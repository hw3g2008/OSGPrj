package com.ruoyi.web.controller.osg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.domain.OsgClassRecord;
import com.ruoyi.system.domain.OsgMockPractice;
import com.ruoyi.system.mapper.OsgClassRecordMapper;
import com.ruoyi.system.mapper.OsgMockPracticeMapper;
import com.ruoyi.system.service.impl.OsgIdentityResolver;
import com.ruoyi.system.service.impl.OsgMockPracticeServiceImpl;

@ExtendWith(MockitoExtension.class)
class OsgMockPracticeControllerTest
{
    @Mock
    private OsgMockPracticeMapper mockPracticeMapper;

    @Mock
    private OsgIdentityResolver identityResolver;

    /** Step3-F3: mentor detail 端点用，按 practice 聚合课消 */
    @Mock
    private OsgClassRecordMapper classRecordMapper;

    private OsgMockPracticeController controller;

    private List<OsgMockPractice> practices;

    /** Step3-F3: mentorDetail 端点用 SecurityUtils.getUserId() 获取 mentorId */
    private MockedStatic<SecurityUtils> securityMock;

    @BeforeEach
    void setUp()
    {
        OsgMockPracticeServiceImpl service = new OsgMockPracticeServiceImpl();
        ReflectionTestUtils.setField(service, "mockPracticeMapper", mockPracticeMapper);
        ReflectionTestUtils.setField(service, "identityResolver", identityResolver);
        ReflectionTestUtils.setField(service, "classRecordMapper", classRecordMapper);

        controller = new OsgMockPracticeController();
        ReflectionTestUtils.setField(controller, "mockPracticeService", service);

        practices = new ArrayList<>(buildPractices());

        lenient().when(mockPracticeMapper.selectMockPracticeList(any(OsgMockPractice.class)))
            .thenAnswer(invocation -> selectPractices(invocation.getArgument(0)));
        lenient().when(mockPracticeMapper.selectMockPracticeByPracticeId(anyLong()))
            .thenAnswer(invocation -> practices.stream()
                .filter(item -> Objects.equals(item.getPracticeId(), invocation.getArgument(0)))
                .findFirst()
                .orElse(null));
        lenient().when(identityResolver.resolveUserIdByStaffId(anyLong()))
            .thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(mockPracticeMapper.updateMockPracticeAssignment(any(OsgMockPractice.class)))
            .thenAnswer(invocation -> applyAssignment(invocation.getArgument(0)));

        securityMock = Mockito.mockStatic(SecurityUtils.class);
        // Step3-F3: 模拟真实未登录态 — getLoginUser() 抛 ServiceException，resolveOperator() 走 fallback "system"，
        // 保持 assign/confirm 既有测试行为；具体测试如需有用户上下文，覆盖 stub getUserId/getLoginUser 即可。
        securityMock.when(SecurityUtils::getLoginUser)
            .thenThrow(new ServiceException("获取用户信息异常"));
    }

    @AfterEach
    void tearDown()
    {
        securityMock.close();
    }

