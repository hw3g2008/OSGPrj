package com.ruoyi.web.controller.osg;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.PreparedStatementSetter;
import org.springframework.jdbc.core.ResultSetExtractor;
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
import com.ruoyi.system.domain.OsgCoaching;
import com.ruoyi.system.domain.OsgJobApplication;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.OsgCoachingMapper;
import com.ruoyi.system.mapper.OsgJobApplicationMapper;
import com.ruoyi.system.mapper.OsgStudentMapper;
import com.ruoyi.system.service.impl.OsgLeadMentorAccessService;
import com.ruoyi.system.service.impl.OsgLeadMentorStudentServiceImpl;
import com.ruoyi.system.service.impl.OsgStudentServiceImpl;

@WebMvcTest(controllers = OsgLeadMentorStudentController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
    SecurityConfig.class,
    PermissionService.class,
    AuthenticationEntryPointImpl.class,
    LogoutSuccessHandlerImpl.class,
    JwtAuthenticationTokenFilter.class,
    PermitAllUrlProperties.class,
    OsgLeadMentorStudentServiceImpl.class
})
class OsgLeadMentorStudentControllerTest
{
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OsgStudentMapper studentMapper;

    @MockBean
    private OsgCoachingMapper coachingMapper;

    @MockBean
    private OsgJobApplicationMapper jobApplicationMapper;

    @MockBean
    private OsgStudentServiceImpl studentService;

    @MockBean
    private JdbcTemplate jdbcTemplate;

    @MockBean
    private OsgLeadMentorAccessService leadMentorAccessService;

    @MockBean
    private TokenService tokenService;

    @MockBean
    private RedisCache redisCache;

    private final AtomicReference<List<OsgStudent>> studentRowsRef = new AtomicReference<>();
    private final AtomicReference<List<OsgCoaching>> coachingRowsRef = new AtomicReference<>();
    private final AtomicReference<List<OsgJobApplication>> applicationRowsRef = new AtomicReference<>();
    private final AtomicReference<Map<Long, Integer>> remainingHoursRef = new AtomicReference<>();

