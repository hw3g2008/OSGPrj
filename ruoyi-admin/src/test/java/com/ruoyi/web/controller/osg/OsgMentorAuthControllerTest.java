package com.ruoyi.web.controller.osg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Collections;
import java.util.Set;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import com.ruoyi.common.constant.HttpStatus;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginBody;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.exception.user.UserPasswordNotMatchException;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.framework.web.service.SysLoginService;
import com.ruoyi.system.service.impl.OsgMentorAccessService;

@ExtendWith(MockitoExtension.class)
class OsgMentorAuthControllerTest
{
    @InjectMocks
    private OsgMentorAuthController controller;

    @Mock
    private SysLoginService loginService;

    @Mock
    private OsgMentorAccessService mentorAccessService;

    private MockedStatic<SecurityUtils> securityMock;

    @BeforeEach
    void setUp()
    {
        securityMock = Mockito.mockStatic(SecurityUtils.class);
    }

    @AfterEach
    void tearDown()
    {
        securityMock.close();
    }

    @Test
    void mentorLoginSkipsCaptchaButStillReturnsToken()
    {
        SysUser user = new SysUser();
        user.setUserId(800L);
        user.setUserName("testmentor");
        user.setEmail("hw3g2008@outlook.com");
        when(mentorAccessService.findUserByLogin("testmentor")).thenReturn(user);
        when(mentorAccessService.hasMentorAccess(user)).thenReturn(true);
        when(loginService.loginWithoutCaptcha("testmentor", "admin123", false))
                .thenReturn("mentor-token");

        LoginBody loginBody = new LoginBody();
        loginBody.setUsername("testmentor");
        loginBody.setPassword("admin123");
        loginBody.setRememberMe(false);

        AjaxResult result = controller.login(loginBody);

        assertEquals(200, result.get("code"));
        assertEquals("mentor-token", result.get("token"));
        verify(mentorAccessService).findUserByLogin("testmentor");
        verify(mentorAccessService).hasMentorAccess(user);
        verify(loginService).loginWithoutCaptcha("testmentor", "admin123", false);
    }

    @Test
    void mentorLoginRejectsUsersWithoutMentorAccess()
    {
        SysUser user = new SysUser();
        user.setUserId(900L);
        user.setUserName("plainuser");
        when(mentorAccessService.findUserByLogin("plainuser")).thenReturn(user);
        when(mentorAccessService.hasMentorAccess(user)).thenReturn(false);

        LoginBody loginBody = new LoginBody();
        loginBody.setUsername("plainuser");
        loginBody.setPassword("admin123");

        AjaxResult result = controller.login(loginBody);

        assertEquals(500, result.get("code"));
        assertEquals("该账号无导师端访问权限", result.get("msg"));
        verify(loginService, never()).loginWithoutCaptcha("plainuser", "admin123", false);
    }

    @Test
    void mentorLoginReturnsUnauthorizedWhenPasswordIsWrong()
    {
        SysUser user = new SysUser();
        user.setUserId(800L);
        user.setUserName("testmentor");
        when(mentorAccessService.findUserByLogin("testmentor")).thenReturn(user);
        when(mentorAccessService.hasMentorAccess(user)).thenReturn(true);
        when(loginService.loginWithoutCaptcha("testmentor", "wrong-pass", false))
                .thenThrow(new UserPasswordNotMatchException());

        LoginBody loginBody = new LoginBody();
        loginBody.setUsername("testmentor");
        loginBody.setPassword("wrong-pass");

        AjaxResult result = controller.login(loginBody);

        assertEquals(HttpStatus.UNAUTHORIZED, result.get("code"));
        assertEquals("用户不存在/密码错误", result.get("msg"));
    }

    @Test
    void mentorLoginReturnsUnauthorizedWhenAuthLayerWrapsBadCredentials()
    {
        SysUser user = new SysUser();
        user.setUserId(800L);
        user.setUserName("testmentor");
        when(mentorAccessService.findUserByLogin("testmentor")).thenReturn(user);
        when(mentorAccessService.hasMentorAccess(user)).thenReturn(true);
        when(loginService.loginWithoutCaptcha("testmentor", "wrong-pass", false))
                .thenThrow(new ServiceException("用户不存在/密码错误"));

        LoginBody loginBody = new LoginBody();
        loginBody.setUsername("testmentor");
        loginBody.setPassword("wrong-pass");

        AjaxResult result = controller.login(loginBody);

        assertEquals(HttpStatus.UNAUTHORIZED, result.get("code"));
        assertEquals("用户不存在/密码错误", result.get("msg"));
    }

    @Test
    void mentorGetInfoReturnsMentorRoles()
    {
        SysUser user = new SysUser();
        user.setUserId(800L);
        user.setUserName("testmentor");
        LoginUser loginUser = new LoginUser(800L, null, user, Collections.emptySet());
        securityMock.when(SecurityUtils::getLoginUser).thenReturn(loginUser);
        when(mentorAccessService.buildPortalRoles(user)).thenReturn(Set.of("mentor"));

        AjaxResult result = controller.getInfo();

        assertEquals(200, result.get("code"));
        assertSame(user, result.get("user"));
        assertEquals(Set.of("mentor"), result.get("roles"));
        assertEquals(Set.of(), result.get("permissions"));
    }
}
