package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.sql.Timestamp;
import java.time.LocalDateTime;

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
import com.ruoyi.common.exception.ServiceException;

@ExtendWith(MockitoExtension.class)
class OsgClassRecordServiceImplAssistantScopeTest
{
    @InjectMocks
    private OsgClassRecordServiceImpl service;

    @Mock
    private OsgClassRecordMapper classRecordMapper;

    @Mock
    private OsgStaffMapper staffMapper;

    @Mock
    private OsgStudentMapper studentMapper;

    @Test
    void createAssistantClassRecordShouldPersistPendingRecordForOwnedStudent()
    {
        OsgClassRecord record = new OsgClassRecord();
        record.setStudentId(6001L);
        record.setMentorId(930L);
        record.setMentorName("assistant_user");
        record.setCreateBy("assistant_user");
        record.setCourseType("position_coaching");
        record.setClassStatus("case_prep");
        record.setClassDate(Timestamp.valueOf(LocalDateTime.of(2026, 3, 27, 10, 0)));
        record.setDurationHours(1.5D);
        record.setFeedbackContent("已完成 case 拆解与复盘");

        when(studentMapper.selectStudentByStudentId(6001L)).thenReturn(buildStudentWithName(6001L, "Assistant Student", 930L));
        when(classRecordMapper.insertMentorClassRecord(any(OsgClassRecord.class))).thenAnswer(invocation -> {
            OsgClassRecord value = invocation.getArgument(0);
            value.setRecordId(71L);
            return 1;
        });

        Map<String, Object> result = service.createAssistantClassRecord(record);

        assertEquals(71L, result.get("recordId"));
        assertEquals("Assistant Student", result.get("studentName"));
        assertEquals("assistant", result.get("courseSource"));
        assertEquals("pending", result.get("status"));
    }

    @Test
    void createAssistantClassRecordShouldRejectForeignStudent()
    {
        OsgClassRecord record = new OsgClassRecord();
        record.setStudentId(6002L);
        record.setMentorId(930L);
        record.setCourseType("position_coaching");
        record.setClassStatus("case_prep");
        record.setClassDate(Timestamp.valueOf(LocalDateTime.of(2026, 3, 27, 10, 0)));
        record.setDurationHours(1.5D);
        record.setFeedbackContent("不应成功");

        when(studentMapper.selectStudentByStudentId(6002L)).thenReturn(buildStudentWithName(6002L, "Foreign Student", 931L));

        ServiceException error = assertThrows(ServiceException.class, () -> service.createAssistantClassRecord(record));

        assertEquals("无权为该学员上报课程记录", error.getMessage());
    }