    @BeforeEach
    void setUp()
    {
        studentRowsRef.set(new ArrayList<>(List.of(
            buildStudent(3004L, "Outsider", "outsider@mit.edu", "MIT", "科技 Tech", 999L, "0"),
            buildStudent(3003L, "Bob Chen", "bob@harvard.edu", "Harvard", "科技 Tech", 810L, "1"),
            buildStudent(3002L, "Test Student", "test@pku.edu.cn", "北京大学", "金融 Finance", 999L, "0"),
            buildStudent(3001L, "Emily Zhang", "emily@nyu.edu", "NYU", "金融 Finance", 810L, "0")
        )));
        coachingRowsRef.set(new ArrayList<>(List.of(
            buildCoaching(8001L, 7002L, 3002L, "810,9201"),
            buildCoaching(8002L, 7004L, 3003L, "810"),
            buildCoaching(8003L, 7005L, 3004L, "9202")
        )));
        applicationRowsRef.set(new ArrayList<>(List.of(
            buildApplication(7001L, 3001L, 810L, "Emily Zhang", "已投递"),
            buildApplication(7006L, 3001L, 810L, "Emily Zhang", "First Round"),
            buildApplication(7002L, 3002L, 999L, "Test Student", "Offer"),
            buildApplication(7003L, 3002L, 999L, "Test Student", "Second Round"),
            buildApplication(7004L, 3003L, 810L, "Bob Chen", "已投递"),
            buildApplication(7005L, 3003L, 810L, "Bob Chen", "获得Offer"),
            buildApplication(7007L, 3004L, 999L, "Outsider", "Offer")
        )));
        remainingHoursRef.set(new LinkedHashMap<>(Map.of(
            3001L, 15,
            3002L, 8,
            3003L, 5,
            3004L, 99
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

        org.mockito.Mockito.when(studentMapper.selectStudentList(any(OsgStudent.class))).thenAnswer(invocation ->
            studentRowsRef.get().stream().map(this::cloneStudent).toList()
        );

        org.mockito.Mockito.when(coachingMapper.selectCoachingList(any(OsgCoaching.class))).thenAnswer(invocation ->
            coachingRowsRef.get().stream().map(this::cloneCoaching).toList()
        );

        org.mockito.Mockito.when(jobApplicationMapper.selectJobApplicationList(any(OsgJobApplication.class))).thenAnswer(invocation ->
            applicationRowsRef.get().stream().map(this::cloneApplication).toList()
        );

        org.mockito.Mockito.when(studentService.selectStudentContracts(anyLong())).thenAnswer(invocation -> {
            Long studentId = invocation.getArgument(0);
            return Map.of(
                "studentId", studentId,
                "summary", Map.of(
                    "remainingHours", remainingHoursRef.get().getOrDefault(studentId, 0),
                    "totalHours", remainingHoursRef.get().getOrDefault(studentId, 0)
                ),
                "contracts", List.of()
            );
        });

        org.mockito.Mockito.when(jdbcTemplate.query(anyString(), any(PreparedStatementSetter.class), any(ResultSetExtractor.class)))
            .thenAnswer(invocation -> new LinkedHashMap<>(remainingHoursRef.get()));
    }

    @Test
    void listShouldReturnUnionRowsWithRealRelationsAndCounts() throws Exception
    {
        mockMvc.perform(get("/lead-mentor/students/list")
                .header("Authorization", "Bearer lead-mentor-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.rows.length()").value(3))
                .andExpect(jsonPath("$.rows[0].studentId").value(3003))
                .andExpect(jsonPath("$.rows[0].relations.length()").value(2))
                .andExpect(jsonPath("$.rows[0].relations[0].value").value("coaching"))
                .andExpect(jsonPath("$.rows[0].relations[1].value").value("managed"))
                .andExpect(jsonPath("$.rows[0].applyCount").value(2))
                .andExpect(jsonPath("$.rows[0].offerCount").value(1))
                .andExpect(jsonPath("$.rows[0].remainingHours").value(5))
                .andExpect(jsonPath("$.rows[1].studentId").value(3002))
                .andExpect(jsonPath("$.rows[1].relations.length()").value(1))
                .andExpect(jsonPath("$.rows[1].relations[0].value").value("coaching"))
                .andExpect(jsonPath("$.rows[1].interviewCount").value(1))
                .andExpect(jsonPath("$.rows[1].offerCount").value(1))
                .andExpect(jsonPath("$.rows[2].studentId").value(3001))
                .andExpect(jsonPath("$.rows[2].relations[0].value").value("managed"))
                .andExpect(jsonPath("$.rows[2].interviewCount").value(1))
                .andExpect(jsonPath("$.rows[2].remainingHours").value(15));

        verifyNoInteractions(studentService);
    }

    @Test
    void listShouldApplyRealFiltersAcrossUnionScopes() throws Exception
    {
        mockMvc.perform(get("/lead-mentor/students/list")
                .header("Authorization", "Bearer lead-mentor-token")
                .param("relation", "dual"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows.length()").value(1))
                .andExpect(jsonPath("$.rows[0].studentId").value(3003));

        mockMvc.perform(get("/lead-mentor/students/list")
                .header("Authorization", "Bearer lead-mentor-token")
                .param("relation", "managed")
                .param("keyword", "Emily"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows.length()").value(1))
                .andExpect(jsonPath("$.rows[0].studentId").value(3001));

        mockMvc.perform(get("/lead-mentor/students/list")
                .header("Authorization", "Bearer lead-mentor-token")
                .param("school", "北京大学")
                .param("majorDirection", "金融 Finance"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows.length()").value(1))
                .andExpect(jsonPath("$.rows[0].studentId").value(3002));
    }

    @Test
    void metaShouldReturnScopedOptionsWithoutOutOfScopeNoise() throws Exception
    {
        mockMvc.perform(get("/lead-mentor/students/meta")
                .header("Authorization", "Bearer lead-mentor-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.relationOptions.length()").value(3))
                .andExpect(jsonPath("$.data.relationOptions[0].value").value("coaching"))
                .andExpect(jsonPath("$.data.accountStatuses.length()").value(2))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("MIT"))));
    }

    @Test
    void listShouldRejectUsersWithoutLeadMentorAccess() throws Exception
    {
        mockMvc.perform(get("/lead-mentor/students/list")
                .header("Authorization", "Bearer outsider-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(403))
                .andExpect(jsonPath("$.msg").value("该账号无班主任端访问权限"));
    }

    @Test
    void listShouldReflectUpdatedUnionStateOnSubsequentRequests() throws Exception
    {
        mockMvc.perform(get("/lead-mentor/students/list")
                .header("Authorization", "Bearer lead-mentor-token")
                .param("keyword", "Emily"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].relations.length()").value(1))
                .andExpect(jsonPath("$.rows[0].interviewCount").value(1));

        List<OsgCoaching> updatedCoachings = new ArrayList<>(coachingRowsRef.get());
        updatedCoachings.add(buildCoaching(8004L, 7001L, 3001L, "810,9301"));
        coachingRowsRef.set(updatedCoachings);

        List<OsgJobApplication> updatedApplications = new ArrayList<>(applicationRowsRef.get());
        updatedApplications.add(buildApplication(7008L, 3001L, 810L, "Emily Zhang", "二面中"));
        applicationRowsRef.set(updatedApplications);

        mockMvc.perform(get("/lead-mentor/students/list")
                .header("Authorization", "Bearer lead-mentor-token")
                .param("keyword", "Emily"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].relations.length()").value(2))
                .andExpect(jsonPath("$.rows[0].interviewCount").value(2));
    }

    private OsgStudent buildStudent(Long studentId, String studentName, String email, String school,
        String majorDirection, Long leadMentorId, String accountStatus)
    {
        OsgStudent student = new OsgStudent();
        student.setStudentId(studentId);
        student.setStudentName(studentName);
        student.setEmail(email);
        student.setSchool(school);
        student.setMajorDirection(majorDirection);
        student.setLeadMentorId(leadMentorId);
        student.setAccountStatus(accountStatus);
        return student;
    }

    private OsgCoaching buildCoaching(Long coachingId, Long applicationId, Long studentId, String mentorIds)
    {
        OsgCoaching coaching = new OsgCoaching();
        coaching.setCoachingId(coachingId);
        coaching.setApplicationId(applicationId);
        coaching.setStudentId(studentId);
        coaching.setMentorIds(mentorIds);
        coaching.setStatus("辅导中");
        return coaching;
    }

    private OsgJobApplication buildApplication(Long applicationId, Long studentId, Long leadMentorId,
        String studentName, String currentStage)
    {
        OsgJobApplication application = new OsgJobApplication();
        application.setApplicationId(applicationId);
        application.setStudentId(studentId);
        application.setLeadMentorId(leadMentorId);
        application.setStudentName(studentName);
        application.setCurrentStage(currentStage);
        return application;
    }

    private LoginUser buildLoginUser(Long userId, String username)
    {
        SysUser user = new SysUser();
        user.setUserId(userId);
        user.setUserName(username);
        return new LoginUser(userId, null, user, java.util.Collections.emptySet());
    }

    private OsgStudent cloneStudent(OsgStudent source)
    {
        OsgStudent clone = new OsgStudent();
        clone.setStudentId(source.getStudentId());
        clone.setStudentName(source.getStudentName());
        clone.setEmail(source.getEmail());
        clone.setSchool(source.getSchool());
        clone.setMajorDirection(source.getMajorDirection());
        clone.setLeadMentorId(source.getLeadMentorId());
        clone.setAccountStatus(source.getAccountStatus());
        return clone;
    }

    private OsgCoaching cloneCoaching(OsgCoaching source)
    {
        OsgCoaching clone = new OsgCoaching();
        clone.setCoachingId(source.getCoachingId());
        clone.setApplicationId(source.getApplicationId());
        clone.setStudentId(source.getStudentId());
        clone.setMentorIds(source.getMentorIds());
        clone.setStatus(source.getStatus());
        return clone;
    }

    private OsgJobApplication cloneApplication(OsgJobApplication source)
    {
        OsgJobApplication clone = new OsgJobApplication();
        clone.setApplicationId(source.getApplicationId());
        clone.setStudentId(source.getStudentId());
        clone.setLeadMentorId(source.getLeadMentorId());
        clone.setStudentName(source.getStudentName());
        clone.setCurrentStage(source.getCurrentStage());
        return clone;
    }
}
