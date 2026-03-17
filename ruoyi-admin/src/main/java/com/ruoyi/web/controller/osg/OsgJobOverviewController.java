package com.ruoyi.web.controller.osg;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.service.impl.OsgJobOverviewServiceImpl;

@RestController
@RequestMapping("/admin/job-overview")
public class OsgJobOverviewController extends BaseController
{
    private static final String JOB_OVERVIEW_ACCESS = "@ss.hasPermi('admin:job-overview:list')";

    @Autowired
    private OsgJobOverviewServiceImpl jobOverviewService;

    @PreAuthorize(JOB_OVERVIEW_ACCESS)
    @GetMapping("/stats")
    public AjaxResult stats(@RequestParam(required = false) String studentName,
                            @RequestParam(required = false) String companyName,
                            @RequestParam(required = false) String currentStage,
                            @RequestParam(required = false) Long leadMentorId,
                            @RequestParam(required = false) String assignStatus)
    {
        return AjaxResult.success(jobOverviewService.selectJobOverviewStats(studentName, companyName, currentStage, leadMentorId, assignStatus));
    }

    @PreAuthorize(JOB_OVERVIEW_ACCESS)
    @GetMapping("/funnel")
    public AjaxResult funnel(@RequestParam(required = false) String studentName,
                             @RequestParam(required = false) String companyName,
                             @RequestParam(required = false) String currentStage,
                             @RequestParam(required = false) Long leadMentorId,
                             @RequestParam(required = false) String assignStatus)
    {
        return AjaxResult.success(jobOverviewService.selectJobOverviewFunnel(studentName, companyName, currentStage, leadMentorId, assignStatus));
    }

    @PreAuthorize(JOB_OVERVIEW_ACCESS)
    @GetMapping("/hot-companies")
    public AjaxResult hotCompanies(@RequestParam(required = false) String studentName,
                                   @RequestParam(required = false) String companyName,
                                   @RequestParam(required = false) String currentStage,
                                   @RequestParam(required = false) Long leadMentorId,
                                   @RequestParam(required = false) String assignStatus)
    {
        return AjaxResult.success(jobOverviewService.selectHotCompanies(studentName, companyName, currentStage, leadMentorId, assignStatus));
    }

    @PreAuthorize(JOB_OVERVIEW_ACCESS)
    @GetMapping("/list")
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
    @GetMapping("/unassigned")
    public AjaxResult unassigned(@RequestParam(required = false) String studentName,
                                 @RequestParam(required = false) String companyName,
                                 @RequestParam(required = false) String currentStage,
                                 @RequestParam(required = false) Long leadMentorId)
    {
        List<Map<String, Object>> rows = jobOverviewService.selectUnassignedList(studentName, companyName, currentStage, leadMentorId);
        return AjaxResult.success().put("rows", rows);
    }

    @PreAuthorize(JOB_OVERVIEW_ACCESS)
    @PostMapping("/assign-mentor")
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
    @PutMapping("/stage-update")
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
}
