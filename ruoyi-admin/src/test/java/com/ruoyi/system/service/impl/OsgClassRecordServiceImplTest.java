package com.ruoyi.system.service.impl;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.ruoyi.system.domain.OsgClassRecord;
import com.ruoyi.system.domain.OsgStaff;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.OsgClassRecordMapper;
import com.ruoyi.system.mapper.OsgStaffMapper;
import com.ruoyi.system.mapper.OsgStudentMapper;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OsgClassRecordServiceImplTest {

    @InjectMocks
    private OsgClassRecordServiceImpl service;

    @Mock
    private OsgClassRecordMapper mapper;

    @Mock
    private OsgStaffMapper staffMapper;

    @Mock
    private OsgStudentMapper studentMapper;

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
    void testCreateMentorClassRecordPopulatesStudentNameFromStudentRecord() {
        OsgClassRecord record = new OsgClassRecord();
        record.setStudentId(3001L);
        record.setCreateBy("mentor.user");
        OsgStudent student = new OsgStudent();
        student.setStudentId(3001L);
        student.setStudentName("Runtime Student");
        when(studentMapper.selectStudentByStudentId(3001L)).thenReturn(student);
        when(mapper.insertMentorClassRecord(record)).thenReturn(1);

        assertEquals(1, service.createMentorClassRecord(record));

        assertEquals("Runtime Student", record.getStudentName());
        assertEquals("mentor", record.getCourseSource());
        assertEquals("pending", record.getStatus());
        assertNotNull(record.getSubmittedAt());
        verify(studentMapper).selectStudentByStudentId(3001L);
        verify(mapper).insertMentorClassRecord(record);
    }

    @Test
    void testUpdateMentorClassRecordDelegates() {
        OsgClassRecord r = new OsgClassRecord();
        when(mapper.updateMentorClassRecord(r)).thenReturn(1);

        assertEquals(1, service.updateMentorClassRecord(r));
        verify(mapper).updateMentorClassRecord(r);
    }

    @Test
    void selectClassRecordStatsTreatsCompletedAsApprovedAndBatchLoadsRates() {
        OsgClassRecord pending = buildRecord(11L, 201L, "pending", 2.0);
        OsgClassRecord completed = buildRecord(12L, 202L, "completed", 1.5);
        when(mapper.selectClassRecordList(any(OsgClassRecord.class))).thenReturn(List.of(pending, completed));
        when(staffMapper.selectStaffByStaffIds(List.of(201L, 202L))).thenReturn(List.of(
            buildStaff(201L, 300),
            buildStaff(202L, 280)
        ));

        Map<String, Object> stats = service.selectClassRecordStats(null);

        assertEquals(2, stats.get("totalCount"));
        assertEquals(1, stats.get("pendingCount"));
        assertEquals(1, stats.get("approvedCount"));
        assertEquals(0, stats.get("rejectedCount"));
        assertEquals("600.0", stats.get("pendingSettlementAmount"));
        verify(staffMapper).selectStaffByStaffIds(List.of(201L, 202L));
        verify(staffMapper, never()).selectStaffByStaffId(anyLong());
    }

    @Test
    void selectClassRecordListUsesBatchRatesForPayloadFees() {
        OsgClassRecord first = buildRecord(21L, 301L, "pending", 2.0);
        OsgClassRecord second = buildRecord(22L, 302L, "completed", 1.5);
        when(mapper.selectClassRecordList(any(OsgClassRecord.class))).thenReturn(List.of(first, second));
        when(staffMapper.selectStaffByStaffIds(List.of(301L, 302L))).thenReturn(List.of(
            buildStaff(301L, 260),
            buildStaff(302L, 320)
        ));

        List<Map<String, Object>> rows = service.selectClassRecordList(null);

        assertEquals(2, rows.size());
        assertEquals("520.0", rows.get(0).get("courseFee"));
        assertEquals("480.0", rows.get(1).get("courseFee"));
        verify(staffMapper).selectStaffByStaffIds(List.of(301L, 302L));
        verify(staffMapper, never()).selectStaffByStaffId(anyLong());
    }

    @Test
    void selectAssistantClassRecordListShouldOnlyReturnAssistantOwnedStudents() {
        OsgClassRecord owned = buildRecord(31L, 401L, "pending", 2.0);
        owned.setStudentId(5001L);
        owned.setStudentName("Owned Student");
        OsgClassRecord foreign = buildRecord(32L, 402L, "approved", 1.0);
        foreign.setStudentId(5002L);
        foreign.setStudentName("Foreign Student");

        when(mapper.selectClassRecordList(any(OsgClassRecord.class))).thenReturn(List.of(owned, foreign));
        when(studentMapper.selectStudentByStudentIds(anyList())).thenReturn(List.of(
            buildStudent(5001L, 920L),
            buildStudent(5002L, 921L)
        ));
        when(staffMapper.selectStaffByStaffIds(List.of(401L))).thenReturn(List.of(buildStaff(401L, 300)));

        List<Map<String, Object>> rows = service.selectAssistantClassRecordList(null, 920L);

        assertEquals(1, rows.size());
        assertEquals(31L, rows.get(0).get("recordId"));
        assertEquals("Owned Student", rows.get(0).get("studentName"));
        verify(staffMapper).selectStaffByStaffIds(List.of(401L));
    }

    @Test
    void selectAssistantClassRecordStatsShouldOnlyAggregateAssistantOwnedStudents() {
        OsgClassRecord pending = buildRecord(41L, 501L, "pending", 2.0);
        pending.setStudentId(6001L);
        OsgClassRecord approved = buildRecord(42L, 502L, "approved", 1.5);
        approved.setStudentId(6002L);

        when(mapper.selectClassRecordList(any(OsgClassRecord.class))).thenReturn(List.of(pending, approved));
        when(studentMapper.selectStudentByStudentIds(anyList())).thenReturn(List.of(
            buildStudent(6001L, 930L),
            buildStudent(6002L, 931L)
        ));
        when(staffMapper.selectStaffByStaffIds(List.of(501L))).thenReturn(List.of(buildStaff(501L, 280)));

        Map<String, Object> stats = service.selectAssistantClassRecordStats(null, 930L);

        assertEquals(1, stats.get("totalCount"));
        assertEquals(1, stats.get("pendingCount"));
        assertEquals(0, stats.get("approvedCount"));
        assertEquals("560.0", stats.get("pendingSettlementAmount"));
        verify(staffMapper).selectStaffByStaffIds(List.of(501L));
    }

    private OsgClassRecord buildRecord(Long recordId, Long mentorId, String status, double durationHours) {
        OsgClassRecord record = new OsgClassRecord();
        record.setRecordId(recordId);
        record.setClassId("CR-" + recordId);
        record.setMentorId(mentorId);
        record.setStudentId(1000L + recordId);
        record.setStudentName("Student " + recordId);
        record.setCourseType("position_coaching");
        record.setCourseSource("assistant");
        record.setClassStatus("case_prep");
        record.setStatus(status);
        record.setDurationHours(durationHours);
        return record;
    }

    private OsgStaff buildStaff(Long staffId, int hourlyRate) {
        OsgStaff staff = new OsgStaff();
        staff.setStaffId(staffId);
        staff.setHourlyRate(java.math.BigDecimal.valueOf(hourlyRate));
        return staff;
    }

    private OsgStudent buildStudent(Long studentId, Long assistantId) {
        OsgStudent student = new OsgStudent();
        student.setStudentId(studentId);
        student.setAssistantId(assistantId);
        return student;
    }
}
