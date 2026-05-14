package com.ruoyi.system.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;
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

import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgClassRecord;
import com.ruoyi.system.service.ISysDictDataService;
import com.ruoyi.system.domain.OsgCoaching;
import com.ruoyi.system.domain.OsgJobApplication;
import com.ruoyi.system.domain.OsgMockPractice;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.OsgClassRecordMapper;
import com.ruoyi.system.mapper.OsgCoachingMapper;
import com.ruoyi.system.mapper.OsgJobApplicationMapper;
import com.ruoyi.system.mapper.OsgMockPracticeMapper;
import com.ruoyi.system.mapper.OsgStudentMapper;
import com.ruoyi.system.mapper.SysUserMapper;
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

    @Autowired
    private OsgMockPracticeMapper mockPracticeMapper;

    @Autowired
    private OsgClassRecordMapper classRecordMapper;

    @Autowired
    private ISysDictDataService dictDataService;

    @Autowired
    private SysUserMapper sysUserMapper;

    // ===== Lead-Mentor 端 =====

    @Override
    public List<Map<String, Object>> listByLeadMentor(String scope, OsgJobApplication query, Long leadMentorId)
    {
        return selectOverviewListInternal(scope, query, leadMentorId);
    }

    private List<Map<String, Object>> selectOverviewListInternal(String scope, OsgJobApplication query, Long currentUserId)
    {
        if (currentUserId == null)
        {
            return List.of();
        }
        String resolvedScope = normalizeScope(scope);
        OsgJobApplication normalizedQuery = normalizeQuery(query);
        List<OsgJobApplication> applications = selectCandidateApplications(resolvedScope, query, currentUserId);
        Map<Long, OsgJobApplication> applicationMap = toApplicationMap(applications);
        List<OsgCoaching> coachings = selectAllCoachings();
        if (SCOPE_COACHING.equals(resolvedScope))
        {
            applications = mergeApplications(applications, selectMissingApplications(coachings.stream()
                .filter(row -> matchesMentorRelation(row, currentUserId))
                .map(OsgCoaching::getApplicationId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new)), applications));
            applicationMap = toApplicationMap(applications);
        }
        Map<Long, OsgStudent> studentMap = SCOPE_COACHING.equals(resolvedScope)
            ? loadStudentMap(applications.stream().map(OsgJobApplication::getStudentId).filter(Objects::nonNull).toList())
            : Map.of();

        Set<Long> applicationsWithCoachingRows = new LinkedHashSet<>();
        List<Map<String, Object>> payloads = new ArrayList<>();
        for (OsgCoaching coaching : coachings)
        {
            if (coaching == null || coaching.getApplicationId() == null)
            {
                continue;
            }
            OsgJobApplication application = applicationMap.get(coaching.getApplicationId());
            if (application == null || !matchesScope(resolvedScope, application, coaching, currentUserId)
                || !matchesOverviewQuery(application, coaching, normalizedQuery))
            {
                continue;
            }
            applicationsWithCoachingRows.add(application.getApplicationId());
            payloads.add(toOverviewPayload(application, coaching));
        }

        applications.stream()
            .filter(row -> row != null && !applicationsWithCoachingRows.contains(row.getApplicationId()))
            .filter(row -> matchesFallbackScope(resolvedScope, row, currentUserId, studentMap))
            .filter(row -> matchesOverviewQuery(row, null, normalizedQuery))
            .map(row -> toOverviewPayload(row, null))
            .forEach(payloads::add);

        payloads = payloads.stream()
            .sorted(this::compareOverviewPayload)
            .collect(Collectors.toList());
        Boolean lessonReportedFilter = normalizedQuery.getLessonReported();
        if (lessonReportedFilter != null)
        {
            payloads = payloads.stream()
                .filter(p -> {
                    Object lessonCount = p.get("lessonCount");
                    boolean reported = lessonCount instanceof Integer && (Integer) lessonCount > 0;
                    return reported == lessonReportedFilter;
                })
                .toList();
        }
        return payloads;
    }

    @Override
    public Map<String, Object> detailForLeadMentor(Long applicationId, Long leadMentorId)
    {
        Map<String, Object> payload = detailForCoachingUser(applicationId, leadMentorId);
        payload.put("classRecordsByMentor", buildClassRecordsByMentor(toLong(payload.get("coachingId"))));
        return payload;
    }

    @Override
    public Map<String, Object> detailForLeadMentorCoaching(Long coachingId, Long leadMentorId)
    {
        OsgCoaching coaching = requireAccessibleCoaching(coachingId, leadMentorId);
        OsgJobApplication application = requireAccessibleApplication(coaching.getApplicationId(), leadMentorId);
        Map<String, Object> payload = toOverviewPayload(application, coaching);
        payload.put("classRecordsByMentor", buildClassRecordsByMentor(coachingId));
        return payload;
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
        OsgCoaching coaching = coachingMapper.selectCoachingByApplicationId(applicationId);
        if (coaching == null)
        {
            coaching = new OsgCoaching();
            coaching.setApplicationId(applicationId);
            coaching.setStudentId(application.getStudentId());
            coaching.setCreateBy(operator);
        }
        return assignMentorsToCoaching(application, coaching, payload, operator);
    }

    @Override
    public Map<String, Object> assignMentorsByCoaching(Long coachingId, Map<String, Object> payload, Long currentUserId, String operator)
    {
        OsgCoaching coaching = coachingMapper.selectCoachingByCoachingId(coachingId);
        if (coaching == null)
        {
            throw new ServiceException("辅导申请不存在");
        }
        OsgJobApplication application = requireManagedApplication(coaching.getApplicationId(), currentUserId);
        return assignMentorsToCoaching(application, coaching, payload, operator);
    }

    private Map<String, Object> assignMentorsToCoaching(OsgJobApplication application, OsgCoaching coaching, Map<String, Object> payload, String operator)
    {
        List<Long> mentorIds = toLongList(payload.get("mentorIds"));
        if (mentorIds.isEmpty())
        {
            throw new ServiceException("请至少选择1位导师");
        }
        Integer requestedMentorCount = coaching.getRequestedMentorCount();
        if (requestedMentorCount != null && requestedMentorCount > 0 && mentorIds.size() != requestedMentorCount)
        {
            throw new ServiceException("导师数量必须等于申请导师数量");
        }
        List<Long> mentorUserIds = mentorIds.stream()
            .map(identityResolver::resolveUserIdByStaffId)
            .toList();

        List<String> mentorNames = toStringList(payload.get("mentorNames"));
        // 防御：前端只传 mentorIds 不传 mentorNames 时，按 userId 反查 sys_user.nick_name
        // 防止「我管理」列表出现 mentor 字段为 null 的展示态 bug
        if (mentorNames.isEmpty() && !mentorUserIds.isEmpty())
        {
            mentorNames = new java.util.ArrayList<>();
            for (Long userId : mentorUserIds)
            {
                SysUser user = userId == null ? null : sysUserMapper.selectUserById(userId);
                if (user != null)
                {
                    String name = user.getNickName();
                    if (name == null || name.isBlank())
                    {
                        name = user.getUserName();
                    }
                    if (name != null && !name.isBlank())
                    {
                        mentorNames.add(name);
                    }
                }
            }
        }
        String mentorNamesText = mentorNames.isEmpty() ? null : String.join(", ", mentorNames);
        String assignNote = firstText(payload.get("assignNote"), payload.get("remark"));
        Date now = new Date();

        boolean isReassignment = (coaching != null);

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

        if (isReassignment)
        {
            coachingMapper.resetConfirmationByCoachingId(coaching.getCoachingId(), operator);
        }

        OsgJobApplication patch = new OsgJobApplication();
        patch.setApplicationId(application.getApplicationId());
        patch.setAssignStatus("assigned");
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
        result.put("applicationId", application.getApplicationId());
        result.put("coachingId", coaching.getCoachingId());
        result.put("coachingStatus", "assigned");
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

    /**
     * §A.0.3 列出当前辅导者负责的活跃辅导对象（前端课程记录提交表单做下拉源）。
     */
    @Override
    public Map<String, Object> listMyTargets(Long currentUserId)
    {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("coachings", listMyCoachings(currentUserId));
        result.put("practices", listMyPractices(currentUserId));
        return result;
    }

    private List<Map<String, Object>> listMyCoachings(Long currentUserId)
    {
        if (currentUserId == null)
        {
            return List.of();
        }
        List<OsgCoaching> coachings = coachingMapper.selectCoachingList(new OsgCoaching());
        if (coachings == null || coachings.isEmpty())
        {
            return List.of();
        }
        List<OsgCoaching> filtered = coachings.stream()
            .filter(row -> row.getApplicationId() != null)
            .filter(row -> matchesMentorRelation(row, currentUserId))
            .filter(row -> {
                String status = row.getStatus();
                return "coaching".equals(status) || "assigned".equals(status);
            })
            .toList();
        if (filtered.isEmpty())
        {
            return List.of();
        }
        // 批量查 application 拿 studentName/companyName/positionName
        List<Long> applicationIds = filtered.stream()
            .map(OsgCoaching::getApplicationId)
            .toList();
        Map<Long, OsgJobApplication> applicationMap = applicationIds.stream()
            .map(id -> jobApplicationMapper.selectJobApplicationByApplicationId(id))
            .filter(Objects::nonNull)
            .collect(Collectors.toMap(OsgJobApplication::getApplicationId, row -> row, (a, b) -> a, LinkedHashMap::new));
        return filtered.stream()
            .map(coaching -> {
                Map<String, Object> payload = new LinkedHashMap<>();
                payload.put("applicationId", coaching.getApplicationId());
                payload.put("studentId", coaching.getStudentId());
                payload.put("status", coaching.getStatus());
                OsgJobApplication application = applicationMap.get(coaching.getApplicationId());
                if (application != null)
                {
                    payload.put("studentName", application.getStudentName());
                    payload.put("companyName", application.getCompanyName());
                    payload.put("positionName", application.getPositionName());
                }
                return payload;
            })
            .toList();
    }

    private List<Map<String, Object>> listMyPractices(Long currentUserId)
    {
        if (currentUserId == null)
        {
            return List.of();
        }
        List<OsgMockPractice> practices = mockPracticeMapper.selectMockPracticeList(new OsgMockPractice());
        if (practices == null || practices.isEmpty())
        {
            return List.of();
        }
        return practices.stream()
            .filter(row -> row.getPracticeId() != null)
            .filter(row -> isUserInCsv(row.getMentorIds(), currentUserId))
            .filter(row -> {
                String status = row.getStatus();
                return "confirmed".equals(status) || "scheduled".equals(status);
            })
            .map(row -> {
                Map<String, Object> payload = new LinkedHashMap<>();
                payload.put("practiceId", row.getPracticeId());
                payload.put("studentId", row.getStudentId());
                payload.put("studentName", row.getStudentName());
                payload.put("practiceType", row.getPracticeType());
                payload.put("status", row.getStatus());
                payload.put("requestContent", row.getRequestContent());
                return payload;
            })
            .toList();
    }

    private boolean isUserInCsv(String csv, Long userId)
    {
        if (csv == null || csv.isBlank() || userId == null)
        {
            return false;
        }
        String target = String.valueOf(userId);
        for (String token : csv.split(","))
        {
            if (target.equals(token.trim()))
            {
                return true;
            }
        }
        return false;
    }

    /** §3.4.1：lead_mentor_id 维度日历，严格限定 lead_mentor_id=当前用户，禁止扩大到 mentor_ids 视角。 */
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

    /**
     * 严格限定 lead_mentor_id=当前用户，禁止扩大到 mentor_ids 视角；§3.4.1 视角说明。
     */
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
        row.put("location", firstText(app.getRegion(), app.getCity()));
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

    private List<OsgJobApplication> selectCandidateApplications(String scope, OsgJobApplication rawQuery, Long currentUserId)
    {
        OsgJobApplication lookupQuery = buildApplicationLookupQuery(rawQuery);
        if (SCOPE_PENDING.equals(scope) || SCOPE_MANAGED.equals(scope))
        {
            lookupQuery.setLeadMentorId(currentUserId);
        }
        List<OsgJobApplication> rows = jobApplicationMapper.selectJobApplicationList(lookupQuery);
        return rows == null ? List.of() : rows;
    }

    private OsgJobApplication buildApplicationLookupQuery(OsgJobApplication rawQuery)
    {
        OsgJobApplication lookupQuery = normalizeQuery(rawQuery);
        lookupQuery.setCurrentStage(null);
        lookupQuery.setStatus(null);
        lookupQuery.setMonth(null);
        lookupQuery.setInterviewTimeStart(null);
        lookupQuery.setInterviewTimeEnd(null);
        lookupQuery.setLessonReported(null);
        return lookupQuery;
    }

    private Map<Long, OsgJobApplication> toApplicationMap(List<OsgJobApplication> applications)
    {
        if (applications == null || applications.isEmpty())
        {
            return Map.of();
        }
        return applications.stream()
            .filter(row -> row != null && row.getApplicationId() != null)
            .collect(Collectors.toMap(OsgJobApplication::getApplicationId, row -> row, (first, second) -> first, LinkedHashMap::new));
    }

    private List<OsgCoaching> selectAllCoachings()
    {
        List<OsgCoaching> rows = coachingMapper.selectCoachingList(new OsgCoaching());
        return rows == null ? List.of() : rows;
    }

    private boolean matchesScope(String scope, OsgJobApplication application, OsgCoaching coaching, Long currentUserId)
    {
        if (SCOPE_PENDING.equals(scope))
        {
            return isPendingCoachingAssignment(coaching);
        }
        if (SCOPE_COACHING.equals(scope))
        {
            return matchesMentorRelation(coaching, currentUserId);
        }
        return true;
    }

    private boolean matchesFallbackScope(String scope, OsgJobApplication application, Long currentUserId, Map<Long, OsgStudent> studentMap)
    {
        if (SCOPE_PENDING.equals(scope))
        {
            return isPendingAssignment(application);
        }
        if (SCOPE_COACHING.equals(scope))
        {
            return hasAssistantOwnership(application, currentUserId, studentMap);
        }
        return true;
    }

    private boolean isPendingCoachingAssignment(OsgCoaching coaching)
    {
        if (coaching == null)
        {
            return false;
        }
        String status = trimToNull(coaching.getStatus());
        boolean pendingStatus = status == null
            || "pending".equalsIgnoreCase(status)
            || "new".equalsIgnoreCase(status)
            || "待审批".equals(status);
        return pendingStatus
            && defaultNumber(coaching.getRequestedMentorCount()) > 0
            && firstText(coaching.getMentorIds(), coaching.getMentorNames(), coaching.getMentorName()) == null;
    }

    private boolean matchesOverviewQuery(OsgJobApplication application, OsgCoaching coaching, OsgJobApplication query)
    {
        if (application == null)
        {
            return false;
        }
        if (query == null)
        {
            return true;
        }
        if (query.getCompanyName() != null && !Objects.equals(query.getCompanyName(), trimToNull(application.getCompanyName())))
        {
            return false;
        }
        if (query.getCurrentStage() != null && !Objects.equals(query.getCurrentStage(), trimToNull(resolveOverviewStage(application, coaching))))
        {
            return false;
        }
        if (query.getAssignStatus() != null && !Objects.equals(query.getAssignStatus(), trimToNull(application.getAssignStatus())))
        {
            return false;
        }
        Date interviewTime = resolveOverviewInterviewTime(application, coaching);
        if (!matchesMonth(interviewTime, query.getMonth()))
        {
            return false;
        }
        if (!matchesOverviewStatus(application, coaching, query.getStatus()))
        {
            return false;
        }
        if (query.getInterviewTimeStart() != null
            && (interviewTime == null || interviewTime.before(query.getInterviewTimeStart())))
        {
            return false;
        }
        if (query.getInterviewTimeEnd() != null
            && (interviewTime == null || interviewTime.after(query.getInterviewTimeEnd())))
        {
            return false;
        }
        return true;
    }

    private boolean matchesOverviewStatus(OsgJobApplication application, OsgCoaching coaching, String status)
    {
        String normalizedStatus = normalizeStatusFilter(status);
        if (normalizedStatus == null)
        {
            return true;
        }
        String rowStatus = resolveStatusForQuery(application, coaching);
        return normalizedStatus.equals(rowStatus);
    }

    private int compareOverviewPayload(Map<String, Object> left, Map<String, Object> right)
    {
        Date leftSubmittedAt = toDate(left.get("submittedAt"));
        Date rightSubmittedAt = toDate(right.get("submittedAt"));
        int submittedCompare = Comparator.nullsLast(Date::compareTo).compare(rightSubmittedAt, leftSubmittedAt);
        if (submittedCompare != 0)
        {
            return submittedCompare;
        }
        Long leftCoachingId = toLong(left.get("coachingId"));
        Long rightCoachingId = toLong(right.get("coachingId"));
        return Comparator.nullsLast(Long::compareTo).compare(rightCoachingId, leftCoachingId);
    }

    private Date toDate(Object value)
    {
        return value instanceof Date date ? date : null;
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

    private OsgCoaching requireAccessibleCoaching(Long coachingId, Long currentUserId)
    {
        OsgCoaching coaching = coachingMapper.selectCoachingByCoachingId(coachingId);
        if (coaching == null)
        {
            throw new ServiceException("辅导申请不存在");
        }
        if (coaching.getApplicationId() == null)
        {
            throw new ServiceException("辅导申请缺少求职申请");
        }
        OsgJobApplication application = jobApplicationMapper.selectJobApplicationByApplicationId(coaching.getApplicationId());
        if (application == null)
        {
            throw new ServiceException("求职申请不存在");
        }
        if (!canManage(application, currentUserId)
            && !hasAssistantOwnership(application, currentUserId)
            && !matchesMentorRelation(coaching, currentUserId))
        {
            throw new ServiceException("无权访问该辅导申请");
        }
        return coaching;
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
        if (query.getInterviewTimeStart() != null
            && (row.getInterviewTime() == null || row.getInterviewTime().before(query.getInterviewTimeStart())))
        {
            return false;
        }
        if (query.getInterviewTimeEnd() != null
            && (row.getInterviewTime() == null || row.getInterviewTime().after(query.getInterviewTimeEnd())))
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
        Long studentId = coaching != null && coaching.getStudentId() != null ? coaching.getStudentId() : application.getStudentId();
        String city = resolveOverviewCity(application, coaching);
        payload.put("applicationId", application.getApplicationId());
        payload.put("coachingId", coaching == null ? null : coaching.getCoachingId());
        payload.put("studentId", studentId);
        payload.put("studentName", defaultText(application.getStudentName(), "-"));
        payload.put("companyName", defaultText(application.getCompanyName(), "-"));
        payload.put("positionName", defaultText(application.getPositionName(), "-"));
        payload.put("region", defaultText(application.getRegion()));
        payload.put("city", defaultText(city));
        payload.put("currentStage", defaultText(resolveOverviewStage(application, coaching), "-"));
        payload.put("interviewTime", resolveOverviewInterviewTime(application, coaching));
        payload.put("assignedStatus", defaultText(application.getAssignStatus()));
        payload.put("leadMentorName", defaultText(application.getLeadMentorName()));
        payload.put("stageUpdated", Boolean.TRUE.equals(application.getStageUpdated()));
        payload.put("requestedMentorCount", resolveOverviewRequestedMentorCount(application, coaching));
        payload.put("preferredMentorNames", defaultText(application.getPreferredMentorNames()));
        // §B5: 提交时间按 RULE-A 02 §4.3 锚到辅导申请 create_time，coaching 缺失时回退 application 投递时间
        payload.put("submittedAt", resolveOverviewSubmittedAt(application, coaching));

        if (coaching != null)
        {
            // §B.1：默认值为英文 enum 'assigned'（不再使用中文"辅导中"）
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

        payload.put("cityLabel", resolveCityLabel(city));
        Map<String, Object> stats = coaching == null
            ? computeApplicationStats(application.getApplicationId())
            : computeCoachingStats(coaching.getCoachingId());
        payload.put("latestRating", stats.get("latestRating"));
        payload.put("lessonCount", stats.get("lessonCount"));
        payload.put("lessonReported", stats.get("lessonReported"));

        return payload;
    }

    private String resolveOverviewStage(OsgJobApplication application, OsgCoaching coaching)
    {
        return coaching == null ? application.getCurrentStage() : firstText(coaching.getInterviewStage(), application.getCurrentStage());
    }

    private Date resolveOverviewInterviewTime(OsgJobApplication application, OsgCoaching coaching)
    {
        return coaching != null && coaching.getInterviewTime() != null ? coaching.getInterviewTime() : application.getInterviewTime();
    }

    /** §B5: coaching 优先取 create_time（辅导申请提交时间），fallback application.submittedAt（岗位投递时间） */
    private Date resolveOverviewSubmittedAt(OsgJobApplication application, OsgCoaching coaching)
    {
        return coaching != null && coaching.getCreateTime() != null
            ? coaching.getCreateTime()
            : application.getSubmittedAt();
    }

    private String resolveOverviewCity(OsgJobApplication application, OsgCoaching coaching)
    {
        return coaching == null ? application.getCity() : firstText(coaching.getCity(), application.getCity());
    }

    private Integer resolveOverviewRequestedMentorCount(OsgJobApplication application, OsgCoaching coaching)
    {
        return coaching != null && coaching.getRequestedMentorCount() != null
            ? coaching.getRequestedMentorCount()
            : defaultNumber(application.getRequestedMentorCount());
    }

    private OsgJobApplication normalizeQuery(OsgJobApplication query)
    {
        OsgJobApplication normalized = new OsgJobApplication();
        if (query == null)
        {
            return normalized;
        }
        normalized.setCompanyName(trimToNull(query.getCompanyName()));
        normalized.setCurrentStage(trimToNull(query.getCurrentStage()));
        normalized.setAssignStatus(trimToNull(query.getAssignStatus()));
        normalized.setMonth(normalizeMonth(trimToNull(query.getMonth())));
        normalized.setStatus(normalizeStatusFilter(firstText(query.getStatus(), query.getCoachingStatus())));
        normalized.setInterviewTimeStart(query.getInterviewTimeStart());
        normalized.setInterviewTimeEnd(query.getInterviewTimeEnd());
        normalized.setLessonReported(query.getLessonReported());
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

    private String resolveStatusForQuery(OsgJobApplication row, OsgCoaching coaching)
    {
        if (coaching != null)
        {
            String normalizedStatus = normalizeStatusFilter(coaching.getStatus());
            if (normalizedStatus != null)
            {
                return normalizedStatus;
            }
        }
        return resolveStatusForQuery(row);
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

        Map<Long, OsgCoaching> coachingByApp = selectCoachingMap();
        return applications.stream()
            .sorted(Comparator.comparing(OsgJobApplication::getSubmittedAt, Comparator.nullsLast(Date::compareTo)).reversed())
            .map(app -> toAssistantOverviewRow(app, coachingByApp.get(app.getApplicationId())))
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

        OsgCoaching coaching = coachingMapper.selectCoachingByApplicationId(applicationId);
        Map<String, Object> detail = new LinkedHashMap<>(toAssistantOverviewRow(application, coaching));
        detail.put("classRecordsByMentor", buildClassRecordsByMentor(coaching == null ? null : coaching.getCoachingId()));
        return detail;
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
            if (query.getInterviewTimeStart() != null
                && (app.getInterviewTime() == null || app.getInterviewTime().before(query.getInterviewTimeStart())))
            {
                return false;
            }
            if (query.getInterviewTimeEnd() != null
                && (app.getInterviewTime() == null || app.getInterviewTime().after(query.getInterviewTimeEnd())))
            {
                return false;
            }
            return true;
        }).toList();
    }

    private Map<String, Object> toAssistantOverviewRow(OsgJobApplication app, OsgCoaching coaching)
    {
        Map<String, Object> payload = new LinkedHashMap<>(toOverviewPayload(app, coaching));
        // 助教端兼容字段（保留 legacy 旧前端可读）
        payload.putIfAbsent("id", app.getApplicationId());
        payload.put("company", payload.get("companyName"));
        payload.put("position", payload.get("positionName"));
        payload.put("location", firstText(app.getRegion(), app.getCity()));
        payload.put("interviewStage", payload.get("currentStage"));
        payload.put("coachingStatus", toAssistantLegacyCoachingStatus(
            coaching == null ? app.getCoachingStatus() : coaching.getStatus()));
        payload.put("result", toAssistantLegacyResult(
            coaching == null ? app.getCurrentStage() : (String) payload.get("currentStage")));
        payload.put("createTime", app.getSubmittedAt());
        return payload;
    }

    private Map<String, Object> toAssistantCalendarRow(OsgJobApplication app)
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", app.getApplicationId());
        row.put("studentName", app.getStudentName());
        row.put("company", app.getCompanyName());
        row.put("position", app.getPositionName());
        row.put("location", firstText(app.getRegion(), app.getCity()));
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

    private List<Map<String, Object>> buildClassRecordsByMentor(Long coachingId)
    {
        if (coachingId == null)
        {
            return List.of();
        }
        List<OsgClassRecord> records = classRecordMapper.selectByJobCoachingReference(coachingId);
        if (records == null || records.isEmpty())
        {
            return List.of();
        }
        Map<Long, List<OsgClassRecord>> byMentor = new LinkedHashMap<>();
        for (OsgClassRecord r : records)
        {
            Long mentorId = r.getMentorId();
            if (mentorId == null)
            {
                mentorId = 0L;
            }
            byMentor.computeIfAbsent(mentorId, k -> new ArrayList<>()).add(r);
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<Long, List<OsgClassRecord>> entry : byMentor.entrySet())
        {
            Long mentorId = entry.getKey();
            List<OsgClassRecord> group = entry.getValue();
            String mentorName = group.stream().map(OsgClassRecord::getMentorName).filter(Objects::nonNull).findFirst().orElse(null);
            BigDecimal totalHours = group.stream()
                .map(r -> r.getDurationHours() != null ? BigDecimal.valueOf(r.getDurationHours()) : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            List<BigDecimal> ratingValues = group.stream()
                .filter(r -> "normal".equals(r.getMemberStatus()))
                .filter(r -> r.getRate() != null && !r.getRate().isBlank())
                .map(r -> {
                    try { return new BigDecimal(r.getRate()); }
                    catch (NumberFormatException e) { return null; }
                })
                .filter(Objects::nonNull)
                .toList();
            BigDecimal avgRating = ratingValues.isEmpty() ? null
                : ratingValues.stream().reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(BigDecimal.valueOf(ratingValues.size()), 2, RoundingMode.HALF_UP);
            List<Map<String, Object>> recordList = group.stream()
                .map(r -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("recordId", r.getRecordId());
                    row.put("classDate", r.getClassDate());
                    row.put("durationHours", r.getDurationHours());
                    row.put("courseType", r.getCourseType());
                    row.put("memberStatus", r.getMemberStatus());
                    row.put("rate", r.getRate());
                    row.put("feedbackContent", r.getFeedbackContent());
                    return row;
                })
                .toList();
            Map<String, Object> mentorGroup = new LinkedHashMap<>();
            mentorGroup.put("mentorId", mentorId == 0L ? null : mentorId);
            mentorGroup.put("mentorName", mentorName);
            mentorGroup.put("totalHours", totalHours);
            mentorGroup.put("avgRating", avgRating);
            mentorGroup.put("records", recordList);
            result.add(mentorGroup);
        }
        return result;
    }

    private Map<String, Object> computeApplicationStats(Long applicationId)
    {
        if (applicationId == null)
        {
            return emptyStats();
        }
        List<OsgClassRecord> records = classRecordMapper.selectByApplicationReference(applicationId);
        return computeStatsFromRecords(records);
    }

    private Map<String, Object> computeCoachingStats(Long coachingId)
    {
        if (coachingId == null)
        {
            return emptyStats();
        }
        List<OsgClassRecord> records = classRecordMapper.selectByJobCoachingReference(coachingId);
        return computeStatsFromRecords(records);
    }

    private Map<String, Object> computeStatsFromRecords(List<OsgClassRecord> records)
    {
        Map<String, Object> stats = new LinkedHashMap<>();
        if (records == null)
        {
            records = List.of();
        }
        int lessonCount = records.size();
        String latestRating = records.stream()
            .filter(r -> "normal".equals(r.getMemberStatus()))
            .filter(r -> r.getRate() != null && !r.getRate().isBlank())
            .map(OsgClassRecord::getRate)
            .findFirst()
            .orElse(null);
        stats.put("latestRating", latestRating);
        stats.put("lessonCount", lessonCount);
        stats.put("lessonReported", lessonCount > 0);
        return stats;
    }

    private Map<String, Object> emptyStats()
    {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("latestRating", null);
        stats.put("lessonCount", 0);
        stats.put("lessonReported", false);
        return stats;
    }

    private String resolveCityLabel(String cityValue)
    {
        return resolveCityLabel(cityValue, new java.util.HashMap<>());
    }

    private String resolveCityLabel(String cityValue, Map<String, String> dictCache)
    {
        if (cityValue == null || cityValue.isBlank())
        {
            return null;
        }
        if (dictCache.containsKey(cityValue))
        {
            return dictCache.get(cityValue);
        }
        String label = dictDataService.selectDictLabel("osg_city", cityValue);
        String resolved = (label == null || label.isBlank()) ? cityValue : label;
        dictCache.put(cityValue, resolved);
        return resolved;
    }

    // ===== Mentor 端列表查询（委托 coaching scope）=====

    @Override
    public List<Map<String, Object>> listByMentor(OsgJobApplication query, Long mentorId)
    {
        return selectOverviewListInternal(SCOPE_COACHING, query, mentorId);
    }
}
