package com.ruoyi.web.controller.osg;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.domain.OsgMentorSchedule;
import com.ruoyi.system.service.IOsgMentorScheduleService;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OsgMentorScheduleControllerTest {

    @InjectMocks
    private OsgMentorScheduleController controller;

    @Mock
    private IOsgMentorScheduleService service;

    private MockedStatic<SecurityUtils> securityMock;

    @BeforeEach
    void setUp() {
        securityMock = Mockito.mockStatic(SecurityUtils.class);
        securityMock.when(SecurityUtils::getUserId).thenReturn(100L);
        securityMock.when(SecurityUtils::getUsername).thenReturn("testmentor");
    }

    @AfterEach
    void tearDown() { securityMock.close(); }

    // ========== current ==========

    @Test
    void testCurrentReturnsSchedule() {
        OsgMentorSchedule schedule = new OsgMentorSchedule();
        schedule.setMonday("morning");
        when(service.selectByMentorAndWeek(eq(100L), anyString())).thenReturn(schedule);

        AjaxResult result = controller.current();

        assertEquals(200, result.get("code"));
        assertNotNull(result.get("data"));
    }

    @Test
    void testCurrentReturnsNullWhenNoSchedule() {
        when(service.selectByMentorAndWeek(eq(100L), anyString())).thenReturn(null);

        AjaxResult result = controller.current();

        assertEquals(200, result.get("code"));
        assertNull(result.get("data"));
    }

    // ========== save ==========

    @Test
    void testSaveSuccess() {
        OsgMentorSchedule schedule = new OsgMentorSchedule();
        schedule.setMonday("morning");
        when(service.saveOrUpdate(any())).thenReturn(1);

        AjaxResult result = controller.save(schedule);

        assertEquals(200, result.get("code"));
        assertEquals(100L, schedule.getMentorId());
        assertEquals("testmentor", schedule.getCreateBy());
        assertEquals("testmentor", schedule.getUpdateBy());
    }

    @Test
    void testSaveSetsMentorIdFromSecurity() {
        OsgMentorSchedule schedule = new OsgMentorSchedule();
        schedule.setMentorId(999L);
        when(service.saveOrUpdate(any())).thenReturn(1);

        controller.save(schedule);

        assertEquals(100L, schedule.getMentorId());
    }

    @Test
    void testSaveFailure() {
        OsgMentorSchedule schedule = new OsgMentorSchedule();
        when(service.saveOrUpdate(any())).thenReturn(0);

        AjaxResult result = controller.save(schedule);

        assertEquals(500, result.get("code"));
    }

    // ========== lastWeek ==========

    @Test
    void testLastWeekReturnsData() {
        OsgMentorSchedule schedule = new OsgMentorSchedule();
        schedule.setTuesday("afternoon");
        when(service.selectByMentorAndWeek(eq(100L), anyString())).thenReturn(schedule);

        AjaxResult result = controller.lastWeek();

        assertEquals(200, result.get("code"));
    }

    @Test
    void testLastWeekReturnsNullWhenNoData() {
        when(service.selectByMentorAndWeek(eq(100L), anyString())).thenReturn(null);

        AjaxResult result = controller.lastWeek();

        assertEquals(200, result.get("code"));
        assertNull(result.get("data"));
    }
}
