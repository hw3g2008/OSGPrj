package com.ruoyi.web.controller.system;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.framework.web.service.SysPasswordService;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * SysPasswordController 单元测试 (T-022)
 */
@ExtendWith(MockitoExtension.class)
class SysPasswordControllerTest {

    @InjectMocks
    private SysPasswordController sysPasswordController;

    @Mock
    private SysPasswordService passwordService;

    // ========== sendCode 测试 ==========

    @Test
    void testSendCodeSuccess() {
        doNothing().when(passwordService).sendResetCode("test@example.com");

        Map<String, String> params = new HashMap<>();
        params.put("email", "test@example.com");

        AjaxResult result = sysPasswordController.sendCode(params);

        assertEquals(200, result.get("code"));
        verify(passwordService).sendResetCode("test@example.com");
    }

    @Test
    void testSendCodeEmptyEmail() {
        Map<String, String> params = new HashMap<>();
        params.put("email", "");

        AjaxResult result = sysPasswordController.sendCode(params);

        assertEquals(500, result.get("code"));
        assertEquals("邮箱地址不能为空", result.get("msg"));
        verify(passwordService, never()).sendResetCode(anyString());
    }

    @Test
    void testSendCodeNullEmail() {
        Map<String, String> params = new HashMap<>();

        AjaxResult result = sysPasswordController.sendCode(params);

        assertEquals(500, result.get("code"));
        verify(passwordService, never()).sendResetCode(anyString());
    }

    @Test
    void testSendCodeUnregisteredEmail() {
        doThrow(new ServiceException("该邮箱未注册"))
                .when(passwordService).sendResetCode("unknown@example.com");

        Map<String, String> params = new HashMap<>();
        params.put("email", "unknown@example.com");

        assertThrows(ServiceException.class, () -> sysPasswordController.sendCode(params));
    }

    // ========== verify 测试 ==========

    @Test
    void testVerifyCodeSuccess() {
        when(passwordService.verifyResetCode("test@example.com", "123456"))
                .thenReturn("reset-token-uuid");

        Map<String, String> params = new HashMap<>();
        params.put("email", "test@example.com");
        params.put("code", "123456");

        AjaxResult result = sysPasswordController.verify(params);

        assertEquals(200, result.get("code"));
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) result.get("data");
        assertEquals("reset-token-uuid", data.get("resetToken"));
    }

    @Test
    void testVerifyCodeEmptyEmail() {
        Map<String, String> params = new HashMap<>();
        params.put("email", "");
        params.put("code", "123456");

        AjaxResult result = sysPasswordController.verify(params);

        assertEquals(500, result.get("code"));
        assertEquals("邮箱地址不能为空", result.get("msg"));
    }

    @Test
    void testVerifyCodeEmptyCode() {
        Map<String, String> params = new HashMap<>();
        params.put("email", "test@example.com");
        params.put("code", "");

        AjaxResult result = sysPasswordController.verify(params);

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

        assertThrows(ServiceException.class, () -> sysPasswordController.verify(params));
    }

    // ========== reset 测试 ==========

    @Test
    void testResetPasswordSuccess() {
        doNothing().when(passwordService).resetPassword("test@example.com", "NewPass123", "valid-token");

        Map<String, String> params = new HashMap<>();
        params.put("email", "test@example.com");
        params.put("password", "NewPass123");
        params.put("resetToken", "valid-token");

        AjaxResult result = sysPasswordController.reset(params);

        assertEquals(200, result.get("code"));
        verify(passwordService).resetPassword("test@example.com", "NewPass123", "valid-token");
    }

    @Test
    void testResetPasswordEmptyEmail() {
        Map<String, String> params = new HashMap<>();
        params.put("email", "");
        params.put("password", "NewPass123");
        params.put("resetToken", "valid-token");

        AjaxResult result = sysPasswordController.reset(params);

        assertEquals(500, result.get("code"));
        assertEquals("邮箱地址不能为空", result.get("msg"));
    }

    @Test
    void testResetPasswordEmptyPassword() {
        Map<String, String> params = new HashMap<>();
        params.put("email", "test@example.com");
        params.put("password", "");
        params.put("resetToken", "valid-token");

        AjaxResult result = sysPasswordController.reset(params);

        assertEquals(500, result.get("code"));
        assertEquals("新密码不能为空", result.get("msg"));
    }

    @Test
    void testResetPasswordEmptyToken() {
        Map<String, String> params = new HashMap<>();
        params.put("email", "test@example.com");
        params.put("password", "NewPass123");
        params.put("resetToken", "");

        AjaxResult result = sysPasswordController.reset(params);

        assertEquals(500, result.get("code"));
        assertEquals("重置令牌不能为空", result.get("msg"));
    }

    @Test
    void testResetPasswordInvalidToken() {
        doThrow(new ServiceException("重置令牌无效或已过期"))
                .when(passwordService).resetPassword("test@example.com", "NewPass123", "invalid-token");

        Map<String, String> params = new HashMap<>();
        params.put("email", "test@example.com");
        params.put("password", "NewPass123");
        params.put("resetToken", "invalid-token");

        assertThrows(ServiceException.class, () -> sysPasswordController.reset(params));
    }

    @Test
    void testResetPasswordWeakPassword() {
        doThrow(new ServiceException("密码需包含字母"))
                .when(passwordService).resetPassword("test@example.com", "12345678", "valid-token");

        Map<String, String> params = new HashMap<>();
        params.put("email", "test@example.com");
        params.put("password", "12345678");
        params.put("resetToken", "valid-token");

        assertThrows(ServiceException.class, () -> sysPasswordController.reset(params));
    }
}
