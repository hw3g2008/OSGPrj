package com.ruoyi.web.controller.osg;

import java.util.Collections;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ruoyi.common.constant.Constants;
import com.ruoyi.common.constant.HttpStatus;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginBody;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.exception.user.UserException;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.framework.web.service.SysLoginService;
import com.ruoyi.system.service.impl.OsgLeadMentorAccessService;

/**
 * Lead-mentor auth endpoints.
 */
@RestController
@RequestMapping("/lead-mentor")
public class OsgLeadMentorAuthController
{
    @Autowired
    private SysLoginService loginService;

    @Autowired
    private OsgLeadMentorAccessService leadMentorAccessService;

    @PostMapping("/login")
    public AjaxResult login(@RequestBody LoginBody loginBody)
    {
        String loginName = StringUtils.trim(loginBody.getUsername());
        SysUser user = leadMentorAccessService.findUserByLogin(loginName);
        if (user != null && !leadMentorAccessService.hasLeadMentorAccess(user))
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, "该账号无班主任端访问权限");
        }

        AjaxResult ajax = AjaxResult.success();
        boolean rememberMe = loginBody.getRememberMe() != null && loginBody.getRememberMe();
        String token;
        try
        {
            token = loginService.loginWithoutCaptcha(
                    user != null ? user.getUserName() : loginName,
                    loginBody.getPassword(),
                    rememberMe);
        }
        catch (UserException e)
        {
            return AjaxResult.error(HttpStatus.UNAUTHORIZED, resolveUserErrorMessage(e));
        }
        catch (ServiceException e)
        {
            if (isUnauthorizedAuthMessage(e.getMessage()))
            {
                return AjaxResult.error(HttpStatus.UNAUTHORIZED, e.getMessage());
            }
            throw e;
        }
        ajax.put(Constants.TOKEN, token);
        return ajax;
    }

    @GetMapping("/getInfo")
    public AjaxResult getInfo()
    {
        LoginUser loginUser = SecurityUtils.getLoginUser();
        SysUser user = loginUser.getUser();

        AjaxResult ajax = AjaxResult.success();
        ajax.put("user", user);
        ajax.put("roles", leadMentorAccessService.buildPortalRoles(user));
        ajax.put("permissions", Collections.emptySet());
        return ajax;
    }

    private String resolveUserErrorMessage(UserException e)
    {
        try
        {
            return e.getMessage();
        }
        catch (RuntimeException ex)
        {
            if ("user.password.not.match".equals(e.getCode()) || "user.not.exists".equals(e.getCode()))
            {
                return "用户不存在/密码错误";
            }
            return "登录失败";
        }
    }

    private boolean isUnauthorizedAuthMessage(String message)
    {
        return "用户不存在/密码错误".equals(message);
    }
}
