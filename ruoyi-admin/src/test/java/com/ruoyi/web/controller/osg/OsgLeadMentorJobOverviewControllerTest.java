package com.ruoyi.web.controller.osg;

import static org.mockito.ArgumentMatchers.any;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
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
import com.ruoyi.system.domain.OsgCoaching;
import com.ruoyi.system.domain.OsgJobApplication;
import com.ruoyi.system.mapper.OsgCoachingMapper;
import com.ruoyi.system.mapper.OsgJobApplicationMapper;
import com.ruoyi.system.service.impl.OsgLeadMentorAccessService;
import com.ruoyi.system.service.impl.OsgLeadMentorJobOverviewServiceImpl;

@WebMvcTest(controllers = OsgLeadMentorJobOverviewController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
    SecurityConfig.class,
    PermissionService.class,
    AuthenticationEntryPointImpl.class,
    LogoutSuccessHandlerImpl.class,
    JwtAuthenticationTokenFilter.class,
    PermitAllUrlProperties.class,
    OsgLeadMentorJobOverviewServiceImpl.class
})
class OsgLeadMentorJobOverviewControllerTest
{
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OsgJobApplicationMapper jobApplicationMapper;

    @MockBean
    private OsgCoachingMapper coachingMapper;

    @MockBean
    private OsgLeadMentorAccessService leadMentorAccessService;

    @MockBean
    private TokenService tokenService;

    @MockBean
    private RedisCache redisCache;

    private final AtomicReference<List<OsgJobApplication>> applicationRowsRef = new AtomicReference<>();
    private final AtomicReference<List<OsgCoaching>> coachingRowsRef = new AtomicReference<>();
    private final AtomicLong coachingIdSequence = new AtomicLong(9000L);

