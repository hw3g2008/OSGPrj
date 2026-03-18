package com.ruoyi.system.service.impl;

import java.util.Collections;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.ruoyi.system.domain.OsgSimPractice;
import com.ruoyi.system.mapper.OsgSimPracticeMapper;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OsgSimPracticeServiceImplTest {

    @InjectMocks
    private OsgSimPracticeServiceImpl service;

    @Mock
    private OsgSimPracticeMapper mapper;

    @Test
    void testSelectListDelegates() {
        OsgSimPractice q = new OsgSimPractice();
        when(mapper.selectList(q)).thenReturn(Collections.singletonList(new OsgSimPractice()));
        assertEquals(1, service.selectList(q).size());
    }

    @Test
    void testSelectByIdDelegates() {
        OsgSimPractice r = new OsgSimPractice();
        r.setPracticeId(1L);
        when(mapper.selectById(1L)).thenReturn(r);
        assertEquals(1L, service.selectById(1L).getPracticeId());
    }

    @Test
    void testUpdateDelegates() {
        OsgSimPractice r = new OsgSimPractice();
        when(mapper.update(r)).thenReturn(1);
        assertEquals(1, service.update(r));
    }
}
