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
import com.ruoyi.system.service.impl.OsgLeadMentorAccessService;

@ExtendWith(MockitoExtension.class)
class OsgLeadMentorAuthControllerTest
{
    @InjectMocks
    private OsgLeadMentorAuthController controller;

    @Mock
    private SysLoginService loginService;

    @Mock
    private OsgLeadMentorAccessService leadMentorAccessService;

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
    void leadMentorLoginSkipsCaptchaButStillReturnsToken()
    {
        SysUser user = new SysUser();
        user.setUserId(810L);
        user.setUserName("leadmentor_demo");
        user.setEmail("leadmentor@example.com");
        when(leadMentorAccessService.findUserByLogin("leadmentor_demo")).thenReturn(user);
        when(leadMentorAccessService.hasLeadMentorAccess(user)).thenReturn(true);
        when(loginService.loginWithoutCaptcha("leadmentor_demo", "admin123", false))
                .thenReturn("lead-mentor-token");

        LoginBody loginBody = new LoginBody();
        loginBody.setUsername("leadmentor_demo");
        loginBody.setPassword("admin123");
        loginBody.setRememberMe(false);

        AjaxResult result = controller.login(loginBody);

        assertEquals(200, result.get("code"));
        assertEquals("lead-mentor-token", result.get("token"));
        verify(leadMentorAccessService).findUserByLogin("leadmentor_demo");
        verify(leadMentorAccessService).hasLeadMentorAccess(user);
        verify(loginService).loginWithoutCaptcha("leadmentor_demo", "admin123", false);
    }

    @Test
    void leadMentorLoginUsesResolvedUserNameWhenEmailSubmitted()
    {
        SysUser user = new SysUser();
        user.setUserId(810L);
        user.setUserName("leadmentor_demo");
        user.setEmail("leadmentor@example.com");
        when(leadMentorAccessService.findUserByLogin("leadmentor@example.com")).thenReturn(user);
        when(leadMentorAccessService.hasLeadMentorAccess(user)).thenReturn(true);
        when(loginService.loginWithoutCaptcha("leadmentor_demo", "admin123", true))
                .thenReturn("lead-mentor-token");

        LoginBody loginBody = new LoginBody();
        loginBody.setUsername("leadmentor@example.com");
        loginBody.setPassword("admin123");
        loginBody.setRememberMe(true);

        AjaxResult result = controller.login(loginBody);

        assertEquals(200, result.get("code"));
        assertEquals("lead-mentor-token", result.get("token"));
        verify(loginService).loginWithoutCaptcha("leadmentor_demo", "admin123", true);
    }

    @Test
    void leadMentorLoginRejectsUsersWithoutPortalAccess()
    {
        SysUser user = new SysUser();
        user.setUserId(811L);
        user.setUserName("plainuser");
        when(leadMentorAccessService.findUserByLogin("plainuser")).thenReturn(user);
        when(leadMentorAccessService.hasLeadMentorAccess(user)).thenReturn(false);

        LoginBody loginBody = new LoginBody();
        loginBody.setUsername("plainuser");
        loginBody.setPassword("admin123");

        AjaxResult result = controller.login(loginBody);

        assertEquals(HttpStatus.FORBIDDEN, result.get("code"));
        assertEquals("该账号无班主任端访问权限", result.get("msg"));
        verify(loginService, never()).loginWithoutCaptcha("plainuser", "admin123", false);
    }

    @Test
    void leadMentorLoginReturnsUnauthorizedWhenPasswordIsWrong()
    {
        SysUser user = new SysUser();
        user.setUserId(810L);
        user.setUserName("leadmentor_demo");
        when(leadMentorAccessService.findUserByLogin("leadmentor_demo")).thenReturn(user);
        when(leadMentorAccessService.hasLeadMentorAccess(user)).thenReturn(true);
        when(loginService.loginWithoutCaptcha("leadmentor_demo", "wrong-pass", false))
                .thenThrow(new UserPasswordNotMatchException());

        LoginBody loginBody = new LoginBody();
        loginBody.setUsername("leadmentor_demo");
        loginBody.setPassword("wrong-pass");

        AjaxResult result = controller.login(loginBody);

        assertEquals(HttpStatus.UNAUTHORIZED, result.get("code"));
        assertEquals("用户不存在/密码错误", result.get("msg"));
    }

    @Test
    void leadMentorLoginReturnsUnauthorizedWhenAuthLayerWrapsBadCredentials()
    {
        SysUser user = new SysUser();
        user.setUserId(810L);
        user.setUserName("leadmentor_demo");
        when(leadMentorAccessService.findUserByLogin("leadmentor_demo")).thenReturn(user);
        when(leadMentorAccessService.hasLeadMentorAccess(user)).thenReturn(true);
        when(loginService.loginWithoutCaptcha("leadmentor_demo", "wrong-pass", false))
                .thenThrow(new ServiceException("用户不存在/密码错误"));

        LoginBody loginBody = new LoginBody();
        loginBody.setUsername("leadmentor_demo");
        loginBody.setPassword("wrong-pass");

        AjaxResult result = controller.login(loginBody);

        assertEquals(HttpStatus.UNAUTHORIZED, result.get("code"));
        assertEquals("用户不存在/密码错误", result.get("msg"));
    }

    @Test
    void leadMentorGetInfoReturnsPortalRoles()
    {
        SysUser user = new SysUser();
        user.setUserId(810L);
        user.setUserName("leadmentor_demo");
        LoginUser loginUser = new LoginUser(810L, null, user, Collections.emptySet());
        securityMock.when(SecurityUtils::getLoginUser).thenReturn(loginUser);
        when(leadMentorAccessService.buildPortalRoles(user)).thenReturn(Set.of("lead-mentor"));

        AjaxResult result = controller.getInfo();

        assertEquals(200, result.get("code"));
        assertSame(user, result.get("user"));
        assertEquals(Set.of("lead-mentor"), result.get("roles"));
        assertEquals(Set.of(), result.get("permissions"));
    }
}
