package com.ruoyi.web.controller.osg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.model.LoginBody;
import com.ruoyi.framework.web.service.SysLoginService;

@ExtendWith(MockitoExtension.class)
class OsgStudentAuthControllerTest
{
    @InjectMocks
    private OsgStudentAuthController controller;

    @Mock
    private SysLoginService loginService;

    @Test
    void studentLoginSkipsCaptchaButStillReturnsToken()
    {
        when(loginService.loginWithoutCaptcha("student_demo", "student123", false))
                .thenReturn("student-token");

        LoginBody loginBody = new LoginBody();
        loginBody.setUsername("student_demo");
        loginBody.setPassword("student123");
        loginBody.setRememberMe(false);

        AjaxResult result = controller.login(loginBody);

        assertEquals(200, result.get("code"));
        assertEquals("student-token", result.get("token"));
        verify(loginService).loginWithoutCaptcha("student_demo", "student123", false);
    }
}
