package com.ruoyi.web.controller.osg;

import java.time.ZoneId;
import java.time.format.TextStyle;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.common.utils.file.FileUtils;
import com.ruoyi.common.utils.poi.ExcelUtil;
import com.ruoyi.system.domain.OsgJobApplication;
import com.ruoyi.system.service.IOsgUserJobOverviewService;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Mentor 端求职总览 Controller。
 * 由 OsgJobOverviewController（拆分前）抽取的 mentor 端方法构成。
 * URL 前缀：/api/mentor/job-overview/*
 * <p>
 * Service 依赖 IOsgUserJobOverviewService（M0.2 完成三端 Service 合并，Assistant+LM+Mentor 共用）。
 */
@RestController
@RequestMapping("/mentor/job-overview")
public class OsgMentorJobOverviewController extends BaseController
{
    @Autowired
    private IOsgUserJobOverviewService userJobOverviewService;

    @GetMapping("/list")
    public TableDataInfo mentorList(OsgJobApplication query)
    {
        if (RequestContextHolder.getRequestAttributes() != null)
        {
            startPage();
        }
        List<Map<String, Object>> rows = userJobOverviewService.listByMentor(query, SecurityUtils.getUserId()).stream()
            .map(this::toLegacyMentorOverviewRow)
            .toList();
        return getDataTable(rows);
    }

    @PutMapping("/{id}/confirm")
    public AjaxResult confirm(@PathVariable Long id)
    {
        return AjaxResult.success(userJobOverviewService.confirmCoaching(id, SecurityUtils.getUserId(), resolveOperator()));
    }

    /**
     * §C.3 mentor 端确认 LM 推送的阶段更新（消除 stageUpdated 标记）。
     * 与 LM 端 ack-stage-update 等价，但限定 mentor 鉴权（service 层走 listByMentor 视角）。
     */
    @PostMapping("/{id}/ack-stage-update")
    public AjaxResult acknowledgeStageUpdate(@PathVariable Long id)
    {
        return AjaxResult.success(userJobOverviewService.acknowledgeStageUpdate(id, SecurityUtils.getUserId(), resolveOperator()));
    }

    /**
     * §A.0.3 mentor 端列出当前活跃的辅导对象（前端课程记录提交表单做下拉源）。
     */
    @GetMapping("/my-targets")
    public AjaxResult myTargets()
    {
        return AjaxResult.success(userJobOverviewService.listMyTargets(SecurityUtils.getUserId()));
    }

    @GetMapping("/calendar")
    public AjaxResult calendar()
    {
        OsgJobApplication query = buildMentorQueryFromRequest();
        List<Map<String, Object>> rows = userJobOverviewService.listByMentor(query, SecurityUtils.getUserId()).stream()
            .map(this::toLegacyCalendarEvent)
            .filter(event -> event.get("time") != null)
            .toList();
        return success(rows);
    }

    @GetMapping("/export")
    public void mentorExport(HttpServletResponse response, OsgJobApplication query)
    {
        prepareExportResponse(response, "学员求职总览.xlsx");
        List<JobOverviewExportRow> exportRows = userJobOverviewService.listByMentor(query, SecurityUtils.getUserId()).stream()
            .map(this::toLegacyMentorOverviewRow)
            .map(JobOverviewExportRow::fromMentorLegacy)
            .toList();
        ExcelUtil<JobOverviewExportRow> util = new ExcelUtil<>(JobOverviewExportRow.class);
        util.exportExcel(response, exportRows, "学员求职总览");
    }

    private void prepareExportResponse(HttpServletResponse response, String fileName)
    {
        try
        {
            FileUtils.setAttachmentResponseHeader(response, fileName);
        }
        catch (java.io.UnsupportedEncodingException ex)
        {
            throw new IllegalStateException("设置导出响应头失败", ex);
        }
    }

    private String resolveOperator()
    {
        // 防御：未登录上下文（getLoginUser 返回 null）会让 BaseController.getUsername() 抛 NPE，
        // 兜底为 "system"，避免 confirm/ack-stage 等接口在异常请求下直接 500。
        try
        {
            return getUsername();
        }
        catch (ServiceException | NullPointerException ex)
        {
            return "system";
        }
    }

    private OsgJobApplication buildMentorQueryFromRequest()
    {
        OsgJobApplication query = new OsgJobApplication();
        if (!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes))
        {
            return query;
        }

