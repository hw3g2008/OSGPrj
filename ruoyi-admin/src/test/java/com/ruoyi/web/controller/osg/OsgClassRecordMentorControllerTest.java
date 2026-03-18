package com.ruoyi.web.controller.osg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
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
import com.ruoyi.system.service.impl.OsgClassRecordServiceImpl;

@ExtendWith(MockitoExtension.class)
class OsgClassRecordMentorControllerTest
{
    @InjectMocks
    private OsgClassRecordController controller;

    @Mock
    private OsgClassRecordServiceImpl classRecordService;

    private MockedStatic<SecurityUtils> securityMock;

    @BeforeEach
    void setUp()
    {
        securityMock = Mockito.mockStatic(SecurityUtils.class);
        securityMock.when(SecurityUtils::getUserId).thenReturn(100L);
        securityMock.when(SecurityUtils::getUsername).thenReturn("testmentor");
    }

    @AfterEach
    void tearDown()
    {
        securityMock.close();
    }

    @Test
    void getInfoShouldReturnMentorRecord()
    {
        OsgClassRecord record = new OsgClassRecord();
        record.setRecordId(1L);
        record.setClassId("#R001");
        when(classRecordService.selectMentorClassRecordById(1L)).thenReturn(record);

        AjaxResult result = controller.getInfo(1L);

        assertEquals(200, result.get("code"));
        assertNotNull(result.get("data"));
        verify(classRecordService).selectMentorClassRecordById(1L);
    }

    @Test
    void getInfoShouldAllowEmptyPayload()
    {
        when(classRecordService.selectMentorClassRecordById(999L)).thenReturn(null);

        AjaxResult result = controller.getInfo(999L);

        assertEquals(200, result.get("code"));
        assertNull(result.get("data"));
    }

    @Test
    void addShouldBindMentorIdentityFromSecurity()
    {
        OsgClassRecord record = new OsgClassRecord();
        record.setDurationHours(2.0);
        when(classRecordService.createMentorClassRecord(any(OsgClassRecord.class))).thenReturn(1);

        AjaxResult result = controller.add(record);

        assertEquals(200, result.get("code"));
        assertEquals(100L, record.getMentorId());
        assertEquals("testmentor", record.getCreateBy());
        verify(classRecordService).createMentorClassRecord(record);
    }
}
