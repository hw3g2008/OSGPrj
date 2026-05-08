package com.ruoyi.web.controller.osg;

import java.util.Collections;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ruoyi.common.constant.Constants;
import com.ruoyi.common.constant.UserConstants;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginBody;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.framework.web.service.SysLoginService;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.OsgStudentMapper;
import com.ruoyi.system.service.impl.OsgStudentServiceImpl;

/**
 * Student auth endpoints.
 */
@RestController
@RequestMapping("/student")
public class OsgStudentAuthController
{
    @Autowired
    private SysLoginService loginService;

    @Autowired
    private OsgStudentMapper osgStudentMapper;

    @Autowired
    private OsgStudentServiceImpl osgStudentService;

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

    /**
     * 学生端登录后的用户信息载体。
     *
     * 返回 user / roles / permissions / mustChangePassword（与 admin 默认 /getInfo 形态一致），
     * 额外补 accountStatus + blacklisted 两字段，供前端路由守卫拦截已结束 / 黑名单学员。
     * 字段来源：osg_student.account_status；osg_student_blacklist 是否存在。
     */
    @GetMapping("/getInfo")
    public AjaxResult getInfo()
    {
        LoginUser loginUser = SecurityUtils.getLoginUser();
        SysUser user = loginUser.getUser();

        AjaxResult ajax = AjaxResult.success();
        ajax.put("user", user);
        ajax.put("roles", Collections.singleton("student"));
        ajax.put("permissions", Collections.emptySet());
        ajax.put("mustChangePassword", SecurityUtils.matchesPassword(UserConstants.DEFAULT_PASSWORD, user.getPassword()));

        OsgStudent student = osgStudentMapper.selectStudentByEmail(user.getUserName());
        String accountStatus = "0";
        boolean blacklisted = false;
        if (student != null)
        {
            String raw = student.getAccountStatus();
            accountStatus = (raw == null || raw.isBlank()) ? "0" : raw;
            blacklisted = !osgStudentService.selectBlacklistedStudentIds(List.of(student.getStudentId())).isEmpty();
        }
        ajax.put("accountStatus", accountStatus);
        ajax.put("blacklisted", blacklisted);
        return ajax;
    }
}
