package com.ruoyi.web.controller.osg;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.domain.OsgJobApplication;
import com.ruoyi.system.service.IOsgUserJobOverviewService;

@RestController
@RequestMapping("/assistant/job-overview")
public class OsgAssistantJobOverviewController extends BaseController
{
    @Autowired
    private IOsgUserJobOverviewService userJobOverviewService;

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

            List<Map<String, Object>> rows = userJobOverviewService.listByAssistant(query, userId);

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
            List<Map<String, Object>> rows = userJobOverviewService.calendarForAssistant(userId);
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
            Map<String, Object> detail = userJobOverviewService.detailForAssistant(applicationId, userId);
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

    /**
     * §C.4 asst 端确认收徒（confirm coaching）。
     * 设计：asst 是 mentor 助教，部分场景下 asst 可代 mentor confirm，复用共用 service。
     */
    @PutMapping("/{applicationId}/confirm-coaching")
    public AjaxResult confirmCoaching(@PathVariable Long applicationId)
    {
        try
        {
            return AjaxResult.success(userJobOverviewService.confirmCoaching(applicationId, getUserId(), resolveOperator()));
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    /**
     * §C.4 asst 端确认 LM 推送的阶段更新（消除 stageUpdated 标记）。
     */
    @PostMapping("/{applicationId}/ack-stage-update")
    public AjaxResult acknowledgeStageUpdate(@PathVariable Long applicationId)
    {
        try
        {
            return AjaxResult.success(userJobOverviewService.acknowledgeStageUpdate(applicationId, getUserId(), resolveOperator()));
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    /**
     * §A.0.3 asst 端列出当前活跃的辅导对象（前端课程记录提交表单做下拉源）。
     */
    @GetMapping("/my-targets")
    public AjaxResult myTargets()
    {
        try
        {
            return AjaxResult.success(userJobOverviewService.listMyTargets(getUserId()));
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
