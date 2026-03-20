package com.ruoyi.system.service.impl;

import java.util.Collections;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.ruoyi.system.domain.OsgMockPractice;
import com.ruoyi.system.mapper.OsgMockPracticeMapper;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OsgMockPracticeServiceImplTest {

    @InjectMocks
    private OsgMockPracticeServiceImpl service;

    @Mock
    private OsgMockPracticeMapper mapper;

    @Test
    void testSelectMentorMockPracticeListDelegates() {
        OsgMockPractice q = new OsgMockPractice();
        when(mapper.selectMentorMockPracticeList(q)).thenReturn(Collections.singletonList(new OsgMockPractice()));

        assertEquals(1, service.selectMentorMockPracticeList(q).size());
        verify(mapper).selectMentorMockPracticeList(q);
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
