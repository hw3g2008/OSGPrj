package com.ruoyi.web.controller.osg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.lang.reflect.Method;
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

import com.ruoyi.common.annotation.Anonymous;
import com.ruoyi.common.constant.HttpStatus;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginBody;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.exception.user.UserPasswordNotMatchException;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.framework.web.service.SysLoginService;
import com.ruoyi.system.service.impl.OsgAssistantAccessService;

@ExtendWith(MockitoExtension.class)
class OsgAssistantAuthControllerTest
{
    @InjectMocks
    private OsgAssistantAuthController controller;

    @Mock
    private SysLoginService loginService;

    @Mock
    private OsgAssistantAccessService assistantAccessService;

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
    void assistantLoginEndpointMustAllowAnonymousAccess() throws Exception
    {
        Method login = OsgAssistantAuthController.class.getMethod("login", LoginBody.class);
        assertNotNull(login.getAnnotation(Anonymous.class), "assistant login 必须支持匿名访问");
    }

    @Test
    void assistantLoginSkipsCaptchaButStillReturnsToken()
    {
        SysUser user = new SysUser();
        user.setUserId(910L);
        user.setUserName("assistant_demo");
        user.setEmail("assistant@example.com");
        when(assistantAccessService.findUserByLogin("assistant_demo")).thenReturn(user);
        when(assistantAccessService.hasAssistantAccess(user)).thenReturn(true);
        when(loginService.loginWithoutCaptcha("assistant_demo", "admin123", false))
                .thenReturn("assistant-token");

        LoginBody loginBody = new LoginBody();
        loginBody.setUsername("assistant_demo");
        loginBody.setPassword("admin123");
        loginBody.setRememberMe(false);

        AjaxResult result = controller.login(loginBody);

        assertEquals(200, result.get("code"));
        assertEquals("assistant-token", result.get("token"));
        verify(assistantAccessService).findUserByLogin("assistant_demo");
        verify(assistantAccessService).hasAssistantAccess(user);
        verify(loginService).loginWithoutCaptcha("assistant_demo", "admin123", false);
    }

    @Test
    void assistantLoginUsesResolvedUserNameWhenEmailSubmitted()
    {
        SysUser user = new SysUser();
        user.setUserId(911L);
        user.setUserName("assistant_demo");
        user.setEmail("assistant@example.com");
        when(assistantAccessService.findUserByLogin("assistant@example.com")).thenReturn(user);
        when(assistantAccessService.hasAssistantAccess(user)).thenReturn(true);
        when(loginService.loginWithoutCaptcha("assistant_demo", "admin123", true))
                .thenReturn("assistant-token");

        LoginBody loginBody = new LoginBody();
        loginBody.setUsername("assistant@example.com");
        loginBody.setPassword("admin123");
        loginBody.setRememberMe(true);

        AjaxResult result = controller.login(loginBody);

        assertEquals(200, result.get("code"));
        assertEquals("assistant-token", result.get("token"));
        verify(loginService).loginWithoutCaptcha("assistant_demo", "admin123", true);
    }

    @Test
    void assistantLoginRejectsUsersWithoutPortalAccess()
    {
        SysUser user = new SysUser();
        user.setUserId(912L);
        user.setUserName("plainuser");
        when(assistantAccessService.findUserByLogin("plainuser")).thenReturn(user);
        when(assistantAccessService.hasAssistantAccess(user)).thenReturn(false);

        LoginBody loginBody = new LoginBody();
        loginBody.setUsername("plainuser");
        loginBody.setPassword("admin123");

        AjaxResult result = controller.login(loginBody);

        assertEquals(HttpStatus.FORBIDDEN, result.get("code"));
        assertEquals("该账号无助教端访问权限", result.get("msg"));
        verify(loginService, never()).loginWithoutCaptcha("plainuser", "admin123", false);
    }

    @Test
    void assistantLoginReturnsUnauthorizedWhenPasswordIsWrong()
    {
        SysUser user = new SysUser();
        user.setUserId(913L);
        user.setUserName("assistant_demo");
        when(assistantAccessService.findUserByLogin("assistant_demo")).thenReturn(user);
        when(assistantAccessService.hasAssistantAccess(user)).thenReturn(true);
        when(loginService.loginWithoutCaptcha("assistant_demo", "wrong-pass", false))
                .thenThrow(new UserPasswordNotMatchException());

        LoginBody loginBody = new LoginBody();
        loginBody.setUsername("assistant_demo");
        loginBody.setPassword("wrong-pass");

        AjaxResult result = controller.login(loginBody);

        assertEquals(HttpStatus.UNAUTHORIZED, result.get("code"));
        assertEquals("用户不存在/密码错误", result.get("msg"));
    }

    @Test
    void assistantLoginReturnsUnauthorizedWhenAuthLayerWrapsBadCredentials()
    {
        SysUser user = new SysUser();
        user.setUserId(914L);
        user.setUserName("assistant_demo");
        when(assistantAccessService.findUserByLogin("assistant_demo")).thenReturn(user);
        when(assistantAccessService.hasAssistantAccess(user)).thenReturn(true);
        when(loginService.loginWithoutCaptcha("assistant_demo", "wrong-pass", false))
                .thenThrow(new ServiceException("用户不存在/密码错误"));

        LoginBody loginBody = new LoginBody();
        loginBody.setUsername("assistant_demo");
        loginBody.setPassword("wrong-pass");

        AjaxResult result = controller.login(loginBody);

        assertEquals(HttpStatus.UNAUTHORIZED, result.get("code"));
        assertEquals("用户不存在/密码错误", result.get("msg"));
    }

    @Test
    void assistantGetInfoReturnsPortalRoles()
    {
        SysUser user = new SysUser();
        user.setUserId(915L);
        user.setUserName("assistant_demo");
        LoginUser loginUser = new LoginUser(915L, null, user, Collections.emptySet());
        securityMock.when(SecurityUtils::getLoginUser).thenReturn(loginUser);
        when(assistantAccessService.buildPortalRoles(user)).thenReturn(Set.of("assistant"));

        AjaxResult result = controller.getInfo();

        assertEquals(200, result.get("code"));
        assertSame(user, result.get("user"));
        assertEquals(Set.of("assistant"), result.get("roles"));
        assertEquals(Set.of(), result.get("permissions"));
    }
}
