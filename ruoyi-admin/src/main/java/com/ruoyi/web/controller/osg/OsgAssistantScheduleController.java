package com.ruoyi.web.controller.osg;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ruoyi.common.constant.HttpStatus;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.service.impl.OsgAssistantAccessService;
import com.ruoyi.system.service.impl.OsgLeadMentorScheduleService;

@RestController
@RequestMapping("/assistant/schedule")
public class OsgAssistantScheduleController extends BaseController
{
    private static final String ACCESS_DENIED_MESSAGE = "该账号无助教端访问权限";

    @Autowired
    private OsgLeadMentorScheduleService scheduleService;

    @Autowired
    private OsgAssistantAccessService assistantAccessService;

    @GetMapping
    public AjaxResult schedule(@RequestParam(value = "weekScope", required = false) String weekScope)
    {
        if (!hasAssistantAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }

        try
        {
            return AjaxResult.success(scheduleService.selectScheduleView(resolveUser(), weekScope));
        }
        catch (ServiceException ex)
        {
            return handleServiceException(ex);
        }
    }

    @GetMapping("/status")
    public AjaxResult status()
    {
        if (!hasAssistantAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }

        try
        {
            return AjaxResult.success(scheduleService.selectStatusView(resolveUser()));
        }
        catch (ServiceException ex)
        {
            return handleServiceException(ex);
        }
    }

    @PutMapping("/next")
    public AjaxResult saveNext(@RequestBody(required = false) Map<String, Object> body)
    {
        if (!hasAssistantAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }

        try
        {
            return AjaxResult.success("助教下周排期已保存",
                scheduleService.saveNextSchedule(resolveUser(), resolveOperator(), body));
        }
        catch (ServiceException ex)
        {
            return handleServiceException(ex);
        }
    }

    private boolean hasAssistantAccess()
    {
        return assistantAccessService.hasAssistantAccess(resolveUser());
    }

    private SysUser resolveUser()
    {
        LoginUser loginUser = SecurityUtils.getLoginUser();
        return loginUser == null ? null : loginUser.getUser();
    }

    private String resolveOperator()
    {
        try
        {
            return getUsername();
        }
        catch (ServiceException ex)
        {
            SysUser user = resolveUser();
            return user == null ? "system" : user.getUserName();
        }
    }

    private AjaxResult handleServiceException(ServiceException ex)
    {
        String message = ex.getMessage();
        if (message != null && (message.contains("无权") || message.contains("仅允许")))
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, message);
        }
        return AjaxResult.error(HttpStatus.BAD_REQUEST, message);
    }
}
