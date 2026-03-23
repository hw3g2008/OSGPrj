package com.ruoyi.web.controller.osg;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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
import org.springframework.security.core.context.SecurityContextHolder;
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
import com.ruoyi.system.domain.OsgMockPractice;
import com.ruoyi.system.domain.OsgStaff;
import com.ruoyi.system.domain.OsgStaffSchedule;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.OsgMockPracticeMapper;
import com.ruoyi.system.mapper.OsgStaffMapper;
import com.ruoyi.system.mapper.OsgStaffScheduleMapper;
import com.ruoyi.system.mapper.OsgStudentMapper;
import com.ruoyi.system.service.impl.OsgLeadMentorAccessService;
import com.ruoyi.system.service.impl.OsgLeadMentorMockPracticeServiceImpl;

@WebMvcTest(controllers = OsgLeadMentorMockPracticeController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
    SecurityConfig.class,
    PermissionService.class,
    AuthenticationEntryPointImpl.class,
    LogoutSuccessHandlerImpl.class,
    JwtAuthenticationTokenFilter.class,
    PermitAllUrlProperties.class,
    OsgLeadMentorMockPracticeServiceImpl.class
})
class OsgLeadMentorMockPracticeControllerTest
{
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OsgMockPracticeMapper mockPracticeMapper;

    @MockBean
    private OsgStudentMapper studentMapper;

    @MockBean
    private OsgStaffMapper staffMapper;

    @MockBean
    private OsgStaffScheduleMapper staffScheduleMapper;

    @MockBean
    private OsgLeadMentorAccessService leadMentorAccessService;

    @MockBean
    private TokenService tokenService;

    @MockBean
    private RedisCache redisCache;

    private final AtomicReference<List<OsgMockPractice>> practiceRowsRef = new AtomicReference<>();
    private final AtomicReference<Map<Long, OsgStudent>> studentRowsRef = new AtomicReference<>();
    private final AtomicReference<Map<Long, OsgStaff>> staffRowsRef = new AtomicReference<>();
    private final AtomicReference<Map<Long, List<OsgStaffSchedule>>> scheduleRowsRef = new AtomicReference<>();