    @Test
    void statsShouldAggregateFourBuckets()
    {
        AjaxResult result = controller.stats(null, null, null);

        assertEquals(200, result.get("code"));
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) result.get("data");
        assertEquals(2, data.get("pendingCount"));
        assertEquals(1, data.get("scheduledCount"));
        assertEquals(1, data.get("completedCount"));
        assertEquals(1, data.get("cancelledCount"));
    }

    @Test
    void listShouldReturnPendingAssignRowsForPendingTab()
    {
        AjaxResult result = controller.list(null, null, null, "pending");

        assertEquals(200, result.get("code"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) result.get("rows");
        assertEquals(2, rows.size());
        assertEquals("mock_interview", rows.get(0).get("practiceType"));
        assertEquals("pending", rows.get(0).get("status"));
    }

    @Test
    void assignShouldPersistScheduledStateAndHideFromPendingTab()
    {
        AjaxResult result = controller.assign(Map.of(
            "practiceId", 1L,
            "mentorIds", List.of(9101L, 9102L),
            "mentorNames", List.of("Jess", "Amy"),
            "mentorBackgrounds", List.of("PE / MBB", "IBD / ECM"),
            "scheduledAt", "2026-03-20T19:30:00",
            "note", "优先模拟第一轮行为题"));

        assertEquals(200, result.get("code"));
        assertEquals("scheduled", result.get("status"));
        assertEquals("Jess, Amy", result.get("mentorNames"));

        AjaxResult pending = controller.list(null, null, null, "pending");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) pending.get("rows");
        assertEquals(1, rows.size());
        assertFalse(rows.stream().anyMatch(item -> Long.valueOf(1L).equals(item.get("practiceId"))));
    }

    @Test
    void assignShouldRejectAlreadyScheduledRequest()
    {
        AjaxResult result = controller.assign(Map.of(
            "practiceId", 2L,
            "mentorIds", List.of(9101L),
            "mentorNames", List.of("Jess"),
            "scheduledAt", "2026-03-20T20:00:00"));

        assertEquals(500, result.get("code"));
        assertEquals("该模拟应聘申请已安排，不能重复分配", result.get("msg"));
    }

    @Test
    void mentorDetailShouldExposeReferenceAndClassRecords()
    {
        // Step3-F3: mentor 是 practice 的 mentor，detail 端点应返回 referenceType + classRecords + 统计字段
        OsgMockPractice practice = new OsgMockPractice();
        practice.setPracticeId(99L);
        practice.setStudentId(801L);
        practice.setStudentName("Alice");
        practice.setPracticeType("mock_interview");
        practice.setStatus("scheduled");
        practice.setMentorIds("9101,9102");
        when(mockPracticeMapper.selectMockPracticeByPracticeId(99L)).thenReturn(practice);

        OsgClassRecord record = new OsgClassRecord();
        record.setRecordId(7001L);
        record.setMentorId(9101L);
        record.setMentorName("Jess");
        record.setMemberStatus("normal");
        record.setRate("excellent");
        record.setStatus("draft");
        when(classRecordMapper.selectClassRecordList(any(OsgClassRecord.class)))
            .thenReturn(List.of(record));

        securityMock.when(SecurityUtils::getUserId).thenReturn(9101L);

        AjaxResult result = controller.mentorDetail(99L);

        assertEquals(200, result.get("code"));
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) result.get("data");
        assertNotNull(data);
        assertEquals(99L, data.get("practiceId"));
        assertEquals("mock_interview", data.get("referenceType"));
        assertEquals(99L, data.get("referenceId"));
        assertEquals(1, data.get("reportedLessonCount"));
        assertEquals("excellent", data.get("latestRating"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> classRecords = (List<Map<String, Object>>) data.get("classRecords");
        assertEquals(1, classRecords.size());
        assertEquals(7001L, classRecords.get(0).get("recordId"));
        assertEquals("Jess", classRecords.get(0).get("mentorName"));
    }

    @Test
    void mentorDetailShouldRejectUnrelatedMentor()
    {
        // Step3-F3: mentor 不在 practice.mentor_ids 里 → 走 hasMentorRelation 校验失败，返回 500 + 业务错误信息
        OsgMockPractice practice = new OsgMockPractice();
        practice.setPracticeId(98L);
        practice.setStudentId(802L);
        practice.setMentorIds("9101");
        when(mockPracticeMapper.selectMockPracticeByPracticeId(98L)).thenReturn(practice);

        securityMock.when(SecurityUtils::getUserId).thenReturn(9999L);

        AjaxResult result = controller.mentorDetail(98L);

        assertEquals(500, result.get("code"));
        assertEquals("无权确认该模拟应聘记录", result.get("msg"));
    }

    @Test
    void mentorDetailShouldExposeEmptyClassRecordsWhenNoLessonsReported()
    {
        // Step3-F3: 还没上报过课消时 reportedLessonCount=0，latestRating=null，classRecords 为空数组
        OsgMockPractice practice = new OsgMockPractice();
        practice.setPracticeId(97L);
        practice.setStudentId(803L);
        practice.setPracticeType("mock_interview");
        practice.setMentorIds("9101");
        when(mockPracticeMapper.selectMockPracticeByPracticeId(97L)).thenReturn(practice);
        when(classRecordMapper.selectClassRecordList(any(OsgClassRecord.class))).thenReturn(Collections.emptyList());

        securityMock.when(SecurityUtils::getUserId).thenReturn(9101L);

        AjaxResult result = controller.mentorDetail(97L);

        assertEquals(200, result.get("code"));
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) result.get("data");
        assertEquals(0, data.get("reportedLessonCount"));
        assertEquals(null, data.get("latestRating"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> classRecords = (List<Map<String, Object>>) data.get("classRecords");
        assertEquals(0, classRecords.size());
    }

    private List<OsgMockPractice> buildPractices()
    {
        return List.of(
            buildPractice(1L, 12701L, "Alice", "mock_interview", "Goldman Sachs 一面模拟", "pending", null, null, 2, "Jess, Amy", null, null),
            buildPractice(2L, 12702L, "Bob", "communication_test", "人际关系测试补测", "scheduled", "Jess", "PE / MBB", 1, "Jess", "2026-03-20 20:00:00", null),
            buildPractice(3L, 12703L, "Cathy", "midterm_exam", "期中考试补考", "completed", "Amy", "IBD / ECM", 1, "Amy", "2026-03-19 18:30:00", "表达结构清晰"),
            buildPractice(4L, 12704L, "David", "mock_interview", "Morgan Stanley mock", "cancelled", null, null, 1, null, null, null),
            buildPractice(5L, 12705L, "Ella", "communication_test", "沟通风格测评", "pending", null, null, 1, "Mike Lee", null, null)
        );
    }

    private OsgMockPractice buildPractice(Long practiceId,
                                          Long studentId,
                                          String studentName,
                                          String practiceType,
                                          String requestContent,
                                          String status,
                                          String mentorNames,
                                          String mentorBackgrounds,
                                          Integer requestedMentorCount,
                                          String preferredMentorNames,
                                          String scheduledAt,
                                          String feedbackSummary)
    {
        OsgMockPractice row = new OsgMockPractice();
        row.setPracticeId(practiceId);
        row.setStudentId(studentId);
        row.setStudentName(studentName);
        row.setPracticeType(practiceType);
        row.setRequestContent(requestContent);
        row.setStatus(status);
        row.setMentorNames(mentorNames);
        row.setMentorBackgrounds(mentorBackgrounds);
        row.setRequestedMentorCount(requestedMentorCount);
        row.setPreferredMentorNames(preferredMentorNames);
        row.setSubmittedAt(Timestamp.valueOf(LocalDateTime.of(2026, 3, 14, 10, 0).minusHours(practiceId)));
        row.setScheduledAt(scheduledAt == null ? null : Timestamp.valueOf(scheduledAt));
        row.setFeedbackSummary(feedbackSummary);
        return row;
    }

    private List<OsgMockPractice> selectPractices(OsgMockPractice query)
    {
        return practices.stream()
            .filter(item -> query.getPracticeType() == null || query.getPracticeType().isBlank() || query.getPracticeType().equals(item.getPracticeType()))
            .filter(item -> query.getStatus() == null || query.getStatus().isBlank() || query.getStatus().equals(item.getStatus()))
            .filter(item -> query.getKeyword() == null || query.getKeyword().isBlank()
                || item.getStudentName().contains(query.getKeyword())
                || item.getRequestContent().contains(query.getKeyword()))
            .filter(item -> !"pending".equals(query.getTab()) || "pending".equals(item.getStatus()))
            .toList();
    }

    private int applyAssignment(OsgMockPractice update)
    {
        for (int index = 0; index < practices.size(); index++)
        {
            OsgMockPractice current = practices.get(index);
            if (!Objects.equals(current.getPracticeId(), update.getPracticeId()))
            {
                continue;
            }
            current.setStatus(update.getStatus());
            current.setMentorIds(update.getMentorIds());
            current.setMentorNames(update.getMentorNames());
            current.setMentorBackgrounds(update.getMentorBackgrounds());
            current.setScheduledAt(update.getScheduledAt());
            current.setRemark(update.getRemark());
            practices.set(index, current);
            return 1;
        }
        return 0;
    }
}
