package com.ruoyi.web.controller.osg;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

import jakarta.servlet.http.HttpServletRequest;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

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
import com.ruoyi.system.domain.OsgStaff;
import com.ruoyi.system.domain.OsgStaffSchedule;
import com.ruoyi.system.mapper.OsgStaffMapper;
import com.ruoyi.system.mapper.OsgStaffScheduleMapper;
import com.ruoyi.system.service.impl.OsgLeadMentorAccessService;
import com.ruoyi.system.service.impl.OsgLeadMentorScheduleService;

@WebMvcTest(controllers = OsgLeadMentorScheduleController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
    SecurityConfig.class,
    PermissionService.class,
    AuthenticationEntryPointImpl.class,
    LogoutSuccessHandlerImpl.class,
    JwtAuthenticationTokenFilter.class,
    PermitAllUrlProperties.class,
    OsgLeadMentorScheduleService.class
})
class OsgLeadMentorScheduleControllerTest
{
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OsgStaffMapper staffMapper;

    @MockBean
    private OsgStaffScheduleMapper staffScheduleMapper;

    @MockBean
    private JdbcTemplate jdbcTemplate;

    @MockBean
    private OsgLeadMentorAccessService leadMentorAccessService;

    @MockBean
    private TokenService tokenService;

    @MockBean
    private RedisCache redisCache;

    private final AtomicReference<List<OsgStaffSchedule>> scheduleRowsRef = new AtomicReference<>();
    private final AtomicLong scheduleIdSequence = new AtomicLong(5000L);

