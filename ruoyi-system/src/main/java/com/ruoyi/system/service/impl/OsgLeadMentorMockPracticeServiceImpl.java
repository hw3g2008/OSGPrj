package com.ruoyi.system.service.impl;

import java.sql.Timestamp;
import java.text.DecimalFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgMockPractice;
import com.ruoyi.system.domain.OsgStaff;
import com.ruoyi.system.domain.OsgStaffSchedule;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.OsgMockPracticeMapper;
import com.ruoyi.system.mapper.OsgStaffMapper;
import com.ruoyi.system.mapper.OsgStaffScheduleMapper;
import com.ruoyi.system.mapper.OsgStudentMapper;
import com.ruoyi.system.service.IOsgLeadMentorMockPracticeService;

@Service
public class OsgLeadMentorMockPracticeServiceImpl implements IOsgLeadMentorMockPracticeService
{
    private static final String SCOPE_PENDING = "pending";
    private static final String SCOPE_COACHING = "coaching";
    private static final String SCOPE_MANAGED = "managed";
    private static final String STATUS_PENDING = "pending";
    private static final String STATUS_CONFIRMED = "confirmed";
    private static final String STAFF_TYPE_MENTOR = "mentor";
    private static final Set<String> SUPPORTED_SCOPES = Set.of(SCOPE_PENDING, SCOPE_COACHING, SCOPE_MANAGED);
    private static final List<String> SLOT_ORDER = List.of("AM", "MIDDAY", "PM", "EVENING");
    private static final DecimalFormat HOURS_FORMAT = new DecimalFormat("0.#");

    @Autowired
    private OsgMockPracticeMapper mockPracticeMapper;

    @Autowired
    private OsgStudentMapper studentMapper;

    @Autowired
    private OsgStaffMapper staffMapper;

    @Autowired
    private OsgStaffScheduleMapper staffScheduleMapper;

    @Autowired
    private OsgIdentityResolver identityResolver;

    @Override
    public Map<String, Object> selectScopedStats(String keyword, String practiceType, String status, Long currentUserId)
    {
        List<OsgMockPractice> rows = selectAccessiblePractices(keyword, practiceType, status, currentUserId);
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("pendingCount", countByStatus(rows, STATUS_PENDING));
        stats.put("scheduledCount", countByStatus(rows, "scheduled"));
        stats.put("completedCount", countByStatus(rows, "completed"));
        stats.put("cancelledCount", countByStatus(rows, "cancelled"));
        stats.put("confirmedCount", countByStatus(rows, STATUS_CONFIRMED));
        stats.put("totalCount", rows.size());
        return stats;
    }

    @Override
    public List<Map<String, Object>> selectPracticeList(String scope, String keyword, String practiceType, String status, Long currentUserId)
    {
        String resolvedScope = normalizeScope(scope);
        return selectScopedRows(resolvedScope, keyword, practiceType, status, currentUserId).stream()
            .map(this::toPayload)
            .toList();
    }

