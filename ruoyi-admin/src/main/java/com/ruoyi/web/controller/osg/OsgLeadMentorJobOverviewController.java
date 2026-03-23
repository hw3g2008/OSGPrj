package com.ruoyi.web.controller.osg;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ruoyi.common.constant.HttpStatus;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.domain.OsgJobApplication;
import com.ruoyi.system.service.IOsgLeadMentorJobOverviewService;
import com.ruoyi.system.service.impl.OsgLeadMentorAccessService;

@RestController
@RequestMapping("/lead-mentor/job-overview")
public class OsgLeadMentorJobOverviewController extends BaseController
{
    private static final String ACCESS_DENIED_MESSAGE = "该账号无班主任端访问权限";

    @Autowired
    private IOsgLeadMentorJobOverviewService leadMentorJobOverviewService;

    @Autowired
    private OsgLeadMentorAccessService leadMentorAccessService;

    @GetMapping("/list")
    public AjaxResult list(String scope, OsgJobApplication query)
    {
        if (!hasLeadMentorAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }

        try
        {
            List<Map<String, Object>> rows = leadMentorJobOverviewService.selectOverviewList(scope, query, getUserId());
            return AjaxResult.success().put("rows", rows);
        }
        catch (ServiceException ex)
        {
            return handleServiceException(ex);
        }
    }

    @GetMapping("/{applicationId}")
    public AjaxResult detail(@PathVariable Long applicationId)
    {
        if (!hasLeadMentorAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }

        try
        {
            return AjaxResult.success(leadMentorJobOverviewService.selectOverviewDetail(applicationId, getUserId()));
        }
        catch (ServiceException ex)
        {
            return handleServiceException(ex);
        }
    }

    @PostMapping("/{applicationId}/assign-mentor")
    public AjaxResult assignMentor(@PathVariable Long applicationId, @RequestBody Map<String, Object> body)
    {
        if (!hasLeadMentorAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }

        try
        {
            Map<String, Object> result = leadMentorJobOverviewService.assignMentors(applicationId, body, getUserId(), resolveOperator());
            return AjaxResult.success(result);
        }
        catch (ServiceException ex)
        {
            return handleServiceException(ex);
        }
    }

    @PostMapping("/{applicationId}/ack-stage-update")
    public AjaxResult acknowledgeStageUpdate(@PathVariable Long applicationId)
    {
        if (!hasLeadMentorAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }

        try
        {
            return AjaxResult.success(leadMentorJobOverviewService.acknowledgeStageUpdate(applicationId, getUserId(), resolveOperator()));
        }
        catch (ServiceException ex)
        {
            return handleServiceException(ex);
        }
    }

    private boolean hasLeadMentorAccess()
    {
        LoginUser loginUser = SecurityUtils.getLoginUser();
        SysUser user = loginUser == null ? null : loginUser.getUser();
        return leadMentorAccessService.hasLeadMentorAccess(user);
    }

    private AjaxResult handleServiceException(ServiceException ex)
    {
        String message = ex.getMessage();
        if (message != null && message.contains("无权"))
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, message);
        }
        return AjaxResult.error(HttpStatus.BAD_REQUEST, message);
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
