package com.ruoyi.system.service.impl;

import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgCoaching;
import com.ruoyi.system.domain.OsgJobApplication;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.OsgCoachingMapper;
import com.ruoyi.system.mapper.OsgJobApplicationMapper;
import com.ruoyi.system.mapper.OsgStudentMapper;
import com.ruoyi.system.service.IOsgUserJobOverviewService;

@Service
public class OsgUserJobOverviewServiceImpl implements IOsgUserJobOverviewService
{
    private static final String SCOPE_PENDING = "pending";
    private static final String SCOPE_COACHING = "coaching";
    private static final String SCOPE_MANAGED = "managed";
    private static final Set<String> SUPPORTED_SCOPES = Set.of(SCOPE_PENDING, SCOPE_COACHING, SCOPE_MANAGED);
    private static final DateTimeFormatter MONTH_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM");

    @Autowired
    private OsgJobApplicationMapper jobApplicationMapper;

    @Autowired
    private OsgCoachingMapper coachingMapper;

    @Autowired
    private OsgIdentityResolver identityResolver;

    @Autowired
    private OsgStudentMapper studentMapper;

    // ===== Lead-Mentor 端 =====

    @Override
    public List<Map<String, Object>> listByLeadMentor(String scope, OsgJobApplication query, Long leadMentorId)
    {
        return selectOverviewListInternal(scope, query, leadMentorId);
    }

    private List<Map<String, Object>> selectOverviewListInternal(String scope, OsgJobApplication query, Long currentUserId)
    {
        String resolvedScope = normalizeScope(scope);
        List<OsgJobApplication> rows = selectScopedApplications(resolvedScope, query, currentUserId);
        rows = filterRowsByQuery(rows, normalizeQuery(query));
        Map<Long, OsgCoaching> coachingMap = selectCoachingMap();
        return rows.stream()
            .sorted(Comparator.comparing(OsgJobApplication::getSubmittedAt, Comparator.nullsLast(Date::compareTo)).reversed())
            .map(row -> toOverviewPayload(row, coachingMap.get(row.getApplicationId())))
            .toList();
    }

    @Override
    public Map<String, Object> detailForLeadMentor(Long applicationId, Long leadMentorId)
    {
        return detailForCoachingUser(applicationId, leadMentorId);
    }

    @Override
    public Map<String, Object> detailForMentor(Long applicationId, Long mentorId)
    {
        return detailForCoachingUser(applicationId, mentorId);
    }

    private Map<String, Object> detailForCoachingUser(Long applicationId, Long currentUserId)
    {
        OsgJobApplication application = requireAccessibleApplication(applicationId, currentUserId);
        return toOverviewPayload(application, coachingMapper.selectCoachingByApplicationId(applicationId));
    }

