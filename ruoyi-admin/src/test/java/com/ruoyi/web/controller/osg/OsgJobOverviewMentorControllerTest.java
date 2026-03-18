package com.ruoyi.web.controller.osg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import java.util.Collections;
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

@ExtendWith(MockitoExtension.class)
class OsgJobOverviewMentorControllerTest
{
    @InjectMocks
    private OsgJobOverviewController controller;

    @Mock
    private IOsgJobCoachingService jobCoachingService;

    private MockedStatic<SecurityUtils> securityMock;

    @BeforeEach
    void setUp()
    {
        securityMock = Mockito.mockStatic(SecurityUtils.class);
        securityMock.when(SecurityUtils::getUserId).thenReturn(100L);
    }

    @AfterEach
    void tearDown()
    {
        securityMock.close();
    }

    @Test
    void confirmShouldSetCoachingStatus()
    {
        when(jobCoachingService.update(any(OsgJobCoaching.class))).thenReturn(1);

        AjaxResult result = controller.confirm(5L);

        assertEquals(200, result.get("code"));
        verify(jobCoachingService).update(any(OsgJobCoaching.class));
    }

    @Test
    void calendarShouldQueryCurrentMentorRows()
    {
        OsgJobCoaching item = new OsgJobCoaching();
        item.setCompany("Goldman Sachs");
        when(jobCoachingService.selectCalendar(any(OsgJobCoaching.class))).thenReturn(Collections.singletonList(item));

        AjaxResult result = controller.calendar();

        assertEquals(200, result.get("code"));
        assertNotNull(result.get("data"));
        verify(jobCoachingService).selectCalendar(any(OsgJobCoaching.class));
    }
}
