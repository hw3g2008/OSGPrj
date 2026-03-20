package com.ruoyi.system.service.impl;

import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.ruoyi.system.domain.OsgClassRecord;
import com.ruoyi.system.mapper.OsgClassRecordMapper;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OsgClassRecordServiceImplTest {

    @InjectMocks
    private OsgClassRecordServiceImpl service;

    @Mock
    private OsgClassRecordMapper mapper;

    @Test
    void testSelectMentorClassRecordListDelegates() {
        OsgClassRecord q = new OsgClassRecord();
        q.setMentorId(1L);
        OsgClassRecord r = new OsgClassRecord();
        r.setRecordId(1L);
        when(mapper.selectMentorClassRecordList(q)).thenReturn(Collections.singletonList(r));

        List<OsgClassRecord> result = service.selectMentorClassRecordList(q);

        assertEquals(1, result.size());
        assertEquals(1L, result.get(0).getRecordId());
        verify(mapper).selectMentorClassRecordList(q);
    }

    @Test
    void testSelectMentorClassRecordListEmpty() {
        OsgClassRecord q = new OsgClassRecord();
        when(mapper.selectMentorClassRecordList(q)).thenReturn(Collections.emptyList());

        List<OsgClassRecord> result = service.selectMentorClassRecordList(q);

        assertTrue(result.isEmpty());
    }

    @Test
    void testSelectMentorClassRecordByIdDelegates() {
        OsgClassRecord r = new OsgClassRecord();
        r.setRecordId(5L);
        when(mapper.selectMentorClassRecordById(5L)).thenReturn(r);

        OsgClassRecord result = service.selectMentorClassRecordById(5L);

        assertEquals(5L, result.getRecordId());
    }

    @Test
    void testSelectMentorClassRecordByIdNotFound() {
        when(mapper.selectMentorClassRecordById(999L)).thenReturn(null);

        assertNull(service.selectMentorClassRecordById(999L));
    }

    @Test
    void testCreateMentorClassRecordDelegates() {
        OsgClassRecord r = new OsgClassRecord();
        when(mapper.insertMentorClassRecord(r)).thenReturn(1);

        assertEquals(1, service.createMentorClassRecord(r));
        assertEquals("pending", r.getStatus());
        assertNotNull(r.getSubmittedAt());
        verify(mapper).insertMentorClassRecord(r);
    }

    @Test
    void testUpdateMentorClassRecordDelegates() {
        OsgClassRecord r = new OsgClassRecord();
        when(mapper.updateMentorClassRecord(r)).thenReturn(1);

        assertEquals(1, service.updateMentorClassRecord(r));
        verify(mapper).updateMentorClassRecord(r);
    }
}
