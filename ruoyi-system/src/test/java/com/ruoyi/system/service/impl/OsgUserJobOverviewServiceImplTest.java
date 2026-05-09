package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.lang.reflect.Method;
import java.util.Date;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgClassRecord;
import com.ruoyi.system.domain.OsgCoaching;
import com.ruoyi.system.domain.OsgJobApplication;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.OsgClassRecordMapper;
import com.ruoyi.system.mapper.OsgCoachingMapper;
import com.ruoyi.system.mapper.OsgJobApplicationMapper;
import com.ruoyi.system.mapper.OsgMockPracticeMapper;
import com.ruoyi.system.mapper.OsgStudentMapper;
import com.ruoyi.system.service.ISysDictDataService;

@ExtendWith(MockitoExtension.class)
class OsgUserJobOverviewServiceImplTest
{
    @InjectMocks
    private OsgUserJobOverviewServiceImpl service;

    @Mock
    private OsgJobApplicationMapper jobApplicationMapper;

    @Mock
    private OsgCoachingMapper coachingMapper;

    @Mock
    private OsgIdentityResolver identityResolver;

    @Mock
    private OsgStudentMapper studentMapper;

    @Mock
    private OsgMockPracticeMapper mockPracticeMapper;

    @Mock
    private OsgClassRecordMapper classRecordMapper;

    @Mock
    private ISysDictDataService dictDataService;

    @Test
    void assignMentorsStoresResolvedUserIdsInsteadOfStaffIds()
    {
        OsgJobApplication application = new OsgJobApplication();
        application.setApplicationId(7001L);
        application.setStudentId(3001L);
        application.setLeadMentorId(810L);
        application.setAssignStatus("pending");

        when(jobApplicationMapper.selectJobApplicationByApplicationId(7001L)).thenReturn(application);
        when(coachingMapper.selectCoachingByApplicationId(7001L)).thenReturn(null);
        when(identityResolver.resolveUserIdByStaffId(9201L)).thenReturn(9001L);
        when(identityResolver.resolveUserIdByStaffId(9202L)).thenReturn(9002L);
        when(coachingMapper.insertCoaching(any(OsgCoaching.class))).thenReturn(1);
        when(jobApplicationMapper.updateJobApplicationAssignment(any(OsgJobApplication.class))).thenReturn(1);

        Map<String, Object> result = service.assignMentors(
            7001L,
            Map.of(
                "mentorIds", List.of(9201L, 9202L),
                "mentorNames", List.of("Jerry Li", "Mike Wang"),
                "assignNote", "优先覆盖 First Round 题型"),
            810L,
            "leadmentor_jobs");

        assertEquals(List.of(9001L, 9002L), result.get("mentorIds"));

        ArgumentCaptor<OsgCoaching> captor = ArgumentCaptor.forClass(OsgCoaching.class);
        verify(coachingMapper).insertCoaching(captor.capture());
        assertEquals("9001,9002", captor.getValue().getMentorIds());
    }

    @Test
    void assignMentorsRejectsWhenResolverCannotResolveStaffId()
    {
        OsgJobApplication application = new OsgJobApplication();
        application.setApplicationId(7001L);
        application.setStudentId(3001L);
        application.setLeadMentorId(810L);
        application.setAssignStatus("pending");

        when(jobApplicationMapper.selectJobApplicationByApplicationId(7001L)).thenReturn(application);
        when(identityResolver.resolveUserIdByStaffId(9201L)).thenThrow(new ServiceException("员工账号不存在，无法完成导师分配"));

        ServiceException error = assertThrows(ServiceException.class, () -> service.assignMentors(
            7001L,
            Map.of("mentorIds", List.of(9201L)),
            810L,
            "leadmentor_jobs"));

        assertEquals("员工账号不存在，无法完成导师分配", error.getMessage());
    }

