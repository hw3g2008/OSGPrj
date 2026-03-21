package com.ruoyi.web.controller.osg;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.ruoyi.common.core.redis.RedisCache;
import com.ruoyi.framework.config.SecurityConfig;
import com.ruoyi.framework.config.properties.PermitAllUrlProperties;
import com.ruoyi.framework.security.filter.JwtAuthenticationTokenFilter;
import com.ruoyi.framework.security.handle.AuthenticationEntryPointImpl;
import com.ruoyi.framework.security.handle.LogoutSuccessHandlerImpl;
import com.ruoyi.framework.web.service.SysPasswordService;
import com.ruoyi.framework.web.service.TokenService;
import com.ruoyi.web.controller.system.SysPasswordController;

@WebMvcTest(controllers = SysPasswordController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
        SecurityConfig.class,
        AuthenticationEntryPointImpl.class,
        LogoutSuccessHandlerImpl.class,
        JwtAuthenticationTokenFilter.class,
        PermitAllUrlProperties.class
})
class OsgLeadMentorPasswordAnonymousIntegrationTest
{
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SysPasswordService passwordService;

    @MockBean
    private TokenService tokenService;

    @MockBean
    private RedisCache redisCache;

    @BeforeEach
    void setUp()
    {
        when(tokenService.getLoginUser(any())).thenReturn(null);
    }

    @Test
    void sendCodeShouldAllowAnonymousRequestForLeadMentorRoute() throws Exception
    {
        doNothing().when(passwordService).sendResetCode("leadmentor@example.com");

        mockMvc.perform(post("/system/password/sendCode")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"leadmentor@example.com\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.msg").value("我们会往您的注册邮箱发送验证码，请查收"));
    }

    @Test
    void verifyShouldAllowAnonymousRequestForLeadMentorRoute() throws Exception
    {
        when(passwordService.verifyResetCode("leadmentor@example.com", "123456")).thenReturn("reset-token");

        mockMvc.perform(post("/system/password/verify")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"leadmentor@example.com\",\"code\":\"123456\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.resetToken").value("reset-token"));
    }

    @Test
    void resetShouldAllowAnonymousRequestForLeadMentorRoute() throws Exception
    {
        doNothing().when(passwordService).resetPassword("leadmentor@example.com", "LeadMentor123", "reset-token");

        mockMvc.perform(post("/system/password/reset")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"leadmentor@example.com\",\"password\":\"LeadMentor123\",\"resetToken\":\"reset-token\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.msg").value("密码重置成功"));
    }
}
