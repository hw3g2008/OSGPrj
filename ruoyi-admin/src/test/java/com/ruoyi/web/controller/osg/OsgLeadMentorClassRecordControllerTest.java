package com.ruoyi.web.controller.osg;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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
import com.ruoyi.system.domain.OsgClassRecord;
import com.ruoyi.system.domain.OsgStaff;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.OsgClassRecordMapper;
import com.ruoyi.system.mapper.OsgStaffMapper;
import com.ruoyi.system.mapper.OsgStudentMapper;
import com.ruoyi.system.service.impl.OsgClassRecordServiceImpl;
import com.ruoyi.system.service.impl.OsgLeadMentorAccessService;

@WebMvcTest(controllers = OsgLeadMentorClassRecordController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
    SecurityConfig.class,
    PermissionService.class,
    AuthenticationEntryPointImpl.class,
    LogoutSuccessHandlerImpl.class,
    JwtAuthenticationTokenFilter.class,
    PermitAllUrlProperties.class,
    OsgClassRecordServiceImpl.class
})
class OsgLeadMentorClassRecordControllerTest
{
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OsgClassRecordMapper classRecordMapper;

    @MockBean
    private OsgStudentMapper studentMapper;

    @MockBean
    private OsgStaffMapper staffMapper;

    @MockBean
    private OsgLeadMentorAccessService leadMentorAccessService;

    @MockBean
    private TokenService tokenService;

    @MockBean
    private RedisCache redisCache;

    private final AtomicReference<Map<Long, OsgStudent>> studentRowsRef = new AtomicReference<>();
    private final AtomicReference<List<OsgClassRecord>> persistedRowsRef = new AtomicReference<>();
    private final AtomicLong recordIdSequence = new AtomicLong(9100L);

    @BeforeEach
    void setUp()
    {
        studentRowsRef.set(new LinkedHashMap<>(Map.of(
            3001L, buildStudent(3001L, "Emily Zhang", 810L),
            3002L, buildStudent(3002L, "Outsider Student", 999L)
        )));
        persistedRowsRef.set(new ArrayList<>());
        recordIdSequence.set(9100L);

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

        org.mockito.Mockito.when(studentMapper.selectStudentByStudentId(any())).thenAnswer(invocation ->
            cloneStudent(studentRowsRef.get().get(invocation.getArgument(0)))
        );

        org.mockito.Mockito.when(classRecordMapper.insertMentorClassRecord(any(OsgClassRecord.class))).thenAnswer(invocation -> {
            OsgClassRecord record = invocation.getArgument(0);
            record.setRecordId(recordIdSequence.incrementAndGet());
            persistedRowsRef.get().add(cloneRecord(record));
            return 1;
        });
    }

