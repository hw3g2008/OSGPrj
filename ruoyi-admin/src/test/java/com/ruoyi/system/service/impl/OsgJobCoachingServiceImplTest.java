package com.ruoyi.system.service.impl;

import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.ruoyi.system.domain.OsgJobCoaching;
import com.ruoyi.system.mapper.OsgJobCoachingMapper;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OsgJobCoachingServiceImplTest {

    @InjectMocks
    private OsgJobCoachingServiceImpl service;

    @Mock
    private OsgJobCoachingMapper mapper;

    @Test
    void testSelectListDelegates() {
        OsgJobCoaching q = new OsgJobCoaching();
        when(mapper.selectList(q)).thenReturn(Collections.singletonList(new OsgJobCoaching()));
        assertEquals(1, service.selectList(q).size());
    }

    @Test
    void testSelectByIdDelegates() {
        OsgJobCoaching r = new OsgJobCoaching();
        r.setId(1L);
        when(mapper.selectById(1L)).thenReturn(r);
        assertEquals(1L, service.selectById(1L).getId());
    }

    @Test
    void testUpdateDelegates() {
        OsgJobCoaching r = new OsgJobCoaching();
        when(mapper.update(r)).thenReturn(1);
        assertEquals(1, service.update(r));
    }

    @Test
    void testSelectCalendarDelegates() {
        OsgJobCoaching q = new OsgJobCoaching();
        when(mapper.selectCalendar(q)).thenReturn(Collections.emptyList());
        assertTrue(service.selectCalendar(q).isEmpty());
    }
}
