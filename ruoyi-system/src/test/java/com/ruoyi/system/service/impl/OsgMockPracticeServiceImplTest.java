package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
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

import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgMockPractice;
import com.ruoyi.system.domain.OsgStudent;
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

        when(mockPracticeMapper.selectMockPracticeList(query)).thenReturn(List.of(practice));
        when(studentMapper.selectStudentByStudentId(3001L)).thenReturn(student);

        List<OsgMockPractice> rows = service.selectMentorMockPracticeList(query);

        assertEquals(1, rows.size());
        assertEquals(9001L, rows.get(0).getPracticeId());
        verify(mockPracticeMapper).selectMockPracticeList(query);
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
}
