package com.ruoyi.web.controller.osg;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
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
import com.ruoyi.system.domain.OsgJobCoaching;
import com.ruoyi.system.service.IOsgJobCoachingService;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OsgJobOverviewControllerTest {

    @InjectMocks
    private OsgJobOverviewController controller;

    @Mock
    private IOsgJobCoachingService service;

    private MockedStatic<SecurityUtils> securityMock;

    @BeforeEach
    void setUp() {
        securityMock = Mockito.mockStatic(SecurityUtils.class);
        securityMock.when(SecurityUtils::getUserId).thenReturn(100L);
    }

    @AfterEach
    void tearDown() { securityMock.close(); }

    // ========== confirm ==========

    @Test
    void testConfirmSuccess() {
        when(service.update(any(OsgJobCoaching.class))).thenReturn(1);

        AjaxResult result = controller.confirm(5L);

        assertEquals(200, result.get("code"));
        verify(service).update(argThat(r -> r.getId().equals(5L) && "coaching".equals(r.getCoachingStatus())));
    }

    @Test
    void testConfirmSetsStatusToCoaching() {
        when(service.update(any())).thenReturn(1);

        controller.confirm(10L);

        verify(service).update(argThat(r -> "coaching".equals(r.getCoachingStatus())));
    }

    @Test
    void testConfirmNotFound() {
        when(service.update(any())).thenReturn(0);

        AjaxResult result = controller.confirm(999L);

        assertEquals(500, result.get("code"));
    }

    // ========== calendar ==========

    @Test
    void testCalendarSuccess() {
        OsgJobCoaching item = new OsgJobCoaching();
        item.setCompany("Goldman Sachs");
        when(service.selectCalendar(any())).thenReturn(Collections.singletonList(item));

        AjaxResult result = controller.calendar();

        assertEquals(200, result.get("code"));
        assertNotNull(result.get("data"));
        verify(service).selectCalendar(argThat(q -> q.getMentorId().equals(100L)));
    }

    @Test
    void testCalendarEmpty() {
        when(service.selectCalendar(any())).thenReturn(Collections.emptyList());

        AjaxResult result = controller.calendar();

        assertEquals(200, result.get("code"));
    }
}
