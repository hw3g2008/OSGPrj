package com.ruoyi.web.controller.osg;

import static org.mockito.ArgumentMatchers.any;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
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
import com.ruoyi.system.domain.OsgJobApplication;
import com.ruoyi.system.domain.OsgPosition;
import com.ruoyi.system.domain.OsgCoaching;
import com.ruoyi.system.mapper.OsgCoachingMapper;
import com.ruoyi.system.mapper.OsgJobApplicationMapper;
import com.ruoyi.system.mapper.OsgPositionMapper;
import com.ruoyi.system.service.impl.OsgLeadMentorAccessService;
import com.ruoyi.system.service.impl.OsgLeadMentorPositionServiceImpl;

@WebMvcTest(controllers = OsgLeadMentorPositionController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
    SecurityConfig.class,
    PermissionService.class,
    AuthenticationEntryPointImpl.class,
    LogoutSuccessHandlerImpl.class,
    JwtAuthenticationTokenFilter.class,
    PermitAllUrlProperties.class,
    OsgLeadMentorPositionServiceImpl.class
})
class OsgLeadMentorPositionControllerTest
{
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OsgPositionMapper positionMapper;

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

    private final AtomicReference<List<OsgPosition>> positionRowsRef = new AtomicReference<>();
    private final AtomicReference<List<OsgJobApplication>> applicationRowsRef = new AtomicReference<>();
    private final AtomicReference<Map<Long, OsgCoaching>> coachingRowsRef = new AtomicReference<>();

    @BeforeEach
    void setUp()
    {
        positionRowsRef.set(new ArrayList<>(List.of(
            buildPosition(101L, "Investment Bank", "Goldman Sachs", "Summer Analyst", "summer", "New York", "2026", "Summer", "visible", "2026-03-18 08:00:00"),
            buildPosition(102L, "Investment Bank", "JP Morgan", "Hidden Analyst", "summer", "Hong Kong", "2026", "Summer", "hidden", "2026-03-19 08:00:00"),
            buildPosition(103L, "Consulting", "McKinsey", "Business Analyst", "fulltime", "London", "2025", "Full Time", "visible", "2026-03-16 08:00:00")
        )));
        applicationRowsRef.set(new ArrayList<>(List.of(
            buildApplication(5001L, 3001L, 101L, 810L, "Alice", "已投递", "已提交辅导申请", "2026-03-18 10:00:00"),
            buildApplication(5002L, 3002L, 101L, 811L, "Bob", "Offer", "已结项", "2026-03-19 10:00:00"),
            buildApplication(5003L, 3003L, 103L, 810L, "Cindy", "一面中", "辅导中", "2026-03-17 10:00:00")
        )));
        coachingRowsRef.set(Map.of(
            5001L, buildCoaching(5001L, 6),
            5002L, buildCoaching(5002L, 9),
            5003L, buildCoaching(5003L, 4)
        ));

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

        org.mockito.Mockito.when(positionMapper.selectPositionList(any(OsgPosition.class))).thenAnswer(invocation -> {
            OsgPosition query = invocation.getArgument(0);
            return positionRowsRef.get().stream()
                .filter(row -> matchText(query.getDisplayStatus(), row.getDisplayStatus()))
                .filter(row -> matchText(query.getIndustry(), row.getIndustry()))
                .filter(row -> matchText(query.getCompanyName(), row.getCompanyName()))
                .filter(row -> matchText(query.getPositionCategory(), row.getPositionCategory()))
                .filter(row -> matchText(query.getRegion(), row.getRegion()))
                .filter(row -> matchText(query.getCity(), row.getCity()))
                .filter(row -> matchContains(query.getRecruitmentCycle(), row.getRecruitmentCycle()))
                .filter(row -> matchText(query.getProjectYear(), row.getProjectYear()))
                .filter(row -> matchKeyword(query.getKeyword(), row))
                .sorted(Comparator.comparing(OsgPosition::getPublishTime).reversed())
                .map(this::clonePosition)
                .toList();
        });

        org.mockito.Mockito.when(jobApplicationMapper.selectJobApplicationList(any(OsgJobApplication.class))).thenAnswer(invocation -> {
            OsgJobApplication query = invocation.getArgument(0);
            return applicationRowsRef.get().stream()
                .filter(row -> query.getLeadMentorId() == null || query.getLeadMentorId().equals(row.getLeadMentorId()))
                .filter(row -> query.getPositionId() == null || query.getPositionId().equals(row.getPositionId()))
                .toList();
        });

        org.mockito.Mockito.when(coachingMapper.selectCoachingByApplicationId(any())).thenAnswer(invocation ->
            coachingRowsRef.get().get(invocation.getArgument(0))
        );
    }

