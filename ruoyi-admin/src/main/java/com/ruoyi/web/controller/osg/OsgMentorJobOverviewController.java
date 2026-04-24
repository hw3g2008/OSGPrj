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
import com.ruoyi.system.service.IOsgLeadMentorJobOverviewService;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Mentor 端求职总览 Controller。
 * 由 OsgJobOverviewController（拆分前）抽取的 mentor 端方法构成。
 * URL 前缀：/api/mentor/job-overview/*
 * <p>
 * 注：Service 依赖 IOsgLeadMentorJobOverviewService 为 M0.1 保留，M0.2 将重命名为 IOsgJobOverviewService。
 */
@RestController
@RequestMapping("/api/mentor/job-overview")
public class OsgMentorJobOverviewController extends BaseController
{
    @Autowired
    private IOsgLeadMentorJobOverviewService leadMentorJobOverviewService;

    @GetMapping("/list")
    public TableDataInfo mentorList(OsgJobApplication query)
    {
        if (RequestContextHolder.getRequestAttributes() != null)
        {
            startPage();
        }
        List<Map<String, Object>> rows = leadMentorJobOverviewService.selectOverviewList("coaching", query, SecurityUtils.getUserId()).stream()
            .map(this::toLegacyMentorOverviewRow)
            .toList();
        return getDataTable(rows);
    }

    @PutMapping("/{id}/confirm")
    public AjaxResult confirm(@PathVariable Long id)
    {
        return AjaxResult.success(leadMentorJobOverviewService.confirmCoaching(id, SecurityUtils.getUserId(), resolveOperator()));
    }

    @GetMapping("/calendar")
    public AjaxResult calendar()
    {
        OsgJobApplication query = buildMentorQueryFromRequest();
        List<Map<String, Object>> rows = leadMentorJobOverviewService.selectOverviewList("coaching", query, SecurityUtils.getUserId()).stream()
            .map(this::toLegacyCalendarEvent)
            .filter(event -> event.get("time") != null)
            .toList();
        return success(rows);
    }

    @GetMapping("/export")
    public void mentorExport(HttpServletResponse response, OsgJobApplication query)
    {
        prepareExportResponse(response, "学员求职总览.xlsx");
        List<JobOverviewExportRow> exportRows = leadMentorJobOverviewService.selectOverviewList("coaching", query, SecurityUtils.getUserId()).stream()
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
        try
        {
            return getUsername();
        }
        catch (ServiceException ex)
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
        payload.put("studentId", row.get("studentId"));
        payload.put("studentName", row.get("studentName"));
        payload.put("mentorId", SecurityUtils.getUserId());
        payload.put("company", row.get("companyName"));
        payload.put("position", row.get("positionName"));
        payload.put("location", firstText(row.get("city"), row.get("region")));
        payload.put("interviewStage", row.get("currentStage"));
        payload.put("interviewTime", row.get("interviewTime"));
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
        return "coaching";
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
