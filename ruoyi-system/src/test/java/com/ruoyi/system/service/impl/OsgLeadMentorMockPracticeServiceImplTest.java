package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.ruoyi.system.domain.OsgMockPractice;
import com.ruoyi.system.domain.OsgStaff;
import com.ruoyi.system.domain.OsgStudent;
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
}