    @Test
    void selectAssistantClassRecordListShouldOnlyReturnAssistantOwnedRows()
    {
        OsgClassRecord owned = buildRecord(31L, 401L, 5001L, "Owned Student", "pending", 2.0);
        OsgClassRecord foreign = buildRecord(32L, 402L, 5002L, "Foreign Student", "approved", 1.0);

        when(classRecordMapper.selectClassRecordList(any(OsgClassRecord.class))).thenReturn(List.of(owned, foreign));
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
    void selectAssistantClassRecordStatsShouldOnlyAggregateAssistantOwnedRows()
    {
        OsgClassRecord pending = buildRecord(41L, 501L, 6001L, "Pending Student", "pending", 2.0);
        OsgClassRecord approved = buildRecord(42L, 502L, 6002L, "Approved Student", "approved", 1.5);

        when(classRecordMapper.selectClassRecordList(any(OsgClassRecord.class))).thenReturn(List.of(pending, approved));
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

    @Test
    void selectAssistantClassRecordList_scope_mine_filters_by_mentor_id_and_course_source()
    {
        OsgClassRecord mineRecord = buildRecordWithSource(51L, 920L, 7001L, "Mine Student", "pending", 1.0, "assistant");
        OsgClassRecord mentorRecord = buildRecordWithSource(52L, 920L, 7002L, "Mentor Student", "pending", 1.0, "mentor");
        OsgClassRecord otherAssistant = buildRecordWithSource(53L, 921L, 7003L, "Other Assistant", "pending", 1.0, "assistant");

        when(classRecordMapper.selectClassRecordList(any(OsgClassRecord.class))).thenReturn(List.of(mineRecord, mentorRecord, otherAssistant));
        when(staffMapper.selectStaffByStaffIds(List.of(920L))).thenReturn(List.of(buildStaff(920L, 300)));

        List<Map<String, Object>> rows = service.selectAssistantClassRecordList(
            null, null, null, null, null, null, null, 920L, "mine");

        assertEquals(1, rows.size());
        assertEquals(51L, rows.get(0).get("recordId"));
    }

    @Test
    void selectAssistantClassRecordList_scope_managed_keeps_ownership_logic()
    {
        OsgClassRecord owned = buildRecordWithSource(61L, 401L, 8001L, "Owned", "pending", 1.0, "mentor");
        OsgClassRecord foreign = buildRecordWithSource(62L, 402L, 8002L, "Foreign", "pending", 1.0, "assistant");

        when(classRecordMapper.selectClassRecordList(any(OsgClassRecord.class))).thenReturn(List.of(owned, foreign));
        when(studentMapper.selectStudentByStudentIds(anyList())).thenReturn(List.of(
            buildStudent(8001L, 940L),
            buildStudent(8002L, 941L)
        ));
        when(staffMapper.selectStaffByStaffIds(List.of(401L))).thenReturn(List.of(buildStaff(401L, 300)));

        List<Map<String, Object>> rows = service.selectAssistantClassRecordList(
            null, null, null, null, null, null, null, 940L, "managed");

        assertEquals(1, rows.size());
        assertEquals(61L, rows.get(0).get("recordId"));
    }

    @Test
    void selectAssistantClassRecordList_scope_null_equals_managed()
    {
        OsgClassRecord owned = buildRecordWithSource(71L, 401L, 9001L, "Owned", "approved", 1.5, "mentor");
        OsgClassRecord foreign = buildRecordWithSource(72L, 402L, 9002L, "Foreign", "pending", 1.0, "assistant");

        when(classRecordMapper.selectClassRecordList(any(OsgClassRecord.class))).thenReturn(List.of(owned, foreign));
        when(studentMapper.selectStudentByStudentIds(anyList())).thenReturn(List.of(
            buildStudent(9001L, 950L),
            buildStudent(9002L, 951L)
        ));
        when(staffMapper.selectStaffByStaffIds(List.of(401L))).thenReturn(List.of(buildStaff(401L, 300)));

        List<Map<String, Object>> rowsNull = service.selectAssistantClassRecordList(
            null, null, null, null, null, null, null, 950L, null);

        assertEquals(1, rowsNull.size());
        assertEquals(71L, rowsNull.get(0).get("recordId"));
    }

    @Test
    void selectAssistantClassRecordStats_returns_mine_count_and_managed_count()
    {
        OsgClassRecord mineOwned = buildRecordWithSource(81L, 960L, 10001L, "Mine Owned", "pending", 2.0, "assistant");
        OsgClassRecord mentorOwned = buildRecordWithSource(82L, 401L, 10002L, "Mentor Owned", "approved", 1.0, "mentor");
        OsgClassRecord foreign = buildRecordWithSource(83L, 402L, 10003L, "Foreign", "pending", 1.0, "assistant");

        when(classRecordMapper.selectClassRecordList(any(OsgClassRecord.class))).thenReturn(List.of(mineOwned, mentorOwned, foreign));
        when(studentMapper.selectStudentByStudentIds(anyList())).thenReturn(List.of(
            buildStudent(10001L, 960L),
            buildStudent(10002L, 960L),
            buildStudent(10003L, 961L)
        ));
        when(staffMapper.selectStaffByStaffIds(anyList())).thenReturn(List.of(
            buildStaff(960L, 300), buildStaff(401L, 250)
        ));

        Map<String, Object> stats = service.selectAssistantClassRecordStats(
            null, null, null, null, null, null, null, 960L, "managed");

        assertEquals(2, stats.get("totalCount"));
        assertEquals(1, stats.get("mineCount"));
        assertEquals(2, stats.get("managedCount"));
    }

    @Test
    void selectAssistantClassRecordStats_mine_count_unaffected_by_scope_param()
    {
        OsgClassRecord mineOwned = buildRecordWithSource(91L, 970L, 11001L, "Mine", "pending", 1.0, "assistant");
        OsgClassRecord mentorOwned = buildRecordWithSource(92L, 401L, 11002L, "Mentor", "approved", 1.0, "mentor");

        when(classRecordMapper.selectClassRecordList(any(OsgClassRecord.class))).thenReturn(List.of(mineOwned, mentorOwned));
        when(studentMapper.selectStudentByStudentIds(anyList())).thenReturn(List.of(
            buildStudent(11001L, 970L),
            buildStudent(11002L, 970L)
        ));
        when(staffMapper.selectStaffByStaffIds(anyList())).thenReturn(List.of(
            buildStaff(970L, 300), buildStaff(401L, 250)
        ));

        Map<String, Object> statsMine = service.selectAssistantClassRecordStats(
            null, null, null, null, null, null, null, 970L, "mine");
        Map<String, Object> statsManaged = service.selectAssistantClassRecordStats(
            null, null, null, null, null, null, null, 970L, "managed");

        assertEquals(statsMine.get("mineCount"), statsManaged.get("mineCount"));
        assertEquals(statsMine.get("managedCount"), statsManaged.get("managedCount"));
        assertEquals(1, statsMine.get("mineCount"));
        assertEquals(2, statsMine.get("managedCount"));
    }

    private OsgClassRecord buildRecord(Long recordId, Long mentorId, Long studentId, String studentName, String status,
                                       double durationHours)
    {
        return buildRecordWithSource(recordId, mentorId, studentId, studentName, status, durationHours, "assistant");
    }

    private OsgClassRecord buildRecordWithSource(Long recordId, Long mentorId, Long studentId, String studentName,
                                                 String status, double durationHours, String courseSource)
    {
        OsgClassRecord record = new OsgClassRecord();
        record.setRecordId(recordId);
        record.setClassId("CR-" + recordId);
        record.setMentorId(mentorId);
        record.setMentorName("Mentor " + mentorId);
        record.setStudentId(studentId);
        record.setStudentName(studentName);
        record.setCourseType("position_coaching");
        record.setCourseSource(courseSource);
        record.setClassStatus("case_prep");
        record.setStatus(status);
        record.setDurationHours(durationHours);
        return record;
    }

    private OsgStaff buildStaff(Long staffId, int hourlyRate)
    {
        OsgStaff staff = new OsgStaff();
        staff.setStaffId(staffId);
        staff.setHourlyRate(java.math.BigDecimal.valueOf(hourlyRate));
        return staff;
    }

    private OsgStudent buildStudent(Long studentId, Long assistantId)
    {
        OsgStudent student = new OsgStudent();
        student.setStudentId(studentId);
        student.setAssistantId(assistantId);
        return student;
    }

    private OsgStudent buildStudentWithName(Long studentId, String studentName, Long assistantId)
    {
        OsgStudent student = buildStudent(studentId, assistantId);
        student.setStudentName(studentName);
        return student;
    }
}
