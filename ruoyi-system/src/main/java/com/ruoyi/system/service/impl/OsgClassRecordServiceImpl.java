package com.ruoyi.system.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgClassRecord;
import com.ruoyi.system.domain.OsgStaff;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.OsgClassRecordMapper;
import com.ruoyi.system.mapper.OsgStaffMapper;
import com.ruoyi.system.mapper.OsgStudentMapper;
import com.ruoyi.system.service.IOsgClassRecordService;

@Service
public class OsgClassRecordServiceImpl implements IOsgClassRecordService
{
    private static final String STATUS_PENDING = "pending";
    private static final String STATUS_APPROVED = "approved";
    private static final String STATUS_REJECTED = "rejected";

    @Autowired
    private OsgClassRecordMapper classRecordMapper;

    @Autowired
    private OsgStaffMapper staffMapper;

    @Autowired
    private OsgStudentMapper studentMapper;

    @Override
    public List<OsgClassRecord> selectMentorClassRecordList(OsgClassRecord record)
    {
        List<OsgClassRecord> rows = classRecordMapper.selectMentorClassRecordList(record);
        return rows == null ? Collections.emptyList() : rows;
    }

    @Override
    public OsgClassRecord selectMentorClassRecordById(Long id)
    {
        return classRecordMapper.selectMentorClassRecordById(id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> createLeadMentorClassRecord(OsgClassRecord record)
    {
        validateLeadMentorCreate(record);

        OsgStudent student = requireManagedStudent(record.getStudentId(), record.getMentorId());
        record.setStudentName(student.getStudentName());
        record.setCourseSource("clerk");
        normalizeCreateDefaults(record);
        if (classRecordMapper.insertMentorClassRecord(record) <= 0)
        {
            throw new ServiceException("课程记录提交失败");
        }
        return toLeadMentorCreatePayload(record);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int createMentorClassRecord(OsgClassRecord record)
    {
        normalizeCreateDefaults(record);
        return classRecordMapper.insertMentorClassRecord(record);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int updateMentorClassRecord(OsgClassRecord record)
    {
        return classRecordMapper.updateMentorClassRecord(record);
    }

    public List<Map<String, Object>> selectClassRecordList(String keyword)
    {
        List<OsgClassRecord> rows = selectRows(keyword, null, null, null);
        if (rows.isEmpty())
        {
            return Collections.emptyList();
        }

        Map<Long, BigDecimal> hourlyRates = loadHourlyRates(rows);
        List<Map<String, Object>> result = new ArrayList<>(rows.size());
        for (OsgClassRecord row : rows)
        {
            result.add(toClassRecordPayload(row, hourlyRates));
        }
        return result;
    }

    public Map<String, Object> selectClassRecordStats(String keyword)
    {
        List<OsgClassRecord> rows = selectRows(keyword, null, null, null);
        Map<Long, BigDecimal> hourlyRates = loadHourlyRates(rows);
        BigDecimal pendingSettlementAmount = rows.stream()
            .filter(row -> Objects.equals(normalizeReviewStatus(row.getStatus()), STATUS_PENDING))
            .map(row -> resolveCourseFee(row, hourlyRates))
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(1, RoundingMode.HALF_UP);

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalCount", rows.size());
        summary.put("pendingCount", countByStatus(rows, STATUS_PENDING));
        summary.put("approvedCount", countByStatus(rows, STATUS_APPROVED));
        summary.put("rejectedCount", countByStatus(rows, STATUS_REJECTED));
        summary.put("pendingSettlementAmount", pendingSettlementAmount.toPlainString());
        summary.put("flowSteps", List.of(
            "学员申请岗位/模拟应聘",
            "班主任分配导师",
            "导师上课并申报记录",
            "后台审核",
            "结算中心转账"
        ));
        return summary;
    }

    @Override
    public Map<String, Object> selectReportSummary(String keyword, String courseType, String courseSource, String tab)
    {
        List<OsgClassRecord> rows = selectRows(keyword, courseType, courseSource, null);
        List<Map<String, Object>> overtimeMentors = rows.stream()
            .filter(this::isOvertime)
            .map(row -> {
                Map<String, Object> payload = new LinkedHashMap<>();
                payload.put("mentorId", row.getMentorId());
                payload.put("mentorName", row.getMentorName());
                payload.put("weeklyHours", row.getWeeklyHours());
                return payload;
            })
            .distinct()
            .toList();

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("allCount", rows.size());
        summary.put("pendingCount", countByStatus(rows, STATUS_PENDING));
        summary.put("approvedCount", countByStatus(rows, STATUS_APPROVED));
        summary.put("rejectedCount", countByStatus(rows, STATUS_REJECTED));
        summary.put("selectedTab", normalizeTab(tab));
        summary.put("overtimeMentors", overtimeMentors);
        return summary;
    }

    @Override
    public List<Map<String, Object>> selectReportList(String keyword, String courseType, String courseSource, String tab)
    {
        List<OsgClassRecord> rows = selectRows(keyword, courseType, courseSource, tab);
        if (rows.isEmpty())
        {
            return Collections.emptyList();
        }
        List<Map<String, Object>> result = new ArrayList<>(rows.size());
        int pendingReviewCount = countByStatus(selectRows(keyword, courseType, courseSource, null), STATUS_PENDING);
        for (OsgClassRecord row : rows)
        {
            result.add(toPayload(row, pendingReviewCount));
        }
        return result;
    }

    @Override
    public Map<String, Object> selectReportDetail(Long recordId)
    {
        return toPayload(requireRecord(recordId), null);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> approveRecord(Long recordId, Map<String, Object> payload, String operator)
    {
        return reviewRecord(recordId, STATUS_APPROVED, payload, operator);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> rejectRecord(Long recordId, Map<String, Object> payload, String operator)
    {
        return reviewRecord(recordId, STATUS_REJECTED, payload, operator);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> batchApprove(Map<String, Object> payload, String operator)
    {
        return reviewBatch(payload, STATUS_APPROVED, operator);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> batchReject(Map<String, Object> payload, String operator)
    {
        return reviewBatch(payload, STATUS_REJECTED, operator);
    }

    private Map<String, Object> reviewBatch(Map<String, Object> payload, String targetStatus, String operator)
    {
        List<Long> recordIds = toLongList(payload == null ? null : payload.get("recordIds"));
        if (recordIds.isEmpty())
        {
            throw new ServiceException("recordIds不能为空");
        }

        String reviewRemark = firstText(payload == null ? null : payload.get("remark"));
        int reviewedCount = 0;
        for (Long recordId : recordIds)
        {
            reviewRecord(recordId, targetStatus, Map.of("remark", reviewRemark), operator);
            reviewedCount++;
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", targetStatus);
        result.put("reviewedCount", reviewedCount);
        result.put("recordIds", recordIds);
        result.put("remark", reviewRemark);
        return result;
    }

    private Map<String, Object> reviewRecord(Long recordId, String targetStatus, Map<String, Object> payload, String operator)
    {
        OsgClassRecord record = requirePendingRecord(recordId);
        record.setStatus(targetStatus);
        record.setReviewRemark(firstText(payload == null ? null : payload.get("remark")));
        record.setReviewedAt(new Timestamp(System.currentTimeMillis()));
        record.setUpdateBy(defaultText(operator, "system"));

        if (classRecordMapper.updateClassRecordReview(record) <= 0)
        {
            throw new ServiceException("课时审核更新失败");
        }
        return toPayload(record, null);
    }

    private OsgClassRecord requirePendingRecord(Long recordId)
    {
        OsgClassRecord record = requireRecord(recordId);
        if (!Objects.equals(normalize(record.getStatus()), STATUS_PENDING))
        {
            throw new ServiceException("该课时记录已审核，不能重复操作");
        }
        return record;
    }

    private OsgClassRecord requireRecord(Long recordId)
    {
        if (recordId == null)
        {
            throw new ServiceException("recordId不能为空");
        }
        OsgClassRecord record = classRecordMapper.selectClassRecordByRecordId(recordId);
        if (record == null)
        {
            throw new ServiceException("课时记录不存在");
        }
        return record;
    }

    private List<OsgClassRecord> selectRows(String keyword, String courseType, String courseSource, String tab)
    {
        OsgClassRecord query = new OsgClassRecord();
        query.setKeyword(keyword);
        query.setCourseType(courseType);
        query.setCourseSource(courseSource);
        query.setTab(normalizeTab(tab));
        List<OsgClassRecord> rows = classRecordMapper.selectClassRecordList(query);
        return rows == null ? Collections.emptyList() : rows;
    }

    private void validateLeadMentorCreate(OsgClassRecord record)
    {
        if (record == null)
        {
            throw new ServiceException("课程记录不能为空");
        }
        if (record.getStudentId() == null)
        {
            throw new ServiceException("学员不能为空");
        }
        if (record.getClassDate() == null)
        {
            throw new ServiceException("上课日期不能为空");
        }
        if (record.getDurationHours() == null || record.getDurationHours() <= 0)
        {
            throw new ServiceException("学习时长不能为空");
        }
        if (record.getCourseType() == null || record.getCourseType().isBlank())
        {
            throw new ServiceException("课程类型不能为空");
        }
        if (record.getClassStatus() == null || record.getClassStatus().isBlank())
        {
            throw new ServiceException("课程内容不能为空");
        }
        if (record.getFeedbackContent() == null || record.getFeedbackContent().isBlank())
        {
            throw new ServiceException("课程反馈不能为空");
        }
    }

    private void normalizeCreateDefaults(OsgClassRecord record)
    {
        if (record.getStatus() == null || record.getStatus().isBlank())
        {
            record.setStatus(STATUS_PENDING);
        }
        if (record.getSubmittedAt() == null)
        {
            record.setSubmittedAt(new Timestamp(System.currentTimeMillis()));
        }
        if (record.getWeeklyHours() == null)
        {
            record.setWeeklyHours(0D);
        }
        if (record.getUpdateBy() == null || record.getUpdateBy().isBlank())
        {
            record.setUpdateBy(record.getCreateBy());
        }
    }

    private OsgStudent requireManagedStudent(Long studentId, Long leadMentorId)
    {
        OsgStudent student = studentMapper.selectStudentByStudentId(studentId);
        if (student == null)
        {
            throw new ServiceException("学员不存在");
        }
        if (leadMentorId == null || !Objects.equals(student.getLeadMentorId(), leadMentorId))
        {
            throw new ServiceException("无权为该学员上报课程记录");
        }
        return student;
    }

    private Map<String, Object> toLeadMentorCreatePayload(OsgClassRecord row)
    {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("recordId", row.getRecordId());
        payload.put("mentorId", row.getMentorId());
        payload.put("mentorName", row.getMentorName());
        payload.put("studentId", row.getStudentId());
        payload.put("studentName", row.getStudentName());
        payload.put("courseType", row.getCourseType());
        payload.put("courseSource", row.getCourseSource());
        payload.put("classStatus", row.getClassStatus());
        payload.put("classDate", row.getClassDate());
        payload.put("durationHours", row.getDurationHours());
        payload.put("weeklyHours", row.getWeeklyHours());
        payload.put("topics", row.getTopics());
        payload.put("comments", row.getComments());
        payload.put("feedbackContent", row.getFeedbackContent());
        payload.put("status", row.getStatus());
        payload.put("submittedAt", row.getSubmittedAt());
        return payload;
    }

    private Map<String, Object> toPayload(OsgClassRecord row, Integer fallbackPendingReviewCount)
    {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("recordId", row.getRecordId());
        payload.put("classId", row.getClassId());
        payload.put("mentorId", row.getMentorId());
        payload.put("mentorName", row.getMentorName());
        payload.put("studentId", row.getStudentId());
        payload.put("studentName", row.getStudentName());
        payload.put("courseType", row.getCourseType());
        payload.put("courseSource", row.getCourseSource());
        payload.put("classDate", row.getClassDate());
        payload.put("durationHours", row.getDurationHours());
        payload.put("weeklyHours", row.getWeeklyHours());
        payload.put("status", row.getStatus());
        payload.put("classStatus", row.getClassStatus());
        payload.put("rate", row.getRate());
        payload.put("topics", row.getTopics());
        payload.put("comments", row.getComments());
        payload.put("feedbackContent", row.getFeedbackContent());
        payload.put("reviewRemark", row.getReviewRemark());
        payload.put("reviewedAt", row.getReviewedAt());
        payload.put("submittedAt", row.getSubmittedAt());
        payload.put("pendingDays", resolvePendingDays(row));
        payload.put("overtimeFlag", isOvertime(row));
        payload.put("overdueFlag", isOverdue(row));
        payload.put("pendingReviewCount", fallbackPendingReviewCount != null ? fallbackPendingReviewCount : row.getPendingReviewCount());
        return payload;
    }

    private Map<String, Object> toClassRecordPayload(OsgClassRecord row, Map<Long, BigDecimal> hourlyRates)
    {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("recordId", row.getRecordId());
        payload.put("recordCode", row.getClassId());
        payload.put("studentId", row.getStudentId());
        payload.put("studentName", row.getStudentName());
        payload.put("mentorId", row.getMentorId());
        payload.put("mentorName", row.getMentorName());
        payload.put("coachingType", toCoachingTypeLabel(row.getCourseType()));
        payload.put("courseType", row.getCourseType());
        payload.put("courseContent", toCourseContentLabel(row.getClassStatus()));
        payload.put("reporterRole", toReporterRoleLabel(row.getCourseSource()));
        payload.put("classDate", row.getClassDate());
        payload.put("durationHours", row.getDurationHours());
        payload.put("courseFee", resolveCourseFee(row, hourlyRates).toPlainString());
        payload.put("studentRating", row.getRate());
        payload.put("status", normalizeReviewStatus(row.getStatus()));
        payload.put("reviewRemark", row.getReviewRemark());
        payload.put("submittedAt", row.getSubmittedAt());
        return payload;
    }

    private int countByStatus(List<OsgClassRecord> rows, String targetStatus)
    {
        return (int) rows.stream()
            .filter(item -> Objects.equals(normalizeReviewStatus(item.getStatus()), targetStatus))
            .count();
    }

    private Map<Long, BigDecimal> loadHourlyRates(List<OsgClassRecord> rows)
    {
        if (rows == null || rows.isEmpty())
        {
            return Collections.emptyMap();
        }

        List<Long> mentorIds = rows.stream()
            .map(OsgClassRecord::getMentorId)
            .filter(Objects::nonNull)
            .distinct()
            .toList();
        if (mentorIds.isEmpty())
        {
            return Collections.emptyMap();
        }

        List<OsgStaff> staffRows = staffMapper.selectStaffByStaffIds(mentorIds);
        if (staffRows == null || staffRows.isEmpty())
        {
            return Collections.emptyMap();
        }

        Map<Long, BigDecimal> hourlyRates = new HashMap<>();
        for (OsgStaff staff : staffRows)
        {
            if (staff.getStaffId() != null && staff.getHourlyRate() != null)
            {
                hourlyRates.put(staff.getStaffId(), staff.getHourlyRate());
            }
        }
        return hourlyRates;
    }

    private BigDecimal resolveCourseFee(OsgClassRecord row, Map<Long, BigDecimal> hourlyRates)
    {
        BigDecimal hourlyRate = row.getMentorId() == null
            ? BigDecimal.ZERO
            : hourlyRates.getOrDefault(row.getMentorId(), BigDecimal.ZERO);
        BigDecimal duration = row.getDurationHours() == null
            ? BigDecimal.ZERO
            : BigDecimal.valueOf(row.getDurationHours());
        return hourlyRate.multiply(duration).setScale(1, RoundingMode.HALF_UP);
    }

    private String toCoachingTypeLabel(String courseType)
    {
        if ("mock_practice".equalsIgnoreCase(defaultText(courseType, "")))
        {
            return "模拟应聘";
        }
        return "岗位辅导";
    }

    private String toCourseContentLabel(String classStatus)
    {
        if (classStatus == null || classStatus.isBlank())
        {
            return "其他";
        }
        return switch (classStatus.trim().toLowerCase()) {
            case "resume_revision" -> "新简历";
            case "resume_update" -> "简历更新";
            case "case_prep" -> "Case准备";
            case "mock_interview" -> "模拟面试";
            case "networking_midterm" -> "人际关系期中考试";
            case "mock_midterm" -> "模拟期中考试";
            case "behavioral" -> "Behavioral";
            default -> classStatus;
        };
    }

    private String toReporterRoleLabel(String courseSource)
    {
        if (courseSource == null || courseSource.isBlank())
        {
            return "导师";
        }
        return switch (courseSource.trim().toLowerCase()) {
            case "assistant" -> "助教";
            case "clerk" -> "班主任";
            default -> "导师";
        };
    }

    private String normalizeTab(String tab)
    {
        if (tab == null || tab.isBlank())
        {
            return "all";
        }
        return tab.trim().toLowerCase();
    }

    private String normalize(String text)
    {
        return text == null ? null : text.trim().toLowerCase();
    }

    private String normalizeReviewStatus(String text)
    {
        String normalized = normalize(text);
        if (normalized == null || normalized.isBlank())
        {
            return STATUS_PENDING;
        }
        if (normalized.contains("rejected") || normalized.contains("驳回"))
        {
            return STATUS_REJECTED;
        }
        if (normalized.contains("approved")
            || normalized.contains("completed")
            || normalized.contains("done")
            || normalized.contains("finish")
            || normalized.contains("通过")
            || normalized.contains("完成"))
        {
            return STATUS_APPROVED;
        }
        return STATUS_PENDING;
    }

    private String defaultText(String text, String fallback)
    {
        return text == null ? fallback : text;
    }

    private boolean isOvertime(OsgClassRecord row)
    {
        if ("1".equals(row.getOvertimeFlag()))
        {
            return true;
        }
        return row.getWeeklyHours() != null && row.getWeeklyHours() > 6;
    }

    private boolean isOverdue(OsgClassRecord row)
    {
        if ("1".equals(row.getOverdueFlag()))
        {
            return true;
        }
        Integer pendingDays = resolvePendingDays(row);
        return pendingDays != null && pendingDays > 30;
    }

    private Integer resolvePendingDays(OsgClassRecord row)
    {
        if (row.getPendingDays() != null)
        {
            return row.getPendingDays();
        }
        if (row.getSubmittedAt() == null)
        {
            return 0;
        }
        long diff = System.currentTimeMillis() - row.getSubmittedAt().getTime();
        return (int) Math.max(diff / (24L * 60 * 60 * 1000), 0);
    }

    private List<Long> toLongList(Object value)
    {
        if (!(value instanceof List<?> list))
        {
            return Collections.emptyList();
        }
        List<Long> result = new ArrayList<>(list.size());
        for (Object item : list)
        {
            result.add(toLong(item));
        }
        return result;
    }

    private Long toLong(Object value)
    {
        if (value instanceof Number number)
        {
            return number.longValue();
        }
        if (value == null)
        {
            throw new ServiceException("ID格式不正确");
        }
        try
        {
            return Long.valueOf(String.valueOf(value));
        }
        catch (NumberFormatException ex)
        {
            throw new ServiceException("ID格式不正确");
        }
    }

    private String firstText(Object value)
    {
        if (value == null)
        {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
    }

}