    @Test
    void createShouldPersistPendingRecordForManagedStudent() throws Exception
    {
        mockMvc.perform(post("/lead-mentor/class-records")
                .header("Authorization", "Bearer lead-mentor-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "studentId": 3001,
                      "courseType": "position_coaching",
                      "classStatus": "case_prep",
                      "classDate": "2026-03-23T10:00:00+08:00",
                      "durationHours": 1.5,
                      "topics": "Profitability tree and market sizing",
                      "comments": "Need to strengthen conclusion delivery",
                      "feedbackContent": "Completed case drill and feedback review"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.recordId").value(9101))
            .andExpect(jsonPath("$.data.studentId").value(3001))
            .andExpect(jsonPath("$.data.studentName").value("Emily Zhang"))
            .andExpect(jsonPath("$.data.mentorId").value(810))
            .andExpect(jsonPath("$.data.mentorName").value("lead_mentor_user"))
            .andExpect(jsonPath("$.data.courseSource").value("clerk"))
            .andExpect(jsonPath("$.data.status").value("pending"))
            .andExpect(jsonPath("$.data.weeklyHours").value(0.0))
            .andExpect(jsonPath("$.data.feedbackContent").value("Completed case drill and feedback review"))
            .andExpect(jsonPath("$.data.submittedAt").exists());

        List<OsgClassRecord> persistedRows = persistedRowsRef.get();
        org.junit.jupiter.api.Assertions.assertEquals(1, persistedRows.size());
        org.junit.jupiter.api.Assertions.assertEquals("Emily Zhang", persistedRows.get(0).getStudentName());
        org.junit.jupiter.api.Assertions.assertEquals("clerk", persistedRows.get(0).getCourseSource());
        org.junit.jupiter.api.Assertions.assertEquals("pending", persistedRows.get(0).getStatus());
        org.junit.jupiter.api.Assertions.assertEquals(0D, persistedRows.get(0).getWeeklyHours());
    }

    @Test
    void createShouldRejectOutOfScopeStudent() throws Exception
    {
        mockMvc.perform(post("/lead-mentor/class-records")
                .header("Authorization", "Bearer lead-mentor-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "studentId": 3002,
                      "courseType": "position_coaching",
                      "classStatus": "case_prep",
                      "classDate": "2026-03-23T10:00:00+08:00",
                      "durationHours": 1.5,
                      "feedbackContent": "Should never be accepted"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(403))
            .andExpect(jsonPath("$.msg").value("无权为该学员上报课程记录"));
    }

    @Test
    void createShouldRejectMissingFeedbackContent() throws Exception
    {
        mockMvc.perform(post("/lead-mentor/class-records")
                .header("Authorization", "Bearer lead-mentor-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "studentId": 3001,
                      "courseType": "position_coaching",
                      "classStatus": "case_prep",
                      "classDate": "2026-03-23T10:00:00+08:00",
                      "durationHours": 1.5
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(400))
            .andExpect(jsonPath("$.msg").value("课程反馈不能为空"));
    }

    @Test
    void createShouldRejectUsersWithoutLeadMentorAccess() throws Exception
    {
        mockMvc.perform(post("/lead-mentor/class-records")
                .header("Authorization", "Bearer outsider-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "studentId": 3001,
                      "courseType": "position_coaching",
                      "classStatus": "case_prep",
                      "classDate": "2026-03-23T10:00:00+08:00",
                      "durationHours": 1.5,
                      "feedbackContent": "Should never be accepted"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(403))
            .andExpect(jsonPath("$.msg").value("该账号无班主任端访问权限"));

        verifyNoInteractions(classRecordMapper);
    }

    private LoginUser buildLoginUser(Long userId, String username)
    {
        SysUser user = new SysUser();
        user.setUserId(userId);
        user.setUserName(username);
        user.setPassword("password");
        return new LoginUser(userId, 1L, user, Set.of());
    }

    private OsgStudent buildStudent(Long studentId, String studentName, Long leadMentorId)
    {
        OsgStudent student = new OsgStudent();
        student.setStudentId(studentId);
        student.setStudentName(studentName);
        student.setLeadMentorId(leadMentorId);
        return student;
    }

    private OsgStudent cloneStudent(OsgStudent student)
    {
        if (student == null)
        {
            return null;
        }
        return buildStudent(student.getStudentId(), student.getStudentName(), student.getLeadMentorId());
    }

    private OsgClassRecord cloneRecord(OsgClassRecord source)
    {
        OsgClassRecord copy = new OsgClassRecord();
        copy.setRecordId(source.getRecordId());
        copy.setMentorId(source.getMentorId());
        copy.setMentorName(source.getMentorName());
        copy.setStudentId(source.getStudentId());
        copy.setStudentName(source.getStudentName());
        copy.setCourseType(source.getCourseType());
        copy.setCourseSource(source.getCourseSource());
        copy.setClassDate(source.getClassDate());
        copy.setDurationHours(source.getDurationHours());
        copy.setWeeklyHours(source.getWeeklyHours());
        copy.setStatus(source.getStatus());
        copy.setClassStatus(source.getClassStatus());
        copy.setTopics(source.getTopics());
        copy.setComments(source.getComments());
        copy.setFeedbackContent(source.getFeedbackContent());
        copy.setSubmittedAt(source.getSubmittedAt() == null
            ? Timestamp.valueOf(LocalDateTime.of(2026, 3, 23, 0, 0))
            : Timestamp.from(source.getSubmittedAt().toInstant()));
        copy.setCreateBy(source.getCreateBy());
        copy.setUpdateBy(source.getUpdateBy());
        return copy;
    }
}
