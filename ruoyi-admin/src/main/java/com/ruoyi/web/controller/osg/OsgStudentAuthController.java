package com.ruoyi.web.controller.osg;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ruoyi.common.constant.Constants;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.model.LoginBody;
import com.ruoyi.framework.web.service.SysLoginService;

/**
 * Student auth endpoints.
 */
@RestController
@RequestMapping("/student")
public class OsgStudentAuthController
{
    @Autowired
    private SysLoginService loginService;

    @PostMapping("/login")
    public AjaxResult login(@RequestBody LoginBody loginBody)
    {
        AjaxResult ajax = AjaxResult.success();
        boolean rememberMe = loginBody.getRememberMe() != null && loginBody.getRememberMe();
        String token = loginService.loginWithoutCaptcha(
                loginBody.getUsername(),
                loginBody.getPassword(),
                rememberMe);
        ajax.put(Constants.TOKEN, token);
        return ajax;
    }
}
