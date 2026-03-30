package com.ruoyi.web.controller.osg;

import java.time.ZoneId;
import java.time.format.TextStyle;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.LinkedHashMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.ServletRequestAttributes;
import com.ruoyi.common.annotation.Excel;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.common.utils.file.FileUtils;
import com.ruoyi.common.utils.poi.ExcelUtil;
import com.ruoyi.system.domain.OsgJobApplication;
import com.ruoyi.system.service.IOsgLeadMentorJobOverviewService;
import com.ruoyi.system.service.impl.OsgJobOverviewServiceImpl;
import jakarta.servlet.http.HttpServletResponse;

@RestController
public class OsgJobOverviewController extends BaseController
{
    private static final String JOB_OVERVIEW_ACCESS = "@ss.hasPermi('admin:job-overview:list')";

    @Autowired
    private OsgJobOverviewServiceImpl jobOverviewService;

    @Autowired
    private IOsgLeadMentorJobOverviewService leadMentorJobOverviewService;

    @PreAuthorize(JOB_OVERVIEW_ACCESS)
    @GetMapping("/admin/job-overview/stats")
    public AjaxResult stats(@RequestParam(required = false) String studentName,
                            @RequestParam(required = false) String companyName,
                            @RequestParam(required = false) String currentStage,
                            @RequestParam(required = false) Long leadMentorId,
                            @RequestParam(required = false) String assignStatus)
    {
        return AjaxResult.success(jobOverviewService.selectJobOverviewStats(studentName, companyName, currentStage, leadMentorId, assignStatus));
    }

    @PreAuthorize(JOB_OVERVIEW_ACCESS)
    @GetMapping("/admin/job-overview/funnel")
    public AjaxResult funnel(@RequestParam(required = false) String studentName,
                             @RequestParam(required = false) String companyName,
                             @RequestParam(required = false) String currentStage,
                             @RequestParam(required = false) Long leadMentorId,
                             @RequestParam(required = false) String assignStatus)
    {
        return AjaxResult.success(jobOverviewService.selectJobOverviewFunnel(studentName, companyName, currentStage, leadMentorId, assignStatus));
    }

    @PreAuthorize(JOB_OVERVIEW_ACCESS)
    @GetMapping("/admin/job-overview/hot-companies")
    public AjaxResult hotCompanies(@RequestParam(required = false) String studentName,
                                   @RequestParam(required = false) String companyName,
                                   @RequestParam(required = false) String currentStage,
                                   @RequestParam(required = false) Long leadMentorId,
                                   @RequestParam(required = false) String assignStatus)
    {
        return AjaxResult.success(jobOverviewService.selectHotCompanies(studentName, companyName, currentStage, leadMentorId, assignStatus));
    }

    @PreAuthorize(JOB_OVERVIEW_ACCESS)
    @GetMapping("/admin/job-overview/list")
    public AjaxResult list(@RequestParam(required = false) String studentName,
                           @RequestParam(required = false) String companyName,
                           @RequestParam(required = false) String currentStage,
                           @RequestParam(required = false) Long leadMentorId,
                           @RequestParam(required = false) String assignStatus)
    {
        List<Map<String, Object>> rows = jobOverviewService.selectJobOverviewList(studentName, companyName, currentStage, leadMentorId, assignStatus);
        return AjaxResult.success().put("rows", rows);
    }

