package com.ruoyi.system.service.impl;

import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgCoaching;
import com.ruoyi.system.domain.OsgJobApplication;
import com.ruoyi.system.mapper.OsgCoachingMapper;
import com.ruoyi.system.mapper.OsgJobApplicationMapper;
import com.ruoyi.system.service.IOsgLeadMentorJobOverviewService;

@Service
public class OsgLeadMentorJobOverviewServiceImpl implements IOsgLeadMentorJobOverviewService
{
    private static final String SCOPE_PENDING = "pending";
    private static final String SCOPE_COACHING = "coaching";
    private static final String SCOPE_MANAGED = "managed";
    private static final Set<String> SUPPORTED_SCOPES = Set.of(SCOPE_PENDING, SCOPE_COACHING, SCOPE_MANAGED);

    @Autowired
    private OsgJobApplicationMapper jobApplicationMapper;

    @Autowired
    private OsgCoachingMapper coachingMapper;

    @Override
    public List<Map<String, Object>> selectOverviewList(String scope, OsgJobApplication query, Long currentUserId)
    {
        String resolvedScope = normalizeScope(scope);
        List<OsgJobApplication> rows = selectScopedApplications(resolvedScope, query, currentUserId);
        Map<Long, OsgCoaching> coachingMap = selectCoachingMap();
        return rows.stream()
            .sorted(Comparator.comparing(OsgJobApplication::getSubmittedAt, Comparator.nullsLast(Date::compareTo)).reversed())
            .map(row -> toOverviewPayload(row, coachingMap.get(row.getApplicationId())))
            .toList();
    }

    @Override
    public Map<String, Object> selectOverviewDetail(Long applicationId, Long currentUserId)
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

        List<String> mentorNames = toStringList(payload.get("mentorNames"));
        String mentorNamesText = mentorNames.isEmpty() ? null : String.join(", ", mentorNames);
        String assignNote = firstText(payload.get("assignNote"), payload.get("remark"));
        Date now = new Date();

        OsgCoaching coaching = coachingMapper.selectCoachingByApplicationId(applicationId);
        if (coaching == null)
        {
            coaching = new OsgCoaching();
            coaching.setApplicationId(applicationId);
            coaching.setStudentId(application.getStudentId());
            coaching.setCreateBy(operator);
        }

        coaching.setMentorIds(mentorIds.stream().map(String::valueOf).collect(Collectors.joining(",")));
        coaching.setMentorNames(mentorNamesText);
        coaching.setMentorName(mentorNames.isEmpty() ? null : mentorNames.get(0));
        coaching.setStatus("辅导中");
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

        OsgJobApplication patch = new OsgJobApplication();
        patch.setApplicationId(applicationId);
        patch.setAssignStatus("assigned");
        patch.setCoachingStatus("辅导中");
        patch.setUpdateBy(operator);
        patch.setRemark(assignNote);
        if (jobApplicationMapper.updateJobApplicationAssignment(patch) <= 0)
        {
            throw new ServiceException("求职申请分配状态更新失败");
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("applicationId", applicationId);
        result.put("coachingStatus", "辅导中");
        result.put("mentorIds", mentorIds);
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
            Set<Long> coachingApplicationIds = resolveCoachingApplicationIds(currentUserId);
            return rows.stream()
                .filter(row -> coachingApplicationIds.contains(row.getApplicationId()))
                .toList();
        }
        return rows;
    }

    private OsgJobApplication requireAccessibleApplication(Long applicationId, Long currentUserId)
    {
        OsgJobApplication application = jobApplicationMapper.selectJobApplicationByApplicationId(applicationId);
        if (application == null)
        {
            throw new ServiceException("求职申请不存在");
        }
        if (!canManage(application, currentUserId) && !resolveCoachingApplicationIds(currentUserId).contains(applicationId))
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
            .collect(Collectors.toSet());
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
            payload.put("coachingStatus", defaultText(coaching.getStatus(), "辅导中"));
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
}
