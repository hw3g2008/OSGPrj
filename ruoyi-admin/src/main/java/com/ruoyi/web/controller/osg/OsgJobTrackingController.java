package com.ruoyi.web.controller.osg;

import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.service.IOsgJobTrackingService;

@RestController
@RequestMapping("/admin/job-tracking")
public class OsgJobTrackingController extends BaseController
{
    private static final String JOB_TRACKING_ACCESS = "@ss.hasPermi('admin:job-tracking:list')";

    @Autowired
    private IOsgJobTrackingService jobTrackingService;

    @PreAuthorize(JOB_TRACKING_ACCESS)
    @GetMapping("/list")
    public AjaxResult list(@RequestParam(required = false) String studentName,
                           @RequestParam(required = false) String leadMentorName,
                           @RequestParam(required = false) String trackingStatus,
                           @RequestParam(required = false) String companyName,
                           @RequestParam(required = false) String location)
    {
        Map<String, Object> payload = jobTrackingService.selectJobTrackingList(
            studentName,
            leadMentorName,
            trackingStatus,
            companyName,
            location
        );
        return AjaxResult.success().put("stats", payload.get("stats")).put("rows", payload.get("rows"));
    }

    @PreAuthorize(JOB_TRACKING_ACCESS)
    @PutMapping("/{applicationId}/update")
    public AjaxResult update(@PathVariable Long applicationId, @RequestBody Map<String, Object> body)
    {
        try
        {
            Map<String, Object> payload = jobTrackingService.updateJobTracking(applicationId, body, resolveOperator());
            return AjaxResult.success("岗位追踪更新成功", payload)
                .put("currentStage", payload.get("currentStage"))
                .put("trackingStatus", payload.get("trackingStatus"))
                .put("preferredMentor", payload.get("preferredMentor"))
                .put("excludedMentor", payload.get("excludedMentor"));
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
