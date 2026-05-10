package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgClassRecord;
import com.ruoyi.system.domain.OsgMockPractice;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.OsgClassRecordMapper;
import com.ruoyi.system.mapper.OsgMockPracticeMapper;
import com.ruoyi.system.mapper.OsgStudentMapper;

@ExtendWith(MockitoExtension.class)
class OsgMockPracticeServiceImplTest
{
    @InjectMocks
    private OsgMockPracticeServiceImpl service;

    @Mock
    private OsgMockPracticeMapper mockPracticeMapper;

    @Mock
    private OsgStudentMapper studentMapper;

    @Mock
    private OsgIdentityResolver identityResolver;

    /** Step3-F3: mentorDetail 端点按 reference_type+practice_id 查 class_record */
    @Mock
    private OsgClassRecordMapper classRecordMapper;

    @Test
    void selectMentorMockPracticeListShouldIncludeAssistantOwnedPractice()
    {
        OsgMockPractice query = new OsgMockPractice();
        query.setCurrentMentorId(920L);

        OsgMockPractice practice = new OsgMockPractice();
        practice.setPracticeId(9001L);
        practice.setStudentId(3001L);
        practice.setStatus("pending");

        OsgStudent student = new OsgStudent();
        student.setStudentId(3001L);
        student.setAssistantId(920L);

        when(mockPracticeMapper.selectMockPracticeList(any(OsgMockPractice.class))).thenReturn(List.of(practice));
        when(studentMapper.selectStudentByStudentId(3001L)).thenReturn(student);

        List<OsgMockPractice> rows = service.selectMentorMockPracticeList(query);

        assertEquals(1, rows.size());
        assertEquals(9001L, rows.get(0).getPracticeId());
        verify(mockPracticeMapper).selectMockPracticeList(argThat(actual ->
            actual != null
                && Objects.equals(actual.getCurrentMentorId(), 920L)
                && actual.getPracticeType() == null
                && actual.getStatus() == null
        ));
    }

    @Test
    void assignMockPracticeStoresResolvedUserIdsInsteadOfStaffIds()
    {
        OsgMockPractice practice = new OsgMockPractice();
        practice.setPracticeId(9002L);
        practice.setStudentId(3002L);
        practice.setStatus("pending");

        when(mockPracticeMapper.selectMockPracticeByPracticeId(9002L)).thenReturn(practice);
        when(identityResolver.resolveUserIdByStaffId(9201L)).thenReturn(9001L);
        when(identityResolver.resolveUserIdByStaffId(9202L)).thenReturn(9002L);
        when(mockPracticeMapper.updateMockPracticeAssignment(any(OsgMockPractice.class))).thenReturn(1);

        Map<String, Object> result = service.assignMockPractice(Map.of(
            "practiceId", 9002L,
            "mentorIds", List.of(9201L, 9202L),
            "mentorNames", List.of("Jess", "Amy"),
            "mentorBackgrounds", List.of("PE / MBB", "IBD / ECM"),
            "scheduledAt", "2026-03-20T19:30:00",
            "note", "优先安排一面复盘"),
            "admin_mock");

        assertEquals("9001,9002", result.get("mentorIds"));

        ArgumentCaptor<OsgMockPractice> captor = ArgumentCaptor.forClass(OsgMockPractice.class);
        verify(mockPracticeMapper).updateMockPracticeAssignment(captor.capture());
        assertEquals("9001,9002", captor.getValue().getMentorIds());

        verify(identityResolver).resolveUserIdByStaffId(9201L);
        verify(identityResolver).resolveUserIdByStaffId(9202L);
    }

    @Test
    void assignMockPracticeRejectsWhenResolverCannotResolveStaffId()
    {
        OsgMockPractice practice = new OsgMockPractice();
        practice.setPracticeId(9003L);
        practice.setStudentId(3003L);
        practice.setStatus("pending");

        when(identityResolver.resolveUserIdByStaffId(9201L)).thenThrow(new ServiceException("员工账号不存在，无法完成导师分配"));

        ServiceException error = assertThrows(ServiceException.class, () -> service.assignMockPractice(Map.of(
            "practiceId", 9003L,
            "mentorIds", List.of(9201L),
            "mentorNames", List.of("Jess"),
            "scheduledAt", "2026-03-20T20:00:00"),
            "admin_mock"));

        assertEquals("员工账号不存在，无法完成导师分配", error.getMessage());
    }

