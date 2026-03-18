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
    void testSelectListDelegates() {
        OsgMockPractice q = new OsgMockPractice();
        when(mapper.selectList(q)).thenReturn(Collections.singletonList(new OsgMockPractice()));
        assertEquals(1, service.selectList(q).size());
    }

    @Test
    void testSelectByIdDelegates() {
        OsgMockPractice r = new OsgMockPractice();
        r.setPracticeId(1L);
        when(mapper.selectById(1L)).thenReturn(r);
        assertEquals(1L, service.selectById(1L).getPracticeId());
    }

    @Test
    void testUpdateDelegates() {
        OsgMockPractice r = new OsgMockPractice();
        when(mapper.update(r)).thenReturn(1);
        assertEquals(1, service.update(r));
    }
}
