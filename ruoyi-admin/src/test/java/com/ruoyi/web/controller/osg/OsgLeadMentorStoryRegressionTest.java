package com.ruoyi.web.controller.osg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import com.ruoyi.common.constant.HttpStatus;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginBody;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.framework.web.service.SysLoginService;
import com.ruoyi.framework.web.service.SysPasswordService;
import com.ruoyi.system.domain.OsgClassRecord;
import com.ruoyi.system.domain.OsgJobApplication;
import com.ruoyi.system.domain.OsgPosition;
import com.ruoyi.system.service.IOsgClassRecordService;
import com.ruoyi.system.service.IOsgLeadMentorJobOverviewService;
import com.ruoyi.system.service.IOsgLeadMentorMockPracticeService;
import com.ruoyi.system.service.IOsgLeadMentorPositionService;
import com.ruoyi.system.service.IOsgLeadMentorStudentService;
import com.ruoyi.system.service.impl.OsgLeadMentorAccessService;
import com.ruoyi.system.service.impl.OsgLeadMentorProfileService;
import com.ruoyi.system.service.impl.OsgLeadMentorScheduleService;
import com.ruoyi.web.controller.system.SysPasswordController;

@ExtendWith(MockitoExtension.class)
class OsgLeadMentorStoryRegressionTest
{
    @InjectMocks
    private OsgLeadMentorAuthController authController;

    @InjectMocks
    private SysPasswordController passwordController;

    @InjectMocks
    private OsgLeadMentorPositionController positionController;

    @InjectMocks
    private OsgLeadMentorJobOverviewController jobOverviewController;

    @InjectMocks
    private OsgLeadMentorMockPracticeController mockPracticeController;

    @InjectMocks
    private OsgLeadMentorStudentController studentController;

    @InjectMocks
    private OsgLeadMentorClassRecordController classRecordController;

    @InjectMocks
    private OsgLeadMentorProfileController profileController;

    @InjectMocks
    private OsgLeadMentorScheduleController scheduleController;

    @Mock
    private SysLoginService loginService;

    @Mock
    private OsgLeadMentorAccessService leadMentorAccessService;

    @Mock
    private IOsgLeadMentorPositionService leadMentorPositionService;

    @Mock
    private IOsgLeadMentorJobOverviewService leadMentorJobOverviewService;

    @Mock
    private IOsgLeadMentorMockPracticeService leadMentorMockPracticeService;

    @Mock
    private IOsgLeadMentorStudentService leadMentorStudentService;

    @Mock
    private IOsgClassRecordService classRecordService;

    @Mock
    private OsgLeadMentorProfileService leadMentorProfileService;

    @Mock
    private OsgLeadMentorScheduleService leadMentorScheduleService;

    @Mock
    private SysPasswordService passwordService;

    private MockedStatic<SecurityUtils> securityMock;

    @BeforeEach
    void setUp()
    {
        securityMock = Mockito.mockStatic(SecurityUtils.class);
    }

    @AfterEach
    void tearDown()
    {
        securityMock.close();
    }

    @Test
    void storyHappyPathProvidesPasswordResetAndLeadMentorLoginEntry()
    {
        Map<String, String> sendCodeParams = new HashMap<>();
        sendCodeParams.put("email", "leadmentor@example.com");
        doNothing().when(passwordService).sendResetCode("leadmentor@example.com");

        AjaxResult sendCodeResult = passwordController.sendCode(sendCodeParams);
        assertEquals(200, sendCodeResult.get("code"));

        Map<String, String> verifyParams = new HashMap<>();
        verifyParams.put("email", "leadmentor@example.com");
        verifyParams.put("code", "123456");
        when(passwordService.verifyResetCode("leadmentor@example.com", "123456")).thenReturn("reset-token");

        AjaxResult verifyResult = passwordController.verify(verifyParams);
        assertEquals(200, verifyResult.get("code"));
        @SuppressWarnings("unchecked")
        Map<String, Object> verifyData = (Map<String, Object>) verifyResult.get("data");
        assertEquals("reset-token", verifyData.get("resetToken"));

        Map<String, String> resetParams = new HashMap<>();
        resetParams.put("email", "leadmentor@example.com");
        resetParams.put("password", "LeadMentor123");
        resetParams.put("resetToken", "reset-token");
        doNothing().when(passwordService).resetPassword("leadmentor@example.com", "LeadMentor123", "reset-token");

        AjaxResult resetResult = passwordController.reset(resetParams);
        assertEquals(200, resetResult.get("code"));

        SysUser user = new SysUser();
        user.setUserId(810L);
        user.setUserName("leadmentor_demo");
        user.setEmail("leadmentor@example.com");
        when(leadMentorAccessService.findUserByLogin("leadmentor_demo")).thenReturn(user);
        when(leadMentorAccessService.hasLeadMentorAccess(user)).thenReturn(true);
        when(loginService.loginWithoutCaptcha("leadmentor_demo", "LeadMentor123", false)).thenReturn("lead-token");

        LoginBody loginBody = new LoginBody();
        loginBody.setUsername("leadmentor_demo");
        loginBody.setPassword("LeadMentor123");

        AjaxResult loginResult = authController.login(loginBody);
        assertEquals(200, loginResult.get("code"));
        assertEquals("lead-token", loginResult.get("token"));

        LoginUser loginUser = new LoginUser(810L, null, user, Collections.emptySet());
        securityMock.when(SecurityUtils::getLoginUser).thenReturn(loginUser);
        when(leadMentorAccessService.buildPortalRoles(user)).thenReturn(Set.of("lead-mentor"));

        AjaxResult infoResult = authController.getInfo();
        assertEquals(200, infoResult.get("code"));
        assertEquals(Set.of("lead-mentor"), infoResult.get("roles"));
    }

