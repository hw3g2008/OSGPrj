package com.ruoyi.system.service.impl;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.ruoyi.system.domain.OsgMentorSchedule;
import com.ruoyi.system.mapper.OsgMentorScheduleMapper;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OsgMentorScheduleServiceImplTest {

    @InjectMocks
    private OsgMentorScheduleServiceImpl service;

    @Mock
    private OsgMentorScheduleMapper mapper;

    @Test
    void testSelectByMentorAndWeekFound() {
        OsgMentorSchedule schedule = new OsgMentorSchedule();
        schedule.setMonday("morning");
        when(mapper.selectByMentorAndWeek(any())).thenReturn(schedule);

        OsgMentorSchedule result = service.selectByMentorAndWeek(1L, "2026-03-17");

        assertNotNull(result);
        assertEquals("morning", result.getMonday());
    }

    @Test
    void testSelectByMentorAndWeekNotFound() {
        when(mapper.selectByMentorAndWeek(any())).thenReturn(null);

        assertNull(service.selectByMentorAndWeek(1L, "2026-03-17"));
    }

    @Test
    void testSelectByMentorAndWeekInvalidDate() {
        // Invalid date format should return null
        OsgMentorSchedule result = service.selectByMentorAndWeek(1L, "invalid-date");

        assertNull(result);
    }

    @Test
    void testSaveOrUpdateInsertWhenNew() {
        when(mapper.selectByMentorAndWeek(any())).thenReturn(null);
        when(mapper.insert(any())).thenReturn(1);

        OsgMentorSchedule schedule = new OsgMentorSchedule();
        schedule.setMentorId(1L);
        int result = service.saveOrUpdate(schedule);

        assertEquals(1, result);
        verify(mapper).insert(schedule);
        verify(mapper, never()).update(any());
    }

    @Test
    void testSaveOrUpdateUpdateWhenExists() {
        OsgMentorSchedule existing = new OsgMentorSchedule();
        existing.setId(10L);
        when(mapper.selectByMentorAndWeek(any())).thenReturn(existing);
        when(mapper.update(any())).thenReturn(1);

        OsgMentorSchedule schedule = new OsgMentorSchedule();
        schedule.setMentorId(1L);
        int result = service.saveOrUpdate(schedule);

        assertEquals(1, result);
        assertEquals(10L, schedule.getId());
        verify(mapper).update(schedule);
        verify(mapper, never()).insert(any());
    }
}