    @BeforeEach
    void setUp()
    {
        SecurityContextHolder.clearContext();
        practiceRowsRef.set(new ArrayList<>(List.of(
            buildPractice(9001L, 3001L, "张三", "模拟面试", "Goldman Sachs IB 二面", 2, "Jerry Li, Mike Chen", "pending", null, null, null, null, null, "2026-03-21 10:00:00"),
            buildPractice(9002L, 3002L, "李四", "人际关系测试", "Leadership Test", 1, "Jess", "scheduled", "810,9201", "Jess, Amy", "Lead Mentor / Morgan Stanley", "2026-03-25 09:30:00", null, "2026-03-22 11:00:00"),
            buildPractice(9003L, 3003L, "王五", "期中考试", "Midterm Review", 1, "Jerry Li", "completed", "9202", "Jerry Li", "Goldman Sachs IBD", "2026-03-20 14:00:00", "表现稳定，框架清晰", "2026-03-20 09:00:00"),
            buildPractice(9004L, 3004L, "赵六", "模拟面试", "McKinsey Case", 1, "Jess", "scheduled", "810", "Jess", "Lead Mentor", "2026-03-24 16:00:00", null, "2026-03-22 09:30:00"),
            buildPractice(9005L, 3005L, "孙七", "模拟面试", "JP Morgan Markets", 2, "Tom", "pending", null, null, null, null, null, "2026-03-23 08:30:00")
        )));

        studentRowsRef.set(new LinkedHashMap<>(Map.of(
            3001L, buildStudent(3001L, "张三", 810L),
            3002L, buildStudent(3002L, "李四", 810L),
            3003L, buildStudent(3003L, "王五", 810L),
            3004L, buildStudent(3004L, "赵六", 999L),
            3005L, buildStudent(3005L, "孙七", 999L)
        )));

        staffRowsRef.set(new LinkedHashMap<>(Map.of(
            9201L, buildStaff(9201L, "Jerry Li", "mentor", "IBD", "New York", "Goldman Sachs IBD · 5年"),
            9202L, buildStaff(9202L, "Mike Chen", "mentor", "Strategy", "Shanghai", "McKinsey · 4年"),
            9203L, buildStaff(9203L, "Sarah Wang", "mentor", "Behavioral", "Singapore", "Leadership Coach · 6年")
        )));

        scheduleRowsRef.set(new LinkedHashMap<>(Map.of(
            9201L, List.of(buildSchedule(9201L, "2026-W13", 2, "AM", true), buildSchedule(9201L, "2026-W13", 4, "PM", true)),
            9202L, List.of(buildSchedule(9202L, "2026-W13", 3, "PM", true)),
            9203L, List.of(buildSchedule(9203L, "2026-W13", 5, "EVENING", false))
        )));

        org.mockito.Mockito.when(tokenService.getLoginUser(any())).thenAnswer(invocation -> {
            HttpServletRequest request = invocation.getArgument(0);
            String authorization = request.getHeader("Authorization");
            if ("Bearer lead-mentor-token".equals(authorization))
            {
                return buildLoginUser(810L, "lead_mentor_user");
            }
            if ("Bearer outsider-token".equals(authorization))
            {
                return buildLoginUser(812L, "outsider_user");
            }
            return null;
        });

        org.mockito.Mockito.when(leadMentorAccessService.hasLeadMentorAccess(any())).thenAnswer(invocation -> {
            SysUser user = invocation.getArgument(0);
            return user != null && Long.valueOf(810L).equals(user.getUserId());
        });

        org.mockito.Mockito.when(mockPracticeMapper.selectMockPracticeList(any(OsgMockPractice.class))).thenAnswer(invocation -> {
            OsgMockPractice query = invocation.getArgument(0);
            return practiceRowsRef.get().stream()
                .filter(row -> query.getPracticeType() == null || query.getPracticeType().equals(row.getPracticeType()))
                .filter(row -> query.getStatus() == null || query.getStatus().equals(row.getStatus()))
                .filter(row -> query.getKeyword() == null || containsKeyword(row, query.getKeyword()))
                .sorted(Comparator.comparing(OsgMockPractice::getSubmittedAt, Comparator.nullsLast(java.util.Date::compareTo)).reversed())
                .map(this::clonePractice)
                .toList();
        });

        org.mockito.Mockito.when(mockPracticeMapper.selectMockPracticeByPracticeId(any())).thenAnswer(invocation ->
            practiceRowsRef.get().stream()
                .filter(item -> item.getPracticeId().equals(invocation.getArgument(0)))
                .findFirst()
                .map(this::clonePractice)
                .orElse(null)
        );

        org.mockito.Mockito.when(mockPracticeMapper.updateMockPracticeAssignment(any(OsgMockPractice.class))).thenAnswer(invocation -> {
            OsgMockPractice patch = invocation.getArgument(0);
            practiceRowsRef.set(practiceRowsRef.get().stream().map(row -> {
                if (!row.getPracticeId().equals(patch.getPracticeId()))
                {
                    return row;
                }
                OsgMockPractice updated = clonePractice(row);
                updated.setStatus(patch.getStatus());
                updated.setMentorIds(patch.getMentorIds());
                updated.setMentorNames(patch.getMentorNames());
                updated.setMentorBackgrounds(patch.getMentorBackgrounds());
                updated.setScheduledAt(patch.getScheduledAt());
                updated.setRemark(patch.getRemark());
                updated.setUpdateBy(patch.getUpdateBy());
                return updated;
            }).toList());
            return 1;
        });

        org.mockito.Mockito.when(mockPracticeMapper.updateMentorMockPracticeStatus(any(OsgMockPractice.class))).thenAnswer(invocation -> {
            OsgMockPractice patch = invocation.getArgument(0);
            practiceRowsRef.set(practiceRowsRef.get().stream().map(row -> {
                if (!row.getPracticeId().equals(patch.getPracticeId()))
                {
                    return row;
                }
                OsgMockPractice updated = clonePractice(row);
                updated.setStatus(patch.getStatus());
                updated.setUpdateBy(patch.getUpdateBy());
                return updated;
            }).toList());
            return 1;
        });

        org.mockito.Mockito.when(studentMapper.selectStudentByStudentId(any())).thenAnswer(invocation ->
            cloneStudent(studentRowsRef.get().get(invocation.getArgument(0)))
        );

        org.mockito.Mockito.when(studentMapper.selectStudentByStudentIds(anyList())).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            List<Long> studentIds = invocation.getArgument(0);
            return studentIds.stream()
                .map(studentId -> cloneStudent(studentRowsRef.get().get(studentId)))
                .filter(java.util.Objects::nonNull)
                .toList();
        });

        org.mockito.Mockito.when(staffMapper.selectStaffList(any(OsgStaff.class))).thenAnswer(invocation -> {
            OsgStaff query = invocation.getArgument(0);
            return staffRowsRef.get().values().stream()
                .filter(row -> query.getStaffType() == null || query.getStaffType().equals(row.getStaffType()))
                .filter(row -> query.getAccountStatus() == null || query.getAccountStatus().equals(row.getAccountStatus()))
                .map(this::cloneStaff)
                .toList();
        });

        org.mockito.Mockito.when(staffMapper.selectStaffByStaffId(any())).thenAnswer(invocation ->
            cloneStaff(staffRowsRef.get().get(invocation.getArgument(0)))
        );

        org.mockito.Mockito.when(staffScheduleMapper.selectStaffScheduleList(any(), any())).thenAnswer(invocation -> {
            Long staffId = invocation.getArgument(0);
            if (staffId == null)
            {
                return scheduleRowsRef.get().values().stream().flatMap(List::stream).map(this::cloneSchedule).toList();
            }
            return scheduleRowsRef.get().getOrDefault(staffId, List.of()).stream()
                .map(this::cloneSchedule)
                .toList();
        });
    }

    @Test
    void listAndStatsRespectLeadMentorScopes() throws Exception
    {
        mockMvc.perform(get("/lead-mentor/mock-practice/stats")
                .header("Authorization", "Bearer lead-mentor-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.pendingCount").value(1))
            .andExpect(jsonPath("$.data.scheduledCount").value(2))
            .andExpect(jsonPath("$.data.completedCount").value(1))
            .andExpect(jsonPath("$.data.totalCount").value(4));

        mockMvc.perform(get("/lead-mentor/mock-practice/list")
                .header("Authorization", "Bearer lead-mentor-token")
                .param("scope", "pending"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.rows.length()").value(1))
            .andExpect(jsonPath("$.rows[0].practiceId").value(9001))
            .andExpect(jsonPath("$.rows[0].practiceType").value("模拟面试"))
            .andExpect(jsonPath("$.rows[0].status").value("pending"));

        mockMvc.perform(get("/lead-mentor/mock-practice/list")
                .header("Authorization", "Bearer lead-mentor-token")
                .param("scope", "coaching"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.rows.length()").value(2))
            .andExpect(jsonPath("$.rows[0].practiceId").value(9002))
            .andExpect(jsonPath("$.rows[1].practiceId").value(9004));

        mockMvc.perform(get("/lead-mentor/mock-practice/list")
                .header("Authorization", "Bearer lead-mentor-token")
                .param("scope", "managed"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.rows.length()").value(3))
            .andExpect(jsonPath("$.rows[0].practiceId").value(9002))
            .andExpect(jsonPath("$.rows[1].practiceId").value(9001))
            .andExpect(jsonPath("$.rows[2].practiceId").value(9003));
    }

    @Test
    void detailReturnsRealFeedbackAndMentorOptionsWithinScope() throws Exception
    {
        org.mockito.Mockito.clearInvocations(staffScheduleMapper);

        mockMvc.perform(get("/lead-mentor/mock-practice/9003")
                .header("Authorization", "Bearer lead-mentor-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.practiceId").value(9003))
            .andExpect(jsonPath("$.data.studentId").value(3003))
            .andExpect(jsonPath("$.data.feedbackSummary").value("表现稳定，框架清晰"))
            .andExpect(jsonPath("$.data.status").value("completed"))
            .andExpect(jsonPath("$.data.mentorOptions.length()").value(3))
            .andExpect(jsonPath("$.data.mentorOptions[0].mentorId").value(9201))
            .andExpect(jsonPath("$.data.mentorOptions[0].availabilityLabel").value("周二 AM, 周四 PM"));

        org.mockito.Mockito.verify(staffScheduleMapper).selectStaffScheduleList(null, null);
        org.mockito.Mockito.verifyNoMoreInteractions(staffScheduleMapper);
    }

    @Test
    void assignPersistsManagedPracticeAndRefreshesPendingScope() throws Exception
    {
        mockMvc.perform(post("/lead-mentor/mock-practice/9001/assign")
                .header("Authorization", "Bearer lead-mentor-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "mentorIds": [9201, 9202],
                      "scheduledAt": "2026-03-25T09:30",
                      "note": "优先安排一面复盘"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.practiceId").value(9001))
            .andExpect(jsonPath("$.data.status").value("scheduled"))
            .andExpect(jsonPath("$.data.mentorNames").value("Jerry Li, Mike Chen"))
            .andExpect(jsonPath("$.data.mentorBackgrounds").value("Goldman Sachs IBD · 5年 / McKinsey · 4年"));

        mockMvc.perform(get("/lead-mentor/mock-practice/list")
                .header("Authorization", "Bearer lead-mentor-token")
                .param("scope", "pending"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.rows.length()").value(0));

        mockMvc.perform(get("/lead-mentor/mock-practice/list")
                .header("Authorization", "Bearer lead-mentor-token")
                .param("scope", "managed"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.rows[1].practiceId").value(9001))
            .andExpect(jsonPath("$.rows[1].status").value("scheduled"))
            .andExpect(jsonPath("$.rows[1].mentorNames").value("Jerry Li, Mike Chen"));
    }

    @Test
    void acknowledgeAssignmentPersistsForCoachingScope() throws Exception
    {
        mockMvc.perform(post("/lead-mentor/mock-practice/9002/ack-assignment")
                .header("Authorization", "Bearer lead-mentor-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.practiceId").value(9002))
            .andExpect(jsonPath("$.data.status").value("confirmed"));

        mockMvc.perform(get("/lead-mentor/mock-practice/list")
                .header("Authorization", "Bearer lead-mentor-token")
                .param("scope", "coaching"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.rows[0].practiceId").value(9002))
            .andExpect(jsonPath("$.rows[0].status").value("confirmed"));
    }

    @Test
    void rejectsUnauthorizedOrOutOfScopeRequests() throws Exception
    {
        mockMvc.perform(get("/lead-mentor/mock-practice/list")
                .header("Authorization", "Bearer outsider-token")
                .param("scope", "managed"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(403))
            .andExpect(jsonPath("$.msg").value("该账号无班主任端访问权限"));

        mockMvc.perform(post("/lead-mentor/mock-practice/9005/assign")
                .header("Authorization", "Bearer lead-mentor-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "mentorIds": [9201],
                      "scheduledAt": "2026-03-25T09:30"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(403))
            .andExpect(jsonPath("$.msg").value("无权操作该模拟应聘申请"));
    }

    private boolean containsKeyword(OsgMockPractice row, String keyword)
    {
        String normalizedKeyword = keyword == null ? null : keyword.trim();
        if (normalizedKeyword == null || normalizedKeyword.isEmpty())
        {
            return true;
        }
        return String.valueOf(row.getStudentName()).contains(normalizedKeyword)
            || String.valueOf(row.getRequestContent()).contains(normalizedKeyword);
    }

    private LoginUser buildLoginUser(Long userId, String username)
    {
        SysUser user = new SysUser();
        user.setUserId(userId);
        user.setUserName(username);
        user.setEmail(username + "@example.com");
        return new LoginUser(userId, null, user, java.util.Collections.emptySet());
    }

    private OsgMockPractice buildPractice(
        Long practiceId,
        Long studentId,
        String studentName,
        String practiceType,
        String requestContent,
        Integer requestedMentorCount,
        String preferredMentorNames,
        String status,
        String mentorIds,
        String mentorNames,
        String mentorBackgrounds,
        String scheduledAt,
        String feedbackSummary,
        String submittedAt
    )
    {
        OsgMockPractice row = new OsgMockPractice();
        row.setPracticeId(practiceId);
        row.setStudentId(studentId);
        row.setStudentName(studentName);
        row.setPracticeType(practiceType);
        row.setRequestContent(requestContent);
        row.setRequestedMentorCount(requestedMentorCount);
        row.setPreferredMentorNames(preferredMentorNames);
        row.setStatus(status);
        row.setMentorIds(mentorIds);
        row.setMentorNames(mentorNames);
        row.setMentorBackgrounds(mentorBackgrounds);
        row.setScheduledAt(parseTimestamp(scheduledAt));
        row.setFeedbackSummary(feedbackSummary);
        row.setFeedbackRating(feedbackSummary == null ? null : 4);
        row.setCompletedHours("completed".equals(status) ? 2 : 0);
        row.setSubmittedAt(parseTimestamp(submittedAt));
        row.setDelFlag("0");
        return row;
    }

    private OsgStudent buildStudent(Long studentId, String studentName, Long leadMentorId)
    {
        OsgStudent student = new OsgStudent();
        student.setStudentId(studentId);
        student.setStudentName(studentName);
        student.setLeadMentorId(leadMentorId);
        student.setAccountStatus("active");
        return student;
    }

    private OsgStaff buildStaff(Long staffId, String staffName, String staffType, String majorDirection, String city, String remark)
    {
        OsgStaff staff = new OsgStaff();
        staff.setStaffId(staffId);
        staff.setStaffName(staffName);
        staff.setStaffType(staffType);
        staff.setMajorDirection(majorDirection);
        staff.setCity(city);
        staff.setRemark(remark);
        staff.setHourlyRate(BigDecimal.valueOf(400));
        staff.setAccountStatus("active");
        return staff;
    }

    private OsgStaffSchedule buildSchedule(Long staffId, String weekScope, Integer weekday, String timeSlot, boolean available)
    {
        OsgStaffSchedule schedule = new OsgStaffSchedule();
        schedule.setStaffId(staffId);
        schedule.setWeekScope(weekScope);
        schedule.setWeekday(weekday);
        schedule.setTimeSlot(timeSlot);
        schedule.setIsAvailable(available ? 1 : 0);
        return schedule;
    }

    private OsgMockPractice clonePractice(OsgMockPractice source)
    {
        if (source == null)
        {
            return null;
        }
        OsgMockPractice clone = new OsgMockPractice();
        clone.setPracticeId(source.getPracticeId());
        clone.setStudentId(source.getStudentId());
        clone.setStudentName(source.getStudentName());
        clone.setPracticeType(source.getPracticeType());
        clone.setRequestContent(source.getRequestContent());
        clone.setRequestedMentorCount(source.getRequestedMentorCount());
        clone.setPreferredMentorNames(source.getPreferredMentorNames());
        clone.setStatus(source.getStatus());
        clone.setMentorIds(source.getMentorIds());
        clone.setMentorNames(source.getMentorNames());
        clone.setMentorBackgrounds(source.getMentorBackgrounds());
        clone.setScheduledAt(source.getScheduledAt());
        clone.setCompletedHours(source.getCompletedHours());
        clone.setFeedbackRating(source.getFeedbackRating());
        clone.setFeedbackSummary(source.getFeedbackSummary());
        clone.setSubmittedAt(source.getSubmittedAt());
        clone.setDelFlag(source.getDelFlag());
        clone.setRemark(source.getRemark());
        clone.setUpdateBy(source.getUpdateBy());
        return clone;
    }

    private OsgStudent cloneStudent(OsgStudent source)
    {
        if (source == null)
        {
            return null;
        }
        OsgStudent clone = new OsgStudent();
        clone.setStudentId(source.getStudentId());
        clone.setStudentName(source.getStudentName());
        clone.setLeadMentorId(source.getLeadMentorId());
        clone.setAccountStatus(source.getAccountStatus());
        return clone;
    }

    private OsgStaff cloneStaff(OsgStaff source)
    {
        if (source == null)
        {
            return null;
        }
        OsgStaff clone = new OsgStaff();
        clone.setStaffId(source.getStaffId());
        clone.setStaffName(source.getStaffName());
        clone.setStaffType(source.getStaffType());
        clone.setMajorDirection(source.getMajorDirection());
        clone.setCity(source.getCity());
        clone.setRemark(source.getRemark());
        clone.setHourlyRate(source.getHourlyRate());
        clone.setAccountStatus(source.getAccountStatus());
        return clone;
    }

    private OsgStaffSchedule cloneSchedule(OsgStaffSchedule source)
    {
        if (source == null)
        {
            return null;
        }
        OsgStaffSchedule clone = new OsgStaffSchedule();
        clone.setStaffId(source.getStaffId());
        clone.setWeekScope(source.getWeekScope());
        clone.setWeekday(source.getWeekday());
        clone.setTimeSlot(source.getTimeSlot());
        clone.setIsAvailable(source.getIsAvailable());
        return clone;
    }

    private Timestamp parseTimestamp(String value)
    {
        if (value == null)
        {
            return null;
        }
        return Timestamp.valueOf(LocalDateTime.parse(value.replace(" ", "T")));
    }
}