        jakarta.servlet.http.HttpServletRequest request = attributes.getRequest();
        query.setStudentName(stringValue(request.getParameter("studentName")));
        query.setCompanyName(stringValue(request.getParameter("companyName")));
        query.setCurrentStage(stringValue(request.getParameter("currentStage")));
        query.setAssignStatus(stringValue(request.getParameter("assignStatus")));
        query.setKeyword(stringValue(request.getParameter("keyword")));
        query.setMonth(stringValue(request.getParameter("month")));
        query.setStatus(stringValue(request.getParameter("status")));
        return query;
    }

    private Map<String, Object> toLegacyMentorOverviewRow(Map<String, Object> row)
    {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", row.get("applicationId"));
        // Step3-F1: 透出 service 已输出的 coaching 锚点 + 课消统计（service 层 Step 2-A F1 已就绪）
        payload.put("applicationId", row.get("applicationId"));
        payload.put("coachingId", row.get("coachingId"));
        payload.put("lessonCount", row.get("lessonCount"));
        payload.put("lessonReported", row.get("lessonReported"));
        payload.put("studentId", row.get("studentId"));
        payload.put("studentName", row.get("studentName"));
        payload.put("mentorId", SecurityUtils.getUserId());
        payload.put("company", row.get("companyName"));
        payload.put("position", row.get("positionName"));
        payload.put("location", firstText(row.get("city"), row.get("region")));
        payload.put("interviewStage", row.get("currentStage"));
        payload.put("interviewTime", row.get("interviewTime"));
        payload.put("stageUpdated", row.get("stageUpdated"));
        payload.put("coachingStatus", toLegacyCoachingStatus(row));
        payload.put("result", toLegacyResult(row));
        payload.put("createTime", row.get("submittedAt"));
        return payload;
    }

    private Map<String, Object> toLegacyCalendarEvent(Map<String, Object> row)
    {
        Date interviewTime = asDate(row.get("interviewTime"));
        String coachingStatus = toLegacyCoachingStatus(row);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", row.get("applicationId"));
        // Step3-F1: 透出 coachingId 给前端日历组件按 coaching 锚点展示
        payload.put("coachingId", row.get("coachingId"));
        payload.put("studentName", row.get("studentName"));
        payload.put("company", row.get("companyName"));
        payload.put("position", row.get("positionName"));
        payload.put("location", firstText(row.get("city"), row.get("region")));
        payload.put("interviewTime", interviewTime);
        payload.put("interviewStage", row.get("currentStage"));
        payload.put("coachingStatus", coachingStatus);
        payload.put("stage", row.get("currentStage"));
        payload.put("time", interviewTime);
        payload.put("color", pickCalendarColor(coachingStatus, toLegacyResult(row)));
        if (interviewTime != null)
        {
            java.time.LocalDateTime dateTime = interviewTime.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime();
            payload.put("day", dateTime.getDayOfMonth());
            payload.put("weekday", dateTime.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.CHINA));
        }
        return payload;
    }

    private String toLegacyCoachingStatus(Map<String, Object> row)
    {
        String coachingStatus = stringValue(row.get("coachingStatus"));
        if ("new".equalsIgnoreCase(coachingStatus) || "新申请".equals(coachingStatus))
        {
            return "new";
        }
        if ("待审批".equals(coachingStatus) || "pending".equalsIgnoreCase(coachingStatus))
        {
            return "new";
        }
        if ("辅导中".equals(coachingStatus) || "coaching".equalsIgnoreCase(coachingStatus))
        {
            return "coaching";
        }
        String result = toLegacyResult(row);
        if (result != null)
        {
            return "completed";
        }
        // 默认走"新分配"语义：coachingStatus 缺失 + 无 result = 后端推送给 mentor 但尚未被
        // 确认的辅导任务。原先错误返 "coaching" 会让前端少打"红色高亮"，漏掉新任务提示。
        return "new";
    }

    private String toLegacyResult(Map<String, Object> row)
    {
        String currentStage = stringValue(row.get("currentStage"));
        if ("offer".equalsIgnoreCase(currentStage))
        {
            return "offer";
        }
        if ("rejected".equalsIgnoreCase(currentStage))
        {
            return "rejected";
        }
        if ("withdrawn".equalsIgnoreCase(currentStage))
        {
            return "cancelled";
        }
        return null;
    }

    private String pickCalendarColor(String coachingStatus, String result)
    {
        if ("offer".equals(result))
        {
            return "#22C55E";
        }
        if ("rejected".equals(result) || "cancelled".equals(result))
        {
            return "#94A3B8";
        }
        if ("new".equals(coachingStatus))
        {
            return "#EF4444";
        }
        return "#7399C6";
    }

    private Date asDate(Object value)
    {
        return value instanceof Date date ? date : null;
    }

    private String firstText(Object primary, Object fallback)
    {
        String first = stringValue(primary);
        if (first != null)
        {
            return first;
        }
        return stringValue(fallback);
    }

    private String stringValue(Object value)
    {
        if (value == null)
        {
            return null;
        }
        String text = value.toString().trim();
        return text.isEmpty() ? null : text;
    }
}