    @PreAuthorize(JOB_OVERVIEW_ACCESS)
    @GetMapping("/admin/job-overview/export")
    public void export(HttpServletResponse response,
                       @RequestParam(required = false) String studentName,
                       @RequestParam(required = false) String companyName,
                       @RequestParam(required = false) String currentStage,
                       @RequestParam(required = false) Long leadMentorId,
                       @RequestParam(required = false) String assignStatus,
                       @RequestParam(required = false) String tab)
    {
        prepareExportResponse(response, "求职总览.xlsx");
        List<JobOverviewExportRow> exportRows = jobOverviewService.selectJobOverviewExportRows(
            studentName,
            companyName,
            currentStage,
            leadMentorId,
            assignStatus,
            tab
        ).stream()
            .map(JobOverviewExportRow::from)
            .toList();
        ExcelUtil<JobOverviewExportRow> util = new ExcelUtil<>(JobOverviewExportRow.class);
        util.exportExcel(response, exportRows, "求职总览");
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

    @PreAuthorize(JOB_OVERVIEW_ACCESS)
    @GetMapping("/admin/job-overview/unassigned")
    public AjaxResult unassigned(@RequestParam(required = false) String studentName,
                                 @RequestParam(required = false) String companyName,
                                 @RequestParam(required = false) String currentStage,
                                 @RequestParam(required = false) Long leadMentorId)
    {
        List<Map<String, Object>> rows = jobOverviewService.selectUnassignedList(studentName, companyName, currentStage, leadMentorId);
        return AjaxResult.success().put("rows", rows);
    }

    @PreAuthorize(JOB_OVERVIEW_ACCESS)
    @PostMapping("/admin/job-overview/assign-mentor")
    public AjaxResult assignMentor(@RequestBody Map<String, Object> body)
    {
        try
        {
            Map<String, Object> result = jobOverviewService.assignMentors(body, resolveOperator());
            return AjaxResult.success("导师分配成功", result)
                .put("status", result.get("status"))
                .put("coachingStatus", result.get("coachingStatus"))
                .put("mentorNames", result.get("mentorNames"));
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    @PreAuthorize(JOB_OVERVIEW_ACCESS)
    @PutMapping("/admin/job-overview/stage-update")
    public AjaxResult stageUpdate(@RequestBody Map<String, Object> body)
    {
        try
        {
            Map<String, Object> result = jobOverviewService.updateStage(body, resolveOperator());
            return AjaxResult.success("求职阶段更新成功", result)
                .put("currentStage", result.get("currentStage"))
                .put("stageUpdated", result.get("stageUpdated"));
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    @GetMapping("/api/mentor/job-overview/list")
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

    @PutMapping("/api/mentor/job-overview/{id}/confirm")
    public AjaxResult confirm(@PathVariable Long id)
    {
        return AjaxResult.success(leadMentorJobOverviewService.confirmCoaching(id, SecurityUtils.getUserId(), resolveOperator()));
    }

    @GetMapping("/api/mentor/job-overview/calendar")
    public AjaxResult calendar()
    {
        OsgJobApplication query = buildMentorQueryFromRequest();
        List<Map<String, Object>> rows = leadMentorJobOverviewService.selectOverviewList("coaching", query, SecurityUtils.getUserId()).stream()
            .map(this::toLegacyCalendarEvent)
            .filter(event -> event.get("time") != null)
            .toList();
        return success(rows);
    }

    @GetMapping("/api/mentor/job-overview/export")
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
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", row.get("applicationId"));
        payload.put("studentName", row.get("studentName"));
        payload.put("company", row.get("companyName"));
        payload.put("stage", row.get("currentStage"));
        payload.put("time", interviewTime);
        payload.put("position", row.get("positionName"));
        payload.put("location", firstText(row.get("city"), row.get("region")));
        payload.put("color", pickCalendarColor(toLegacyCoachingStatus(row), toLegacyResult(row)));
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

    private static class JobOverviewExportRow
    {
        @Excel(name = "申请ID")
        private final Long applicationId;

        @Excel(name = "学员ID")
        private final Long studentId;

        @Excel(name = "学员姓名")
        private final String studentName;

        @Excel(name = "公司")
        private final String companyName;

        @Excel(name = "岗位")
        private final String positionName;

        @Excel(name = "当前阶段")
        private final String currentStage;

        @Excel(name = "面试时间", width = 20, dateFormat = "yyyy-MM-dd HH:mm:ss")
        private final Object interviewTime;

        @Excel(name = "分配状态")
        private final String assignedStatusLabel;

        @Excel(name = "数据视图")
        private final String datasetLabel;

        @Excel(name = "班主任")
        private final String leadMentorName;

        @Excel(name = "导师")
        private final String mentorName;

        @Excel(name = "辅导状态")
        private final String coachingStatus;

        @Excel(name = "需求导师数")
        private final Integer requestedMentorCount;

        @Excel(name = "意向导师")
        private final String preferredMentorNames;

        @Excel(name = "已用课时")
        private final Integer hoursUsed;

        @Excel(name = "反馈摘要")
        private final String feedbackSummary;

        @Excel(name = "申请时间", width = 20, dateFormat = "yyyy-MM-dd HH:mm:ss")
        private final Object submittedAt;

        private JobOverviewExportRow(Long applicationId, Long studentId, String studentName, String companyName,
                                     String positionName, String currentStage, Object interviewTime,
                                     String assignedStatusLabel, String datasetLabel, String leadMentorName,
                                     String mentorName, String coachingStatus, Integer requestedMentorCount,
                                     String preferredMentorNames, Integer hoursUsed, String feedbackSummary,
                                     Object submittedAt)
        {
            this.applicationId = applicationId;
            this.studentId = studentId;
            this.studentName = studentName;
            this.companyName = companyName;
            this.positionName = positionName;
            this.currentStage = currentStage;
            this.interviewTime = interviewTime;
            this.assignedStatusLabel = assignedStatusLabel;
            this.datasetLabel = datasetLabel;
            this.leadMentorName = leadMentorName;
            this.mentorName = mentorName;
            this.coachingStatus = coachingStatus;
            this.requestedMentorCount = requestedMentorCount;
            this.preferredMentorNames = preferredMentorNames;
            this.hoursUsed = hoursUsed;
            this.feedbackSummary = feedbackSummary;
            this.submittedAt = submittedAt;
        }

        private static JobOverviewExportRow from(Map<String, Object> row)
        {
            return new JobOverviewExportRow(
                asLong(row.get("applicationId")),
                asLong(row.get("studentId")),
                asText(row.get("studentName")),
                asText(row.get("companyName")),
                asText(row.get("positionName")),
                asText(row.get("currentStage")),
                row.get("interviewTime"),
                asText(row.get("assignedStatusLabel")),
                asText(row.get("datasetLabel")),
                asText(row.get("leadMentorName")),
                asText(row.get("mentorName")),
                asText(row.get("coachingStatus")),
                asInteger(row.get("requestedMentorCount")),
                asText(row.get("preferredMentorNames")),
                asInteger(row.get("hoursUsed")),
                asText(row.get("feedbackSummary")),
                row.get("submittedAt")
            );
        }

        private static JobOverviewExportRow fromMentorLegacy(Map<String, Object> row)
        {
            return new JobOverviewExportRow(
                asLong(row.get("id")),
                asLong(row.get("studentId")),
                asText(row.get("studentName")),
                asText(row.get("company")),
                asText(row.get("position")),
                asText(row.get("interviewStage")),
                row.get("interviewTime"),
                asText(row.get("coachingStatus")),
                "导师端",
                "",
                asText(row.get("mentorName")),
                asText(row.get("coachingStatus")),
                null,
                "",
                null,
                "",
                row.get("createTime")
            );
        }

        private static Long asLong(Object value)
        {
            return value instanceof Number number ? number.longValue() : null;
        }

        private static Integer asInteger(Object value)
        {
            return value instanceof Number number ? number.intValue() : null;
        }

        private static String asText(Object value)
        {
            return value == null ? null : String.valueOf(value);
        }
    }
}
