package com.ruoyi.web.controller.osg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
import com.ruoyi.web.controller.system.SysPasswordController;

@ExtendWith(MockitoExtension.class)
class OsgLeadMentorPasswordContractTest
{
    @InjectMocks
    private SysPasswordController controller;

    @Mock
    private SysPasswordService passwordService;

    @Test
    void sendCodeReturnsSharedAcknowledgementForLeadMentorFlow()
    {
        doNothing().when(passwordService).sendResetCode("leadmentor@example.com");
        Map<String, String> params = new HashMap<>();
        params.put("email", "leadmentor@example.com");

        AjaxResult result = controller.sendCode(params);

        assertEquals(200, result.get("code"));
        assertEquals("我们会往您的注册邮箱发送验证码，请查收", result.get("msg"));
        verify(passwordService).sendResetCode("leadmentor@example.com");
    }

    @Test
    void verifyReturnsResetTokenForLeadMentorFlow()
    {
        when(passwordService.verifyResetCode("leadmentor@example.com", "123456")).thenReturn("reset-token");
        Map<String, String> params = new HashMap<>();
        params.put("email", "leadmentor@example.com");
        params.put("code", "123456");

        AjaxResult result = controller.verify(params);

        assertEquals(200, result.get("code"));
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) result.get("data");
        assertEquals("reset-token", data.get("resetToken"));
    }

    @Test
    void resetReturnsSuccessMessageForLeadMentorFlow()
    {
        doNothing().when(passwordService).resetPassword("leadmentor@example.com", "LeadMentor123", "reset-token");
        Map<String, String> params = new HashMap<>();
        params.put("email", "leadmentor@example.com");
        params.put("password", "LeadMentor123");
        params.put("resetToken", "reset-token");

        AjaxResult result = controller.reset(params);

        assertEquals(200, result.get("code"));
        assertEquals("密码重置成功", result.get("msg"));
        verify(passwordService).resetPassword("leadmentor@example.com", "LeadMentor123", "reset-token");
    }

    @Test
    void verifyRejectsBlankCode()
    {
        Map<String, String> params = new HashMap<>();
        params.put("email", "leadmentor@example.com");
        params.put("code", "");

        AjaxResult result = controller.verify(params);

        assertEquals(500, result.get("code"));
        assertEquals("验证码不能为空", result.get("msg"));
        verify(passwordService, never()).verifyResetCode(anyString(), anyString());
    }

    @Test
    void verifyPropagatesServiceErrors()
    {
        when(passwordService.verifyResetCode("leadmentor@example.com", "000000"))
                .thenThrow(new ServiceException("验证码错误"));
        Map<String, String> params = new HashMap<>();
        params.put("email", "leadmentor@example.com");
        params.put("code", "000000");

        assertThrows(ServiceException.class, () -> controller.verify(params));
    }
}
