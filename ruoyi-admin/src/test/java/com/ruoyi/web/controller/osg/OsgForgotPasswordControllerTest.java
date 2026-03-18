package com.ruoyi.web.controller.osg;

import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.framework.web.service.SysPasswordService;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OsgForgotPasswordControllerTest {

    @InjectMocks
    private OsgForgotPasswordController controller;

    @Mock
    private SysPasswordService passwordService;

    // ========== sendCode ==========

    @Test
    void testSendCodeSuccess() {
        doNothing().when(passwordService).sendResetCode("test@example.com");
        Map<String, String> params = new HashMap<>();
        params.put("email", "test@example.com");

        AjaxResult result = controller.sendCode(params);

        assertEquals(200, result.get("code"));
        verify(passwordService).sendResetCode("test@example.com");
    }

    @Test
    void testSendCodeEmptyEmail() {
        Map<String, String> params = new HashMap<>();
        params.put("email", "");

        AjaxResult result = controller.sendCode(params);

        assertEquals(500, result.get("code"));
        assertEquals("邮箱地址不能为空", result.get("msg"));
        verify(passwordService, never()).sendResetCode(anyString());
    }

    @Test
    void testSendCodeNullEmail() {
        Map<String, String> params = new HashMap<>();

        AjaxResult result = controller.sendCode(params);

        assertEquals(500, result.get("code"));
        verify(passwordService, never()).sendResetCode(anyString());
    }

    // ========== verifyCode ==========

    @Test
    void testVerifyCodeSuccess() {
        when(passwordService.verifyResetCode("test@example.com", "123456")).thenReturn("reset-token");
        Map<String, String> params = new HashMap<>();
        params.put("email", "test@example.com");
        params.put("code", "123456");

        AjaxResult result = controller.verifyCode(params);

        assertEquals(200, result.get("code"));
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) result.get("data");
        assertEquals("reset-token", data.get("resetToken"));
    }

    @Test
    void testVerifyCodeEmptyEmail() {
        Map<String, String> params = new HashMap<>();
        params.put("email", "");
        params.put("code", "123456");

        AjaxResult result = controller.verifyCode(params);

        assertEquals(500, result.get("code"));
        assertEquals("邮箱地址不能为空", result.get("msg"));
    }

    @Test
    void testVerifyCodeEmptyCode() {
        Map<String, String> params = new HashMap<>();
        params.put("email", "test@example.com");
        params.put("code", "");

        AjaxResult result = controller.verifyCode(params);

        assertEquals(500, result.get("code"));
        assertEquals("验证码不能为空", result.get("msg"));
    }

    @Test
    void testVerifyCodeWrongCode() {
        doThrow(new ServiceException("验证码错误"))
                .when(passwordService).verifyResetCode("test@example.com", "000000");
        Map<String, String> params = new HashMap<>();
        params.put("email", "test@example.com");
        params.put("code", "000000");

        assertThrows(ServiceException.class, () -> controller.verifyCode(params));
    }

    // ========== reset ==========

    @Test
    void testResetSuccess() {
        doNothing().when(passwordService).resetPassword("test@example.com", "NewPass123", "valid-token");
        Map<String, String> params = new HashMap<>();
        params.put("email", "test@example.com");
        params.put("password", "NewPass123");
        params.put("resetToken", "valid-token");

        AjaxResult result = controller.reset(params);

        assertEquals(200, result.get("code"));
        assertEquals("密码重置成功", result.get("msg"));
    }

    @Test
    void testResetEmptyPassword() {
        Map<String, String> params = new HashMap<>();
        params.put("email", "test@example.com");
        params.put("password", "");
        params.put("resetToken", "token");

        AjaxResult result = controller.reset(params);

        assertEquals(500, result.get("code"));
        assertEquals("新密码不能为空", result.get("msg"));
    }

    @Test
    void testResetEmptyToken() {
        Map<String, String> params = new HashMap<>();
        params.put("email", "test@example.com");
        params.put("password", "NewPass123");
        params.put("resetToken", "");

        AjaxResult result = controller.reset(params);

        assertEquals(500, result.get("code"));
        assertEquals("重置令牌不能为空", result.get("msg"));
    }
}
