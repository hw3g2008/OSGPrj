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
import com.ruoyi.system.domain.OsgSimPractice;
import com.ruoyi.system.service.IOsgSimPracticeService;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OsgSimPracticeControllerTest {

    @InjectMocks
    private OsgSimPracticeController controller;

    @Mock
    private IOsgSimPracticeService service;

    private MockedStatic<SecurityUtils> securityMock;

    @BeforeEach
    void setUp() {
        securityMock = Mockito.mockStatic(SecurityUtils.class);
        securityMock.when(SecurityUtils::getUserId).thenReturn(100L);
    }

    @AfterEach
    void tearDown() { securityMock.close(); }

    @Test
    void testConfirmSuccess() {
        when(service.update(any())).thenReturn(1);

        AjaxResult result = controller.confirm(7L);

        assertEquals(200, result.get("code"));
        verify(service).update(argThat(r -> r.getPracticeId().equals(7L) && "confirmed".equals(r.getStatus())));
    }

    @Test
    void testConfirmSetsStatusToConfirmed() {
        when(service.update(any())).thenReturn(1);

        controller.confirm(1L);

        verify(service).update(argThat(r -> "confirmed".equals(r.getStatus())));
    }

    @Test
    void testConfirmFailure() {
        when(service.update(any())).thenReturn(0);

        AjaxResult result = controller.confirm(999L);

        assertEquals(500, result.get("code"));
    }
}
