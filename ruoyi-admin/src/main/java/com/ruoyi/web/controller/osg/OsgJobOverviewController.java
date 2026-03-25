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
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.domain.OsgJobApplication;
import com.ruoyi.system.service.IOsgLeadMentorJobOverviewService;
import com.ruoyi.system.service.impl.OsgJobOverviewServiceImpl;

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
        List<Map<String, Object>> rows = leadMentorJobOverviewService.selectOverviewList("coaching", new OsgJobApplication(), SecurityUtils.getUserId()).stream()
            .map(this::toLegacyCalendarEvent)
            .filter(event -> event.get("time") != null)
            .toList();
        return success(rows);
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