    @Test
    void listShouldReturnVisibleRowsAcrossPlatformInPublishOrder() throws Exception
    {
        mockMvc.perform(get("/lead-mentor/positions/list")
                .header("Authorization", "Bearer lead-mentor-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.rows.length()").value(2))
                .andExpect(jsonPath("$.rows[0].positionId").value(101))
                .andExpect(jsonPath("$.rows[1].positionId").value(103))
                .andExpect(jsonPath("$.rows[0].companyName").value("Goldman Sachs"))
                .andExpect(jsonPath("$.rows[1].companyName").value("McKinsey"));
    }

    @Test
    void listShouldApplyRealFiltersAgainstPositionFields() throws Exception
    {
        mockMvc.perform(get("/lead-mentor/positions/list")
                .header("Authorization", "Bearer lead-mentor-token")
                .param("industry", "Consulting")
                .param("keyword", "Business"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.rows.length()").value(1))
                .andExpect(jsonPath("$.rows[0].positionId").value(103))
                .andExpect(jsonPath("$.rows[0].positionName").value("Business Analyst"));
    }

    @Test
    void listShouldExposeLeadMentorScopedCountsInsteadOfGlobalCounts() throws Exception
    {
        mockMvc.perform(get("/lead-mentor/positions/list")
                .header("Authorization", "Bearer lead-mentor-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].studentCount").value(1))
                .andExpect(jsonPath("$.rows[0].myStudentCount").value(1))
                .andExpect(jsonPath("$.rows[1].studentCount").value(1))
                .andExpect(jsonPath("$.rows[1].myStudentCount").value(1));
    }

    @Test
    void listShouldExcludeOfferRowsFromScopedSummaryCounts() throws Exception
    {
        List<OsgJobApplication> updated = new ArrayList<>(applicationRowsRef.get());
        updated.add(buildApplication(5004L, 3004L, 101L, 810L, "Dylan", "获得Offer", "已结项", "2026-03-20 08:00:00"));
        applicationRowsRef.set(updated);

        mockMvc.perform(get("/lead-mentor/positions/list")
                .header("Authorization", "Bearer lead-mentor-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].positionId").value(101))
                .andExpect(jsonPath("$.rows[0].studentCount").value(1))
                .andExpect(jsonPath("$.rows[0].myStudentCount").value(1));
    }

    @Test
    void listShouldRejectUsersWithoutLeadMentorAccess() throws Exception
    {
        mockMvc.perform(get("/lead-mentor/positions/list")
                .header("Authorization", "Bearer outsider-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(403))
                .andExpect(jsonPath("$.msg").value("该账号无班主任端访问权限"));
    }

    @Test
    void listShouldReflectUpdatedScopedCountsOnSubsequentRequests() throws Exception
    {
        mockMvc.perform(get("/lead-mentor/positions/list")
                .header("Authorization", "Bearer lead-mentor-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[1].myStudentCount").value(1));

        List<OsgJobApplication> updated = new ArrayList<>(applicationRowsRef.get());
        updated.add(buildApplication(5004L, 3004L, 103L, 810L, "Dylan", "已投递", "辅导中", "2026-03-20 08:00:00"));
        applicationRowsRef.set(updated);

        mockMvc.perform(get("/lead-mentor/positions/list")
                .header("Authorization", "Bearer lead-mentor-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[1].myStudentCount").value(2))
                .andExpect(jsonPath("$.rows[1].studentCount").value(2));
    }

    @Test
    void metaShouldReturnVisibleFilterOptions() throws Exception
    {
        mockMvc.perform(get("/lead-mentor/positions/meta")
                .header("Authorization", "Bearer lead-mentor-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.categories[0].value").value("fulltime"))
                .andExpect(jsonPath("$.data.companies[0].value").value("Goldman Sachs"))
                .andExpect(jsonPath("$.data.displayStatuses[0].value").value("visible"))
                .andExpect(jsonPath("$.data.sortOptions[0].value").value("publishTime:desc"));
    }

    @Test
    void studentsShouldReturnLeadMentorScopedRowsWithStageAndUsedHours() throws Exception
    {
        List<OsgJobApplication> scopedRows = new ArrayList<>(applicationRowsRef.get());
        scopedRows.add(buildApplication(5004L, 3004L, 101L, 810L, "Dylan", "二面中", "辅导中", "2026-03-20 10:00:00"));
        applicationRowsRef.set(scopedRows);

        Map<Long, OsgCoaching> coachingRows = new java.util.LinkedHashMap<>(coachingRowsRef.get());
        coachingRows.put(5004L, buildCoaching(5004L, 10));
        coachingRowsRef.set(coachingRows);

        mockMvc.perform(get("/lead-mentor/positions/101/students")
                .header("Authorization", "Bearer lead-mentor-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].studentId").value(3004))
                .andExpect(jsonPath("$.data[0].studentName").value("Dylan"))
                .andExpect(jsonPath("$.data[0].currentStage").value("二面中"))
                .andExpect(jsonPath("$.data[0].status").value("二面中"))
                .andExpect(jsonPath("$.data[0].statusTone").value("warning"))
                .andExpect(jsonPath("$.data[0].usedHours").value(10))
                .andExpect(jsonPath("$.data[1].studentId").value(3001))
                .andExpect(jsonPath("$.data[1].studentName").value("Alice"))
                .andExpect(jsonPath("$.data[1].currentStage").value("已投递"))
                .andExpect(jsonPath("$.data[1].usedHours").value(6));
    }

    @Test
    void studentsShouldRejectUsersWithoutLeadMentorAccess() throws Exception
    {
        mockMvc.perform(get("/lead-mentor/positions/101/students")
                .header("Authorization", "Bearer outsider-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(403))
                .andExpect(jsonPath("$.msg").value("该账号无班主任端访问权限"));
    }

    @Test
    void studentsShouldReflectUpdatedScopedRowsOnSubsequentRequests() throws Exception
    {
        mockMvc.perform(get("/lead-mentor/positions/103/students")
                .header("Authorization", "Bearer lead-mentor-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].studentId").value(3003))
                .andExpect(jsonPath("$.data[0].usedHours").value(4));

        List<OsgJobApplication> updatedRows = new ArrayList<>(applicationRowsRef.get());
        updatedRows.add(buildApplication(5005L, 3005L, 103L, 810L, "Eve", "Offer", "已结项", "2026-03-21 08:00:00"));
        applicationRowsRef.set(updatedRows);

        Map<Long, OsgCoaching> coachingRows = new java.util.LinkedHashMap<>(coachingRowsRef.get());
        coachingRows.put(5005L, buildCoaching(5005L, 12));
        coachingRowsRef.set(coachingRows);

        mockMvc.perform(get("/lead-mentor/positions/103/students")
                .header("Authorization", "Bearer lead-mentor-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].studentId").value(3005))
                .andExpect(jsonPath("$.data[0].currentStage").value("Offer"))
                .andExpect(jsonPath("$.data[0].usedHours").value(12))
                .andExpect(jsonPath("$.data[1].studentId").value(3003));
    }

    private LoginUser buildLoginUser(Long userId, String roleKey)
    {
        SysUser user = new SysUser();
        user.setUserId(userId);
        user.setUserName(roleKey);
        user.setRoles(List.of());
        return new LoginUser(user.getUserId(), 1L, user, roleKey == null ? Set.of() : OsgTestPermissions.permissionsForRole(roleKey));
    }

    private OsgPosition buildPosition(Long positionId, String industry, String companyName, String positionName,
                                      String positionCategory, String city, String projectYear,
                                      String recruitmentCycle, String displayStatus, String publishTime)
    {
        OsgPosition position = new OsgPosition();
        position.setPositionId(positionId);
        position.setIndustry(industry);
        position.setCompanyName(companyName);
        position.setPositionName(positionName);
        position.setPositionCategory(positionCategory);
        position.setCompanyType(industry);
        position.setRegion(city);
        position.setCity(city);
        position.setProjectYear(projectYear);
        position.setRecruitmentCycle(recruitmentCycle);
        position.setDisplayStatus(displayStatus);
        position.setPublishTime(Timestamp.valueOf(LocalDateTime.parse(publishTime.replace(" ", "T"))));
        position.setStudentCount(9);
        return position;
    }

    private OsgJobApplication buildApplication(Long applicationId, Long studentId, Long positionId,
                                               Long leadMentorId, String studentName, String currentStage,
                                               String coachingStatus, String submittedAt)
    {
        OsgJobApplication application = new OsgJobApplication();
        application.setApplicationId(applicationId);
        application.setStudentId(studentId);
        application.setPositionId(positionId);
        application.setLeadMentorId(leadMentorId);
        application.setStudentName(studentName);
        application.setCurrentStage(currentStage);
        application.setCoachingStatus(coachingStatus);
        application.setSubmittedAt(Timestamp.valueOf(LocalDateTime.parse(submittedAt.replace(" ", "T"))));
        return application;
    }

    private OsgCoaching buildCoaching(Long applicationId, int totalHours)
    {
        OsgCoaching coaching = new OsgCoaching();
        coaching.setApplicationId(applicationId);
        coaching.setTotalHours(totalHours);
        return coaching;
    }

    private OsgPosition clonePosition(OsgPosition source)
    {
        OsgPosition target = new OsgPosition();
        target.setPositionId(source.getPositionId());
        target.setPositionCategory(source.getPositionCategory());
        target.setIndustry(source.getIndustry());
        target.setCompanyName(source.getCompanyName());
        target.setCompanyType(source.getCompanyType());
        target.setCompanyWebsite(source.getCompanyWebsite());
        target.setPositionName(source.getPositionName());
        target.setDepartment(source.getDepartment());
        target.setRegion(source.getRegion());
        target.setCity(source.getCity());
        target.setRecruitmentCycle(source.getRecruitmentCycle());
        target.setProjectYear(source.getProjectYear());
        target.setPublishTime(source.getPublishTime());
        target.setDeadline(source.getDeadline());
        target.setDisplayStatus(source.getDisplayStatus());
        target.setPositionUrl(source.getPositionUrl());
        target.setApplicationNote(source.getApplicationNote());
        target.setStudentCount(source.getStudentCount());
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

    private boolean matchKeyword(String keyword, OsgPosition row)
    {
        if (keyword == null)
        {
            return true;
        }

        return containsIgnoreCase(row.getPositionName(), keyword)
            || containsIgnoreCase(row.getCompanyName(), keyword)
            || containsIgnoreCase(row.getDepartment(), keyword);
    }

    private boolean containsIgnoreCase(String source, String keyword)
    {
        return source != null && source.toLowerCase().contains(keyword.toLowerCase());
    }
}