    @Test
    void storyUnauthorizedBoundaryRejectsUsersWithoutLeadMentorAccess()
    {
        SysUser user = new SysUser();
        user.setUserId(811L);
        user.setUserName("mentor_only");

        when(leadMentorAccessService.findUserByLogin("mentor_only")).thenReturn(user);
        when(leadMentorAccessService.hasLeadMentorAccess(user)).thenReturn(false);

        LoginBody loginBody = new LoginBody();
        loginBody.setUsername("mentor_only");
        loginBody.setPassword("secret123");

        AjaxResult loginResult = authController.login(loginBody);

        assertEquals(HttpStatus.FORBIDDEN, loginResult.get("code"));
        assertEquals("该账号无班主任端访问权限", loginResult.get("msg"));
        verify(leadMentorAccessService).hasLeadMentorAccess(user);
    }

    @Test
    void storyS041HappyPathExposesScopedListAndStudentsDetailEntry()
    {
        SysUser user = buildLeadMentorUser(810L, "leadmentor_positions");
        LoginUser loginUser = new LoginUser(810L, null, user, Collections.emptySet());
        securityMock.when(SecurityUtils::getLoginUser).thenReturn(loginUser);
        securityMock.when(SecurityUtils::getUserId).thenReturn(810L);

        when(leadMentorAccessService.hasLeadMentorAccess(user)).thenReturn(true);
        when(leadMentorPositionService.selectPositionList(any(OsgPosition.class), eq(810L)))
            .thenReturn(List.of(Map.of("positionId", 101L, "companyName", "Goldman Sachs", "myStudentCount", 1)));
        when(leadMentorPositionService.selectPositionStudents(101L, 810L))
            .thenReturn(List.of(Map.of("studentId", 3001L, "studentName", "Alice", "currentStage", "二面中", "usedHours", 10)));

        AjaxResult listResult = positionController.list(new OsgPosition());
        AjaxResult studentsResult = positionController.students(101L);

        assertEquals(200, listResult.get("code"));
        assertEquals(200, studentsResult.get("code"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) listResult.get("rows");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> students = (List<Map<String, Object>>) studentsResult.get("data");
        assertEquals("Goldman Sachs", rows.get(0).get("companyName"));
        assertEquals(1, rows.get(0).get("myStudentCount"));
        assertEquals(3001L, students.get(0).get("studentId"));
        assertEquals("二面中", students.get(0).get("currentStage"));
        assertEquals(10, students.get(0).get("usedHours"));
    }

    @Test
    void storyS041BoundaryRejectsStudentsDetailWithoutLeadMentorAccess()
    {
        SysUser user = buildLeadMentorUser(811L, "outsider_positions");
        LoginUser loginUser = new LoginUser(811L, null, user, Collections.emptySet());
        securityMock.when(SecurityUtils::getLoginUser).thenReturn(loginUser);

        when(leadMentorAccessService.hasLeadMentorAccess(user)).thenReturn(false);

        AjaxResult result = positionController.students(101L);

        assertEquals(HttpStatus.FORBIDDEN, result.get("code"));
        assertEquals("该账号无班主任端访问权限", result.get("msg"));
        verifyNoInteractions(leadMentorPositionService);
    }

    @Test
    void storyS041RefreshPathCanObserveUpdatedScopedStudentsDetail()
    {
        SysUser user = buildLeadMentorUser(810L, "leadmentor_positions");
        LoginUser loginUser = new LoginUser(810L, null, user, Collections.emptySet());
        securityMock.when(SecurityUtils::getLoginUser).thenReturn(loginUser);
        securityMock.when(SecurityUtils::getUserId).thenReturn(810L);

        when(leadMentorAccessService.hasLeadMentorAccess(user)).thenReturn(true);
        when(leadMentorPositionService.selectPositionStudents(101L, 810L))
            .thenReturn(
                List.of(Map.of("studentId", 3001L, "currentStage", "已投递", "usedHours", 6)),
                List.of(
                    Map.of("studentId", 3004L, "currentStage", "Offer", "usedHours", 12),
                    Map.of("studentId", 3001L, "currentStage", "已投递", "usedHours", 6)
                )
            );

        AjaxResult first = positionController.students(101L);
        AjaxResult second = positionController.students(101L);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> firstRows = (List<Map<String, Object>>) first.get("data");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> secondRows = (List<Map<String, Object>>) second.get("data");
        assertNotNull(firstRows);
        assertNotNull(secondRows);
        assertEquals(1, firstRows.size());
        assertEquals(2, secondRows.size());
        assertEquals(3004L, secondRows.get(0).get("studentId"));
        assertEquals("Offer", secondRows.get(0).get("currentStage"));
    }

    @Test
    void storyS042HappyPathExposesScopedTabsDetailAssignAndAckEntry()
    {
        SysUser user = buildLeadMentorUser(810L, "leadmentor_jobs");
        LoginUser loginUser = new LoginUser(810L, null, user, Collections.emptySet());
        securityMock.when(SecurityUtils::getLoginUser).thenReturn(loginUser);
        securityMock.when(SecurityUtils::getUserId).thenReturn(810L);

        when(leadMentorAccessService.hasLeadMentorAccess(user)).thenReturn(true);
        when(leadMentorJobOverviewService.selectOverviewList(eq("managed"), any(OsgJobApplication.class), eq(810L)))
            .thenReturn(List.of(
                Map.of(
                    "applicationId", 7003L,
                    "studentName", "Cindy",
                    "currentStage", "Second Round",
                    "mentorNames", "Jerry Li",
                    "stageUpdated", true
                )
            ));
        when(leadMentorJobOverviewService.selectOverviewDetail(7002L, 810L))
            .thenReturn(new HashMap<>(Map.of(
                "applicationId", 7002L,
                "studentName", "Bob",
                "currentStage", "Case Study",
                "mentorNames", "Jess, Amy",
                "hoursUsed", 6,
                "feedbackSummary", "拆分 case study 讲解后通过率提升"
            )));
        when(leadMentorJobOverviewService.assignMentors(eq(7002L), any(Map.class), eq(810L), eq("leadmentor_jobs")))
            .thenReturn(new HashMap<>(Map.of(
                "applicationId", 7002L,
                "coachingStatus", "辅导中",
                "mentorNames", "Jerry Li, Mike Wang"
            )));
        when(leadMentorJobOverviewService.acknowledgeStageUpdate(7003L, 810L, "leadmentor_jobs"))
            .thenReturn(new HashMap<>(Map.of(
                "applicationId", 7003L,
                "currentStage", "Second Round",
                "stageUpdated", false
            )));

        AjaxResult listResult = jobOverviewController.list("managed", new OsgJobApplication());
        AjaxResult detailResult = jobOverviewController.detail(7002L);
        AjaxResult assignResult = jobOverviewController.assignMentor(
            7002L,
            new HashMap<>(Map.of(
                "mentorIds", List.of(9001L, 9002L),
                "mentorNames", List.of("Jerry Li", "Mike Wang")
            ))
        );
        AjaxResult ackResult = jobOverviewController.acknowledgeStageUpdate(7003L);

        assertEquals(200, listResult.get("code"));
        assertEquals(200, detailResult.get("code"));
        assertEquals(200, assignResult.get("code"));
        assertEquals(200, ackResult.get("code"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) listResult.get("rows");
        @SuppressWarnings("unchecked")
        Map<String, Object> detail = (Map<String, Object>) detailResult.get("data");
        @SuppressWarnings("unchecked")
        Map<String, Object> assign = (Map<String, Object>) assignResult.get("data");
        @SuppressWarnings("unchecked")
        Map<String, Object> ack = (Map<String, Object>) ackResult.get("data");
        assertEquals("Cindy", rows.get(0).get("studentName"));
        assertEquals("Case Study", detail.get("currentStage"));
        assertEquals(6, detail.get("hoursUsed"));
        assertEquals("Jerry Li, Mike Wang", assign.get("mentorNames"));
        assertEquals(Boolean.FALSE, ack.get("stageUpdated"));
    }

    @Test
    void storyS042BoundaryRejectsJobOverviewRequestsWithoutLeadMentorAccess()
    {
        SysUser user = buildLeadMentorUser(811L, "outsider_jobs");
        LoginUser loginUser = new LoginUser(811L, null, user, Collections.emptySet());
        securityMock.when(SecurityUtils::getLoginUser).thenReturn(loginUser);

        when(leadMentorAccessService.hasLeadMentorAccess(user)).thenReturn(false);

        AjaxResult listResult = jobOverviewController.list("coaching", new OsgJobApplication());
        AjaxResult detailResult = jobOverviewController.detail(7002L);

        assertEquals(HttpStatus.FORBIDDEN, listResult.get("code"));
        assertEquals(HttpStatus.FORBIDDEN, detailResult.get("code"));
        assertEquals("该账号无班主任端访问权限", listResult.get("msg"));
        verifyNoInteractions(leadMentorJobOverviewService);
    }

    @Test
    void storyS042RefreshPathCanObserveUpdatedManagedStageEntry()
    {
        SysUser user = buildLeadMentorUser(810L, "leadmentor_jobs");
        LoginUser loginUser = new LoginUser(810L, null, user, Collections.emptySet());
        securityMock.when(SecurityUtils::getLoginUser).thenReturn(loginUser);
        securityMock.when(SecurityUtils::getUserId).thenReturn(810L);

        when(leadMentorAccessService.hasLeadMentorAccess(user)).thenReturn(true);
        when(leadMentorJobOverviewService.selectOverviewList(eq("managed"), any(OsgJobApplication.class), eq(810L)))
            .thenReturn(
                List.of(Map.of("applicationId", 7003L, "studentName", "Cindy", "stageUpdated", true)),
                List.of(Map.of("applicationId", 7003L, "studentName", "Cindy", "stageUpdated", false))
            );

        AjaxResult first = jobOverviewController.list("managed", new OsgJobApplication());
        AjaxResult second = jobOverviewController.list("managed", new OsgJobApplication());

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> firstRows = (List<Map<String, Object>>) first.get("rows");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> secondRows = (List<Map<String, Object>>) second.get("rows");
        assertNotNull(firstRows);
        assertNotNull(secondRows);
        assertEquals(Boolean.TRUE, firstRows.get(0).get("stageUpdated"));
        assertEquals(Boolean.FALSE, secondRows.get(0).get("stageUpdated"));
    }

    @Test
    void storyS043HappyPathExposesScopedTabsFeedbackAssignAndAckEntry()
    {
        SysUser user = buildLeadMentorUser(810L, "leadmentor_mock");
        LoginUser loginUser = new LoginUser(810L, null, user, Collections.emptySet());
        securityMock.when(SecurityUtils::getLoginUser).thenReturn(loginUser);
        securityMock.when(SecurityUtils::getUserId).thenReturn(810L);

        when(leadMentorAccessService.hasLeadMentorAccess(user)).thenReturn(true);
        when(leadMentorMockPracticeService.selectScopedStats(null, null, null, 810L))
            .thenReturn(Map.of(
                "pendingCount", 1,
                "scheduledCount", 1,
                "completedCount", 1,
                "cancelledCount", 0,
                "totalCount", 3
            ));
        when(leadMentorMockPracticeService.selectPracticeList("pending", null, null, null, 810L))
            .thenReturn(List.of(
                Map.of(
                    "practiceId", 9001L,
                    "studentName", "Alice",
                    "practiceType", "模拟面试",
                    "status", "pending"
                )
            ));
        when(leadMentorMockPracticeService.selectPracticeDetail(9003L, 810L))
            .thenReturn(new HashMap<>(Map.of(
                "practiceId", 9003L,
                "studentName", "Cindy",
                "mentorNames", "Jerry Li",
                "completedHoursLabel", "2h",
                "feedbackRating", 4,
                "feedbackSummary", "表现稳定，框架清晰"
            )));
        when(leadMentorMockPracticeService.assignPractice(eq(9001L), any(Map.class), eq(810L), eq("leadmentor_mock")))
            .thenReturn(new HashMap<>(Map.of(
                "practiceId", 9001L,
                "status", "scheduled",
                "statusLabel", "新分配",
                "mentorNames", "Jerry Li, Mike Chen"
            )));
        when(leadMentorMockPracticeService.acknowledgeAssignment(9002L, 810L, "leadmentor_mock"))
            .thenReturn(new HashMap<>(Map.of(
                "practiceId", 9002L,
                "status", "confirmed",
                "statusLabel", "已确认"
            )));

        AjaxResult statsResult = mockPracticeController.stats(null, null, null);
        AjaxResult listResult = mockPracticeController.list("pending", null, null, null);
        AjaxResult detailResult = mockPracticeController.detail(9003L);
        AjaxResult assignResult = mockPracticeController.assign(
            9001L,
            new HashMap<>(Map.of(
                "mentorIds", List.of(9201L, 9202L),
                "scheduledAt", "2026-03-25T09:30",
                "note", "优先安排一面复盘"
            ))
        );
        AjaxResult ackResult = mockPracticeController.acknowledgeAssignment(9002L);

        assertEquals(200, statsResult.get("code"));
        assertEquals(200, listResult.get("code"));
        assertEquals(200, detailResult.get("code"));
        assertEquals(200, assignResult.get("code"));
        assertEquals(200, ackResult.get("code"));
        @SuppressWarnings("unchecked")
        Map<String, Object> stats = (Map<String, Object>) statsResult.get("data");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) listResult.get("rows");
        @SuppressWarnings("unchecked")
        Map<String, Object> detail = (Map<String, Object>) detailResult.get("data");
        @SuppressWarnings("unchecked")
        Map<String, Object> assign = (Map<String, Object>) assignResult.get("data");
        @SuppressWarnings("unchecked")
        Map<String, Object> ack = (Map<String, Object>) ackResult.get("data");
        assertEquals(1, stats.get("pendingCount"));
        assertEquals("Alice", rows.get(0).get("studentName"));
        assertEquals("Cindy", detail.get("studentName"));
        assertEquals("表现稳定，框架清晰", detail.get("feedbackSummary"));
        assertEquals("Jerry Li, Mike Chen", assign.get("mentorNames"));
        assertEquals("已确认", ack.get("statusLabel"));
    }

    @Test
    void storyS043BoundaryRejectsMockPracticeRequestsWithoutLeadMentorAccess()
    {
        SysUser user = buildLeadMentorUser(811L, "outsider_mock");
        LoginUser loginUser = new LoginUser(811L, null, user, Collections.emptySet());
        securityMock.when(SecurityUtils::getLoginUser).thenReturn(loginUser);

        when(leadMentorAccessService.hasLeadMentorAccess(user)).thenReturn(false);

        AjaxResult listResult = mockPracticeController.list("pending", null, null, null);
        AjaxResult detailResult = mockPracticeController.detail(9003L);

        assertEquals(HttpStatus.FORBIDDEN, listResult.get("code"));
        assertEquals(HttpStatus.FORBIDDEN, detailResult.get("code"));
        assertEquals("该账号无班主任端访问权限", listResult.get("msg"));
        verifyNoInteractions(leadMentorMockPracticeService);
    }

    @Test
    void storyS043RefreshPathCanObserveUpdatedPendingAndCoachingEntries()
    {
        SysUser user = buildLeadMentorUser(810L, "leadmentor_mock");
        LoginUser loginUser = new LoginUser(810L, null, user, Collections.emptySet());
        securityMock.when(SecurityUtils::getLoginUser).thenReturn(loginUser);
        securityMock.when(SecurityUtils::getUserId).thenReturn(810L);

        when(leadMentorAccessService.hasLeadMentorAccess(user)).thenReturn(true);
        when(leadMentorMockPracticeService.selectPracticeList("pending", null, null, null, 810L))
            .thenReturn(
                List.of(Map.of("practiceId", 9001L, "status", "pending", "studentName", "Alice")),
                List.of()
            );
        when(leadMentorMockPracticeService.selectPracticeList("coaching", null, null, null, 810L))
            .thenReturn(
                List.of(Map.of("practiceId", 9002L, "status", "scheduled", "statusLabel", "新分配")),
                List.of(Map.of("practiceId", 9002L, "status", "confirmed", "statusLabel", "已确认"))
            );
        when(leadMentorMockPracticeService.selectScopedStats(null, null, null, 810L))
            .thenReturn(Map.of(
                "pendingCount", 1,
                "scheduledCount", 1,
                "completedCount", 0,
                "cancelledCount", 0,
                "totalCount", 2
            ));

        AjaxResult pendingFirst = mockPracticeController.list("pending", null, null, null);
        AjaxResult pendingSecond = mockPracticeController.list("pending", null, null, null);
        AjaxResult coachingFirst = mockPracticeController.list("coaching", null, null, null);
        AjaxResult coachingSecond = mockPracticeController.list("coaching", null, null, null);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> pendingFirstRows = (List<Map<String, Object>>) pendingFirst.get("rows");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> pendingSecondRows = (List<Map<String, Object>>) pendingSecond.get("rows");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> coachingFirstRows = (List<Map<String, Object>>) coachingFirst.get("rows");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> coachingSecondRows = (List<Map<String, Object>>) coachingSecond.get("rows");
        assertNotNull(pendingFirstRows);
        assertNotNull(pendingSecondRows);
        assertNotNull(coachingFirstRows);
        assertNotNull(coachingSecondRows);
        assertEquals(1, pendingFirstRows.size());
        assertEquals(0, pendingSecondRows.size());
        assertEquals("新分配", coachingFirstRows.get(0).get("statusLabel"));
        assertEquals("已确认", coachingSecondRows.get(0).get("statusLabel"));
    }

    @Test
    void storyS044HappyPathExposesStudentUnionListAndMetaEntry()
    {
        SysUser user = buildLeadMentorUser(810L, "leadmentor_students");
        LoginUser loginUser = new LoginUser(810L, null, user, Collections.emptySet());
        securityMock.when(SecurityUtils::getLoginUser).thenReturn(loginUser);
        securityMock.when(SecurityUtils::getUserId).thenReturn(810L);

        when(leadMentorAccessService.hasLeadMentorAccess(user)).thenReturn(true);
        when(leadMentorStudentService.selectStudentList(null, null, null, null, null, 810L))
            .thenReturn(List.of(
                Map.of(
                    "studentId", 6202L,
                    "studentName", "Marco He",
                    "relations", List.of(
                        Map.of("value", "coaching", "label", "我教的学员"),
                        Map.of("value", "managed", "label", "班主任为我")
                    ),
                    "applyCount", 3,
                    "remainingHours", 9
                )
            ));
        when(leadMentorStudentService.selectStudentMeta(810L))
            .thenReturn(Map.of(
                "relationOptions", List.of(Map.of("value", "coaching", "label", "我教的学员")),
                "schools", List.of(Map.of("value", "Harvard", "label", "Harvard"))
            ));

        AjaxResult listResult = studentController.list(null, null, null, null, null, null);
        AjaxResult metaResult = studentController.meta();

        assertEquals(200, listResult.get("code"));
        assertEquals(200, metaResult.get("code"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) listResult.get("rows");
        @SuppressWarnings("unchecked")
        Map<String, Object> meta = (Map<String, Object>) metaResult.get("data");
        assertEquals("Marco He", rows.get(0).get("studentName"));
        assertEquals(3, rows.get(0).get("applyCount"));
        assertEquals(9, rows.get(0).get("remainingHours"));
        assertNotNull(rows.get(0).get("relations"));
        assertNotNull(meta.get("relationOptions"));
    }

    @Test
    void storyS044BoundaryRejectsStudentListRequestsWithoutLeadMentorAccess()
    {
        SysUser user = buildLeadMentorUser(811L, "outsider_students");
        LoginUser loginUser = new LoginUser(811L, null, user, Collections.emptySet());
        securityMock.when(SecurityUtils::getLoginUser).thenReturn(loginUser);

        when(leadMentorAccessService.hasLeadMentorAccess(user)).thenReturn(false);

        AjaxResult listResult = studentController.list(null, null, null, null, null, null);
        AjaxResult metaResult = studentController.meta();

        assertEquals(HttpStatus.FORBIDDEN, listResult.get("code"));
        assertEquals(HttpStatus.FORBIDDEN, metaResult.get("code"));
        assertEquals("该账号无班主任端访问权限", listResult.get("msg"));
        verifyNoInteractions(leadMentorStudentService);
    }

    @Test
    void storyS044RefreshPathCanObserveUpdatedStudentUnionRows()
    {
        SysUser user = buildLeadMentorUser(810L, "leadmentor_students");
        LoginUser loginUser = new LoginUser(810L, null, user, Collections.emptySet());
        securityMock.when(SecurityUtils::getLoginUser).thenReturn(loginUser);
        securityMock.when(SecurityUtils::getUserId).thenReturn(810L);

        when(leadMentorAccessService.hasLeadMentorAccess(user)).thenReturn(true);
        when(leadMentorStudentService.selectStudentList(null, null, null, null, null, 810L))
            .thenReturn(
                List.of(Map.of("studentId", 6201L, "studentName", "Luna Xu", "relations", List.of(Map.of("value", "managed")))),
                List.of(Map.of(
                    "studentId", 6201L,
                    "studentName", "Luna Xu",
                    "relations", List.of(
                        Map.of("value", "coaching"),
                        Map.of("value", "managed")
                    )
                ))
            );

        AjaxResult first = studentController.list(null, null, null, null, null, null);
        AjaxResult second = studentController.list(null, null, null, null, null, null);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> firstRows = (List<Map<String, Object>>) first.get("rows");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> secondRows = (List<Map<String, Object>>) second.get("rows");
        assertNotNull(firstRows);
        assertNotNull(secondRows);
        assertEquals(1, ((List<?>) firstRows.get(0).get("relations")).size());
        assertEquals(2, ((List<?>) secondRows.get(0).get("relations")).size());
    }

    @Test
    void storyS045HappyPathExposesRealCreateEntryForManagedStudent()
    {
        SysUser user = buildLeadMentorUser(810L, "leadmentor_classes");
        LoginUser loginUser = new LoginUser(810L, null, user, Collections.emptySet());
        securityMock.when(SecurityUtils::getLoginUser).thenReturn(loginUser);
        securityMock.when(SecurityUtils::getUserId).thenReturn(810L);
        securityMock.when(SecurityUtils::getUsername).thenReturn("leadmentor_classes");

        when(leadMentorAccessService.hasLeadMentorAccess(user)).thenReturn(true);
        when(classRecordService.createLeadMentorClassRecord(any(OsgClassRecord.class)))
            .thenReturn(new HashMap<>(Map.of(
                "recordId", 6051L,
                "studentId", 12903L,
                "studentName", "钱七",
                "mentorId", 810L,
                "mentorName", "leadmentor_classes",
                "courseType", "job_coaching",
                "classStatus", "case_prep",
                "status", "pending"
            )));

        OsgClassRecord payload = new OsgClassRecord();
        payload.setStudentId(12903L);
        payload.setCourseType("job_coaching");
        payload.setClassStatus("case_prep");
        payload.setFeedbackContent("根据驳回意见重新核实课时并补充案例反馈。");

        AjaxResult result = classRecordController.create(payload);

        assertEquals(200, result.get("code"));
        @SuppressWarnings("unchecked")
        Map<String, Object> created = (Map<String, Object>) result.get("data");
        assertEquals(6051L, created.get("recordId"));
        assertEquals(12903L, created.get("studentId"));
        assertEquals("钱七", created.get("studentName"));
        assertEquals("pending", created.get("status"));
        verify(classRecordService).createLeadMentorClassRecord(any(OsgClassRecord.class));
    }

    @Test
    void storyS045BoundaryRejectsCreateWhenUserLacksLeadMentorAccess()
    {
        SysUser user = buildLeadMentorUser(811L, "outsider_classes");
        LoginUser loginUser = new LoginUser(811L, null, user, Collections.emptySet());
        securityMock.when(SecurityUtils::getLoginUser).thenReturn(loginUser);

        when(leadMentorAccessService.hasLeadMentorAccess(user)).thenReturn(false);

        OsgClassRecord payload = new OsgClassRecord();
        payload.setStudentId(12903L);
        payload.setCourseType("job_coaching");
        payload.setClassStatus("case_prep");
        payload.setFeedbackContent("Should never be accepted");

        AjaxResult result = classRecordController.create(payload);

        assertEquals(HttpStatus.FORBIDDEN, result.get("code"));
        assertEquals("该账号无班主任端访问权限", result.get("msg"));
        verifyNoInteractions(classRecordService);
    }

    @Test
    void storyS046HappyPathReadsOwnProfileAndCreatesChangeRequest()
    {
        SysUser user = buildLeadMentorUser(810L, "leadmentor_profile");
        user.setNickName("Jess Lead Mentor");
        user.setEmail("lead@example.com");
        user.setPhonenumber("+86 138-0013-8000");
        user.setSex("0");
        LoginUser loginUser = new LoginUser(810L, null, user, Collections.emptySet());
        securityMock.when(SecurityUtils::getLoginUser).thenReturn(loginUser);
        securityMock.when(SecurityUtils::getUsername).thenReturn("leadmentor_profile");

        when(leadMentorAccessService.hasLeadMentorAccess(user)).thenReturn(true);
        when(leadMentorProfileService.selectProfileView(user)).thenReturn(Map.of(
            "profile", Map.of(
                "staffId", 810L,
                "englishName", "Jess Lead Mentor",
                "genderLabel", "Male",
                "email", "lead@example.com"
            ),
            "pendingChanges", List.of(Map.of(
                "changeRequestId", 9101L,
                "fieldKey", "phone",
                "afterValue", "+86 139-0000-0000",
                "status", "pending"
            )),
            "pendingCount", 1
        ));
        when(leadMentorProfileService.submitChangeRequest(eq(user), eq("leadmentor_profile"), any())).thenReturn(Map.of(
            "staffId", 810L,
            "changeRequestId", 9201L,
            "createdCount", 1,
            "profile", Map.of(
                "staffId", 810L,
                "englishName", "Jess Lead Mentor"
            ),
            "pendingChanges", List.of(Map.of(
                "changeRequestId", 9201L,
                "fieldKey", "phone",
                "afterValue", "+86 139-0000-1111",
                "status", "pending"
            )),
            "pendingCount", 2,
            "requests", List.of(Map.of(
                "changeRequestId", 9201L,
                "fieldKey", "phone",
                "afterValue", "+86 139-0000-1111",
                "status", "pending"
            ))
        ));

        AjaxResult profileResult = profileController.profile();
        AjaxResult submitResult = profileController.submitChangeRequest(Map.of(
            "phone", "+86 139-0000-1111",
            "regionArea", "中国大陆",
            "regionCity", "Shanghai 上海"
        ));

        assertEquals(200, profileResult.get("code"));
        assertEquals(200, submitResult.get("code"));
        @SuppressWarnings("unchecked")
        Map<String, Object> profileData = (Map<String, Object>) profileResult.get("data");
        @SuppressWarnings("unchecked")
        Map<String, Object> submitData = (Map<String, Object>) submitResult.get("data");
        assertEquals(810L, ((Map<?, ?>) profileData.get("profile")).get("staffId"));
        assertEquals(1, profileData.get("pendingCount"));
        assertEquals(9201L, submitData.get("changeRequestId"));
        assertEquals(2, submitData.get("pendingCount"));
    }

    @Test
    void storyS046BoundaryRejectsUnauthorizedAndCrossStaffProfileChange()
    {
        SysUser outsider = buildLeadMentorUser(811L, "outsider_profile");
        LoginUser loginUser = new LoginUser(811L, null, outsider, Collections.emptySet());
        securityMock.when(SecurityUtils::getLoginUser).thenReturn(loginUser);

        when(leadMentorAccessService.hasLeadMentorAccess(outsider)).thenReturn(false);

        AjaxResult profileResult = profileController.profile();
        AjaxResult submitResult = profileController.submitChangeRequest(Map.of("staffId", 999L, "phone", "+86 139-0000-0000"));

        assertEquals(HttpStatus.FORBIDDEN, profileResult.get("code"));
        assertEquals(HttpStatus.FORBIDDEN, submitResult.get("code"));
        verifyNoInteractions(leadMentorProfileService);

        when(leadMentorAccessService.hasLeadMentorAccess(outsider)).thenReturn(true);
        when(leadMentorProfileService.submitChangeRequest(eq(outsider), eq("outsider_profile"), any()))
            .thenThrow(new ServiceException("仅允许提交本人资料变更申请"));

        AjaxResult crossStaffResult = profileController.submitChangeRequest(Map.of("staffId", 999L, "phone", "+86 139-0000-0000"));

        assertEquals(HttpStatus.FORBIDDEN, crossStaffResult.get("code"));
        assertEquals("仅允许提交本人资料变更申请", crossStaffResult.get("msg"));
    }

    @Test
    void storyS047HappyPathReadsOwnCurrentScheduleAndSavesNextWeekState()
    {
        SysUser user = buildLeadMentorUser(810L, "leadmentor_schedule");
        user.setEmail("lead@example.com");
        LoginUser loginUser = new LoginUser(810L, null, user, Collections.emptySet());
        securityMock.when(SecurityUtils::getLoginUser).thenReturn(loginUser);
        securityMock.when(SecurityUtils::getUsername).thenReturn("leadmentor_schedule");

        when(leadMentorAccessService.hasLeadMentorAccess(user)).thenReturn(true);
        when(leadMentorScheduleService.selectScheduleView(user, "current")).thenReturn(Map.of(
            "staffId", 810L,
            "weekScope", "current",
            "readonly", true,
            "filled", true,
            "availableHours", 12,
            "selectedSlotKeys", List.of("1-morning", "3-evening")
        ));
        when(leadMentorScheduleService.selectStatusView(user)).thenReturn(Map.of(
            "staffId", 810L,
            "forceScheduleModal", true,
            "nextWeekFilled", false,
            "scheduleStatus", "待填写"
        ));
        when(leadMentorScheduleService.saveNextSchedule(eq(user), eq("leadmentor_schedule"), any())).thenReturn(Map.of(
            "staffId", 810L,
            "weekScope", "next",
            "selectedSlotCount", 2,
            "selectedSlotKeys", List.of("1-morning", "3-evening"),
            "availableHours", 18,
            "note", "周三晚上保留面试时段"
        ));

        AjaxResult currentResult = scheduleController.schedule("current");
        AjaxResult statusResult = scheduleController.status();
        AjaxResult saveResult = scheduleController.saveNext(Map.of(
            "availableHours", 18,
            "selectedSlotKeys", List.of("1-morning", "3-evening"),
            "note", "周三晚上保留面试时段"
        ));

        assertEquals(200, currentResult.get("code"));
        assertEquals(200, statusResult.get("code"));
        assertEquals(200, saveResult.get("code"));
        @SuppressWarnings("unchecked")
        Map<String, Object> currentData = (Map<String, Object>) currentResult.get("data");
        @SuppressWarnings("unchecked")
        Map<String, Object> statusData = (Map<String, Object>) statusResult.get("data");
        @SuppressWarnings("unchecked")
        Map<String, Object> saveData = (Map<String, Object>) saveResult.get("data");
        assertEquals(true, currentData.get("readonly"));
        assertEquals(12, currentData.get("availableHours"));
        assertEquals(true, statusData.get("forceScheduleModal"));
        assertEquals("待填写", statusData.get("scheduleStatus"));
        assertEquals(2, saveData.get("selectedSlotCount"));
        assertEquals(18, saveData.get("availableHours"));
    }

    @Test
    void storyS047BoundaryRejectsUnauthorizedAndInvalidScheduleSave()
    {
        SysUser outsider = buildLeadMentorUser(811L, "outsider_schedule");
        LoginUser loginUser = new LoginUser(811L, null, outsider, Collections.emptySet());
        securityMock.when(SecurityUtils::getLoginUser).thenReturn(loginUser);

        when(leadMentorAccessService.hasLeadMentorAccess(outsider)).thenReturn(false);

        AjaxResult scheduleResult = scheduleController.schedule("current");
        AjaxResult saveResult = scheduleController.saveNext(Map.of(
            "availableHours", 18,
            "selectedSlotKeys", List.of("1-morning")
        ));

        assertEquals(HttpStatus.FORBIDDEN, scheduleResult.get("code"));
        assertEquals(HttpStatus.FORBIDDEN, saveResult.get("code"));
        verifyNoInteractions(leadMentorScheduleService);

        when(leadMentorAccessService.hasLeadMentorAccess(outsider)).thenReturn(true);
        when(leadMentorScheduleService.saveNextSchedule(eq(outsider), eq("outsider_schedule"), any()))
            .thenThrow(new ServiceException("下周可上课时长必须大于0"));
        securityMock.when(SecurityUtils::getUsername).thenReturn("outsider_schedule");

        AjaxResult invalidSaveResult = scheduleController.saveNext(Map.of(
            "availableHours", 0,
            "selectedSlotKeys", List.of()
        ));

        assertEquals(HttpStatus.BAD_REQUEST, invalidSaveResult.get("code"));
        assertEquals("下周可上课时长必须大于0", invalidSaveResult.get("msg"));
    }

    private SysUser buildLeadMentorUser(Long userId, String username)
    {
        SysUser user = new SysUser();
        user.setUserId(userId);
        user.setUserName(username);
        return user;
    }
}