    @Test
    void confirmCoachingShouldUpdateConfirmedAtAndReturnLegacyStatus()
    {
        // §C.1：原子 SQL 防并发竞态 + 写 osg_job_application.coachingStatus='coaching'
        OsgJobApplication application = new OsgJobApplication();
        application.setApplicationId(7002L);
        application.setStudentId(3002L);
        application.setLeadMentorId(810L);
        application.setCurrentStage("Case Study");

        OsgCoaching coaching = new OsgCoaching();
        coaching.setCoachingId(8001L);
        coaching.setApplicationId(7002L);
        coaching.setStudentId(3002L);
        coaching.setStatus("assigned");
        coaching.setMentorId(810L);
        coaching.setMentorIds("810");

        when(jobApplicationMapper.selectJobApplicationByApplicationId(7002L)).thenReturn(application);
        when(coachingMapper.selectCoachingByApplicationId(7002L)).thenReturn(coaching);
        when(coachingMapper.selectCoachingList(any(OsgCoaching.class))).thenReturn(List.of(coaching));
        when(coachingMapper.confirmCoachingIfPending(7002L, "mentor_user")).thenReturn(1);

        Map<String, Object> result = service.confirmCoaching(7002L, 810L, "mentor_user");

        assertEquals(7002L, result.get("applicationId"));
        assertEquals("coaching", result.get("coachingStatus"));
        assertNotNull(result.get("confirmedAt"));

        // 验证原子 SQL 被调用一次
        verify(coachingMapper).confirmCoachingIfPending(7002L, "mentor_user");

        // §C.1 bug 2 修复：验证 osg_job_application.coachingStatus='coaching' 被写入
        ArgumentCaptor<OsgJobApplication> appCaptor = ArgumentCaptor.forClass(OsgJobApplication.class);
        verify(jobApplicationMapper).updateJobApplicationAssignment(appCaptor.capture());
        assertEquals(7002L, appCaptor.getValue().getApplicationId());
        assertEquals("coaching", appCaptor.getValue().getCoachingStatus());
        assertEquals("mentor_user", appCaptor.getValue().getUpdateBy());
    }

    @Test
    void confirmCoachingShouldRejectRepeatedConfirm()
    {
        // §C.1 bug 1 修复：原子 SQL 返回 affected=0 表示已被 confirm，应抛业务异常
        OsgJobApplication application = new OsgJobApplication();
        application.setApplicationId(7002L);
        application.setStudentId(3002L);

        OsgCoaching coaching = new OsgCoaching();
        coaching.setCoachingId(8001L);
        coaching.setApplicationId(7002L);
        coaching.setStudentId(3002L);
        coaching.setStatus("coaching");
        coaching.setMentorIds("810");
        coaching.setConfirmedAt(new Date()); // 已 confirmed

        when(jobApplicationMapper.selectJobApplicationByApplicationId(7002L)).thenReturn(application);
        when(coachingMapper.selectCoachingByApplicationId(7002L)).thenReturn(coaching);
        when(coachingMapper.selectCoachingList(any(OsgCoaching.class))).thenReturn(List.of(coaching));
        when(coachingMapper.confirmCoachingIfPending(7002L, "mentor_user")).thenReturn(0);

        ServiceException error = assertThrows(ServiceException.class,
            () -> service.confirmCoaching(7002L, 810L, "mentor_user"));
        assertEquals("该申请已被确认", error.getMessage());

        // 验证 jobApplicationMapper 不被调用（抛错前已退出）
        verify(jobApplicationMapper, org.mockito.Mockito.never()).updateJobApplicationAssignment(any());
    }

    @Test
    void confirmCoachingShouldRejectWhenCurrentMentorCannotAccessApplication()
    {
        OsgJobApplication application = new OsgJobApplication();
        application.setApplicationId(7002L);
        application.setStudentId(3002L);
        application.setLeadMentorId(810L);

        when(jobApplicationMapper.selectJobApplicationByApplicationId(7002L)).thenReturn(application);
        when(coachingMapper.selectCoachingList(any(OsgCoaching.class))).thenReturn(List.of());

        ServiceException error = assertThrows(ServiceException.class, () -> service.confirmCoaching(7002L, 999L, "mentor_user"));

        assertEquals("无权确认该求职申请", error.getMessage());
    }

