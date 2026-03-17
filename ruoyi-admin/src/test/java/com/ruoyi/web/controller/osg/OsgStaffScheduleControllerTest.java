package com.ruoyi.web.controller.osg;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.web.servlet.MockMvc;
import jakarta.servlet.http.HttpServletRequest;
import com.ruoyi.common.core.domain.entity.SysRole;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.core.redis.RedisCache;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.framework.config.PasswordResetMailConfig;
import com.ruoyi.framework.config.SecurityConfig;
import com.ruoyi.framework.config.properties.PermitAllUrlProperties;
import com.ruoyi.framework.security.filter.JwtAuthenticationTokenFilter;
import com.ruoyi.framework.security.handle.AuthenticationEntryPointImpl;
import com.ruoyi.framework.security.handle.LogoutSuccessHandlerImpl;
import com.ruoyi.framework.web.service.PermissionService;
import com.ruoyi.framework.web.service.TokenService;
import com.ruoyi.system.service.IOsgStaffScheduleService;

@WebMvcTest(controllers = OsgStaffScheduleController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
    SecurityConfig.class,
    PermissionService.class,
    AuthenticationEntryPointImpl.class,
    LogoutSuccessHandlerImpl.class,
    JwtAuthenticationTokenFilter.class,
    PermitAllUrlProperties.class
})
class OsgStaffScheduleControllerTest
{
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private IOsgStaffScheduleService staffScheduleService;

    @MockBean
    private TokenService tokenService;

    @MockBean
    private RedisCache redisCache;

    @MockBean
    private JavaMailSender mailSender;

    @MockBean
    private PasswordResetMailConfig mailConfig;

    private final AtomicReference<List<Map<String, Object>>> scheduleRowsRef = new AtomicReference<>();

    @BeforeEach
    void setUp()
    {
        scheduleRowsRef.set(List.of(buildScheduleRow(new BigDecimal("10"), List.of("1-morning", "3-evening"))));

        when(tokenService.getLoginUser(any())).thenAnswer(invocation -> {
            HttpServletRequest request = invocation.getArgument(0);
            String authorization = request.getHeader("Authorization");
            if ("Bearer super-admin-token".equals(authorization))
            {
                return buildLoginUser("super_admin", "super_admin");
            }
            if ("Bearer clerk-token".equals(authorization))
            {
                return buildLoginUser("clerk", "clerk");
            }
            return null;
        });

        when(mailConfig.getFrom()).thenReturn("noreply@example.com");
        when(mailConfig.getMailbox()).thenReturn("audit@example.com");

        when(staffScheduleService.selectScheduleList(anyString())).thenAnswer(invocation -> scheduleRowsRef.get());
        when(staffScheduleService.saveSchedule(anyMap(), anyString(), anyLong())).thenAnswer(invocation -> {
            Map<String, Object> payload = invocation.getArgument(0);
            String reason = asText(payload.get("reason"));
            if (reason == null || reason.isBlank())
            {
                throw new ServiceException("调整原因不能为空");
            }

            BigDecimal availableHours = new BigDecimal(String.valueOf(payload.get("availableHours")));
            @SuppressWarnings("unchecked")
            List<String> selectedSlotKeys = (List<String>) payload.get("selectedSlotKeys");
            scheduleRowsRef.set(List.of(buildScheduleRow(availableHours, selectedSlotKeys)));

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("staffId", 7L);
            result.put("weekScope", payload.get("week"));
            result.put("selectedSlotCount", selectedSlotKeys.size());
            return result;
        });
    }

    @Test
    void listShouldReturnScheduleRowsForSuperAdmin() throws Exception
    {
        mockMvc.perform(get("/admin/schedule/list")
                .header("Authorization", "Bearer super-admin-token")
                .param("week", "current"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.rows[0].staffId").value(7))
                .andExpect(jsonPath("$.rows[0].staffName").value("Diana"))
                .andExpect(jsonPath("$.rows[0].filled").value(true))
                .andExpect(jsonPath("$.rows[0].availableHours").value(10))
                .andExpect(jsonPath("$.rows[0].availableSlotLabels[0]").value("周一: 上午"));
    }

    @Test
    void editShouldRejectMissingReason() throws Exception
    {
        mockMvc.perform(put("/admin/schedule/edit")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "staffId": 7,
                      "week": "current",
                      "availableHours": 12,
                      "notifyStaff": true,
                      "selectedSlotKeys": ["1-morning", "2-evening"]
                    }
                    """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("调整原因不能为空"));
    }

    @Test
    void editShouldAffectSubsequentListQuery() throws Exception
    {
        mockMvc.perform(put("/admin/schedule/edit")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "staffId": 7,
                      "week": "current",
                      "availableHours": 15,
                      "reason": "导师请假后重排",
                      "notifyStaff": true,
                      "selectedSlotKeys": ["1-morning", "1-evening", "4-afternoon"]
                    }
                    """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.staffId").value(7))
                .andExpect(jsonPath("$.data.selectedSlotCount").value(3));

        mockMvc.perform(get("/admin/schedule/list")
                .header("Authorization", "Bearer super-admin-token")
                .param("week", "current"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].availableHours").value(15))
                .andExpect(jsonPath("$.rows[0].selectedSlotKeys[2]").value("4-afternoon"))
                .andExpect(jsonPath("$.rows[0].availableSlotLabels[1]").value("周一: 晚上"));
    }

    @Test
    void listShouldReturnForbiddenForClerkRole() throws Exception
    {
        mockMvc.perform(get("/admin/schedule/list")
                .header("Authorization", "Bearer clerk-token")
                .param("week", "current"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(403))
                .andExpect(jsonPath("$.msg").value("没有权限，请联系管理员授权"));
    }

    private LoginUser buildLoginUser(String roleKey, String username)
    {
        SysRole role = new SysRole();
        role.setRoleKey(roleKey);
        role.setRoleName(roleKey);

        SysUser user = new SysUser();
        user.setUserId(7L);
        user.setUserName(username);
        user.setPassword("password");
        user.setRoles(List.of(role));

        return new LoginUser(7L, 1L, user, OsgTestPermissions.permissionsForRole(roleKey));
    }

    private Map<String, Object> buildScheduleRow(BigDecimal availableHours, List<String> selectedSlotKeys)
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("staffId", 7L);
        row.put("staffName", "Diana");
        row.put("email", "diana@example.com");
        row.put("staffType", "lead_mentor");
        row.put("majorDirection", "金融");
        row.put("weekScope", "current");
        row.put("filled", true);
        row.put("availableHours", availableHours);
        row.put("availableText", "周一: 上午 / 周三: 晚上");
        row.put("selectedSlotKeys", selectedSlotKeys);
        row.put("availableSlotLabels", selectedSlotKeys.stream().map(this::toSlotLabel).toList());
        row.put("canRemind", false);
        return row;
    }

    private String toSlotLabel(String key)
    {
        String[] parts = key.split("-");
        String weekday = switch (parts[0])
        {
            case "1" -> "周一";
            case "2" -> "周二";
            case "3" -> "周三";
            case "4" -> "周四";
            case "5" -> "周五";
            case "6" -> "周六";
            case "7" -> "周日";
            default -> "周?";
        };
        String timeSlot = switch (parts[1])
        {
            case "morning" -> "上午";
            case "afternoon" -> "下午";
            case "evening" -> "晚上";
            default -> parts[1];
        };
        return weekday + ": " + timeSlot;
    }

    private String asText(Object value)
    {
        if (value == null)
        {
            return null;
        }
        return String.valueOf(value).trim();
    }
}
