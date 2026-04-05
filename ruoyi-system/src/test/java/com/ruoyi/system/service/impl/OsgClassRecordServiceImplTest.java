package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgClassRecord;
import com.ruoyi.system.domain.OsgStaff;
import com.ruoyi.system.mapper.OsgClassRecordMapper;
import com.ruoyi.system.mapper.OsgStaffMapper;
import com.ruoyi.system.mapper.OsgStudentMapper;

@ExtendWith(MockitoExtension.class)
class OsgClassRecordServiceImplTest
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
    void createMentorClassRecordShouldForcePendingReviewState()
    {
        OsgClassRecord record = new OsgClassRecord();
        record.setStudentId(7001L);
        record.setStudentName("Mentor Flow Student");
        record.setMentorId(901L);
        record.setMentorName("mentor_demo");
        record.setCreateBy("mentor_demo");
        record.setCourseType("job_coaching");
        record.setClassStatus("case_prep");
        record.setClassDate(Timestamp.valueOf(LocalDateTime.of(2026, 3, 28, 10, 0)));
        record.setDurationHours(1.5D);
        record.setFeedbackContent("导师已上课，但审核必须仍由后台决定。");
        record.setStatus("approved");
        record.setReviewRemark("client injected");
        record.setReviewedAt(Timestamp.valueOf(LocalDateTime.of(2026, 3, 28, 11, 0)));

        when(classRecordMapper.insertMentorClassRecord(any(OsgClassRecord.class))).thenReturn(1);

        int inserted = service.createMentorClassRecord(record);

        assertEquals(1, inserted);
        assertEquals("pending", record.getStatus());
        assertNull(record.getReviewRemark());
        assertNull(record.getReviewedAt());
    }

    @Test
    void selectClassRecordExportListShouldNormalizeVisibleFilters() throws Exception
    {
        OsgClassRecord row = new OsgClassRecord();
        row.setRecordId(11L);
        row.setClassId("R11");
        row.setStudentId(1001L);
        row.setStudentName("学员A");
        row.setMentorId(201L);
        row.setMentorName("导师A");
        row.setCourseType("mock_practice");
        row.setClassStatus("resume_revision");
        row.setCourseSource("clerk");
        row.setStatus("pending");
        row.setDurationHours(2D);
        row.setClassDate(Timestamp.valueOf(LocalDateTime.of(2026, 3, 21, 10, 0)));

        OsgStaff staff = new OsgStaff();
        staff.setStaffId(201L);
        staff.setHourlyRate(new java.math.BigDecimal("300"));

        when(classRecordMapper.selectClassRecordList(any(OsgClassRecord.class))).thenReturn(List.of(row));
        when(staffMapper.selectStaffByStaffIds(any())).thenReturn(List.of(staff));

        List<Map<String, Object>> exportRows = service.selectClassRecordExportList(
            "学员A",
            "mock_application",
            "new_resume",
            "headteacher",
            "pending",
            new Date(Timestamp.valueOf(LocalDateTime.of(2026, 3, 20, 0, 0)).getTime()),
            new Date(Timestamp.valueOf(LocalDateTime.of(2026, 3, 22, 0, 0)).getTime()));

        verify(classRecordMapper).selectClassRecordList(any(OsgClassRecord.class));
        assertEquals(1, exportRows.size());
        assertEquals("模拟应聘", exportRows.get(0).get("coachingType"));
        assertEquals("新简历", exportRows.get(0).get("courseContent"));
        assertEquals("班主任", exportRows.get(0).get("reporterRole"));
        assertEquals("600.0", exportRows.get(0).get("courseFee"));
    }

    @Test
    void selectClassRecordListShouldApplyVisibleFiltersAndTab()
    {
        OsgClassRecord matching = buildRow(11L, "学员A", "导师A", "position_coaching", "resume_revision", "mentor", "pending", 2D, LocalDateTime.of(2026, 3, 21, 10, 0));
        OsgClassRecord otherStatus = buildRow(12L, "学员A", "导师A", "position_coaching", "resume_revision", "mentor", "approved", 2D, LocalDateTime.of(2026, 3, 21, 10, 0));
        OsgClassRecord otherDate = buildRow(13L, "学员A", "导师A", "position_coaching", "resume_revision", "mentor", "pending", 2D, LocalDateTime.of(2026, 3, 24, 10, 0));

        OsgStaff staff = new OsgStaff();
        staff.setStaffId(201L);
        staff.setHourlyRate(new java.math.BigDecimal("300"));

        when(classRecordMapper.selectClassRecordList(any(OsgClassRecord.class))).thenAnswer(invocation -> filterRows(invocation.getArgument(0), List.of(matching, otherStatus, otherDate)));
        when(staffMapper.selectStaffByStaffIds(any())).thenReturn(List.of(staff));

        List<Map<String, Object>> rows = service.selectClassRecordList(
            "学员A",
            "position_coaching",
            "new_resume",
            "mentor",
            "pending",
            new Date(Timestamp.valueOf(LocalDateTime.of(2026, 3, 20, 0, 0)).getTime()),
            new Date(Timestamp.valueOf(LocalDateTime.of(2026, 3, 22, 0, 0)).getTime()));

        assertEquals(1, rows.size());
        assertEquals("学员A", rows.get(0).get("studentName"));
        assertEquals("岗位辅导", rows.get(0).get("coachingType"));
        assertEquals("新简历", rows.get(0).get("courseContent"));
        assertEquals("导师", rows.get(0).get("reporterRole"));
    }

    @Test
    void selectClassRecordStatsShouldApplyVisibleFiltersAndTab()
    {
        OsgClassRecord matching = buildRow(11L, "学员A", "导师A", "position_coaching", "resume_revision", "mentor", "pending", 2D, LocalDateTime.of(2026, 3, 21, 10, 0));
        OsgClassRecord otherStatus = buildRow(12L, "学员A", "导师A", "position_coaching", "resume_revision", "mentor", "approved", 2D, LocalDateTime.of(2026, 3, 21, 10, 0));

        OsgStaff staff = new OsgStaff();
        staff.setStaffId(201L);
        staff.setHourlyRate(new java.math.BigDecimal("300"));

        when(classRecordMapper.selectClassRecordList(any(OsgClassRecord.class))).thenAnswer(invocation -> filterRows(invocation.getArgument(0), List.of(matching, otherStatus)));
        when(staffMapper.selectStaffByStaffIds(any())).thenReturn(List.of(staff));

        Map<String, Object> stats = service.selectClassRecordStats(
            "学员A",
            "position_coaching",
            "new_resume",
            "mentor",
            "pending",
            new Date(Timestamp.valueOf(LocalDateTime.of(2026, 3, 20, 0, 0)).getTime()),
            new Date(Timestamp.valueOf(LocalDateTime.of(2026, 3, 22, 0, 0)).getTime()));

        assertEquals(1, stats.get("totalCount"));
        assertEquals(1, stats.get("pendingCount"));
        assertEquals(0, stats.get("approvedCount"));
        assertEquals(0, stats.get("rejectedCount"));
        assertEquals("600.0", stats.get("pendingSettlementAmount"));
    }

    @Test
    void rejectRecordShouldRequireRejectRemark()
    {
        OsgClassRecord pending = buildRow(
            11L,
            "学员A",
            "导师A",
            "position_coaching",
            "resume_revision",
            "mentor",
            "pending",
            2D,
            LocalDateTime.of(2026, 3, 21, 10, 0)
        );

        when(classRecordMapper.selectClassRecordByRecordId(11L)).thenReturn(pending);

        ServiceException error = assertThrows(ServiceException.class, () -> service.rejectRecord(11L, Map.of(), "auditor"));

        assertEquals("驳回原因不能为空", error.getMessage());
    }

    private static OsgClassRecord buildRow(Long recordId,
                                           String studentName,
                                           String mentorName,
                                           String courseType,
                                           String classStatus,
                                           String courseSource,
                                           String status,
                                           double durationHours,
                                           LocalDateTime classDate)
    {
        OsgClassRecord row = new OsgClassRecord();
        row.setRecordId(recordId);
        row.setClassId("R" + recordId);
        row.setStudentId(1000L + recordId);
        row.setStudentName(studentName);
        row.setMentorId(201L);
        row.setMentorName(mentorName);
        row.setCourseType(courseType);
        row.setClassStatus(classStatus);
        row.setCourseSource(courseSource);
        row.setStatus(status);
        row.setDurationHours(durationHours);
        row.setClassDate(Timestamp.valueOf(classDate));
        return row;
    }

    private static List<OsgClassRecord> filterRows(OsgClassRecord query, List<OsgClassRecord> rows)
    {
        return rows.stream()
            .filter(row -> query.getKeyword() == null
                || row.getStudentName().contains(query.getKeyword())
                || row.getMentorName().contains(query.getKeyword()))
            .filter(row -> query.getCourseType() == null || Objects.equals(query.getCourseType(), row.getCourseType()))
            .filter(row -> query.getClassStatus() == null || Objects.equals(query.getClassStatus(), row.getClassStatus()))
            .filter(row -> query.getCourseSource() == null || Objects.equals(query.getCourseSource(), row.getCourseSource()))
            .filter(row -> query.getTab() == null || "all".equals(query.getTab()) || Objects.equals(query.getTab(), row.getStatus()))
            .filter(row -> query.getClassDateStart() == null || !row.getClassDate().before(query.getClassDateStart()))
            .filter(row -> query.getClassDateEnd() == null || !row.getClassDate().after(query.getClassDateEnd()))
            .toList();
    }
}