    @Test
    void selectOverviewListShouldIncludeAssistantOwnedApplicationsForSharedAssistantView()
    {
        OsgJobApplication application = new OsgJobApplication();
        application.setApplicationId(7010L);
        application.setStudentId(3010L);
        application.setStudentName("Assistant Student");
        application.setCompanyName("Assistant Capital");
        application.setPositionName("Analyst");
        application.setCurrentStage("applied");
        application.setSubmittedAt(new Date());

        OsgStudent student = new OsgStudent();
        student.setStudentId(3010L);
        student.setAssistantId(920L);

        when(jobApplicationMapper.selectJobApplicationList(any(OsgJobApplication.class))).thenReturn(List.of(application));
        when(coachingMapper.selectCoachingList(any(OsgCoaching.class))).thenReturn(List.of());
        when(studentMapper.selectStudentByStudentIds(List.of(3010L))).thenReturn(List.of(student));

        List<Map<String, Object>> rows = service.listByLeadMentor("coaching", new OsgJobApplication(), 920L);

        assertEquals(1, rows.size());
        assertEquals(7010L, rows.get(0).get("applicationId"));
        assertEquals("Assistant Student", rows.get(0).get("studentName"));
    }

    // ===== TCS-T-302: computeApplicationStats =====

    @SuppressWarnings("unchecked")
    private Map<String, Object> invokeComputeApplicationStats(Long applicationId) throws Exception
    {
        Method method = OsgUserJobOverviewServiceImpl.class.getDeclaredMethod("computeApplicationStats", Long.class);
        method.setAccessible(true);
        return (Map<String, Object>) method.invoke(service, applicationId);
    }

    @Test
    void computeApplicationStatsReturnsZeroCountWhenApplicationIdIsNull() throws Exception
    {
        Map<String, Object> stats = invokeComputeApplicationStats(null);

        assertNull(stats.get("latestRating"));
        assertEquals(0, stats.get("lessonCount"));
        assertEquals(false, stats.get("lessonReported"));
    }

    @Test
    void computeApplicationStatsIncludesAbsentInLessonCountButSkipsForLatestRating() throws Exception
    {
        OsgClassRecord absentRecord = new OsgClassRecord();
        absentRecord.setMemberStatus("absent");
        absentRecord.setRate("5");

        OsgClassRecord normalNoRate = new OsgClassRecord();
        normalNoRate.setMemberStatus("normal");
        normalNoRate.setRate(null);

        when(classRecordMapper.selectByApplicationReference(5001L)).thenReturn(List.of(absentRecord, normalNoRate));

        Map<String, Object> stats = invokeComputeApplicationStats(5001L);

        assertNull(stats.get("latestRating"));
        assertEquals(2, stats.get("lessonCount"));
        assertEquals(true, stats.get("lessonReported"));
    }

    @Test
    void computeApplicationStatsReturnsFirstNormalRateAsLatestRating() throws Exception
    {
        OsgClassRecord first = new OsgClassRecord();
        first.setMemberStatus("normal");
        first.setRate("5");

        OsgClassRecord second = new OsgClassRecord();
        second.setMemberStatus("normal");
        second.setRate("3");

        when(classRecordMapper.selectByApplicationReference(5002L)).thenReturn(List.of(first, second));

        Map<String, Object> stats = invokeComputeApplicationStats(5002L);

        assertEquals("5", stats.get("latestRating"));
        assertEquals(2, stats.get("lessonCount"));
        assertEquals(true, stats.get("lessonReported"));
    }

    // ===== TCS-T-303: resolveCityLabel =====

    @SuppressWarnings("unchecked")
    private String invokeResolveCityLabel(String cityValue, Map<String, String> cache) throws Exception
    {
        Method method = OsgUserJobOverviewServiceImpl.class.getDeclaredMethod("resolveCityLabel", String.class, Map.class);
        method.setAccessible(true);
        return (String) method.invoke(service, cityValue, cache);
    }

    @Test
    void resolveCityLabelReturnsNullWhenCityValueIsNull() throws Exception
    {
        assertNull(invokeResolveCityLabel(null, new java.util.HashMap<>()));
    }

    @Test
    void resolveCityLabelReturnsNullWhenCityValueIsBlank() throws Exception
    {
        assertNull(invokeResolveCityLabel("  ", new java.util.HashMap<>()));
    }

    @Test
    void resolveCityLabelReturnsDictLabelWhenFound() throws Exception
    {
        when(dictDataService.selectDictLabel("osg_city", "SH")).thenReturn("上海");

        String result = invokeResolveCityLabel("SH", new java.util.HashMap<>());

        assertEquals("上海", result);
    }

    @Test
    void resolveCityLabelFallsBackToOriginalValueWhenNotFound() throws Exception
    {
        when(dictDataService.selectDictLabel("osg_city", "UNKNOWN")).thenReturn(null);

        String result = invokeResolveCityLabel("UNKNOWN", new java.util.HashMap<>());

        assertEquals("UNKNOWN", result);
    }

