package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Timestamp;
import java.util.ArrayList;
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
import com.ruoyi.system.domain.OsgMockPractice;
import com.ruoyi.system.domain.OsgStaff;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.OsgClassRecordMapper;
import com.ruoyi.system.mapper.OsgMockPracticeMapper;
import com.ruoyi.system.mapper.OsgStaffMapper;
import com.ruoyi.system.mapper.OsgStaffScheduleMapper;
import com.ruoyi.system.mapper.OsgStudentMapper;

@ExtendWith(MockitoExtension.class)
class OsgLeadMentorMockPracticeServiceImplTest
{
    @InjectMocks
    private OsgLeadMentorMockPracticeServiceImpl service;

    @Mock
    private OsgMockPracticeMapper mockPracticeMapper;

    @Mock
    private OsgStudentMapper studentMapper;

    @Mock
    private OsgStaffMapper staffMapper;

    @Mock
    private OsgStaffScheduleMapper staffScheduleMapper;

    @Mock
    private OsgIdentityResolver identityResolver;

    @Mock
    private OsgClassRecordMapper classRecordMapper;

    @Test
    @SuppressWarnings("unchecked")
    void selectPracticeDetailReturnsClassRecordsByMockPracticeReference()
    {
        OsgMockPractice practice = new OsgMockPractice();
        practice.setPracticeId(9001L);
        practice.setStudentId(3001L);
        practice.setStudentName("Alice");
        practice.setPracticeType("模拟面试");
        practice.setStatus("completed");
        practice.setDelFlag("0");

        OsgStudent student = new OsgStudent();
        student.setStudentId(3001L);
        student.setLeadMentorId(810L);

        OsgClassRecord older = buildClassRecord(7001L, 9001L, "mock_interview", "2026-03-24 09:00:00", "4", "normal");
        OsgClassRecord latest = buildClassRecord(7002L, 9001L, "mock_interview", "2026-03-25 10:00:00", "5", "normal");

        when(mockPracticeMapper.selectMockPracticeByPracticeId(9001L)).thenReturn(practice);
        when(studentMapper.selectStudentByStudentId(3001L)).thenReturn(student);
        lenient().when(classRecordMapper.selectClassRecordList(any(OsgClassRecord.class))).thenAnswer(invocation -> {
            OsgClassRecord query = invocation.getArgument(0);
            assertEquals("mock_interview", query.getReferenceType());
            assertEquals(9001L, query.getReferenceId());
            assertEquals(3001L, query.getStudentId());
            assertEquals("0", query.getDelFlag());
            return new ArrayList<>(List.of(older, latest));
        });

        Map<String, Object> detail = service.selectPracticeDetail(9001L, 810L);

        assertEquals("mock_interview", detail.get("referenceType"));
        assertEquals(9001L, detail.get("referenceId"));
        assertEquals(2, detail.get("reportedLessonCount"));
        assertEquals("5", detail.get("latestRating"));

        List<Map<String, Object>> classRecords = (List<Map<String, Object>>) detail.get("classRecords");
        assertEquals(2, classRecords.size());
        assertEquals(7002L, classRecords.get(0).get("recordId"));
        assertEquals(7001L, classRecords.get(1).get("recordId"));
    }

    @Test
    void assignPracticeRejectsMentorCountMismatch()
    {
        OsgMockPractice practice = new OsgMockPractice();
        practice.setPracticeId(9001L);
        practice.setStudentId(3001L);
        practice.setStatus("pending");
        practice.setRequestedMentorCount(2);

        OsgStudent student = new OsgStudent();
        student.setStudentId(3001L);
        student.setLeadMentorId(810L);

        when(mockPracticeMapper.selectMockPracticeByPracticeId(9001L)).thenReturn(practice);
        when(studentMapper.selectStudentByStudentId(3001L)).thenReturn(student);

        ServiceException exception = assertThrows(ServiceException.class, () -> service.assignPractice(
            9001L,
            Map.of(
                "mentorIds", List.of(9201L),
                "scheduledAt", "2026-03-25T09:30"),
            810L,
            "leadmentor_mock"));

        assertEquals("分配导师数量必须等于申请导师数量", exception.getMessage());
        verify(mockPracticeMapper, never()).updateMockPracticeAssignment(any(OsgMockPractice.class));
    }

    @Test
    void assignPracticeStoresResolvedUserIdsInsteadOfStaffIds()
    {
        OsgMockPractice practice = new OsgMockPractice();
        practice.setPracticeId(9001L);
        practice.setStudentId(3001L);
        practice.setStatus("pending");

        OsgStudent student = new OsgStudent();
        student.setStudentId(3001L);
        student.setLeadMentorId(810L);

        OsgStaff mentor1 = new OsgStaff();
        mentor1.setStaffId(9201L);
        mentor1.setStaffName("Jerry Li");
        mentor1.setStaffType("mentor");
        mentor1.setAccountStatus("active");
        mentor1.setRemark("Goldman Sachs IBD · 5年");

        OsgStaff mentor2 = new OsgStaff();
        mentor2.setStaffId(9202L);
        mentor2.setStaffName("Mike Chen");
        mentor2.setStaffType("mentor");
        mentor2.setAccountStatus("active");
        mentor2.setRemark("McKinsey · 4年");

        when(mockPracticeMapper.selectMockPracticeByPracticeId(9001L)).thenReturn(practice);
        when(studentMapper.selectStudentByStudentId(3001L)).thenReturn(student);
        when(staffMapper.selectStaffByStaffId(9201L)).thenReturn(mentor1);
        when(staffMapper.selectStaffByStaffId(9202L)).thenReturn(mentor2);
        when(identityResolver.resolveUserIdByStaffId(9201L)).thenReturn(9001L);
        when(identityResolver.resolveUserIdByStaffId(9202L)).thenReturn(9002L);
        when(mockPracticeMapper.updateMockPracticeAssignment(any(OsgMockPractice.class))).thenReturn(1);

        Map<String, Object> result = service.assignPractice(
            9001L,
            Map.of(
                "mentorIds", List.of(9201L, 9202L),
                "scheduledAt", "2026-03-25T09:30",
                "note", "优先安排一面复盘"),
            810L,
            "leadmentor_mock");

        assertEquals(List.of(9001L, 9002L), result.get("mentorIds"));

        ArgumentCaptor<OsgMockPractice> captor = ArgumentCaptor.forClass(OsgMockPractice.class);
        verify(mockPracticeMapper).updateMockPracticeAssignment(captor.capture());
        assertEquals("9001,9002", captor.getValue().getMentorIds());
    }

    private OsgClassRecord buildClassRecord(Long recordId, Long practiceId, String referenceType, String classDate, String rate, String memberStatus)
    {
        OsgClassRecord record = new OsgClassRecord();
        record.setRecordId(recordId);
        record.setStudentId(3001L);
        record.setStudentName("Alice");
        record.setMentorId(9201L);
        record.setMentorName("Jerry Li");
        record.setReferenceType(referenceType);
        record.setReferenceId(practiceId);
        record.setPracticeId(practiceId);
        record.setClassDate(Timestamp.valueOf(classDate));
        record.setDurationHours(1.5D);
        record.setMemberStatus(memberStatus);
        record.setRate(rate);
        record.setFeedbackContent("feedback " + recordId);
        record.setStatus("approved");
        record.setDelFlag("0");
        return record;
    }
}
