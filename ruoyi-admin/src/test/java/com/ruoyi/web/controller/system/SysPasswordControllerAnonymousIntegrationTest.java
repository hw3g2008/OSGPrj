package com.ruoyi.web.controller.system;

import static org.mockito.Mockito.doNothing;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.ruoyi.framework.web.service.SysPasswordService;

/**
 * 匿名密码找回接口集成测试。
 *
 * 目标：验证 sendCode 在完整 Spring Security + AOP 链路下不会因为读取登录态而返回 401。
 */
@SpringBootTest
@AutoConfigureMockMvc
class SysPasswordControllerAnonymousIntegrationTest
{
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SysPasswordService passwordService;

    @Test
    void sendCodeShouldAllowAnonymousRequest() throws Exception
    {
        doNothing().when(passwordService).sendResetCode("test@example.com");

        mockMvc.perform(post("/system/password/sendCode")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"test@example.com\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.msg").value("我们会往您的注册邮箱发送验证码，请查收"));
    }
}