    @Test
    void resolveCityLabelHitsCacheAndSkipsDictLookupOnSecondCall() throws Exception
    {
        when(dictDataService.selectDictLabel("osg_city", "BJ")).thenReturn("北京");
        Map<String, String> cache = new java.util.HashMap<>();

        invokeResolveCityLabel("BJ", cache);
        invokeResolveCityLabel("BJ", cache);

        verify(dictDataService, org.mockito.Mockito.times(1)).selectDictLabel("osg_city", "BJ");
    }

    // ===== TCS-T-308: detailForLeadMentor classRecordsByMentor =====

    @Test
    void detailForLeadMentorIncludesClassRecordsByMentorGrouped()
    {
        OsgJobApplication application = new OsgJobApplication();
        application.setApplicationId(5100L);
        application.setStudentId(4100L);
        application.setLeadMentorId(810L);

        OsgCoaching coaching = new OsgCoaching();
        coaching.setApplicationId(5100L);
        coaching.setStatus("coaching");

        OsgClassRecord r1 = new OsgClassRecord();
        r1.setRecordId(101L);
        r1.setMentorId(810L);
        r1.setMentorName("Mentor A");
        r1.setDurationHours(1.5);
        r1.setMemberStatus("normal");
        r1.setRate("5");
        r1.setCourseType("base");

        OsgClassRecord r2 = new OsgClassRecord();
        r2.setRecordId(102L);
        r2.setMentorId(810L);
        r2.setMentorName("Mentor A");
        r2.setDurationHours(1.0);
        r2.setMemberStatus("normal");
        r2.setRate("3");
        r2.setCourseType("base");

        when(jobApplicationMapper.selectJobApplicationByApplicationId(5100L)).thenReturn(application);
        when(coachingMapper.selectCoachingByApplicationId(5100L)).thenReturn(coaching);
        when(classRecordMapper.selectByApplicationReference(5100L)).thenReturn(List.of(r1, r2));

        Map<String, Object> result = service.detailForLeadMentor(5100L, 810L);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> groups = (List<Map<String, Object>>) result.get("classRecordsByMentor");
        assertNotNull(groups);
        assertEquals(1, groups.size());

        Map<String, Object> group = groups.get(0);
        assertEquals(810L, group.get("mentorId"));
        assertEquals("Mentor A", group.get("mentorName"));
        assertEquals(new java.math.BigDecimal("2.5"), group.get("totalHours"));
        assertEquals(new java.math.BigDecimal("4.00"), group.get("avgRating"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> records = (List<Map<String, Object>>) group.get("records");
        assertEquals(2, records.size());
    }

    @Test
    void detailForLeadMentorReturnsEmptyClassRecordsWhenNoRecordsExist()
    {
        OsgJobApplication application = new OsgJobApplication();
        application.setApplicationId(5200L);
        application.setStudentId(4200L);
        application.setLeadMentorId(810L);

        OsgCoaching coaching = new OsgCoaching();
        coaching.setApplicationId(5200L);
        coaching.setStatus("coaching");
        coaching.setMentorId(810L);
        coaching.setMentorIds("810");

        when(jobApplicationMapper.selectJobApplicationByApplicationId(5200L)).thenReturn(application);
        when(coachingMapper.selectCoachingByApplicationId(5200L)).thenReturn(coaching);
        when(classRecordMapper.selectByApplicationReference(5200L)).thenReturn(List.of());

        Map<String, Object> result = service.detailForLeadMentor(5200L, 810L);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> groups = (List<Map<String, Object>>) result.get("classRecordsByMentor");
        assertNotNull(groups);
        assertEquals(0, groups.size());
    }

    @Test
    void detailForLeadMentorGroupsAbsentRecordInLessonCountButSkipsFromAvgRating()
    {
        OsgJobApplication application = new OsgJobApplication();
        application.setApplicationId(5300L);
        application.setStudentId(4300L);
        application.setLeadMentorId(810L);

        OsgCoaching coaching = new OsgCoaching();
        coaching.setApplicationId(5300L);
        coaching.setStatus("coaching");
        coaching.setMentorId(810L);
        coaching.setMentorIds("810");

        OsgClassRecord absentRecord = new OsgClassRecord();
        absentRecord.setRecordId(301L);
        absentRecord.setMentorId(810L);
        absentRecord.setMentorName("Mentor B");
        absentRecord.setDurationHours(0.5);
        absentRecord.setMemberStatus("absent");
        absentRecord.setRate("5");

        OsgClassRecord normalRecord = new OsgClassRecord();
        normalRecord.setRecordId(302L);
        normalRecord.setMentorId(810L);
        normalRecord.setMentorName("Mentor B");
        normalRecord.setDurationHours(1.0);
        normalRecord.setMemberStatus("normal");
        normalRecord.setRate(null);

        when(jobApplicationMapper.selectJobApplicationByApplicationId(5300L)).thenReturn(application);
        when(coachingMapper.selectCoachingByApplicationId(5300L)).thenReturn(coaching);
        when(classRecordMapper.selectByApplicationReference(5300L)).thenReturn(List.of(absentRecord, normalRecord));

        Map<String, Object> result = service.detailForLeadMentor(5300L, 810L);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> groups = (List<Map<String, Object>>) result.get("classRecordsByMentor");
        assertEquals(1, groups.size());
        Map<String, Object> group = groups.get(0);
        assertNull(group.get("avgRating"));
        assertEquals(new java.math.BigDecimal("1.5"), group.get("totalHours"));
    }

    // ===== TCS-T-307: calendarForLeadMentor lead_mentor_id boundary =====

    @Test
    void calendarForLeadMentorQueryUsesCurrentUserIdAsLeadMentorId()
    {
        OsgJobApplication app = new OsgJobApplication();
        app.setApplicationId(9001L);
        app.setStudentName("Calendar Student");
        app.setInterviewTime(new Date());

        when(jobApplicationMapper.selectJobApplicationList(any(OsgJobApplication.class))).thenReturn(List.of(app));

        List<Map<String, Object>> result = service.calendarForLeadMentor(810L);

        assertEquals(1, result.size());
        ArgumentCaptor<OsgJobApplication> captor = ArgumentCaptor.forClass(OsgJobApplication.class);
        verify(jobApplicationMapper).selectJobApplicationList(captor.capture());
        assertEquals(810L, captor.getValue().getLeadMentorId());
    }

    @Test
    void calendarForLeadMentorReturnsEmptyWhenCurrentUserIdIsNull()
    {
        List<Map<String, Object>> result = service.calendarForLeadMentor(null);

        assertEquals(0, result.size());
        verify(jobApplicationMapper, org.mockito.Mockito.never()).selectJobApplicationList(any());
    }

    // ===== TCS-T-306: interviewTime range filter / lessonReported filter =====

    @Test
    void listByLeadMentorFiltersOutAppsBelowInterviewTimeStart()
    {
        Date start = new Date(5000L);
        OsgJobApplication appBefore = new OsgJobApplication();
        appBefore.setApplicationId(7101L);
        appBefore.setStudentId(3101L);
        appBefore.setInterviewTime(new Date(4000L));
        appBefore.setSubmittedAt(new Date());

        OsgJobApplication appAfter = new OsgJobApplication();
        appAfter.setApplicationId(7102L);
        appAfter.setStudentId(3102L);
        appAfter.setInterviewTime(new Date(6000L));
        appAfter.setSubmittedAt(new Date());

        when(jobApplicationMapper.selectJobApplicationList(any(OsgJobApplication.class))).thenReturn(List.of(appBefore, appAfter));
        when(coachingMapper.selectCoachingList(any(OsgCoaching.class))).thenReturn(List.of());
        when(classRecordMapper.selectByApplicationReference(any())).thenReturn(List.of());

        OsgJobApplication query = new OsgJobApplication();
        query.setInterviewTimeStart(start);

        List<Map<String, Object>> rows = service.listByLeadMentor("managed", query, 999L);

        assertEquals(1, rows.size());
        assertEquals(7102L, rows.get(0).get("applicationId"));
    }

    @Test
    void listByLeadMentorFiltersLessonReportedTrueCorrectly()
    {
        OsgJobApplication reported = new OsgJobApplication();
        reported.setApplicationId(7201L);
        reported.setStudentId(3201L);
        reported.setSubmittedAt(new Date());

        OsgJobApplication notReported = new OsgJobApplication();
        notReported.setApplicationId(7202L);
        notReported.setStudentId(3202L);
        notReported.setSubmittedAt(new Date());

        OsgClassRecord classRecord = new OsgClassRecord();
        classRecord.setMemberStatus("normal");
        classRecord.setRate("4");

        when(jobApplicationMapper.selectJobApplicationList(any(OsgJobApplication.class))).thenReturn(List.of(reported, notReported));
        when(coachingMapper.selectCoachingList(any(OsgCoaching.class))).thenReturn(List.of());
        when(classRecordMapper.selectByApplicationReference(7201L)).thenReturn(List.of(classRecord));
        when(classRecordMapper.selectByApplicationReference(7202L)).thenReturn(List.of());

        OsgJobApplication query = new OsgJobApplication();
        query.setLessonReported(Boolean.TRUE);

        List<Map<String, Object>> rows = service.listByLeadMentor("managed", query, 999L);

        assertEquals(1, rows.size());
        assertEquals(7201L, rows.get(0).get("applicationId"));
    }

    @Test
    void listByLeadMentorReturnsEmptyForInvalidInterviewTimeRange()
    {
        OsgJobApplication app = new OsgJobApplication();
        app.setApplicationId(7301L);
        app.setStudentId(3301L);
        app.setInterviewTime(new Date(5000L));
        app.setSubmittedAt(new Date());

        when(jobApplicationMapper.selectJobApplicationList(any(OsgJobApplication.class))).thenReturn(List.of(app));
        when(coachingMapper.selectCoachingList(any(OsgCoaching.class))).thenReturn(List.of());

        OsgJobApplication query = new OsgJobApplication();
        query.setInterviewTimeStart(new Date(9000L));
        query.setInterviewTimeEnd(new Date(1000L));

        List<Map<String, Object>> rows = service.listByLeadMentor("managed", query, 999L);

        assertEquals(0, rows.size());
    }

    // ===== TCS-T-305: normalizeQuery / matchesQuery =====

    @Test
    void normalizeQueryCopiesInterviewTimeRangeAndLessonReported() throws Exception
    {
        Method method = OsgUserJobOverviewServiceImpl.class.getDeclaredMethod("normalizeQuery", OsgJobApplication.class);
        method.setAccessible(true);

        Date start = new Date(1000L);
        Date end = new Date(2000L);
        OsgJobApplication query = new OsgJobApplication();
        query.setInterviewTimeStart(start);
        query.setInterviewTimeEnd(end);
        query.setLessonReported(Boolean.TRUE);

        OsgJobApplication normalized = (OsgJobApplication) method.invoke(service, query);

        assertEquals(start, normalized.getInterviewTimeStart());
        assertEquals(end, normalized.getInterviewTimeEnd());
        assertEquals(Boolean.TRUE, normalized.getLessonReported());
    }

    @Test
    void normalizeQueryDoesNotCopyStudentNameAnymore() throws Exception
    {
        Method method = OsgUserJobOverviewServiceImpl.class.getDeclaredMethod("normalizeQuery", OsgJobApplication.class);
        method.setAccessible(true);

        OsgJobApplication query = new OsgJobApplication();
        query.setStudentName("should be ignored");

        OsgJobApplication normalized = (OsgJobApplication) method.invoke(service, query);

        assertNull(normalized.getStudentName());
    }

    @Test
    void listByLeadMentorDoesNotFilterByStudentNameAfterChange()
    {
        OsgJobApplication app1 = new OsgJobApplication();
        app1.setApplicationId(8001L);
        app1.setStudentId(4001L);
        app1.setStudentName("Alice");
        app1.setSubmittedAt(new Date());

        OsgJobApplication app2 = new OsgJobApplication();
        app2.setApplicationId(8002L);
        app2.setStudentId(4002L);
        app2.setStudentName("Bob");
        app2.setSubmittedAt(new Date());

        when(jobApplicationMapper.selectJobApplicationList(any(OsgJobApplication.class))).thenReturn(List.of(app1, app2));
        when(coachingMapper.selectCoachingList(any(OsgCoaching.class))).thenReturn(List.of());
        when(classRecordMapper.selectByApplicationReference(any())).thenReturn(List.of());

        OsgJobApplication queryWithStudentName = new OsgJobApplication();
        queryWithStudentName.setStudentName("Alice");

        List<Map<String, Object>> rows = service.listByLeadMentor("managed", queryWithStudentName, 999L);

        assertEquals(2, rows.size());
    }

    // ===== TCS-T-304: toOverviewPayload 4 new fields =====

    @Test
    void toOverviewPayloadIncludesNewFieldsFromApplicationStats()
    {
        OsgJobApplication application = new OsgJobApplication();
        application.setApplicationId(6001L);
        application.setStudentId(3001L);
        application.setStudentName("Test Student");
        application.setCity("SH");
        application.setSubmittedAt(new Date());

        OsgClassRecord classRecord = new OsgClassRecord();
        classRecord.setMemberStatus("normal");
        classRecord.setRate("5");

        when(jobApplicationMapper.selectJobApplicationList(any(OsgJobApplication.class))).thenReturn(List.of(application));
        when(coachingMapper.selectCoachingList(any(OsgCoaching.class))).thenReturn(List.of());
        when(classRecordMapper.selectByApplicationReference(6001L)).thenReturn(List.of(classRecord));
        when(dictDataService.selectDictLabel("osg_city", "SH")).thenReturn("上海");

        List<Map<String, Object>> rows = service.listByLeadMentor("managed", new OsgJobApplication(), 999L);

        assertEquals(1, rows.size());
        Map<String, Object> payload = rows.get(0);
        assertEquals("上海", payload.get("cityLabel"));
        assertEquals("5", payload.get("latestRating"));
        assertEquals(1, payload.get("lessonCount"));
        assertEquals(true, payload.get("lessonReported"));
    }

    @Test
    void toOverviewPayloadHandlesNullApplicationIdWithoutNpe()
    {
        OsgJobApplication application = new OsgJobApplication();
        application.setApplicationId(null);
        application.setStudentId(3002L);
        application.setStudentName("No ID Student");
        application.setCity(null);
        application.setSubmittedAt(new Date());

        when(jobApplicationMapper.selectJobApplicationList(any(OsgJobApplication.class))).thenReturn(List.of(application));
        when(coachingMapper.selectCoachingList(any(OsgCoaching.class))).thenReturn(List.of());

        List<Map<String, Object>> rows = service.listByLeadMentor("managed", new OsgJobApplication(), 999L);

        assertEquals(1, rows.size());
        Map<String, Object> payload = rows.get(0);
        assertNull(payload.get("cityLabel"));
        assertNull(payload.get("latestRating"));
        assertEquals(0, payload.get("lessonCount"));
        assertEquals(false, payload.get("lessonReported"));
    }

    @Test
    void confirmCoachingShouldRejectAssistantOwnedButUnassignedApplication()
    {
        OsgJobApplication application = new OsgJobApplication();
        application.setApplicationId(7011L);
        application.setStudentId(3011L);

        when(jobApplicationMapper.selectJobApplicationByApplicationId(7011L)).thenReturn(application);
        when(coachingMapper.selectCoachingList(any(OsgCoaching.class))).thenReturn(List.of());

        ServiceException error = assertThrows(ServiceException.class, () -> service.confirmCoaching(7011L, 920L, "assistant_user"));

        assertEquals("无权确认该求职申请", error.getMessage());
    }

    // ===== TCS-T-313: scope coverage + edge cases =====

    @Test
    void listByLeadMentorCoachingScopeReturnsOnlyAppsWhereUserIsInMentorIds()
    {
        OsgJobApplication coached = new OsgJobApplication();
        coached.setApplicationId(8001L);
        coached.setStudentId(4001L);
        coached.setSubmittedAt(new Date());

        OsgJobApplication notCoached = new OsgJobApplication();
        notCoached.setApplicationId(8002L);
        notCoached.setStudentId(4002L);
        notCoached.setLeadMentorId(810L);
        notCoached.setSubmittedAt(new Date());

        OsgCoaching coaching = new OsgCoaching();
        coaching.setCoachingId(9001L);
        coaching.setApplicationId(8001L);
        coaching.setMentorIds("810");

        when(jobApplicationMapper.selectJobApplicationList(any(OsgJobApplication.class)))
            .thenReturn(List.of(coached, notCoached));
        when(coachingMapper.selectCoachingList(any(OsgCoaching.class))).thenReturn(List.of(coaching));
        when(classRecordMapper.selectByApplicationReference(any())).thenReturn(List.of());

        List<Map<String, Object>> rows = service.listByLeadMentor("coaching", new OsgJobApplication(), 810L);

        assertEquals(1, rows.size());
        assertEquals(8001L, rows.get(0).get("applicationId"));
    }

    @Test
    void listByLeadMentorPendingScopeExcludesAssignedAndNoRequestApps()
    {
        OsgJobApplication pending = new OsgJobApplication();
        pending.setApplicationId(8101L);
        pending.setStudentId(4101L);
        pending.setAssignStatus("pending");
        pending.setRequestedMentorCount(2);
        pending.setLeadMentorId(810L);
        pending.setSubmittedAt(new Date());

        OsgJobApplication assigned = new OsgJobApplication();
        assigned.setApplicationId(8102L);
        assigned.setStudentId(4102L);
        assigned.setAssignStatus("assigned");
        assigned.setRequestedMentorCount(1);
        assigned.setLeadMentorId(810L);
        assigned.setSubmittedAt(new Date());

        OsgJobApplication noRequest = new OsgJobApplication();
        noRequest.setApplicationId(8103L);
        noRequest.setStudentId(4103L);
        noRequest.setAssignStatus("pending");
        noRequest.setRequestedMentorCount(0);
        noRequest.setLeadMentorId(810L);
        noRequest.setSubmittedAt(new Date());

        when(jobApplicationMapper.selectJobApplicationList(any(OsgJobApplication.class)))
            .thenReturn(List.of(pending, assigned, noRequest));
        when(coachingMapper.selectCoachingList(any(OsgCoaching.class))).thenReturn(List.of());
        when(classRecordMapper.selectByApplicationReference(any())).thenReturn(List.of());

        List<Map<String, Object>> rows = service.listByLeadMentor("pending", new OsgJobApplication(), 810L);

        assertEquals(1, rows.size());
        assertEquals(8101L, rows.get(0).get("applicationId"));
    }

    @Test
    void computeApplicationStatsReturnsNullRatingWhenAllRecordsHaveBlankRate() throws Exception
    {
        OsgClassRecord blankRate = new OsgClassRecord();
        blankRate.setMemberStatus("normal");
        blankRate.setRate("");

        OsgClassRecord nullRate = new OsgClassRecord();
        nullRate.setMemberStatus("normal");
        nullRate.setRate(null);

        Method method = OsgUserJobOverviewServiceImpl.class.getDeclaredMethod("computeApplicationStats", Long.class);
        method.setAccessible(true);

        when(classRecordMapper.selectByApplicationReference(5001L)).thenReturn(List.of(blankRate, nullRate));

        @SuppressWarnings("unchecked")
        Map<String, Object> stats = (Map<String, Object>) method.invoke(service, 5001L);

        assertNull(stats.get("latestRating"));
        assertEquals(2, stats.get("lessonCount"));
        assertEquals(true, stats.get("lessonReported"));
    }

    @Test
    void listByLeadMentorLessonReportedFalseFiltersOnlyUnreported()
    {
        OsgJobApplication withLesson = new OsgJobApplication();
        withLesson.setApplicationId(8201L);
        withLesson.setStudentId(4201L);
        withLesson.setSubmittedAt(new Date());

        OsgJobApplication noLesson = new OsgJobApplication();
        noLesson.setApplicationId(8202L);
        noLesson.setStudentId(4202L);
        noLesson.setSubmittedAt(new Date());

        OsgClassRecord record = new OsgClassRecord();
        record.setMemberStatus("normal");
        record.setRate("4");

        when(jobApplicationMapper.selectJobApplicationList(any(OsgJobApplication.class)))
            .thenReturn(List.of(withLesson, noLesson));
        when(coachingMapper.selectCoachingList(any(OsgCoaching.class))).thenReturn(List.of());
        when(classRecordMapper.selectByApplicationReference(8201L)).thenReturn(List.of(record));
        when(classRecordMapper.selectByApplicationReference(8202L)).thenReturn(List.of());

        OsgJobApplication query = new OsgJobApplication();
        query.setLessonReported(Boolean.FALSE);

        List<Map<String, Object>> rows = service.listByLeadMentor("managed", query, 999L);

        assertEquals(1, rows.size());
        assertEquals(8202L, rows.get(0).get("applicationId"));
    }
}
