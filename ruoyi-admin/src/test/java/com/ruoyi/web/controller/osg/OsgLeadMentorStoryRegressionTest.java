package com.ruoyi.web.controller.osg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
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
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.framework.web.service.SysLoginService;
import com.ruoyi.framework.web.service.SysPasswordService;
import com.ruoyi.system.service.impl.OsgLeadMentorAccessService;
import com.ruoyi.web.controller.system.SysPasswordController;

@ExtendWith(MockitoExtension.class)
class OsgLeadMentorStoryRegressionTest
{
    @InjectMocks
    private OsgLeadMentorAuthController authController;

    @InjectMocks
    private SysPasswordController passwordController;

    @Mock
    private SysLoginService loginService;

    @Mock
    private OsgLeadMentorAccessService leadMentorAccessService;

    @Mock
    private SysPasswordService passwordService;

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
    void storyHappyPathProvidesPasswordResetAndLeadMentorLoginEntry()
    {
        Map<String, String> sendCodeParams = new HashMap<>();
        sendCodeParams.put("email", "leadmentor@example.com");
        doNothing().when(passwordService).sendResetCode("leadmentor@example.com");

        AjaxResult sendCodeResult = passwordController.sendCode(sendCodeParams);
        assertEquals(200, sendCodeResult.get("code"));

        Map<String, String> verifyParams = new HashMap<>();
        verifyParams.put("email", "leadmentor@example.com");
        verifyParams.put("code", "123456");
        when(passwordService.verifyResetCode("leadmentor@example.com", "123456")).thenReturn("reset-token");

        AjaxResult verifyResult = passwordController.verify(verifyParams);
        assertEquals(200, verifyResult.get("code"));
        @SuppressWarnings("unchecked")
        Map<String, Object> verifyData = (Map<String, Object>) verifyResult.get("data");
        assertEquals("reset-token", verifyData.get("resetToken"));

        Map<String, String> resetParams = new HashMap<>();
        resetParams.put("email", "leadmentor@example.com");
        resetParams.put("password", "LeadMentor123");
        resetParams.put("resetToken", "reset-token");
        doNothing().when(passwordService).resetPassword("leadmentor@example.com", "LeadMentor123", "reset-token");

        AjaxResult resetResult = passwordController.reset(resetParams);
        assertEquals(200, resetResult.get("code"));

        SysUser user = new SysUser();
        user.setUserId(810L);
        user.setUserName("leadmentor_demo");
        user.setEmail("leadmentor@example.com");
        when(leadMentorAccessService.findUserByLogin("leadmentor_demo")).thenReturn(user);
        when(leadMentorAccessService.hasLeadMentorAccess(user)).thenReturn(true);
        when(loginService.loginWithoutCaptcha("leadmentor_demo", "LeadMentor123", false)).thenReturn("lead-token");

        LoginBody loginBody = new LoginBody();
        loginBody.setUsername("leadmentor_demo");
        loginBody.setPassword("LeadMentor123");

        AjaxResult loginResult = authController.login(loginBody);
        assertEquals(200, loginResult.get("code"));
        assertEquals("lead-token", loginResult.get("token"));

        LoginUser loginUser = new LoginUser(810L, null, user, Collections.emptySet());
        securityMock.when(SecurityUtils::getLoginUser).thenReturn(loginUser);
        when(leadMentorAccessService.buildPortalRoles(user)).thenReturn(Set.of("lead-mentor"));

        AjaxResult infoResult = authController.getInfo();
        assertEquals(200, infoResult.get("code"));
        assertEquals(Set.of("lead-mentor"), infoResult.get("roles"));
    }

    @Test
    void storyUnauthorizedBoundaryRejectsUsersWithoutLeadMentorAccess()
    {
        SysUser user = new SysUser();
        user.setUserId(811L);
        user.setUserName("mentor_only");

        when(leadMentorAccessService.findUserByLogin("mentor_only")).thenReturn(user);
        when(leadMentorAccessService.hasLeadMentorAccess(user)).thenReturn(false);

        LoginBody loginBody = new LoginBody();
        loginBody.setUsername("mentor_only");
        loginBody.setPassword("secret123");

        AjaxResult loginResult = authController.login(loginBody);

        assertEquals(HttpStatus.FORBIDDEN, loginResult.get("code"));
        assertEquals("该账号无班主任端访问权限", loginResult.get("msg"));
        verify(leadMentorAccessService).hasLeadMentorAccess(user);
    }
}