    @Test
    void selectMentorMockPracticeDetailShouldReturnReferenceAndClassRecords()
    {
        // Step3-F3: 真正发生过课消的 practice，detail 应聚合 reference_type=mock_interview/communication_test，
        // 把按 reference_id=practiceId 查到的 class_record 全量返回，且统计 reportedLessonCount + latestRating。
        OsgMockPractice practice = new OsgMockPractice();
        practice.setPracticeId(9100L);
        practice.setStudentId(3100L);
        practice.setStudentName("Diana");
        practice.setPracticeType("mock_interview");
        practice.setStatus("scheduled");
        practice.setMentorIds("9001,9002");
        when(mockPracticeMapper.selectMockPracticeByPracticeId(9100L)).thenReturn(practice);

        // mapper 默认按 class_date desc 返回，最新一条排在最前；resolveLatestRating 取首条 memberStatus=normal 的 rate
        OsgClassRecord latest = new OsgClassRecord();
        latest.setRecordId(7002L);
        latest.setMentorId(9002L);
        latest.setMentorName("Amy");
        latest.setRate("excellent");
        latest.setMemberStatus("normal");
        latest.setStatus("submitted");
        OsgClassRecord earlier = new OsgClassRecord();
        earlier.setRecordId(7001L);
        earlier.setMentorId(9001L);
        earlier.setMentorName("Jess");
        earlier.setRate("good");
        earlier.setMemberStatus("normal");
        earlier.setStatus("draft");
        when(classRecordMapper.selectClassRecordList(any(OsgClassRecord.class)))
            .thenReturn(List.of(latest, earlier));

        Map<String, Object> detail = service.selectMentorMockPracticeDetail(9100L, 9001L);

        assertNotNull(detail);
        assertEquals(9100L, detail.get("practiceId"));
        assertEquals("mock_interview", detail.get("referenceType"));
        assertEquals(9100L, detail.get("referenceId"));
        assertEquals(2, detail.get("reportedLessonCount"));
        // latestRating 取列表首条 memberStatus=normal 的 rate（即 mapper 已按 class_date desc 排好的最新一条）
        assertEquals("excellent", detail.get("latestRating"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> classRecords = (List<Map<String, Object>>) detail.get("classRecords");
        assertEquals(2, classRecords.size());

        // 校验 selectClassRecordList 实际按 reference_type+reference_id 查
        ArgumentCaptor<OsgClassRecord> queryCaptor = ArgumentCaptor.forClass(OsgClassRecord.class);
        verify(classRecordMapper).selectClassRecordList(queryCaptor.capture());
        assertEquals("mock_interview", queryCaptor.getValue().getReferenceType());
        assertEquals(9100L, queryCaptor.getValue().getReferenceId());
    }

    @Test
    void selectMentorMockPracticeDetailShouldRejectMentorNotInPractice()
    {
        // Step3-F3: 当前用户不在 practice.mentor_ids 里 → 抛 ServiceException("无权确认该模拟应聘记录")
        OsgMockPractice practice = new OsgMockPractice();
        practice.setPracticeId(9101L);
        practice.setStudentId(3101L);
        practice.setMentorIds("9001");
        when(mockPracticeMapper.selectMockPracticeByPracticeId(9101L)).thenReturn(practice);

        ServiceException error = assertThrows(
            ServiceException.class,
            () -> service.selectMentorMockPracticeDetail(9101L, 9999L));
        assertEquals("无权确认该模拟应聘记录", error.getMessage());
    }

    @Test
    void selectMentorMockPracticeDetailShouldHandleEmptyClassRecords()
    {
        // Step3-F3: 还没产生任何 class_record，detail 仍要返回结构，reportedLessonCount=0，latestRating=null
        OsgMockPractice practice = new OsgMockPractice();
        practice.setPracticeId(9102L);
        practice.setStudentId(3102L);
        practice.setPracticeType("communication_test");
        practice.setMentorIds("9001");
        when(mockPracticeMapper.selectMockPracticeByPracticeId(9102L)).thenReturn(practice);
        when(classRecordMapper.selectClassRecordList(any(OsgClassRecord.class)))
            .thenReturn(Collections.emptyList());

        Map<String, Object> detail = service.selectMentorMockPracticeDetail(9102L, 9001L);

        assertEquals("communication_test", detail.get("referenceType"));
        assertEquals(0, detail.get("reportedLessonCount"));
        assertNull(detail.get("latestRating"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> classRecords = (List<Map<String, Object>>) detail.get("classRecords");
        assertEquals(0, classRecords.size());
    }

    @Test
    void selectMentorMockPracticeDetailShouldThrowWhenPracticeMissing()
    {
        // Step3-F3: practice 不存在 → 抛 ServiceException
        when(mockPracticeMapper.selectMockPracticeByPracticeId(9999L)).thenReturn(null);

        ServiceException error = assertThrows(
            ServiceException.class,
            () -> service.selectMentorMockPracticeDetail(9999L, 9001L));
        assertEquals("模拟应聘申请不存在", error.getMessage());
    }
}
