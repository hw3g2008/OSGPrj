package com.ruoyi.web.controller.osg;

import java.math.BigDecimal;
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
import com.ruoyi.system.domain.OsgClassRecord;
import com.ruoyi.system.service.IOsgClassRecordService;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OsgClassRecordControllerTest {

    @InjectMocks
    private OsgClassRecordController controller;

    @Mock
    private IOsgClassRecordService service;

    private MockedStatic<SecurityUtils> securityMock;

    @BeforeEach
    void setUp() {
        securityMock = Mockito.mockStatic(SecurityUtils.class);
        securityMock.when(SecurityUtils::getUserId).thenReturn(100L);
        securityMock.when(SecurityUtils::getUsername).thenReturn("testmentor");
    }

    @AfterEach
    void tearDown() {
        securityMock.close();
    }

    // ========== getInfo ==========

    @Test
    void testGetInfoSuccess() {
        OsgClassRecord record = new OsgClassRecord();
        record.setRecordId(1L);
        record.setClassId("#R001");
        when(service.selectById(1L)).thenReturn(record);

        AjaxResult result = controller.getInfo(1L);

        assertEquals(200, result.get("code"));
        assertNotNull(result.get("data"));
        verify(service).selectById(1L);
    }

    @Test
    void testGetInfoNotFound() {
        when(service.selectById(999L)).thenReturn(null);

        AjaxResult result = controller.getInfo(999L);

        assertEquals(200, result.get("code"));
        assertNull(result.get("data"));
    }

    // ========== add ==========

    @Test
    void testAddSuccess() {
        OsgClassRecord record = new OsgClassRecord();
        record.setDurationHours(new java.math.BigDecimal("2.0"));
        when(service.insert(any(OsgClassRecord.class))).thenReturn(1);

        AjaxResult result = controller.add(record);

        assertEquals(200, result.get("code"));
        assertEquals(100L, record.getMentorId());
        assertEquals("testmentor", record.getCreateBy());
        verify(service).insert(record);
    }

    @Test
    void testAddSetsMentorIdFromSecurity() {
        OsgClassRecord record = new OsgClassRecord();
        record.setMentorId(999L);
        record.setDurationHours(new java.math.BigDecimal("1.0"));
        when(service.insert(any())).thenReturn(1);

        controller.add(record);

        assertEquals(100L, record.getMentorId());
    }

    @Test
    void testAddInsertFailure() {
        OsgClassRecord record = new OsgClassRecord();
        record.setDurationHours(new java.math.BigDecimal("1.0"));
        when(service.insert(any())).thenReturn(0);

        AjaxResult result = controller.add(record);

        assertEquals(500, result.get("code"));
    }
}
