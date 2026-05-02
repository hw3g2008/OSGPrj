package com.ruoyi.web.controller.osg;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import jakarta.servlet.http.HttpServletRequest;

import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.core.redis.RedisCache;
import com.ruoyi.framework.config.SecurityConfig;
import com.ruoyi.framework.config.properties.PermitAllUrlProperties;
import com.ruoyi.framework.security.filter.JwtAuthenticationTokenFilter;
import com.ruoyi.framework.security.handle.AuthenticationEntryPointImpl;
import com.ruoyi.framework.security.handle.LogoutSuccessHandlerImpl;
import com.ruoyi.framework.web.service.PermissionService;
import com.ruoyi.framework.web.service.TokenService;
import com.ruoyi.system.service.IOsgAssistantPositionVisibilityService;
import com.ruoyi.system.service.impl.OsgAssistantAccessService;
import com.ruoyi.system.service.impl.OsgPositionServiceImpl;

@WebMvcTest(controllers = OsgAssistantPositionController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
    SecurityConfig.class,
    PermissionService.class,
    AuthenticationEntryPointImpl.class,
    LogoutSuccessHandlerImpl.class,
    JwtAuthenticationTokenFilter.class,
    PermitAllUrlProperties.class
})
class OsgAssistantPositionControllerTest
{
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OsgPositionServiceImpl positionService;

    @MockBean
    private OsgAssistantAccessService assistantAccessService;

    @MockBean
    private IOsgAssistantPositionVisibilityService assistantVisibilityService;

    @MockBean
    private TokenService tokenService;

    @MockBean
    private RedisCache redisCache;

    @BeforeEach
    void setUp()
    {
        when(tokenService.getLoginUser(any())).thenAnswer(invocation -> {
            HttpServletRequest request = invocation.getArgument(0);
            String authorization = request.getHeader("Authorization");
            if ("Bearer assistant-token".equals(authorization))
            {
                return buildLoginUser(820L);
            }
            if ("Bearer outsider-token".equals(authorization))
            {
                return buildLoginUser(821L);
            }
            return null;
        });

        when(assistantAccessService.hasAssistantAccess(any())).thenAnswer(invocation -> {
            SysUser user = invocation.getArgument(0);
            return user != null && Long.valueOf(820L).equals(user.getUserId());
        });
    }

    @Test
    void listShouldDelegateToVisibilityServiceWithCurrentUserId() throws Exception
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("positionId", 501L);
        row.put("companyName", "Goldman Sachs");
        row.put("targetMajors", "finance,tech");
        row.put("myStudentCount", 3);
        when(assistantVisibilityService.listForAssistant(820L)).thenReturn(List.of(row));

        mockMvc.perform(get("/assistant/positions/list")
                .header("Authorization", "Bearer assistant-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.length()").value(1))
            .andExpect(jsonPath("$.data[0].positionId").value(501))
            .andExpect(jsonPath("$.data[0].targetMajors").value("finance,tech"))
            .andExpect(jsonPath("$.data[0].myStudentCount").value(3));

        verify(assistantVisibilityService).listForAssistant(eq(820L));
    }

    @Test
    void listShouldRejectUsersWithoutAssistantAccess() throws Exception
    {
        mockMvc.perform(get("/assistant/positions/list")
                .header("Authorization", "Bearer outsider-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(403))
            .andExpect(jsonPath("$.msg").value("该账号无助教端访问权限"));
    }

    @Test
    void existingDrillDownEndpointStillWorks() throws Exception
    {
        when(positionService.selectPositionDrillDown(any())).thenReturn(List.of());

        mockMvc.perform(get("/assistant/positions/drill-down")
                .header("Authorization", "Bearer assistant-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200));
    }

    private LoginUser buildLoginUser(Long userId)
    {
        SysUser user = new SysUser();
        user.setUserId(userId);
        user.setUserName("assistant_user_" + userId);
        user.setRoles(List.of());
        return new LoginUser(user.getUserId(), 1L, user, Set.of());
    }
}