    @BeforeEach
    void setUp()
    {
        applicationRowsRef.set(new ArrayList<>(List.of(
            buildApplication(7001L, 3001L, 810L, "Alice", "Goldman Sachs", "Summer Analyst", "First Round", "pending", 2, "Jerry Li, Mike Wang", false, "2026-03-21 10:00:00", "2026-03-26 09:30:00"),
            buildApplication(7002L, 3002L, 810L, "Bob", "McKinsey", "Business Analyst", "Case Study", "assigned", 1, "Jess", false, "2026-03-22 11:00:00", "2026-03-28 14:00:00"),
            buildApplication(7003L, 3003L, 810L, "Cindy", "Google", "Product Strategy", "Second Round", "assigned", 1, "Jerry Li", true, "2026-03-20 08:00:00", "2026-03-29 16:00:00"),
            buildApplication(7004L, 3004L, 999L, "Dylan", "JP Morgan", "Markets Analyst", "First Round", "assigned", 1, "Amy", false, "2026-03-19 08:00:00", "2026-03-30 09:00:00")
        )));
        coachingRowsRef.set(new ArrayList<>(List.of(
            buildCoaching(8001L, 7002L, 3002L, "810,9201", "Jess, Amy", "Jess", "辅导中", 6, "拆分 case study 讲解后通过率提升"),
            buildCoaching(8002L, 7003L, 3003L, "9202", "Jerry Li", "Jerry Li", "辅导中", 4, "阶段推进中"),
            buildCoaching(8003L, 7004L, 3004L, "9203", "Amy", "Amy", "辅导中", 5, "非班主任作用域")
        )));
        coachingIdSequence.set(8100L);

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

        org.mockito.Mockito.when(jobApplicationMapper.selectJobApplicationList(any(OsgJobApplication.class))).thenAnswer(invocation -> {
            OsgJobApplication query = invocation.getArgument(0);
            return applicationRowsRef.get().stream()
                .filter(row -> query.getLeadMentorId() == null || query.getLeadMentorId().equals(row.getLeadMentorId()))
                .filter(row -> query.getAssignStatus() == null || query.getAssignStatus().equals(row.getAssignStatus()))
                .filter(row -> matchContains(query.getStudentName(), row.getStudentName()))
                .filter(row -> matchText(query.getCompanyName(), row.getCompanyName()))
                .filter(row -> matchText(query.getCurrentStage(), row.getCurrentStage()))
                .filter(row -> matchKeyword(query.getKeyword(), row))
                .sorted(Comparator.comparing(OsgJobApplication::getSubmittedAt, Comparator.nullsLast(java.util.Date::compareTo)).reversed())
                .map(this::cloneApplication)
                .toList();
        });

        org.mockito.Mockito.when(jobApplicationMapper.selectJobApplicationByApplicationId(any())).thenAnswer(invocation ->
            applicationRowsRef.get().stream()
                .filter(item -> item.getApplicationId().equals(invocation.getArgument(0)))
                .findFirst()
                .map(this::cloneApplication)
                .orElse(null)
        );

        org.mockito.Mockito.when(jobApplicationMapper.updateJobApplicationAssignment(any(OsgJobApplication.class))).thenAnswer(invocation -> {
            OsgJobApplication patch = invocation.getArgument(0);
            applicationRowsRef.set(applicationRowsRef.get().stream().map(row -> {
                if (!row.getApplicationId().equals(patch.getApplicationId()))
                {
                    return row;
                }
                OsgJobApplication updated = cloneApplication(row);
                updated.setAssignStatus(patch.getAssignStatus());
                updated.setCoachingStatus(patch.getCoachingStatus());
                updated.setRemark(patch.getRemark());
                updated.setUpdateBy(patch.getUpdateBy());
                return updated;
            }).toList());
            return 1;
        });

        org.mockito.Mockito.when(jobApplicationMapper.updateJobApplicationStage(any(OsgJobApplication.class))).thenAnswer(invocation -> {
            OsgJobApplication patch = invocation.getArgument(0);
            applicationRowsRef.set(applicationRowsRef.get().stream().map(row -> {
                if (!row.getApplicationId().equals(patch.getApplicationId()))
                {
                    return row;
                }
                OsgJobApplication updated = cloneApplication(row);
                if (patch.getCurrentStage() != null)
                {
                    updated.setCurrentStage(patch.getCurrentStage());
                }
                if (patch.getInterviewTime() != null)
                {
                    updated.setInterviewTime(patch.getInterviewTime());
                }
                if (patch.getStageUpdated() != null)
                {
                    updated.setStageUpdated(patch.getStageUpdated());
                }
                updated.setRemark(patch.getRemark());
                updated.setUpdateBy(patch.getUpdateBy());
                return updated;
            }).toList());
            return 1;
        });

        org.mockito.Mockito.when(coachingMapper.selectCoachingList(any(OsgCoaching.class))).thenAnswer(invocation -> {
            OsgCoaching query = invocation.getArgument(0);
            return coachingRowsRef.get().stream()
                .filter(row -> query.getApplicationId() == null || query.getApplicationId().equals(row.getApplicationId()))
                .filter(row -> query.getStudentId() == null || query.getStudentId().equals(row.getStudentId()))
                .filter(row -> query.getStatus() == null || query.getStatus().equals(row.getStatus()))
                .map(this::cloneCoaching)
                .toList();
        });

        org.mockito.Mockito.when(coachingMapper.selectCoachingByApplicationId(any())).thenAnswer(invocation ->
            coachingRowsRef.get().stream()
                .filter(item -> item.getApplicationId().equals(invocation.getArgument(0)))
                .findFirst()
                .map(this::cloneCoaching)
                .orElse(null)
        );

        org.mockito.Mockito.when(coachingMapper.insertCoaching(any(OsgCoaching.class))).thenAnswer(invocation -> {
            OsgCoaching coaching = cloneCoaching(invocation.getArgument(0));
            coaching.setCoachingId(coachingIdSequence.incrementAndGet());
            coachingRowsRef.set(new ArrayList<>(appendRow(coachingRowsRef.get(), coaching)));
            return 1;
        });

        org.mockito.Mockito.when(coachingMapper.updateCoaching(any(OsgCoaching.class))).thenAnswer(invocation -> {
            OsgCoaching patch = invocation.getArgument(0);
            coachingRowsRef.set(coachingRowsRef.get().stream().map(row -> {
                if (!row.getCoachingId().equals(patch.getCoachingId()))
                {
                    return row;
                }
                OsgCoaching updated = cloneCoaching(row);
                if (patch.getMentorIds() != null)
                {
                    updated.setMentorIds(patch.getMentorIds());
                }
                if (patch.getMentorNames() != null)
                {
                    updated.setMentorNames(patch.getMentorNames());
                }
                if (patch.getMentorName() != null)
                {
                    updated.setMentorName(patch.getMentorName());
                }
                if (patch.getStatus() != null)
                {
                    updated.setStatus(patch.getStatus());
                }
                if (patch.getTotalHours() != null)
                {
                    updated.setTotalHours(patch.getTotalHours());
                }
                if (patch.getFeedbackSummary() != null)
                {
                    updated.setFeedbackSummary(patch.getFeedbackSummary());
                }
                if (patch.getAssignNote() != null)
                {
                    updated.setAssignNote(patch.getAssignNote());
                }
                if (patch.getAssignedAt() != null)
                {
                    updated.setAssignedAt(patch.getAssignedAt());
                }
                if (patch.getConfirmedAt() != null)
                {
                    updated.setConfirmedAt(patch.getConfirmedAt());
                }
                updated.setUpdateBy(patch.getUpdateBy());
                return updated;
            }).toList());
            return 1;
        });
    }

