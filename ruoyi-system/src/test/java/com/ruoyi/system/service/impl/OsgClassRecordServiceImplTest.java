package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.mockito.ArgumentCaptor;

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

    @Mock
    private OsgClassReportValidator classReportValidator;

    @Test
    void createLeadMentorClassRecordShouldDefaultMemberStatusToNormalWhenAbsent()
    {
        OsgClassRecord record = new OsgClassRecord();
        record.setStudentId(46706L);
        record.setMentorId(101L);
        record.setClassDate(Timestamp.valueOf(LocalDateTime.of(2026, 5, 8, 10, 0)));
        record.setClassStatus("completed");
        record.setDurationHours(1.0D);
        record.setCourseType("base_course");
        record.setFeedbackContent("test");
        record.setCreateBy("lm_demo");
        // memberStatus 故意不传：复现 BUG-001 — DB 列 NOT NULL 触发 500

        com.ruoyi.system.domain.OsgStudent student = new com.ruoyi.system.domain.OsgStudent();
        student.setStudentId(46706L);
        student.setStudentName("Story1 Test");
        student.setLeadMentorId(101L);
        student.setAccountStatus("0");
        when(studentMapper.selectStudentByStudentId(46706L)).thenReturn(student);
        when(classRecordMapper.insertMentorClassRecord(any(OsgClassRecord.class))).thenReturn(1);

        service.createLeadMentorClassRecord(record);

        ArgumentCaptor<OsgClassRecord> captor = ArgumentCaptor.forClass(OsgClassRecord.class);
        verify(classRecordMapper).insertMentorClassRecord(captor.capture());
        assertEquals("normal", captor.getValue().getMemberStatus());
    }

    @Test
    void createLeadMentorClassRecordShouldPreserveExplicitAbsentMemberStatus()
    {
        OsgClassRecord record = new OsgClassRecord();
        record.setStudentId(46706L);
        record.setMentorId(101L);
        record.setClassDate(Timestamp.valueOf(LocalDateTime.of(2026, 5, 8, 10, 0)));
        record.setClassStatus("absent");
        record.setMemberStatus("absent");
        record.setAbsentRemark("学员未到场");
        record.setCreateBy("lm_demo");

        com.ruoyi.system.domain.OsgStudent student = new com.ruoyi.system.domain.OsgStudent();
        student.setStudentId(46706L);
        student.setStudentName("Story1 Test");
        student.setLeadMentorId(101L);
        student.setAccountStatus("0");
        when(studentMapper.selectStudentByStudentId(46706L)).thenReturn(student);
        when(classRecordMapper.insertMentorClassRecord(any(OsgClassRecord.class))).thenReturn(1);

        service.createLeadMentorClassRecord(record);

        ArgumentCaptor<OsgClassRecord> captor = ArgumentCaptor.forClass(OsgClassRecord.class);
        verify(classRecordMapper).insertMentorClassRecord(captor.capture());
        assertEquals("absent", captor.getValue().getMemberStatus());
    }

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

        // 批次 7 + 7.5：mentor 路径接入 validateStudentAccountForClassRecord，
        // 需要 stub 出 0/0 学员避免「学员不存在」拦截。
        // 见 docs/plans/stage-coaching-request/09-rule-a-alignment-fix-plan.md §13.3 / §13.5
        com.ruoyi.system.domain.OsgStudent student = new com.ruoyi.system.domain.OsgStudent();
        student.setStudentId(7001L);
        student.setStudentName("Mentor Flow Student");
        student.setAccountStatus("0");
        student.setFrozen(0);
        when(studentMapper.selectStudentByStudentId(7001L)).thenReturn(student);
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

    @Test
    void selectLeadMentorClassRecordListWithMineScopeFiltersToOwnClerkRecords()
    {
        // Lead mentor user_id = 7777
        // mine = mentor_id == 7777 AND course_source == 'clerk'
        OsgClassRecord mineRow = buildRow(11L, "学员A", "Lead Mentor", "job_coaching", "case_prep", "clerk", "approved", 2D,
            LocalDateTime.of(2026, 4, 28, 10, 0));
        mineRow.setMentorId(7777L);
        OsgClassRecord otherSourceRow = buildRow(12L, "学员B", "Lead Mentor", "job_coaching", "case_prep", "mentor", "approved", 2D,
            LocalDateTime.of(2026, 4, 28, 11, 0));
        otherSourceRow.setMentorId(7777L);
        OsgClassRecord otherMentorRow = buildRow(13L, "学员C", "Other", "job_coaching", "case_prep", "clerk", "approved", 2D,
            LocalDateTime.of(2026, 4, 28, 12, 0));
        otherMentorRow.setMentorId(8888L);

        when(classRecordMapper.selectClassRecordList(any(OsgClassRecord.class)))
            .thenReturn(List.of(mineRow, otherSourceRow, otherMentorRow));

        List<Map<String, Object>> rows = service.selectLeadMentorClassRecordList(
            null, null, null, null, null, null, null, 7777L, "mine");

        assertEquals(1, rows.size());
        assertEquals(11L, rows.get(0).get("recordId"));
    }

    @Test
    void selectLeadMentorClassRecordListWithManagedScopeFiltersToManagedStudents()
    {
        // managed = student.lead_mentor_id == 7777
        OsgClassRecord managedRow = buildRow(21L, "Managed Stu", "Some Mentor", "job_coaching", "case_prep", "mentor", "approved", 2D,
            LocalDateTime.of(2026, 4, 28, 10, 0));
        managedRow.setStudentId(1021L);
        OsgClassRecord notManagedRow = buildRow(22L, "Other Stu", "Some Mentor", "job_coaching", "case_prep", "mentor", "approved", 2D,
            LocalDateTime.of(2026, 4, 28, 11, 0));
        notManagedRow.setStudentId(1022L);

        com.ruoyi.system.domain.OsgStudent managedStudent = new com.ruoyi.system.domain.OsgStudent();
        managedStudent.setStudentId(1021L);
        managedStudent.setLeadMentorId(7777L);
        com.ruoyi.system.domain.OsgStudent notManagedStudent = new com.ruoyi.system.domain.OsgStudent();
        notManagedStudent.setStudentId(1022L);
        notManagedStudent.setLeadMentorId(9999L);

        when(classRecordMapper.selectClassRecordList(any(OsgClassRecord.class)))
            .thenReturn(List.of(managedRow, notManagedRow));
        when(studentMapper.selectStudentByStudentIds(any()))
            .thenReturn(List.of(managedStudent, notManagedStudent));

        List<Map<String, Object>> rows = service.selectLeadMentorClassRecordList(
            null, null, null, null, null, null, null, 7777L, "managed");

        assertEquals(1, rows.size());
        assertEquals(21L, rows.get(0).get("recordId"));
    }

    @Test
    void selectLeadMentorClassRecordListWithNullScopeFallsBackToManagedFiltering()
    {
        // scope=null/empty → 与 managed 等价（向后兼容）
        OsgClassRecord managedRow = buildRow(31L, "Managed Stu", "Some Mentor", "job_coaching", "case_prep", "mentor", "approved", 2D,
            LocalDateTime.of(2026, 4, 28, 10, 0));
        managedRow.setStudentId(1031L);

        com.ruoyi.system.domain.OsgStudent managedStudent = new com.ruoyi.system.domain.OsgStudent();
        managedStudent.setStudentId(1031L);
        managedStudent.setLeadMentorId(7777L);

        when(classRecordMapper.selectClassRecordList(any(OsgClassRecord.class)))
            .thenReturn(List.of(managedRow));
        when(studentMapper.selectStudentByStudentIds(any()))
            .thenReturn(List.of(managedStudent));

        List<Map<String, Object>> rows = service.selectLeadMentorClassRecordList(
            null, null, null, null, null, null, null, 7777L);

        assertEquals(1, rows.size());
        assertEquals(31L, rows.get(0).get("recordId"));
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

    // ====================================================================
    // class_status 派生：覆盖 mentor / lead-mentor / assistant 三端 × 所有 enum
    // 见 OsgClassRecordServiceImpl#deriveClassStatus
    // ====================================================================

    private static org.junit.jupiter.params.provider.Arguments deriveCase(
        String courseType, String baseCourseCategory, String expected)
    {
        return org.junit.jupiter.params.provider.Arguments.of(courseType, baseCourseCategory, expected);
    }

    static java.util.stream.Stream<org.junit.jupiter.params.provider.Arguments> classStatusDeriveCases()
    {
        return java.util.stream.Stream.of(
            deriveCase("mock_interview", null, "mock_interview"),
            deriveCase("relation_test", null, "networking_midterm"),
            deriveCase("communication_test", null, "mock_midterm"),
            deriveCase("job_coaching", null, "other"),
            deriveCase("base_course", "tech", "technical"),
            deriveCase("base_course", "behavior", "behavioral"),
            deriveCase("base_course", "new_resume", "resume_revision"),
            deriveCase("base_course", "resume_update", "resume_update"),
            deriveCase("base_course", "case_study", "case_prep"),
            deriveCase("base_course", "other", "other"),
            deriveCase("base_course", null, "other"),
            deriveCase("base_course", "", "other")
        );
    }

    @org.junit.jupiter.params.ParameterizedTest(name = "mentor derive: {0}/{1} -> {2}")
    @org.junit.jupiter.params.provider.MethodSource("classStatusDeriveCases")
    void createMentorClassRecordShouldDeriveClassStatus(String courseType, String baseCourseCategory, String expected)
    {
        OsgClassRecord record = new OsgClassRecord();
        record.setStudentId(46706L);
        record.setMentorId(101L);
        record.setStudentName("Story1");
        record.setClassDate(Timestamp.valueOf(LocalDateTime.of(2026, 5, 17, 10, 0)));
        record.setDurationHours(1.0D);
        record.setCourseType(courseType);
        record.setBaseCourseCategory(baseCourseCategory);
        record.setCreateBy("mentor_demo");

        com.ruoyi.system.domain.OsgStudent stub = new com.ruoyi.system.domain.OsgStudent();
        stub.setStudentId(46706L);
        stub.setStudentName("Story1");
        stub.setAccountStatus("0");
        stub.setFrozen(0);
        when(studentMapper.selectStudentByStudentId(46706L)).thenReturn(stub);
        when(classRecordMapper.insertMentorClassRecord(any(OsgClassRecord.class))).thenReturn(1);

        service.createMentorClassRecord(record);

        ArgumentCaptor<OsgClassRecord> captor = ArgumentCaptor.forClass(OsgClassRecord.class);
        verify(classRecordMapper).insertMentorClassRecord(captor.capture());
        assertEquals(expected, captor.getValue().getClassStatus());
    }

    @org.junit.jupiter.params.ParameterizedTest(name = "lead-mentor derive: {0}/{1} -> {2}")
    @org.junit.jupiter.params.provider.MethodSource("classStatusDeriveCases")
    void createLeadMentorClassRecordShouldDeriveClassStatus(String courseType, String baseCourseCategory, String expected)
    {
        OsgClassRecord record = new OsgClassRecord();
        record.setStudentId(46706L);
        record.setMentorId(101L);
        record.setClassDate(Timestamp.valueOf(LocalDateTime.of(2026, 5, 17, 10, 0)));
        record.setDurationHours(1.0D);
        record.setCourseType(courseType);
        record.setBaseCourseCategory(baseCourseCategory);
        record.setFeedbackContent("derive-test");
        record.setCreateBy("lm_demo");

        com.ruoyi.system.domain.OsgStudent student = new com.ruoyi.system.domain.OsgStudent();
        student.setStudentId(46706L);
        student.setStudentName("Story1");
        student.setLeadMentorId(101L);
        student.setAccountStatus("0");
        when(studentMapper.selectStudentByStudentId(46706L)).thenReturn(student);
        when(classRecordMapper.insertMentorClassRecord(any(OsgClassRecord.class))).thenReturn(1);

        service.createLeadMentorClassRecord(record);

        ArgumentCaptor<OsgClassRecord> captor = ArgumentCaptor.forClass(OsgClassRecord.class);
        verify(classRecordMapper).insertMentorClassRecord(captor.capture());
        assertEquals(expected, captor.getValue().getClassStatus());
    }

    @Test
    void createMentorClassRecordShouldPreserveExplicitClassStatus()
    {
        // 显式提供 classStatus（如 absent 流、admin 修订）→ 派生不应覆盖
        OsgClassRecord record = new OsgClassRecord();
        record.setStudentId(46706L);
        record.setMentorId(101L);
        record.setStudentName("Story1");
        record.setClassDate(Timestamp.valueOf(LocalDateTime.of(2026, 5, 17, 10, 0)));
        record.setDurationHours(1.0D);
        record.setCourseType("base_course");
        record.setBaseCourseCategory("tech");
        record.setClassStatus("absent");
        record.setMemberStatus("absent");
        record.setAbsentRemark("学员未到场");
        record.setCreateBy("mentor_demo");

        com.ruoyi.system.domain.OsgStudent stub = new com.ruoyi.system.domain.OsgStudent();
        stub.setStudentId(46706L);
        stub.setStudentName("Story1");
        stub.setAccountStatus("0");
        stub.setFrozen(0);
        when(studentMapper.selectStudentByStudentId(46706L)).thenReturn(stub);
        when(classRecordMapper.insertMentorClassRecord(any(OsgClassRecord.class))).thenReturn(1);

        service.createMentorClassRecord(record);

        ArgumentCaptor<OsgClassRecord> captor = ArgumentCaptor.forClass(OsgClassRecord.class);
        verify(classRecordMapper).insertMentorClassRecord(captor.capture());
        assertEquals("absent", captor.getValue().getClassStatus());
    }

    @Test
    void createMentorClassRecordShouldLeaveClassStatusNullWhenCourseTypeUnknown()
    {
        // 未知 courseType（防御未来 enum 扩展）→ 不强写 class_status
        OsgClassRecord record = new OsgClassRecord();
        record.setStudentId(46706L);
        record.setMentorId(101L);
        record.setStudentName("Story1");
        record.setClassDate(Timestamp.valueOf(LocalDateTime.of(2026, 5, 17, 10, 0)));
        record.setDurationHours(1.0D);
        record.setCourseType("future_unknown_type");
        record.setCreateBy("mentor_demo");

        com.ruoyi.system.domain.OsgStudent stub = new com.ruoyi.system.domain.OsgStudent();
        stub.setStudentId(46706L);
        stub.setStudentName("Story1");
        stub.setAccountStatus("0");
        stub.setFrozen(0);
        when(studentMapper.selectStudentByStudentId(46706L)).thenReturn(stub);
        when(classRecordMapper.insertMentorClassRecord(any(OsgClassRecord.class))).thenReturn(1);

        service.createMentorClassRecord(record);

        ArgumentCaptor<OsgClassRecord> captor = ArgumentCaptor.forClass(OsgClassRecord.class);
        verify(classRecordMapper).insertMentorClassRecord(captor.capture());
        assertNull(captor.getValue().getClassStatus());
    }
}
