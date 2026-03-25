package com.ruoyi.system.service.impl;

import java.util.Collections;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.ruoyi.system.domain.OsgMockPractice;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.OsgMockPracticeMapper;
import com.ruoyi.system.mapper.OsgStudentMapper;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OsgMockPracticeServiceImplTest {

    @InjectMocks
    private OsgMockPracticeServiceImpl service;

    @Mock
    private OsgMockPracticeMapper mapper;

    @Mock
    private OsgStudentMapper studentMapper;

    @Test
    void testSelectMentorMockPracticeListIncludesAssistantOwnedRows() {
        OsgMockPractice q = new OsgMockPractice();
        q.setCurrentMentorId(920L);
        OsgMockPractice practice = new OsgMockPractice();
        practice.setPracticeId(1L);
        practice.setStudentId(3001L);

        OsgStudent student = new OsgStudent();
        student.setStudentId(3001L);
        student.setAssistantId(920L);

        when(mapper.selectMockPracticeList(q)).thenReturn(Collections.singletonList(practice));
        when(studentMapper.selectStudentByStudentId(3001L)).thenReturn(student);

        assertEquals(1, service.selectMentorMockPracticeList(q).size());
        verify(mapper).selectMockPracticeList(q);
    }

    @Test
    void testSelectMentorMockPracticeByIdDelegates() {
        OsgMockPractice r = new OsgMockPractice();
        r.setPracticeId(1L);
        when(mapper.selectMentorMockPracticeById(1L)).thenReturn(r);

        assertEquals(1L, service.selectMentorMockPracticeById(1L).getPracticeId());
        verify(mapper).selectMentorMockPracticeById(1L);
    }

    @Test
    void testConfirmMentorMockPracticeDelegates() {
        OsgMockPractice r = new OsgMockPractice();
        when(mapper.updateMentorMockPracticeStatus(r)).thenReturn(1);

        assertEquals(1, service.confirmMentorMockPractice(r));
        assertNotNull(r.getUpdateTime());
        verify(mapper).updateMentorMockPracticeStatus(r);
    }
}
