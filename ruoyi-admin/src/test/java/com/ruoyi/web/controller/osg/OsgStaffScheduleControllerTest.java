package com.ruoyi.web.controller.osg;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import org.springframework.mail.SimpleMailMessage;
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
        when(staffScheduleService.remindAll(anyString())).thenAnswer(invocation -> {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("recipientCount", 1);
            result.put("pendingCount", 1);
            result.put("weekScope", "current");
            result.put("recipients", List.of("diana@example.com"));
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

    @Test
    void remindAllShouldReturnSuccessForSuperAdmin() throws Exception
    {
        mockMvc.perform(post("/admin/schedule/remind-all")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"week\":\"current\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.recipientCount").value(1))
                .andExpect(jsonPath("$.pendingCount").value(1))
                .andExpect(jsonPath("$.weekScope").value("current"));
    }

    @Test
    void exportShouldReturnExcelForSuperAdmin() throws Exception
    {
        mockMvc.perform(get("/admin/schedule/export")
                .header("Authorization", "Bearer super-admin-token")
                .param("week", "current"))
                .andExpect(status().isOk());
    }

    // ==================== NEW TEST METHODS FOR BRANCH COVERAGE ====================

    @Test
    void remindAllShouldHandleNullBody() throws Exception
    {
        when(staffScheduleService.remindAll(any())).thenAnswer(invocation -> {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("recipientCount", 0);
            result.put("pendingCount", 0);
            result.put("weekScope", "current");
            result.put("recipients", List.of());
            return result;
        });

        mockMvc.perform(post("/admin/schedule/remind-all")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.msg").value("当前无可提醒导师"))
                .andExpect(jsonPath("$.recipientCount").value(0));
    }

    @Test
    void remindAllShouldHandleZeroRecipients() throws Exception
    {
        when(staffScheduleService.remindAll(anyString())).thenAnswer(invocation -> {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("recipientCount", 0);
            result.put("pendingCount", 2);
            result.put("weekScope", "current");
            result.put("recipients", List.of());
            return result;
        });

        mockMvc.perform(post("/admin/schedule/remind-all")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"week\":\"current\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.msg").value("当前无可提醒导师"))
                .andExpect(jsonPath("$.pendingCount").value(2));
    }

    @Test
    void remindAllShouldSendEmailsWhenRecipientsExist() throws Exception
    {
        mockMvc.perform(post("/admin/schedule/remind-all")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"week\":\"current\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.msg").value("已提醒 1 位导师"));

        verify(mailSender).send(any(SimpleMailMessage.class));
    }

    @Test
    void remindAllShouldUseWeekScopeFallbackKey() throws Exception
    {
        mockMvc.perform(post("/admin/schedule/remind-all")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"weekScope\":\"current\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void remindAllShouldReturnErrorWhenServiceThrows() throws Exception
    {
        when(staffScheduleService.remindAll(anyString())).thenThrow(new ServiceException("排期服务异常"));

        mockMvc.perform(post("/admin/schedule/remind-all")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"week\":\"current\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("排期服务异常"));
    }

    @Test
    void remindAllShouldThrowWhenMailFromBlank() throws Exception
    {
        when(mailConfig.getFrom()).thenReturn("");

        mockMvc.perform(post("/admin/schedule/remind-all")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"week\":\"current\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("排期提醒邮件发送配置缺失: from"));
    }

    @Test
    void remindAllShouldThrowWhenMailFromNull() throws Exception
    {
        when(mailConfig.getFrom()).thenReturn(null);

        mockMvc.perform(post("/admin/schedule/remind-all")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"week\":\"current\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("排期提醒邮件发送配置缺失: from"));
    }

    @Test
    void remindAllShouldSkipBlankRecipientEmails() throws Exception
    {
        when(staffScheduleService.remindAll(anyString())).thenAnswer(invocation -> {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("recipientCount", 2);
            result.put("pendingCount", 2);
            result.put("weekScope", "current");
            result.put("recipients", List.of("diana@example.com", ""));
            return result;
        });

        mockMvc.perform(post("/admin/schedule/remind-all")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"week\":\"current\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.msg").value("已提醒 2 位导师"));
    }

    @Test
    void remindAllShouldNotBccWhenMailboxEqualsRecipient() throws Exception
    {
        when(mailConfig.getMailbox()).thenReturn("diana@example.com");

        mockMvc.perform(post("/admin/schedule/remind-all")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"week\":\"current\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        verify(mailSender).send(any(SimpleMailMessage.class));
    }

    @Test
    void remindAllShouldNotBccWhenMailboxBlank() throws Exception
    {
        when(mailConfig.getMailbox()).thenReturn("");

        mockMvc.perform(post("/admin/schedule/remind-all")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"week\":\"current\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void remindAllShouldBuildNextWeekReminderBody() throws Exception
    {
        when(staffScheduleService.remindAll(anyString())).thenAnswer(invocation -> {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("recipientCount", 1);
            result.put("pendingCount", 1);
            result.put("weekScope", "next");
            result.put("recipients", List.of("diana@example.com"));
            return result;
        });

        mockMvc.perform(post("/admin/schedule/remind-all")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"week\":\"next\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.weekScope").value("next"));
    }

    @Test
    void exportShouldHandleUnfilledAndCanRemindRows() throws Exception
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("staffId", 8L);
        row.put("staffName", "Tom");
        row.put("staffType", "mentor");
        row.put("availableHours", 0);
        row.put("availableText", "-");
        row.put("filled", false);
        row.put("canRemind", true);
        scheduleRowsRef.set(List.of(row));

        mockMvc.perform(get("/admin/schedule/export")
                .header("Authorization", "Bearer super-admin-token")
                .param("week", "current"))
                .andExpect(status().isOk());
    }

    @Test
    void exportShouldHandleIntegerAvailableHours() throws Exception
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("staffId", 8L);
        row.put("staffName", "Tom");
        row.put("staffType", "mentor");
        row.put("availableHours", 20);
        row.put("availableText", "周一上午");
        row.put("filled", true);
        row.put("canRemind", false);
        scheduleRowsRef.set(List.of(row));

        mockMvc.perform(get("/admin/schedule/export")
                .header("Authorization", "Bearer super-admin-token")
                .param("week", "current"))
                .andExpect(status().isOk());
    }

    @Test
    void exportShouldHandleNullAvailableHours() throws Exception
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("staffId", 8L);
        row.put("staffName", "Tom");
        row.put("staffType", "mentor");
        row.put("availableHours", null);
        row.put("availableText", "-");
        row.put("filled", false);
        row.put("canRemind", false);
        scheduleRowsRef.set(List.of(row));

        mockMvc.perform(get("/admin/schedule/export")
                .header("Authorization", "Bearer super-admin-token")
                .param("week", "current"))
                .andExpect(status().isOk());
    }

    @Test
    void exportShouldHandleStringBooleanValues() throws Exception
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("staffId", 8L);
        row.put("staffName", "Tom");
        row.put("staffType", "mentor");
        row.put("availableHours", new BigDecimal("5.5"));
        row.put("availableText", "-");
        row.put("filled", "true");
        row.put("canRemind", "1");
        scheduleRowsRef.set(List.of(row));

        mockMvc.perform(get("/admin/schedule/export")
                .header("Authorization", "Bearer super-admin-token")
                .param("week", "current"))
                .andExpect(status().isOk());
    }

    @Test
    void exportShouldHandleNumericBooleanValues() throws Exception
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("staffId", 8L);
        row.put("staffName", "Tom");
        row.put("staffType", "mentor");
        row.put("availableHours", new BigDecimal("3"));
        row.put("availableText", "-");
        row.put("filled", 1);
        row.put("canRemind", 0);
        scheduleRowsRef.set(List.of(row));

        mockMvc.perform(get("/admin/schedule/export")
                .header("Authorization", "Bearer super-admin-token")
                .param("week", "current"))
                .andExpect(status().isOk());
    }

    @Test
    void exportShouldHandleNullBooleanValues() throws Exception
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("staffId", 8L);
        row.put("staffName", "Tom");
        row.put("staffType", "mentor");
        row.put("availableHours", new BigDecimal("3"));
        row.put("availableText", "-");
        row.put("filled", null);
        row.put("canRemind", null);
        scheduleRowsRef.set(List.of(row));

        mockMvc.perform(get("/admin/schedule/export")
                .header("Authorization", "Bearer super-admin-token")
                .param("week", "current"))
                .andExpect(status().isOk());
    }

    @Test
    void exportShouldHandleStringStaffId() throws Exception
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("staffId", "8");
        row.put("staffName", "Tom");
        row.put("staffType", "mentor");
        row.put("availableHours", new BigDecimal("3"));
        row.put("availableText", "-");
        row.put("filled", true);
        row.put("canRemind", false);
        scheduleRowsRef.set(List.of(row));

        mockMvc.perform(get("/admin/schedule/export")
                .header("Authorization", "Bearer super-admin-token")
                .param("week", "current"))
                .andExpect(status().isOk());
    }

    @Test
    void exportShouldHandleNonParsableStaffId() throws Exception
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("staffId", "abc");
        row.put("staffName", "Tom");
        row.put("staffType", "mentor");
        row.put("availableHours", new BigDecimal("3"));
        row.put("availableText", "-");
        row.put("filled", true);
        row.put("canRemind", false);
        scheduleRowsRef.set(List.of(row));

        mockMvc.perform(get("/admin/schedule/export")
                .header("Authorization", "Bearer super-admin-token")
                .param("week", "current"))
                .andExpect(status().isOk());
    }

    @Test
    void remindAllShouldHandleRecipientsNotAsList() throws Exception
    {
        when(staffScheduleService.remindAll(anyString())).thenAnswer(invocation -> {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("recipientCount", 0);
            result.put("pendingCount", 0);
            result.put("weekScope", "current");
            result.put("recipients", "not-a-list");
            return result;
        });

        mockMvc.perform(post("/admin/schedule/remind-all")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"week\":\"current\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void remindAllShouldHandleStringRecipientCountAsInteger() throws Exception
    {
        when(staffScheduleService.remindAll(anyString())).thenAnswer(invocation -> {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("recipientCount", "0");
            result.put("pendingCount", "3");
            result.put("weekScope", "current");
            result.put("recipients", List.of());
            return result;
        });

        mockMvc.perform(post("/admin/schedule/remind-all")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"week\":\"current\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.msg").value("当前无可提醒导师"));
    }

    @Test
    void remindAllShouldHandleNonParsableIntegerValues() throws Exception
    {
        when(staffScheduleService.remindAll(anyString())).thenAnswer(invocation -> {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("recipientCount", "abc");
            result.put("pendingCount", null);
            result.put("weekScope", "current");
            result.put("recipients", List.of());
            return result;
        });

        mockMvc.perform(post("/admin/schedule/remind-all")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"week\":\"current\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.msg").value("当前无可提醒导师"));
    }

    @Test
    void exportShouldHandleFalseBooleanString() throws Exception
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("staffId", 8L);
        row.put("staffName", "Tom");
        row.put("staffType", "mentor");
        row.put("availableHours", new BigDecimal("3"));
        row.put("availableText", "-");
        row.put("filled", "false");
        row.put("canRemind", "0");
        scheduleRowsRef.set(List.of(row));

        mockMvc.perform(get("/admin/schedule/export")
                .header("Authorization", "Bearer super-admin-token")
                .param("week", "current"))
                .andExpect(status().isOk());
    }

    @Test
    void listShouldHandleNullWeekParam() throws Exception
    {
        when(staffScheduleService.selectScheduleList(any())).thenAnswer(invocation -> scheduleRowsRef.get());

        mockMvc.perform(get("/admin/schedule/list")
                .header("Authorization", "Bearer super-admin-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
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

    // ==================== ADDITIONAL BRANCH COVERAGE TESTS ====================

    @Test
    void exportShouldHandleNullStaffId() throws Exception
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("staffId", null);
        row.put("staffName", "Tom");
        row.put("staffType", "mentor");
        row.put("availableHours", new BigDecimal("3"));
        row.put("availableText", "-");
        row.put("filled", true);
        row.put("canRemind", false);
        scheduleRowsRef.set(List.of(row));

        mockMvc.perform(get("/admin/schedule/export")
                .header("Authorization", "Bearer super-admin-token")
                .param("week", "current"))
                .andExpect(status().isOk());
    }

    @Test
    void exportShouldHandleEmptyStringStaffName() throws Exception
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("staffId", 8L);
        row.put("staffName", "");
        row.put("staffType", "mentor");
        row.put("availableHours", new BigDecimal("3"));
        row.put("availableText", "");
        row.put("filled", true);
        row.put("canRemind", false);
        scheduleRowsRef.set(List.of(row));

        mockMvc.perform(get("/admin/schedule/export")
                .header("Authorization", "Bearer super-admin-token")
                .param("week", "current"))
                .andExpect(status().isOk());
    }

    @Test
    void remindAllShouldHandleEmptyRecipientsListWithPositiveCount() throws Exception
    {
        when(staffScheduleService.remindAll(anyString())).thenAnswer(invocation -> {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("recipientCount", 1);
            result.put("pendingCount", 1);
            result.put("weekScope", "current");
            result.put("recipients", List.of());
            return result;
        });

        mockMvc.perform(post("/admin/schedule/remind-all")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"week\":\"current\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.msg").value("已提醒 1 位导师"));
    }

    @Test
    void remindAllShouldHandleNullRecipientsWithPositiveCount() throws Exception
    {
        when(staffScheduleService.remindAll(anyString())).thenAnswer(invocation -> {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("recipientCount", 1);
            result.put("pendingCount", 1);
            result.put("weekScope", "current");
            result.put("recipients", null);
            return result;
        });

        mockMvc.perform(post("/admin/schedule/remind-all")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"week\":\"current\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void exportShouldHandleBlankStringStaffId() throws Exception
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("staffId", "  ");
        row.put("staffName", "Tom");
        row.put("staffType", "mentor");
        row.put("availableHours", new BigDecimal("3"));
        row.put("availableText", "-");
        row.put("filled", true);
        row.put("canRemind", false);
        scheduleRowsRef.set(List.of(row));

        mockMvc.perform(get("/admin/schedule/export")
                .header("Authorization", "Bearer super-admin-token")
                .param("week", "current"))
                .andExpect(status().isOk());
    }

    @Test
    void remindAllShouldHandleNullRecipientCountValue() throws Exception
    {
        when(staffScheduleService.remindAll(anyString())).thenAnswer(invocation -> {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("recipientCount", null);
            result.put("pendingCount", null);
            result.put("weekScope", "current");
            result.put("recipients", List.of());
            return result;
        });

        mockMvc.perform(post("/admin/schedule/remind-all")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"week\":\"current\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.msg").value("当前无可提醒导师"));
    }
}