    @Override
    public Map<String, Object> assignMentors(Long applicationId, Map<String, Object> payload, Long currentUserId, String operator)
    {
        OsgJobApplication application = requireManagedApplication(applicationId, currentUserId);
        List<Long> mentorIds = toLongList(payload.get("mentorIds"));
        if (mentorIds.isEmpty())
        {
            throw new ServiceException("请至少选择1位导师");
        }
        List<Long> mentorUserIds = mentorIds.stream()
            .map(identityResolver::resolveUserIdByStaffId)
            .toList();

        List<String> mentorNames = toStringList(payload.get("mentorNames"));
        String mentorNamesText = mentorNames.isEmpty() ? null : String.join(", ", mentorNames);
        String assignNote = firstText(payload.get("assignNote"), payload.get("remark"));
        Date now = new Date();

        OsgCoaching coaching = coachingMapper.selectCoachingByApplicationId(applicationId);
        boolean isReassignment = (coaching != null);
        if (coaching == null)
        {
            coaching = new OsgCoaching();
            coaching.setApplicationId(applicationId);
            coaching.setStudentId(application.getStudentId());
            coaching.setCreateBy(operator);
        }

        coaching.setMentorIds(mentorUserIds.stream().map(String::valueOf).collect(Collectors.joining(",")));
        coaching.setMentorNames(mentorNamesText);
        coaching.setMentorName(mentorNames.isEmpty() ? null : mentorNames.get(0));
        // §F1：新分配后 status='assigned'，等辅导者 confirm 才转 'coaching'
        coaching.setStatus("assigned");
        coaching.setTotalHours(defaultNumber(coaching.getTotalHours()));
        coaching.setAssignNote(assignNote);
        coaching.setAssignedAt(now);
        coaching.setUpdateBy(operator);
        coaching.setRemark(assignNote);

        int coachingRows = coaching.getCoachingId() == null
            ? coachingMapper.insertCoaching(coaching)
            : coachingMapper.updateCoaching(coaching);
        if (coachingRows <= 0)
        {
            throw new ServiceException("导师分配保存失败");
        }

        // §F1 重新分配裁决：清空老辅导者的 confirm 记录，避免新辅导者看到“已确认”卡死
        if (isReassignment)
        {
            coachingMapper.resetConfirmationByApplicationId(applicationId, operator);
        }

        OsgJobApplication patch = new OsgJobApplication();
        patch.setApplicationId(applicationId);
        patch.setAssignStatus("assigned");
        // §F1：不再设 coachingStatus='辅导中'；重新分配场景重置为 'none'
        if (isReassignment)
        {
            patch.setCoachingStatus("none");
        }
        patch.setUpdateBy(operator);
        patch.setRemark(assignNote);
        if (jobApplicationMapper.updateJobApplicationAssignment(patch) <= 0)
        {
            throw new ServiceException("求职申请分配状态更新失败");
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("applicationId", applicationId);
        result.put("coachingStatus", isReassignment ? "none" : "assigned");
        result.put("mentorIds", mentorUserIds);
        result.put("mentorNames", mentorNamesText);
        result.put("assignNote", assignNote);
        result.put("assignedAt", now);
        return result;
    }

    @Override
    public Map<String, Object> acknowledgeStageUpdate(Long applicationId, Long currentUserId, String operator)
    {
        OsgJobApplication application = requireAccessibleApplication(applicationId, currentUserId);

        OsgJobApplication patch = new OsgJobApplication();
        patch.setApplicationId(applicationId);
        patch.setStageUpdated(Boolean.FALSE);
        patch.setUpdateBy(operator);
        patch.setRemark("lead-mentor ack stage update");
        if (jobApplicationMapper.updateJobApplicationStage(patch) <= 0)
        {
            throw new ServiceException("阶段确认保存失败");
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("applicationId", applicationId);
        result.put("currentStage", application.getCurrentStage());
        result.put("stageUpdated", Boolean.FALSE);
        result.put("interviewTime", application.getInterviewTime());
        return result;
    }

    // ===== Mentor 专用操作 =====

    @Override
    public Map<String, Object> confirmCoaching(Long applicationId, Long currentUserId, String operator)
    {
        OsgJobApplication application = jobApplicationMapper.selectJobApplicationByApplicationId(applicationId);
        if (application == null)
        {
            throw new ServiceException("求职申请不存在");
        }
        if (!resolveCoachingApplicationIds(currentUserId).contains(applicationId))
        {
            throw new ServiceException("无权确认该求职申请");
        }

        OsgCoaching coaching = coachingMapper.selectCoachingByApplicationId(applicationId);
        if (coaching == null)
        {
            throw new ServiceException("辅导记录不存在");
        }

        // §C.1 原子 SQL 防并发竞态 + 防重复 confirm（bug 1 修复）
        int affected = coachingMapper.confirmCoachingIfPending(applicationId, operator);
        if (affected == 0)
        {
            throw new ServiceException("该申请已被确认");
        }

        // §C.1 bug 2 修复：写 osg_job_application.coachingStatus='coaching'
        OsgJobApplication appPatch = new OsgJobApplication();
        appPatch.setApplicationId(applicationId);
        appPatch.setCoachingStatus("coaching");
        appPatch.setUpdateBy(operator);
        appPatch.setRemark("mentor confirmed coaching");
        jobApplicationMapper.updateJobApplicationAssignment(appPatch);

        Date confirmedAt = new Date();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("applicationId", applicationId);
        result.put("coachingStatus", "coaching");
        result.put("confirmedAt", confirmedAt);
        return result;
    }

    @Override
    public List<Map<String, Object>> calendarForLeadMentor(Long leadMentorId)
    {
        return calendarForCoachingUser(leadMentorId);
    }

    @Override
    public List<Map<String, Object>> calendarForMentor(Long mentorId)
    {
        return calendarForCoachingUser(mentorId);
    }

    private List<Map<String, Object>> calendarForCoachingUser(Long currentUserId)
    {
        if (currentUserId == null)
        {
            return List.of();
        }

        OsgJobApplication query = new OsgJobApplication();
        query.setLeadMentorId(currentUserId);
        List<OsgJobApplication> applications = jobApplicationMapper.selectJobApplicationList(query);
        if (applications == null || applications.isEmpty())
        {
            return List.of();
        }

        return applications.stream()
            .filter(app -> app.getInterviewTime() != null)
            .sorted(Comparator.comparing(OsgJobApplication::getInterviewTime, Comparator.nullsLast(Date::compareTo)))
            .map(this::toCalendarRow)
            .toList();
    }

    private Map<String, Object> toCalendarRow(OsgJobApplication app)
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", app.getApplicationId());
        row.put("studentName", app.getStudentName());
        row.put("company", app.getCompanyName());
        row.put("position", app.getPositionName());
        row.put("location", firstText(app.getCity(), app.getRegion()));
        row.put("interviewTime", app.getInterviewTime());
        row.put("interviewStage", app.getCurrentStage());
        row.put("coachingStatus", toLegacyCoachingStatus(app.getCoachingStatus()));
        row.put("result", toLegacyResult(app.getCurrentStage()));
        return row;
    }

    private String toLegacyCoachingStatus(String coachingStatus)
    {
        if (coachingStatus == null)
        {
            return "none";
        }
        String normalized = coachingStatus.trim().toLowerCase();
        if (normalized.isEmpty() || "new".equals(normalized) || "none".equals(normalized)
            || "待审批".equals(coachingStatus) || "pending".equals(normalized))
        {
            return "new";
        }
        if ("辅导中".equals(coachingStatus) || "coaching".equals(normalized))
        {
            return "coaching";
        }
        return "none";
    }

    private String toLegacyResult(String currentStage)
    {
        if (currentStage == null)
        {
            return null;
        }
        String normalized = currentStage.trim().toLowerCase();
        if ("offer".equals(normalized))
        {
            return "offer";
        }
        if ("rejected".equals(normalized) || "拒绝".equals(currentStage))
        {
            return "rejected";
        }
        if ("withdrawn".equals(normalized) || "withdraw".equals(normalized))
        {
            return "cancelled";
        }
        return null;
    }

    private List<OsgJobApplication> selectScopedApplications(String scope, OsgJobApplication rawQuery, Long currentUserId)
    {
        if (currentUserId == null)
        {
            return List.of();
        }

        OsgJobApplication normalizedQuery = normalizeQuery(rawQuery);
        if (SCOPE_PENDING.equals(scope) || SCOPE_MANAGED.equals(scope))
        {
            normalizedQuery.setLeadMentorId(currentUserId);
        }

        List<OsgJobApplication> rows = jobApplicationMapper.selectJobApplicationList(normalizedQuery);
        if (rows == null || rows.isEmpty())
        {
            return List.of();
        }

        if (SCOPE_PENDING.equals(scope))
        {
            return rows.stream()
                .filter(this::isPendingAssignment)
                .toList();
        }
        if (SCOPE_COACHING.equals(scope))
        {
            OsgJobApplication managedQuery = normalizeQuery(rawQuery);
            managedQuery.setLeadMentorId(currentUserId);
            List<OsgJobApplication> managedRows = jobApplicationMapper.selectJobApplicationList(managedQuery);
            List<OsgJobApplication> visibleRows = mergeApplications(rows, managedRows);
            Set<Long> coachingApplicationIds = resolveCoachingApplicationIds(currentUserId);
            visibleRows = mergeApplications(visibleRows,
                filterRowsByQuery(selectMissingApplications(coachingApplicationIds, visibleRows), normalizedQuery));
            Map<Long, OsgStudent> studentMap = loadStudentMap(visibleRows.stream()
                .map(OsgJobApplication::getStudentId)
                .filter(Objects::nonNull)
                .toList());
            return visibleRows.stream()
                .filter(row -> coachingApplicationIds.contains(row.getApplicationId())
                    || canManage(row, currentUserId)
                    || hasAssistantOwnership(row, currentUserId, studentMap))
                .toList();
        }
        return rows;
    }

    private List<OsgJobApplication> mergeApplications(List<OsgJobApplication> primaryRows, List<OsgJobApplication> fallbackRows)
    {
        if ((primaryRows == null || primaryRows.isEmpty()) && (fallbackRows == null || fallbackRows.isEmpty()))
        {
            return List.of();
        }

        Map<Long, OsgJobApplication> merged = new LinkedHashMap<>();
        mergeApplicationRows(merged, primaryRows);
        mergeApplicationRows(merged, fallbackRows);
        return new ArrayList<>(merged.values());
    }

    private void mergeApplicationRows(Map<Long, OsgJobApplication> merged, List<OsgJobApplication> rows)
    {
        if (rows == null || rows.isEmpty())
        {
            return;
        }
        rows.stream()
            .filter(row -> row != null && row.getApplicationId() != null)
            .forEach(row -> merged.putIfAbsent(row.getApplicationId(), row));
    }

    private OsgJobApplication requireAccessibleApplication(Long applicationId, Long currentUserId)
    {
        OsgJobApplication application = jobApplicationMapper.selectJobApplicationByApplicationId(applicationId);
        if (application == null)
        {
            throw new ServiceException("求职申请不存在");
        }
        if (!canManage(application, currentUserId)
            && !hasAssistantOwnership(application, currentUserId)
            && !resolveCoachingApplicationIds(currentUserId).contains(applicationId))
        {
            throw new ServiceException("无权访问该求职申请");
        }
        return application;
    }

    private OsgJobApplication requireManagedApplication(Long applicationId, Long currentUserId)
    {
        OsgJobApplication application = jobApplicationMapper.selectJobApplicationByApplicationId(applicationId);
        if (application == null)
        {
            throw new ServiceException("求职申请不存在");
        }
        if (!canManage(application, currentUserId))
        {
            throw new ServiceException("无权操作该求职申请");
        }
        return application;
    }

    private Map<Long, OsgCoaching> selectCoachingMap()
    {
        List<OsgCoaching> rows = coachingMapper.selectCoachingList(new OsgCoaching());
        if (rows == null || rows.isEmpty())
        {
            return Collections.emptyMap();
        }
        return rows.stream()
            .filter(row -> row.getApplicationId() != null)
            .collect(Collectors.toMap(OsgCoaching::getApplicationId, row -> row, (first, second) -> second, LinkedHashMap::new));
    }

    private Set<Long> resolveCoachingApplicationIds(Long currentUserId)
    {
        if (currentUserId == null)
        {
            return Set.of();
        }

        List<OsgCoaching> rows = coachingMapper.selectCoachingList(new OsgCoaching());
        if (rows == null || rows.isEmpty())
        {
            return Set.of();
        }

        return rows.stream()
            .filter(row -> row.getApplicationId() != null)
            .filter(row -> matchesMentorRelation(row, currentUserId))
            .map(OsgCoaching::getApplicationId)
            .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private List<OsgJobApplication> selectMissingApplications(Set<Long> applicationIds, List<OsgJobApplication> existingRows)
    {
        if (applicationIds == null || applicationIds.isEmpty())
        {
            return List.of();
        }

        Set<Long> existingIds = existingRows == null ? Set.of() : existingRows.stream()
            .map(OsgJobApplication::getApplicationId)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());
        List<Long> missingIds = applicationIds.stream()
            .filter(applicationId -> !existingIds.contains(applicationId))
            .toList();
        if (missingIds.isEmpty())
        {
            return List.of();
        }

        List<OsgJobApplication> rows = jobApplicationMapper.selectJobApplicationsByIds(missingIds);
        return rows == null ? List.of() : rows;
    }

    private List<OsgJobApplication> filterRowsByQuery(List<OsgJobApplication> rows, OsgJobApplication query)
    {
        if (rows == null || rows.isEmpty())
        {
            return List.of();
        }
        if (query == null)
        {
            return rows;
        }
        return rows.stream()
            .filter(row -> matchesQuery(row, query))
            .toList();
    }

    private boolean matchesQuery(OsgJobApplication row, OsgJobApplication query)
    {
        if (row == null)
        {
            return false;
        }
        if (query.getStudentName() != null && !containsText(row.getStudentName(), query.getStudentName()))
        {
            return false;
        }
        if (query.getCompanyName() != null && !Objects.equals(query.getCompanyName(), trimToNull(row.getCompanyName())))
        {
            return false;
        }
        if (query.getCurrentStage() != null && !Objects.equals(query.getCurrentStage(), trimToNull(row.getCurrentStage())))
        {
            return false;
        }
        if (query.getAssignStatus() != null && !Objects.equals(query.getAssignStatus(), trimToNull(row.getAssignStatus())))
        {
            return false;
        }
        if (!matchesMonth(row.getInterviewTime(), query.getMonth()))
        {
            return false;
        }
        if (!matchesStatus(row, query.getStatus()))
        {
            return false;
        }
        if (query.getKeyword() != null
            && !containsText(row.getStudentName(), query.getKeyword())
            && !containsText(row.getCompanyName(), query.getKeyword())
            && !containsText(row.getPositionName(), query.getKeyword()))
        {
            return false;
        }
        return true;
    }

    private boolean containsText(String source, String fragment)
    {
        return source != null && fragment != null && source.contains(fragment);
    }

    private Map<String, Object> toOverviewPayload(OsgJobApplication application, OsgCoaching coaching)
    {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("applicationId", application.getApplicationId());
        payload.put("studentId", application.getStudentId());
        payload.put("studentName", defaultText(application.getStudentName(), "-"));
        payload.put("companyName", defaultText(application.getCompanyName(), "-"));
        payload.put("positionName", defaultText(application.getPositionName(), "-"));
        payload.put("region", defaultText(application.getRegion()));
        payload.put("city", defaultText(application.getCity()));
        payload.put("currentStage", defaultText(application.getCurrentStage(), "-"));
        payload.put("interviewTime", application.getInterviewTime());
        payload.put("assignedStatus", defaultText(application.getAssignStatus()));
        payload.put("leadMentorName", defaultText(application.getLeadMentorName()));
        payload.put("stageUpdated", Boolean.TRUE.equals(application.getStageUpdated()));
        payload.put("requestedMentorCount", defaultNumber(application.getRequestedMentorCount()));
        payload.put("preferredMentorNames", defaultText(application.getPreferredMentorNames()));
        payload.put("submittedAt", application.getSubmittedAt());

        if (coaching != null)
        {
            // §B.1：默认值为英文 enum 'assigned'（不再使用中文“辅导中”）
            payload.put("coachingStatus", defaultText(coaching.getStatus(), "assigned"));
            payload.put("mentorName", defaultText(coaching.getMentorName(), coaching.getMentorNames()));
            payload.put("mentorNames", defaultText(coaching.getMentorNames(), coaching.getMentorName()));
            payload.put("mentorBackground", defaultText(coaching.getMentorBackground()));
            payload.put("hoursUsed", defaultNumber(coaching.getTotalHours()));
            payload.put("feedbackSummary", defaultText(coaching.getFeedbackSummary(), "-"));
        }
        else
        {
            String fallbackStatus = defaultNumber(application.getRequestedMentorCount()) > 0 ? "待审批" : "未申请";
            payload.put("coachingStatus", defaultText(application.getCoachingStatus(), fallbackStatus));
            payload.put("mentorName", null);
            payload.put("mentorNames", defaultText(application.getPreferredMentorNames()));
            payload.put("mentorBackground", null);
            payload.put("hoursUsed", 0);
            payload.put("feedbackSummary", "-");
        }
        return payload;
    }

    private OsgJobApplication normalizeQuery(OsgJobApplication query)
    {
        OsgJobApplication normalized = new OsgJobApplication();
        if (query == null)
        {
            return normalized;
        }
        normalized.setStudentName(trimToNull(query.getStudentName()));
        normalized.setCompanyName(trimToNull(query.getCompanyName()));
        normalized.setCurrentStage(trimToNull(query.getCurrentStage()));
        normalized.setKeyword(trimToNull(query.getKeyword()));
        normalized.setAssignStatus(trimToNull(query.getAssignStatus()));
        normalized.setMonth(normalizeMonth(trimToNull(query.getMonth())));
        normalized.setStatus(normalizeStatusFilter(firstText(query.getStatus(), query.getCoachingStatus())));
        return normalized;
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

    private boolean matchesMentorRelation(OsgCoaching coaching, Long currentUserId)
    {
        if (coaching == null || currentUserId == null)
        {
            return false;
        }
        if (currentUserId.equals(coaching.getMentorId()))
        {
            return true;
        }
        String mentorIds = coaching.getMentorIds();
        if (mentorIds == null || mentorIds.isBlank())
        {
            return false;
        }
        String token = String.valueOf(currentUserId);
        return Arrays.stream(mentorIds.split(","))
            .map(String::trim)
            .anyMatch(token::equals);
    }

    private boolean isPendingAssignment(OsgJobApplication row)
    {
        return row != null
            && !Objects.equals(trimToNull(row.getAssignStatus()), "assigned")
            && defaultNumber(row.getRequestedMentorCount()) > 0;
    }

    private boolean canManage(OsgJobApplication application, Long currentUserId)
    {
        return application != null && currentUserId != null && currentUserId.equals(application.getLeadMentorId());
    }

    private boolean hasAssistantOwnership(OsgJobApplication application, Long currentUserId)
    {
        if (application == null || application.getStudentId() == null)
        {
            return false;
        }
        OsgStudent student = studentMapper.selectStudentByStudentId(application.getStudentId());
        return student != null && Objects.equals(student.getAssistantId(), currentUserId);
    }

    private boolean hasAssistantOwnership(OsgJobApplication application, Long currentUserId, Map<Long, OsgStudent> studentMap)
    {
        if (application == null || application.getStudentId() == null)
        {
            return false;
        }
        OsgStudent student = studentMap.get(application.getStudentId());
        return student != null && Objects.equals(student.getAssistantId(), currentUserId);
    }

    private Map<Long, OsgStudent> loadStudentMap(List<Long> studentIds)
    {
        if (studentIds == null || studentIds.isEmpty())
        {
            return Map.of();
        }

        List<OsgStudent> students = studentMapper.selectStudentByStudentIds(studentIds.stream().distinct().toList());
        if (students == null || students.isEmpty())
        {
            return Map.of();
        }

        return students.stream()
            .filter(student -> student != null && student.getStudentId() != null)
            .collect(Collectors.toMap(OsgStudent::getStudentId, student -> student, (first, second) -> first, LinkedHashMap::new));
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

    private List<String> toStringList(Object value)
    {
        if (!(value instanceof List<?> rawList))
        {
            return List.of();
        }
        return rawList.stream()
            .map(item -> item == null ? null : item.toString().trim())
            .filter(item -> item != null && !item.isBlank())
            .toList();
    }

    private Long toLong(Object value)
    {
        if (value == null)
        {
            return null;
        }
        if (value instanceof Number number)
        {
            return number.longValue();
        }
        String text = value.toString().trim();
        if (text.isBlank())
        {
            return null;
        }
        try
        {
            return Long.valueOf(text);
        }
        catch (NumberFormatException ex)
        {
            return null;
        }
    }

    private String firstText(Object... candidates)
    {
        for (Object candidate : candidates)
        {
            String text = candidate == null ? null : candidate.toString().trim();
            if (text != null && !text.isBlank())
            {
                return text;
            }
        }
        return null;
    }

    private Integer defaultNumber(Integer value)
    {
        return value == null ? 0 : value;
    }

    private String trimToNull(String value)
    {
        if (value == null || value.isBlank())
        {
            return null;
        }
        return value.trim();
    }

    private boolean matchesMonth(Date interviewTime, String month)
    {
        String normalizedMonth = normalizeMonth(month);
        if (normalizedMonth == null)
        {
            return true;
        }
        if (interviewTime == null)
        {
            return false;
        }
        LocalDateTime dateTime = interviewTime.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime();
        return MONTH_FORMATTER.format(dateTime).equals(normalizedMonth);
    }

    private boolean matchesStatus(OsgJobApplication row, String status)
    {
        String normalizedStatus = normalizeStatusFilter(status);
        if (normalizedStatus == null)
        {
            return true;
        }
        String rowStatus = resolveStatusForQuery(row);
        return normalizedStatus.equals(rowStatus);
    }

    private String normalizeMonth(String month)
    {
        String value = trimToNull(month);
        if (value == null)
        {
            return null;
        }
        return value.length() >= 7 ? value.substring(0, 7) : value;
    }

    private String resolveStatusForQuery(OsgJobApplication row)
    {
        if (row == null)
        {
            return null;
        }
        String normalizedStatus = normalizeStatusFilter(firstText(row.getCoachingStatus(), row.getAssignStatus()));
        if (normalizedStatus != null)
        {
            return normalizedStatus;
        }
        if (defaultNumber(row.getRequestedMentorCount()) > 0)
        {
            return "new";
        }
        return null;
    }

    private String normalizeStatusFilter(String status)
    {
        String value = trimToNull(status);
        if (value == null)
        {
            return null;
        }
        String lower = value.toLowerCase(java.util.Locale.ROOT);
        if ("new".equals(lower) || "pending".equals(lower) || "待审批".equals(value) || "新申请".equals(value))
        {
            return "new";
        }
        if ("coaching".equals(lower) || "辅导中".equals(value))
        {
            return "coaching";
        }
        if ("completed".equals(lower) || "已完成".equals(value))
        {
            return "completed";
        }
        return value;
    }

    private String defaultText(String value)
    {
        return value == null ? "" : value;
    }

    private String defaultText(String value, String fallback)
    {
        if (value == null || value.isBlank())
        {
            return fallback;
        }
        return value;
    }

    // ===== Assistant 端（源自原 OsgAssistantJobOverviewServiceImpl）=====

    @Override
    public List<Map<String, Object>> listByAssistant(OsgJobApplication query, Long assistantId)
    {
        List<OsgStudent> students = studentMapper.selectStudentList(buildAssistantStudentQuery(assistantId));
        if (students.isEmpty())
        {
            return List.of();
        }

        List<Long> studentIds = students.stream()
            .map(OsgStudent::getStudentId)
            .toList();

        List<OsgJobApplication> applications = jobApplicationMapper.selectByStudentIds(studentIds);
        if (query != null)
        {
            applications = filterAssistantApplications(applications, query);
        }

        return applications.stream()
            .sorted(Comparator.comparing(OsgJobApplication::getSubmittedAt, Comparator.nullsLast(Date::compareTo)).reversed())
            .map(this::toAssistantOverviewRow)
            .toList();
    }

    @Override
    public Map<String, Object> detailForAssistant(Long applicationId, Long assistantId)
    {
        OsgJobApplication application = jobApplicationMapper.selectJobApplicationByApplicationId(applicationId);
        if (application == null)
        {
            return Map.of();
        }

        if (!isAssistantOfStudent(application.getStudentId(), assistantId))
        {
            return Map.of();
        }

        return toAssistantOverviewRow(application);
    }

    @Override
    public List<Map<String, Object>> calendarForAssistant(Long assistantId)
    {
        List<OsgStudent> students = studentMapper.selectStudentList(buildAssistantStudentQuery(assistantId));
        if (students.isEmpty())
        {
            return List.of();
        }

        List<Long> studentIds = students.stream()
            .map(OsgStudent::getStudentId)
            .toList();

        List<OsgJobApplication> applications = jobApplicationMapper.selectByStudentIds(studentIds);

        return applications.stream()
            .filter(app -> app.getInterviewTime() != null)
            .sorted(Comparator.comparing(OsgJobApplication::getInterviewTime, Comparator.nullsLast(Date::compareTo)))
            .map(this::toAssistantCalendarRow)
            .toList();
    }

    private OsgStudent buildAssistantStudentQuery(Long assistantId)
    {
        OsgStudent student = new OsgStudent();
        student.setAssistantId(assistantId);
        return student;
    }

    private boolean isAssistantOfStudent(Long studentId, Long assistantId)
    {
        if (studentId == null)
        {
            return false;
        }
        List<OsgStudent> students = studentMapper.selectStudentList(buildAssistantStudentQuery(assistantId));
        return students.stream().anyMatch(s -> studentId.equals(s.getStudentId()));
    }

    private List<OsgJobApplication> filterAssistantApplications(List<OsgJobApplication> applications, OsgJobApplication query)
    {
        return applications.stream().filter(app -> {
            if (query.getStudentName() != null && !query.getStudentName().isBlank())
            {
                String name = app.getStudentName();
                if (name == null || !name.toLowerCase().contains(query.getStudentName().toLowerCase()))
                {
                    return false;
                }
            }
            if (query.getCompanyName() != null && !query.getCompanyName().isBlank())
            {
                String company = app.getCompanyName();
                if (company == null || !company.toLowerCase().contains(query.getCompanyName().toLowerCase()))
                {
                    return false;
                }
            }
            if (query.getCurrentStage() != null && !query.getCurrentStage().isBlank())
            {
                String stage = app.getCurrentStage();
                if (stage == null || !stage.equalsIgnoreCase(query.getCurrentStage()))
                {
                    return false;
                }
            }
            return true;
        }).toList();
    }

    private Map<String, Object> toAssistantOverviewRow(OsgJobApplication app)
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", app.getApplicationId());
        row.put("studentId", app.getStudentId());
        row.put("studentName", app.getStudentName());
        row.put("company", app.getCompanyName());
        row.put("position", app.getPositionName());
        row.put("location", firstText(app.getCity(), app.getRegion()));
        row.put("interviewStage", app.getCurrentStage());
        row.put("interviewTime", app.getInterviewTime());
        row.put("coachingStatus", toAssistantLegacyCoachingStatus(app.getCoachingStatus()));
        row.put("result", toAssistantLegacyResult(app.getCurrentStage()));
        row.put("createTime", app.getSubmittedAt());
        return row;
    }

    private Map<String, Object> toAssistantCalendarRow(OsgJobApplication app)
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", app.getApplicationId());
        row.put("studentName", app.getStudentName());
        row.put("company", app.getCompanyName());
        row.put("position", app.getPositionName());
        row.put("location", firstText(app.getCity(), app.getRegion()));
        row.put("interviewTime", app.getInterviewTime());
        row.put("interviewStage", app.getCurrentStage());
        row.put("coachingStatus", toAssistantLegacyCoachingStatus(app.getCoachingStatus()));
        row.put("result", toAssistantLegacyResult(app.getCurrentStage()));
        return row;
    }

    private String toAssistantLegacyCoachingStatus(String coachingStatus)
    {
        if (coachingStatus == null)
        {
            return "none";
        }
        String normalized = coachingStatus.trim().toLowerCase();
        if (normalized.isEmpty() || "new".equals(normalized) || "none".equals(normalized) || "待审批".equals(coachingStatus) || "pending".equals(normalized))
        {
            return "new";
        }
        if ("辅导中".equals(coachingStatus) || "coaching".equals(normalized))
        {
            return "coaching";
        }
        return "none";
    }

    private String toAssistantLegacyResult(String currentStage)
    {
        if (currentStage == null)
        {
            return null;
        }
        String normalized = currentStage.trim().toLowerCase();
        if ("offer".equals(normalized))
        {
            return "offer";
        }
        if ("rejected".equals(normalized) || "拒绝".equals(currentStage))
        {
            return "rejected";
        }
        if ("withdrawn".equals(normalized) || "withdraw".equals(normalized))
        {
            return "cancelled";
        }
        return null;
    }

    private String firstText(String primary, String fallback)
    {
        if (primary != null && !primary.isBlank())
        {
            return primary;
        }
        return fallback != null ? fallback : "";
    }

    // ===== Mentor 端列表查询（委托 coaching scope）=====

    @Override
    public List<Map<String, Object>> listByMentor(OsgJobApplication query, Long mentorId)
    {
        return selectOverviewListInternal(SCOPE_COACHING, query, mentorId);
    }
}
