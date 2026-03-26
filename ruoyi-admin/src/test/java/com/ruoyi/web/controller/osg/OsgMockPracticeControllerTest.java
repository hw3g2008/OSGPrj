package com.ruoyi.web.controller.osg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.lenient;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.system.domain.OsgMockPractice;
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

    private OsgMockPracticeController controller;

    private List<OsgMockPractice> practices;

    @BeforeEach
    void setUp()
    {
        OsgMockPracticeServiceImpl service = new OsgMockPracticeServiceImpl();
        ReflectionTestUtils.setField(service, "mockPracticeMapper", mockPracticeMapper);
        ReflectionTestUtils.setField(service, "identityResolver", identityResolver);

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
