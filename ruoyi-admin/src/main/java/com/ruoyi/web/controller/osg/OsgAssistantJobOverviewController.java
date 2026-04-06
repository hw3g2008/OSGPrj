package com.ruoyi.web.controller.osg;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.domain.OsgJobApplication;
import com.ruoyi.system.service.IOsgAssistantJobOverviewService;

@RestController
@RequestMapping("/assistant/job-overview")
public class OsgAssistantJobOverviewController extends BaseController
{
    @Autowired
    private IOsgAssistantJobOverviewService assistantJobOverviewService;

    @GetMapping("/list")
    public AjaxResult list(
        @RequestParam(required = false) String studentName,
        @RequestParam(required = false) String companyName,
        @RequestParam(required = false) String currentStage,
        @RequestParam(required = false) String coachingStatus)
    {
        try
        {
            Long userId = getUserId();
            OsgJobApplication query = new OsgJobApplication();
            query.setStudentName(studentName);
            query.setCompanyName(companyName);
            query.setCurrentStage(currentStage);

            List<Map<String, Object>> rows = assistantJobOverviewService.selectOverviewList(query, userId);

            if (coachingStatus != null && !coachingStatus.isBlank())
            {
                rows = rows.stream()
                    .filter(row -> coachingStatus.equalsIgnoreCase(String.valueOf(row.getOrDefault("coachingStatus", ""))))
                    .toList();
            }

            return AjaxResult.success().put("rows", rows);
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    @GetMapping("/calendar")
    public AjaxResult calendar()
    {
        try
        {
            Long userId = getUserId();
            List<Map<String, Object>> rows = assistantJobOverviewService.selectCalendarEvents(userId);
            return success(rows);
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    @GetMapping("/{applicationId}")
    public AjaxResult detail(@PathVariable Long applicationId)
    {
        try
        {
            Long userId = getUserId();
            Map<String, Object> detail = assistantJobOverviewService.selectOverviewDetail(applicationId, userId);
            if (detail == null || detail.isEmpty())
            {
                return AjaxResult.error("记录不存在或无权访问");
            }
            return AjaxResult.success(detail);
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }
}