    @Test
    void listShouldReturnPendingScopeOwnedByCurrentLeadMentor() throws Exception
    {
        mockMvc.perform(get("/lead-mentor/job-overview/list")
                .header("Authorization", "Bearer lead-mentor-token")
                .param("scope", "pending"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.rows.length()").value(1))
            .andExpect(jsonPath("$.rows[0].applicationId").value(7001))
            .andExpect(jsonPath("$.rows[0].studentName").value("Alice"))
            .andExpect(jsonPath("$.rows[0].requestedMentorCount").value(2))
            .andExpect(jsonPath("$.rows[0].mentorNames").value("Jerry Li, Mike Wang"));
    }

    @Test
    void listShouldReturnCoachingScopeByRealMentorRelationInsteadOfLeadMentorOwnership() throws Exception
    {
        mockMvc.perform(get("/lead-mentor/job-overview/list")
                .header("Authorization", "Bearer lead-mentor-token")
                .param("scope", "coaching"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.rows.length()").value(1))
            .andExpect(jsonPath("$.rows[0].applicationId").value(7002))
            .andExpect(jsonPath("$.rows[0].studentName").value("Bob"))
            .andExpect(jsonPath("$.rows[0].mentorNames").value("Jess, Amy"))
            .andExpect(jsonPath("$.rows[0].hoursUsed").value(6));
    }

    @Test
    void detailShouldReturnMergedStageMentorHoursAndFeedbackForScopedApplication() throws Exception
    {
        mockMvc.perform(get("/lead-mentor/job-overview/7002")
                .header("Authorization", "Bearer lead-mentor-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.applicationId").value(7002))
            .andExpect(jsonPath("$.data.studentId").value(3002))
            .andExpect(jsonPath("$.data.currentStage").value("Case Study"))
            .andExpect(jsonPath("$.data.mentorNames").value("Jess, Amy"))
            .andExpect(jsonPath("$.data.hoursUsed").value(6))
            .andExpect(jsonPath("$.data.feedbackSummary").value("拆分 case study 讲解后通过率提升"));
    }

    @Test
    void assignMentorShouldPersistManagedRowAndRemoveItFromPendingScopeAfterRefresh() throws Exception
    {
        mockMvc.perform(post("/lead-mentor/job-overview/7001/assign-mentor")
                .header("Authorization", "Bearer lead-mentor-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "mentorIds": [9001, 9002],
                      "mentorNames": ["Jerry Li", "Mike Wang"],
                      "assignNote": "优先覆盖 First Round 题型"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.applicationId").value(7001))
            .andExpect(jsonPath("$.data.coachingStatus").value("辅导中"))
            .andExpect(jsonPath("$.data.mentorNames").value("Jerry Li, Mike Wang"));

        mockMvc.perform(get("/lead-mentor/job-overview/list")
                .header("Authorization", "Bearer lead-mentor-token")
                .param("scope", "pending"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.rows.length()").value(0));
    }

    @Test
    void ackStageUpdateShouldPersistStageAckAndKeepRefreshConsistent() throws Exception
    {
        mockMvc.perform(post("/lead-mentor/job-overview/7003/ack-stage-update")
                .header("Authorization", "Bearer lead-mentor-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.applicationId").value(7003))
            .andExpect(jsonPath("$.data.stageUpdated").value(false));

        mockMvc.perform(get("/lead-mentor/job-overview/list")
                .header("Authorization", "Bearer lead-mentor-token")
                .param("scope", "managed"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.rows[2].applicationId").value(7003))
            .andExpect(jsonPath("$.rows[2].stageUpdated").value(false));
    }

    @Test
    void listShouldRejectUsersWithoutLeadMentorAccess() throws Exception
    {
        mockMvc.perform(get("/lead-mentor/job-overview/list")
                .header("Authorization", "Bearer outsider-token")
                .param("scope", "managed"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(403))
            .andExpect(jsonPath("$.msg").value("该账号无班主任端访问权限"));
    }

    private LoginUser buildLoginUser(Long userId, String roleKey)
    {
        SysUser user = new SysUser();
        user.setUserId(userId);
        user.setUserName(roleKey);
        user.setRoles(List.of());
        return new LoginUser(user.getUserId(), 1L, user, roleKey == null ? Set.of() : OsgTestPermissions.permissionsForRole(roleKey));
    }

    private OsgJobApplication buildApplication(Long applicationId, Long studentId, Long leadMentorId,
                                               String studentName, String companyName, String positionName,
                                               String currentStage, String assignStatus, Integer requestedMentorCount,
                                               String preferredMentorNames, boolean stageUpdated,
                                               String submittedAt, String interviewTime)
    {
        OsgJobApplication application = new OsgJobApplication();
        application.setApplicationId(applicationId);
        application.setStudentId(studentId);
        application.setLeadMentorId(leadMentorId);
        application.setStudentName(studentName);
        application.setCompanyName(companyName);
        application.setPositionName(positionName);
        application.setCurrentStage(currentStage);
        application.setAssignStatus(assignStatus);
        application.setRequestedMentorCount(requestedMentorCount);
        application.setPreferredMentorNames(preferredMentorNames);
        application.setStageUpdated(stageUpdated);
        application.setSubmittedAt(Timestamp.valueOf(LocalDateTime.parse(submittedAt.replace(" ", "T"))));
        application.setInterviewTime(Timestamp.valueOf(LocalDateTime.parse(interviewTime.replace(" ", "T"))));
        application.setCoachingStatus("pending".equals(assignStatus) ? "待审批" : "辅导中");
        application.setLeadMentorName("Jess");
        application.setRegion("Hong Kong");
        application.setCity("Hong Kong");
        return application;
    }

    private OsgCoaching buildCoaching(Long coachingId, Long applicationId, Long studentId,
                                      String mentorIds, String mentorNames, String mentorName,
                                      String status, Integer totalHours, String feedbackSummary)
    {
        OsgCoaching coaching = new OsgCoaching();
        coaching.setCoachingId(coachingId);
        coaching.setApplicationId(applicationId);
        coaching.setStudentId(studentId);
        coaching.setMentorIds(mentorIds);
        coaching.setMentorNames(mentorNames);
        coaching.setMentorName(mentorName);
        coaching.setStatus(status);
        coaching.setTotalHours(totalHours);
        coaching.setFeedbackSummary(feedbackSummary);
        return coaching;
    }

    private OsgJobApplication cloneApplication(OsgJobApplication source)
    {
        OsgJobApplication target = new OsgJobApplication();
        target.setApplicationId(source.getApplicationId());
        target.setStudentId(source.getStudentId());
        target.setPositionId(source.getPositionId());
        target.setStudentName(source.getStudentName());
        target.setCompanyName(source.getCompanyName());
        target.setPositionName(source.getPositionName());
        target.setRegion(source.getRegion());
        target.setCity(source.getCity());
        target.setCurrentStage(source.getCurrentStage());
        target.setInterviewTime(source.getInterviewTime());
        target.setCoachingStatus(source.getCoachingStatus());
        target.setLeadMentorId(source.getLeadMentorId());
        target.setLeadMentorName(source.getLeadMentorName());
        target.setAssignStatus(source.getAssignStatus());
        target.setRequestedMentorCount(source.getRequestedMentorCount());
        target.setPreferredMentorNames(source.getPreferredMentorNames());
        target.setStageUpdated(source.getStageUpdated());
        target.setSubmittedAt(source.getSubmittedAt());
        target.setRemark(source.getRemark());
        target.setUpdateBy(source.getUpdateBy());
        target.setKeyword(source.getKeyword());
        return target;
    }

    private OsgCoaching cloneCoaching(OsgCoaching source)
    {
        OsgCoaching target = new OsgCoaching();
        target.setCoachingId(source.getCoachingId());
        target.setApplicationId(source.getApplicationId());
        target.setStudentId(source.getStudentId());
        target.setMentorId(source.getMentorId());
        target.setMentorName(source.getMentorName());
        target.setMentorIds(source.getMentorIds());
        target.setMentorNames(source.getMentorNames());
        target.setMentorBackground(source.getMentorBackground());
        target.setStatus(source.getStatus());
        target.setTotalHours(source.getTotalHours());
        target.setFeedbackSummary(source.getFeedbackSummary());
        target.setAssignNote(source.getAssignNote());
        target.setAssignedAt(source.getAssignedAt());
        target.setConfirmedAt(source.getConfirmedAt());
        target.setUpdateBy(source.getUpdateBy());
        return target;
    }

    private boolean matchText(String expected, String actual)
    {
        return expected == null || expected.equals(actual);
    }

    private boolean matchContains(String expected, String actual)
    {
        return expected == null || (actual != null && actual.contains(expected));
    }

    private boolean matchKeyword(String keyword, OsgJobApplication row)
    {
        if (keyword == null)
        {
            return true;
        }

        return containsIgnoreCase(row.getStudentName(), keyword)
            || containsIgnoreCase(row.getCompanyName(), keyword)
            || containsIgnoreCase(row.getPositionName(), keyword);
    }

    private boolean containsIgnoreCase(String source, String keyword)
    {
        return source != null && source.toLowerCase().contains(keyword.toLowerCase());
    }

    private <T> List<T> appendRow(List<T> rows, T item)
    {
        List<T> next = new ArrayList<>(rows);
        next.add(item);
        return next;
    }
}