    @Override
    public Map<String, Object> selectPracticeDetail(Long practiceId, Long currentUserId)
    {
        OsgMockPractice practice = requireAccessiblePractice(practiceId, currentUserId);
        Map<String, Object> payload = new LinkedHashMap<>(toPayload(practice));
        payload.put("mentorOptions", selectMentorOptions(practice));
        payload.put("allowedScopes", resolveAccessibleScopes(practice, currentUserId));
        payload.put("canAssign", canManage(practice, currentUserId) && isPending(practice));
        payload.put("canAcknowledge", hasMentorRelation(practice, currentUserId) && isScheduled(practice));
        return payload;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> assignPractice(Long practiceId, Map<String, Object> payload, Long currentUserId, String operator)
    {
        OsgMockPractice practice = requireManagedPractice(practiceId, currentUserId);
        if (!isPending(practice))
        {
            throw new ServiceException("该模拟应聘申请已安排，不能重复分配");
        }

        List<Long> mentorIds = toLongList(payload == null ? null : payload.get("mentorIds"));
        if (mentorIds.isEmpty())
        {
            throw new ServiceException("请至少选择1位导师");
        }

        Date scheduledAt = toDate(payload == null ? null : payload.get("scheduledAt"));
        if (scheduledAt == null)
        {
            throw new ServiceException("预约时间不能为空");
        }

        List<OsgStaff> mentors = resolveMentors(mentorIds);
        List<Long> mentorUserIds = mentorIds.stream()
            .map(identityResolver::resolveUserIdByStaffId)
            .toList();
        practice.setStatus("scheduled");
        practice.setMentorIds(mentorUserIds.stream().map(String::valueOf).collect(Collectors.joining(",")));
        practice.setMentorNames(mentors.stream().map(OsgStaff::getStaffName).collect(Collectors.joining(", ")));
        practice.setMentorBackgrounds(mentors.stream().map(this::mentorBackground).collect(Collectors.joining(" / ")));
        practice.setScheduledAt(scheduledAt);
        practice.setRemark(firstText(payload == null ? null : payload.get("note"), payload == null ? null : payload.get("remark")));
        practice.setUpdateBy(defaultText(operator, "system"));

        if (mockPracticeMapper.updateMockPracticeAssignment(practice) <= 0)
        {
            throw new ServiceException("模拟应聘分配失败");
        }

        return toPayload(requireAccessiblePractice(practiceId, currentUserId));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> acknowledgeAssignment(Long practiceId, Long currentUserId, String operator)
    {
        OsgMockPractice practice = requireCoachingPractice(practiceId, currentUserId);
        if (!isScheduled(practice))
        {
            throw new ServiceException("该模拟应聘申请当前无需确认");
        }

        OsgMockPractice patch = new OsgMockPractice();
        patch.setPracticeId(practiceId);
        patch.setStatus(STATUS_CONFIRMED);
        patch.setUpdateBy(defaultText(operator, "system"));
        patch.setRemark("lead-mentor ack assignment");
        if (mockPracticeMapper.updateMentorMockPracticeStatus(patch) <= 0)
        {
            throw new ServiceException("模拟应聘确认失败");
        }

        return toPayload(requireAccessiblePractice(practiceId, currentUserId));
    }

    private List<OsgMockPractice> selectScopedRows(String scope, String keyword, String practiceType, String status, Long currentUserId)
    {
        List<OsgMockPractice> accessibleRows = selectAccessiblePractices(keyword, practiceType, status, currentUserId);
        if (accessibleRows.isEmpty())
        {
            return List.of();
        }

        Map<Long, OsgStudent> studentMap = loadStudentMap(accessibleRows);
        return accessibleRows.stream()
            .filter(row -> matchesScope(row, scope, currentUserId, studentMap))
            .sorted(Comparator.comparing(OsgMockPractice::getSubmittedAt, Comparator.nullsLast(Date::compareTo)).reversed())
            .toList();
    }

    private List<OsgMockPractice> selectAccessiblePractices(String keyword, String practiceType, String status, Long currentUserId)
    {
        List<OsgMockPractice> rows = selectBaseRows(keyword, practiceType, status);
        if (rows.isEmpty() || currentUserId == null)
        {
            return List.of();
        }

        Map<Long, OsgStudent> studentMap = loadStudentMap(rows);
        Map<Long, OsgMockPractice> accessible = new LinkedHashMap<>();
        for (OsgMockPractice row : rows)
        {
            if (canManage(row, currentUserId, studentMap) || hasMentorRelation(row, currentUserId))
            {
                accessible.put(row.getPracticeId(), row);
            }
        }
        return accessible.values().stream()
            .sorted(Comparator.comparing(OsgMockPractice::getSubmittedAt, Comparator.nullsLast(Date::compareTo)).reversed())
            .toList();
    }

    private List<OsgMockPractice> selectBaseRows(String keyword, String practiceType, String status)
    {
        OsgMockPractice query = new OsgMockPractice();
        query.setKeyword(trimToNull(keyword));
        query.setPracticeType(trimToNull(practiceType));
        query.setStatus(trimToNull(status));
        List<OsgMockPractice> rows = mockPracticeMapper.selectMockPracticeList(query);
        if (rows == null || rows.isEmpty())
        {
            return List.of();
        }
        return rows.stream()
            .filter(this::isActiveRecord)
            .toList();
    }

    private OsgMockPractice requireAccessiblePractice(Long practiceId, Long currentUserId)
    {
        OsgMockPractice practice = requireExistingPractice(practiceId);
        if (!canManage(practice, currentUserId) && !hasMentorRelation(practice, currentUserId))
        {
            throw new ServiceException("无权访问该模拟应聘申请");
        }
        return practice;
    }

    private OsgMockPractice requireManagedPractice(Long practiceId, Long currentUserId)
    {
        OsgMockPractice practice = requireExistingPractice(practiceId);
        if (!canManage(practice, currentUserId))
        {
            throw new ServiceException("无权操作该模拟应聘申请");
        }
        return practice;
    }

    private OsgMockPractice requireCoachingPractice(Long practiceId, Long currentUserId)
    {
        OsgMockPractice practice = requireExistingPractice(practiceId);
        if (!hasMentorRelation(practice, currentUserId))
        {
            throw new ServiceException("无权确认该模拟应聘申请");
        }
        return practice;
    }

    private OsgMockPractice requireExistingPractice(Long practiceId)
    {
        OsgMockPractice practice = mockPracticeMapper.selectMockPracticeByPracticeId(practiceId);
        if (!isActiveRecord(practice))
        {
            throw new ServiceException("模拟应聘申请不存在");
        }
        return practice;
    }

    private Map<Long, OsgStudent> loadStudentMap(List<OsgMockPractice> rows)
    {
        if (rows == null || rows.isEmpty())
        {
            return Collections.emptyMap();
        }

        List<Long> studentIds = rows.stream()
            .map(OsgMockPractice::getStudentId)
            .filter(Objects::nonNull)
            .distinct()
            .toList();
        if (studentIds.isEmpty())
        {
            return Collections.emptyMap();
        }

        Map<Long, OsgStudent> result = new LinkedHashMap<>();
        for (OsgStudent student : studentMapper.selectStudentByStudentIds(studentIds))
        {
            if (student == null || student.getStudentId() == null)
            {
                continue;
            }
            result.put(student.getStudentId(), student);
        }
        return result;
    }

    private boolean matchesScope(OsgMockPractice row, String scope, Long currentUserId)
    {
        if (SCOPE_PENDING.equals(scope))
        {
            return canManage(row, currentUserId) && isPending(row);
        }
        if (SCOPE_MANAGED.equals(scope))
        {
            return canManage(row, currentUserId);
        }
        return hasMentorRelation(row, currentUserId);
    }

    private boolean matchesScope(OsgMockPractice row, String scope, Long currentUserId, Map<Long, OsgStudent> studentMap)
    {
        if (SCOPE_PENDING.equals(scope))
        {
            return canManage(row, currentUserId, studentMap) && isPending(row);
        }
        if (SCOPE_MANAGED.equals(scope))
        {
            return canManage(row, currentUserId, studentMap);
        }
        return hasMentorRelation(row, currentUserId);
    }

    private boolean canManage(OsgMockPractice practice, Long currentUserId)
    {
        if (practice == null || currentUserId == null)
        {
            return false;
        }
        OsgStudent student = studentMapper.selectStudentByStudentId(practice.getStudentId());
        return student != null && currentUserId.equals(student.getLeadMentorId());
    }

    private boolean canManage(OsgMockPractice practice, Long currentUserId, Map<Long, OsgStudent> studentMap)
    {
        if (practice == null || currentUserId == null)
        {
            return false;
        }
        OsgStudent student = studentMap.get(practice.getStudentId());
        return student != null && currentUserId.equals(student.getLeadMentorId());
    }

    private boolean hasMentorRelation(OsgMockPractice practice, Long currentUserId)
    {
        if (practice == null || currentUserId == null)
        {
            return false;
        }
        String mentorIds = practice.getMentorIds();
        if (mentorIds == null || mentorIds.isBlank())
        {
            return false;
        }
        String token = String.valueOf(currentUserId);
        return Arrays.stream(mentorIds.split(","))
            .map(String::trim)
            .anyMatch(token::equals);
    }

    private boolean isActiveRecord(OsgMockPractice practice)
    {
        return practice != null && !Objects.equals(trimToNull(practice.getDelFlag()), "1");
    }

    private boolean isPending(OsgMockPractice practice)
    {
        return Objects.equals(normalize(practice == null ? null : practice.getStatus()), STATUS_PENDING);
    }

    private boolean isScheduled(OsgMockPractice practice)
    {
        return Objects.equals(normalize(practice == null ? null : practice.getStatus()), "scheduled");
    }

    private int countByStatus(List<OsgMockPractice> rows, String status)
    {
        return (int) rows.stream()
            .filter(row -> Objects.equals(normalize(row.getStatus()), normalize(status)))
            .count();
    }

    private Map<String, Object> toPayload(OsgMockPractice practice)
    {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("practiceId", practice.getPracticeId());
        payload.put("studentId", practice.getStudentId());
        payload.put("studentName", defaultText(practice.getStudentName(), "-"));
        payload.put("practiceType", defaultText(practice.getPracticeType(), "-"));
        payload.put("requestContent", defaultText(practice.getRequestContent()));
        payload.put("requestedMentorCount", defaultNumber(practice.getRequestedMentorCount()));
        payload.put("preferredMentorNames", defaultText(practice.getPreferredMentorNames()));
        payload.put("status", defaultText(practice.getStatus(), STATUS_PENDING));
        payload.put("statusLabel", statusLabel(practice.getStatus()));
        payload.put("mentorIds", splitCsv(practice.getMentorIds()));
        payload.put("mentorNames", defaultText(practice.getMentorNames()));
        payload.put("mentorBackgrounds", defaultText(practice.getMentorBackgrounds()));
        payload.put("scheduledAt", practice.getScheduledAt());
        payload.put("completedHours", defaultNumber(practice.getCompletedHours()));
        payload.put("completedHoursLabel", hoursLabel(practice.getCompletedHours()));
        payload.put("feedbackRating", defaultNumber(practice.getFeedbackRating()));
        payload.put("feedbackSummary", defaultText(practice.getFeedbackSummary()));
        payload.put("submittedAt", practice.getSubmittedAt());
        payload.put("note", defaultText(practice.getRemark()));
        payload.put("isNewAssignment", isScheduled(practice));
        return payload;
    }

    private List<Map<String, Object>> selectMentorOptions(OsgMockPractice practice)
    {
        OsgStaff query = new OsgStaff();
        query.setStaffType(STAFF_TYPE_MENTOR);
        List<OsgStaff> mentors = staffMapper.selectStaffList(query);
        if (mentors == null || mentors.isEmpty())
        {
            return List.of();
        }

        Set<Long> selectedMentorIds = new LinkedHashSet<>(splitCsv(practice.getMentorIds()));
        Map<Long, List<OsgStaffSchedule>> scheduleMap = loadAvailableSchedulesByMentorId();
        return mentors.stream()
            .filter(this::isActiveMentor)
            .sorted(Comparator.comparing(OsgStaff::getStaffId))
            .map(mentor -> toMentorOption(mentor, selectedMentorIds, scheduleMap))
            .toList();
    }

    private boolean isActiveMentor(OsgStaff staff)
    {
        return staff != null
            && Objects.equals(normalize(staff.getStaffType()), STAFF_TYPE_MENTOR)
            && !"frozen".equals(normalize(staff.getAccountStatus()))
            && !"inactive".equals(normalize(staff.getAccountStatus()));
    }

    private Map<Long, List<OsgStaffSchedule>> loadAvailableSchedulesByMentorId()
    {
        List<OsgStaffSchedule> schedules = staffScheduleMapper.selectStaffScheduleList(null, null);
        if (schedules == null || schedules.isEmpty())
        {
            return Collections.emptyMap();
        }

        return schedules.stream()
            .filter(item -> item != null && item.getStaffId() != null && defaultNumber(item.getIsAvailable()) > 0)
            .sorted(Comparator.comparing(OsgStaffSchedule::getStaffId)
                .thenComparing(OsgStaffSchedule::getWeekday, Comparator.nullsLast(Integer::compareTo))
                .thenComparing(item -> slotSortValue(item.getTimeSlot())))
            .collect(Collectors.groupingBy(OsgStaffSchedule::getStaffId, LinkedHashMap::new, Collectors.toList()));
    }

    private Map<String, Object> toMentorOption(OsgStaff mentor, Set<Long> selectedMentorIds,
        Map<Long, List<OsgStaffSchedule>> scheduleMap)
    {
        List<OsgStaffSchedule> availableSchedules = scheduleMap.getOrDefault(mentor.getStaffId(), List.of());

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("mentorId", mentor.getStaffId());
        payload.put("mentorName", mentor.getStaffName());
        payload.put("mentorBackground", mentorBackground(mentor));
        payload.put("hourlyRate", mentor.getHourlyRate());
        payload.put("selected", selectedMentorIds.contains(mentor.getStaffId()));
        payload.put("availabilityLabel", availableSchedules.isEmpty() ? "暂无排班" : availableSchedules.stream()
            .map(this::formatScheduleLabel)
            .collect(Collectors.joining(", ")));
        payload.put("availableSlotCount", availableSchedules.size());
        return payload;
    }

    private List<OsgStaff> resolveMentors(List<Long> mentorIds)
    {
        List<OsgStaff> result = new ArrayList<>(mentorIds.size());
        for (Long mentorId : mentorIds)
        {
            OsgStaff mentor = staffMapper.selectStaffByStaffId(mentorId);
            if (!isActiveMentor(mentor))
            {
                throw new ServiceException("导师不存在或不可用");
            }
            result.add(mentor);
        }
        return result;
    }

    private List<String> resolveAccessibleScopes(OsgMockPractice practice, Long currentUserId)
    {
        List<String> scopes = new ArrayList<>(2);
        if (canManage(practice, currentUserId))
        {
            scopes.add(SCOPE_MANAGED);
            if (isPending(practice))
            {
                scopes.add(SCOPE_PENDING);
            }
        }
        if (hasMentorRelation(practice, currentUserId))
        {
            scopes.add(SCOPE_COACHING);
        }
        return scopes;
    }

    private String mentorBackground(OsgStaff mentor)
    {
        return defaultText(mentor.getRemark(), joinNonBlank(" · ", mentor.getMajorDirection(), mentor.getCity()));
    }

    private String formatScheduleLabel(OsgStaffSchedule schedule)
    {
        return weekdayLabel(schedule.getWeekday()) + " " + defaultText(schedule.getTimeSlot(), "ALL");
    }

    private int slotSortValue(String timeSlot)
    {
        int index = SLOT_ORDER.indexOf(defaultText(timeSlot, "ALL").toUpperCase(Locale.ROOT));
        return index >= 0 ? index : SLOT_ORDER.size();
    }

    private String weekdayLabel(Integer weekday)
    {
        return switch (weekday == null ? 0 : weekday)
        {
            case 1 -> "周一";
            case 2 -> "周二";
            case 3 -> "周三";
            case 4 -> "周四";
            case 5 -> "周五";
            case 6 -> "周六";
            case 7 -> "周日";
            default -> "未知";
        };
    }

    private String statusLabel(String status)
    {
        return switch (normalize(status))
        {
            case STATUS_PENDING -> "待分配";
            case "scheduled" -> "新分配";
            case STATUS_CONFIRMED -> "已确认";
            case "completed" -> "已完成";
            case "cancelled" -> "已取消";
            default -> defaultText(status, "-");
        };
    }

    private String hoursLabel(Integer completedHours)
    {
        int hours = defaultNumber(completedHours);
        if (hours <= 0)
        {
            return "0h";
        }
        return HOURS_FORMAT.format(hours) + "h";
    }

    private String normalizeScope(String scope)
    {
        String resolved = trimToNull(scope);
        if (resolved == null)
        {
            return SCOPE_COACHING;
        }
        if (!SUPPORTED_SCOPES.contains(resolved))
        {
            throw new ServiceException("scope参数不合法");
        }
        return resolved;
    }

    private List<Long> splitCsv(String value)
    {
        String normalized = trimToNull(value);
        if (normalized == null)
        {
            return List.of();
        }
        return Arrays.stream(normalized.split(","))
            .map(String::trim)
            .filter(item -> !item.isEmpty())
            .map(this::toLong)
            .filter(Objects::nonNull)
            .toList();
    }

    private List<Long> toLongList(Object value)
    {
        if (!(value instanceof List<?> rawList))
        {
            return List.of();
        }
        return rawList.stream()
            .map(this::toLong)
            .filter(Objects::nonNull)
            .toList();
    }

    private Long toLong(Object value)
    {
        if (value instanceof Number number)
        {
            return number.longValue();
        }
        String text = firstText(value);
        if (text == null)
        {
            return null;
        }
        try
        {
            return Long.valueOf(text);
        }
        catch (NumberFormatException ex)
        {
            throw new ServiceException("ID格式不正确");
        }
    }

    private Date toDate(Object value)
    {
        if (value instanceof Date date)
        {
            return date;
        }
        String text = firstText(value);
        if (text == null)
        {
            return null;
        }
        String normalized = text.replace("T", " ");
        if (normalized.length() == 16)
        {
            normalized = normalized + ":00";
        }
        try
        {
            return Timestamp.valueOf(normalized);
        }
        catch (IllegalArgumentException ex)
        {
            throw new ServiceException("预约时间格式不正确");
        }
    }

    private String joinNonBlank(String separator, String... values)
    {
        return Arrays.stream(values)
            .map(this::trimToNull)
            .filter(Objects::nonNull)
            .collect(Collectors.joining(separator));
    }

    private String firstText(Object... values)
    {
        if (values == null)
        {
            return null;
        }
        for (Object value : values)
        {
            if (value == null)
            {
                continue;
            }
            String text = String.valueOf(value).trim();
            if (!text.isEmpty())
            {
                return text;
            }
        }
        return null;
    }

    private String defaultText(String value)
    {
        return defaultText(value, null);
    }

    private String defaultText(String value, String fallback)
    {
        return value == null || value.isBlank() ? fallback : value;
    }

    private int defaultNumber(Number value)
    {
        return value == null ? 0 : value.intValue();
    }

    private String normalize(String value)
    {
        return value == null ? null : value.trim().toLowerCase(Locale.ROOT);
    }

    private String trimToNull(String value)
    {
        if (value == null)
        {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
