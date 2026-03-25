package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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
}
