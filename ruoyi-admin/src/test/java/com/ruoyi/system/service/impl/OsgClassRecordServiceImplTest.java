package com.ruoyi.system.service.impl;

import java.util.Arrays;
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
    void testSelectListDelegates() {
        OsgClassRecord q = new OsgClassRecord();
        q.setMentorId(1L);
        OsgClassRecord r = new OsgClassRecord();
        r.setRecordId(1L);
        when(mapper.selectList(q)).thenReturn(Collections.singletonList(r));

        List<OsgClassRecord> result = service.selectList(q);

        assertEquals(1, result.size());
        assertEquals(1L, result.get(0).getRecordId());
        verify(mapper).selectList(q);
    }

    @Test
    void testSelectListEmpty() {
        OsgClassRecord q = new OsgClassRecord();
        when(mapper.selectList(q)).thenReturn(Collections.emptyList());

        List<OsgClassRecord> result = service.selectList(q);

        assertTrue(result.isEmpty());
    }

    @Test
    void testSelectByIdDelegates() {
        OsgClassRecord r = new OsgClassRecord();
        r.setRecordId(5L);
        when(mapper.selectById(5L)).thenReturn(r);

        OsgClassRecord result = service.selectById(5L);

        assertEquals(5L, result.getRecordId());
    }

    @Test
    void testSelectByIdNotFound() {
        when(mapper.selectById(999L)).thenReturn(null);

        assertNull(service.selectById(999L));
    }

    @Test
    void testInsertDelegates() {
        OsgClassRecord r = new OsgClassRecord();
        when(mapper.insert(r)).thenReturn(1);

        assertEquals(1, service.insert(r));
        verify(mapper).insert(r);
    }

    @Test
    void testUpdateDelegates() {
        OsgClassRecord r = new OsgClassRecord();
        when(mapper.update(r)).thenReturn(1);

        assertEquals(1, service.update(r));
        verify(mapper).update(r);
    }
}