    @BeforeEach
    void setUp()
    {
        scheduleRowsRef.set(new ArrayList<>(List.of(
            buildSchedule(810L, "current", 1, "morning", true, "12", "本周固定排期"),
            buildSchedule(810L, "current", 3, "evening", true, "12", "本周固定排期"),
            buildSchedule(810L, "current", 3, "afternoon", true, "12", "本周固定排期")
        )));
        scheduleIdSequence.set(5000L);

        org.mockito.Mockito.when(tokenService.getLoginUser(any())).thenAnswer(invocation -> {
            HttpServletRequest request = invocation.getArgument(0);
            String authorization = request.getHeader("Authorization");
            if ("Bearer lead-mentor-token".equals(authorization))
            {
                return buildLoginUser(810L, "lead_mentor_user", "lead@example.com");
            }
            if ("Bearer outsider-token".equals(authorization))
            {
                return buildLoginUser(812L, "outsider_user", "outsider@example.com");
            }
            return null;
        });

        org.mockito.Mockito.when(leadMentorAccessService.hasLeadMentorAccess(any())).thenAnswer(invocation -> {
            SysUser user = invocation.getArgument(0);
            return user != null && Long.valueOf(810L).equals(user.getUserId());
        });

        org.mockito.Mockito.when(jdbcTemplate.queryForObject(any(String.class), org.mockito.ArgumentMatchers.eq(Long.class), any()))
            .thenAnswer(invocation -> {
                Object email = invocation.getArgument(2);
                if ("lead@example.com".equals(email))
                {
                    return 810L;
                }
                return null;
            });

        org.mockito.Mockito.when(staffMapper.selectStaffByStaffId(810L)).thenReturn(buildStaff(810L, "Test Lead Mentor", "lead@example.com"));

        org.mockito.Mockito.when(staffScheduleMapper.selectStaffScheduleList(anyLong(), anyString())).thenAnswer(invocation -> {
            Long staffId = invocation.getArgument(0);
            String weekScope = invocation.getArgument(1);
            return scheduleRowsRef.get().stream()
                .filter(row -> row.getStaffId().equals(staffId))
                .filter(row -> row.getWeekScope().equals(weekScope))
                .sorted(Comparator.comparing(OsgStaffSchedule::getWeekday)
                    .thenComparing(row -> slotOrder(row.getTimeSlot())))
                .map(this::cloneSchedule)
                .toList();
        });

        org.mockito.Mockito.when(staffScheduleMapper.upsertSchedule(any(OsgStaffSchedule.class))).thenAnswer(invocation -> {
            OsgStaffSchedule schedule = cloneSchedule(invocation.getArgument(0));
            if (schedule.getScheduleId() == null)
            {
                schedule.setScheduleId(scheduleIdSequence.incrementAndGet());
            }
            List<OsgStaffSchedule> updated = new ArrayList<>(scheduleRowsRef.get());
            updated.removeIf(existing ->
                existing.getStaffId().equals(schedule.getStaffId())
                    && existing.getWeekScope().equals(schedule.getWeekScope())
                    && existing.getWeekday().equals(schedule.getWeekday())
                    && existing.getTimeSlot().equals(schedule.getTimeSlot()));
            updated.add(schedule);
            scheduleRowsRef.set(updated);
            return 1;
        });

        org.mockito.Mockito.when(staffScheduleMapper.batchUpsertSchedules(anyList())).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            List<OsgStaffSchedule> schedules = (List<OsgStaffSchedule>) invocation.getArgument(0);
            List<OsgStaffSchedule> updated = new ArrayList<>(scheduleRowsRef.get());
            for (OsgStaffSchedule rawSchedule : schedules)
            {
                OsgStaffSchedule schedule = cloneSchedule(rawSchedule);
                if (schedule.getScheduleId() == null)
                {
                    schedule.setScheduleId(scheduleIdSequence.incrementAndGet());
                }
                updated.removeIf(existing ->
                    existing.getStaffId().equals(schedule.getStaffId())
                        && existing.getWeekScope().equals(schedule.getWeekScope())
                        && existing.getWeekday().equals(schedule.getWeekday())
                        && existing.getTimeSlot().equals(schedule.getTimeSlot()));
                updated.add(schedule);
            }
            scheduleRowsRef.set(updated);
            return schedules.size();
        });
    }

    @Test
    void scheduleShouldReturnCurrentWeekAsReadonlyOwnScopeView() throws Exception
    {
        mockMvc.perform(get("/lead-mentor/schedule")
                .header("Authorization", "Bearer lead-mentor-token")
                .param("weekScope", "current"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.staffId").value(810))
            .andExpect(jsonPath("$.data.weekScope").value("current"))
            .andExpect(jsonPath("$.data.readonly").value(true))
            .andExpect(jsonPath("$.data.filled").value(true))
            .andExpect(jsonPath("$.data.availableHours").value(12))
            .andExpect(jsonPath("$.data.availableDayCount").value(2))
            .andExpect(jsonPath("$.data.selectedSlotKeys[0]").value("1-morning"))
            .andExpect(jsonPath("$.data.selectedSlotKeys[2]").value("3-evening"))
            .andExpect(jsonPath("$.data.note").value("本周固定排期"));
    }

    @Test
    void statusShouldFlagForceScheduleWhenNextWeekIsMissing() throws Exception
    {
        mockMvc.perform(get("/lead-mentor/schedule/status")
                .header("Authorization", "Bearer lead-mentor-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.staffId").value(810))
            .andExpect(jsonPath("$.data.forceScheduleModal").value(true))
            .andExpect(jsonPath("$.data.nextWeekFilled").value(false))
            .andExpect(jsonPath("$.data.scheduleStatus").value("待填写"))
            .andExpect(jsonPath("$.data.currentWeek.availableHours").value(12))
            .andExpect(jsonPath("$.data.nextWeek.filled").value(false));
    }

    @Test
    void saveNextShouldPersistOwnScheduleAndReflectOnSubsequentReads() throws Exception
    {
        mockMvc.perform(put("/lead-mentor/schedule/next")
                .header("Authorization", "Bearer lead-mentor-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "availableHours": 15,
                      "selectedSlotKeys": ["1-morning", "4-afternoon", "4-evening"],
                      "note": "周四全天可排课"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.staffId").value(810))
            .andExpect(jsonPath("$.data.weekScope").value("next"))
            .andExpect(jsonPath("$.data.selectedSlotCount").value(3))
            .andExpect(jsonPath("$.data.selectedSlotKeys[2]").value("4-evening"))
            .andExpect(jsonPath("$.data.note").value("周四全天可排课"));

        mockMvc.perform(get("/lead-mentor/schedule")
                .header("Authorization", "Bearer lead-mentor-token")
                .param("weekScope", "next"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.filled").value(true))
            .andExpect(jsonPath("$.data.availableHours").value(15))
            .andExpect(jsonPath("$.data.availableDayCount").value(2))
            .andExpect(jsonPath("$.data.selectedSlotKeys[1]").value("4-afternoon"))
            .andExpect(jsonPath("$.data.note").value("周四全天可排课"));

        mockMvc.perform(get("/lead-mentor/schedule/status")
                .header("Authorization", "Bearer lead-mentor-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.forceScheduleModal").value(false))
            .andExpect(jsonPath("$.data.nextWeekFilled").value(true))
            .andExpect(jsonPath("$.data.scheduleStatus").value("已提交"));
    }

    @Test
    void saveNextShouldRejectCrossStaffPayload() throws Exception
    {
        mockMvc.perform(put("/lead-mentor/schedule/next")
                .header("Authorization", "Bearer lead-mentor-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "staffId": 999,
                      "availableHours": 12,
                      "selectedSlotKeys": ["1-morning"]
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(403))
            .andExpect(jsonPath("$.msg").value("仅允许提交本人下周排期"));
    }

    @Test
    void saveNextShouldRejectInvalidSchedulePayload() throws Exception
    {
        mockMvc.perform(put("/lead-mentor/schedule/next")
                .header("Authorization", "Bearer lead-mentor-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "availableHours": 0,
                      "selectedSlotKeys": []
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(400))
            .andExpect(jsonPath("$.msg").value("下周可上课时长必须大于0"));
    }

    @Test
    void scheduleEndpointsShouldRejectUsersWithoutLeadMentorAccess() throws Exception
    {
        mockMvc.perform(get("/lead-mentor/schedule")
                .header("Authorization", "Bearer outsider-token")
                .param("weekScope", "current"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(403))
            .andExpect(jsonPath("$.msg").value("该账号无班主任端访问权限"));

        mockMvc.perform(put("/lead-mentor/schedule/next")
                .header("Authorization", "Bearer outsider-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "availableHours": 12,
                      "selectedSlotKeys": ["1-morning"]
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(403))
            .andExpect(jsonPath("$.msg").value("该账号无班主任端访问权限"));

        verifyNoInteractions(staffMapper, staffScheduleMapper);
    }

    private LoginUser buildLoginUser(Long userId, String username, String email)
    {
        SysUser user = new SysUser();
        user.setUserId(userId);
        user.setUserName(username);
        user.setNickName("Lead Mentor");
        user.setEmail(email);
        user.setStatus("0");
        user.setDelFlag("0");

        LoginUser loginUser = new LoginUser(userId, null, user, Set.of());
        loginUser.setUser(user);
        return loginUser;
    }

    private OsgStaff buildStaff(Long staffId, String staffName, String email)
    {
        OsgStaff staff = new OsgStaff();
        staff.setStaffId(staffId);
        staff.setStaffName(staffName);
        staff.setEmail(email);
        staff.setStaffType("lead_mentor");
        return staff;
    }

    private OsgStaffSchedule buildSchedule(Long staffId, String weekScope, int weekday, String timeSlot, boolean available,
                                           String availableHours, String note)
    {
        OsgStaffSchedule schedule = new OsgStaffSchedule();
        schedule.setScheduleId(scheduleIdSequence.incrementAndGet());
        schedule.setStaffId(staffId);
        schedule.setWeekScope(weekScope);
        schedule.setWeekday(weekday);
        schedule.setTimeSlot(timeSlot);
        schedule.setIsAvailable(available ? 1 : 0);
        schedule.setAvailableHours(new BigDecimal(availableHours));
        schedule.setAdjustReason("班主任自主更新排期");
        schedule.setRemark(note);
        schedule.setNotifyStaff(0);
        schedule.setOperatorId(staffId);
        schedule.setCreateBy("tester");
        schedule.setUpdateBy("tester");
        return schedule;
    }

    private OsgStaffSchedule cloneSchedule(OsgStaffSchedule schedule)
    {
        OsgStaffSchedule clone = new OsgStaffSchedule();
        clone.setScheduleId(schedule.getScheduleId());
        clone.setStaffId(schedule.getStaffId());
        clone.setWeekScope(schedule.getWeekScope());
        clone.setWeekday(schedule.getWeekday());
        clone.setTimeSlot(schedule.getTimeSlot());
        clone.setIsAvailable(schedule.getIsAvailable());
        clone.setAvailableHours(schedule.getAvailableHours());
        clone.setAdjustReason(schedule.getAdjustReason());
        clone.setRemark(schedule.getRemark());
        clone.setNotifyStaff(schedule.getNotifyStaff());
        clone.setOperatorId(schedule.getOperatorId());
        clone.setCreateBy(schedule.getCreateBy());
        clone.setUpdateBy(schedule.getUpdateBy());
        return clone;
    }

    private int slotOrder(String timeSlot)
    {
        return switch (timeSlot)
        {
            case "morning" -> 1;
            case "afternoon" -> 2;
            case "evening" -> 3;
            default -> 4;
        };
    }
}
