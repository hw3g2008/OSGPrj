package com.ruoyi.system.service.impl;

import java.sql.Timestamp;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgCoaching;
import com.ruoyi.system.domain.OsgJobApplication;
import com.ruoyi.system.mapper.OsgCoachingMapper;
import com.ruoyi.system.mapper.OsgJobApplicationMapper;
import com.ruoyi.system.service.IOsgJobOverviewService;

@Service
public class OsgJobOverviewServiceImpl implements IOsgJobOverviewService
{
    private static final ZoneId ZONE_ID = ZoneId.systemDefault();

    private static final Map<String, String> STAGE_LABELS = Map.ofEntries(
        Map.entry("applied", "已投递"),
        Map.entry("hirevue", "HireVue"),
        Map.entry("first_round", "First Round"),
        Map.entry("second_round", "Second Round"),
        Map.entry("case_study", "Case Study"),
        Map.entry("final", "Final"),
        Map.entry("offer", "Offer"),
        Map.entry("rejected", "已拒绝"),
        Map.entry("withdrawn", "主动放弃")
    );

    private static final Map<String, String> COACHING_STATUS_LABELS = Map.of(
        "none", "未申请",
        "pending", "待分配导师",
        "assigned", "已分配导师",
        "coaching", "辅导中",
        "completed", "已完成",
        "cancelled", "已取消"
    );

    @Autowired
    private OsgJobApplicationMapper jobApplicationMapper;

    @Autowired
    private OsgCoachingMapper coachingMapper;

    @Autowired
    private OsgIdentityResolver identityResolver;

    @Override
    public Map<String, Object> selectJobOverviewStats(String studentName, String companyName, String currentStage, Long leadMentorId, String assignStatus)
    {
        List<OsgJobApplication> rows = selectApplications(studentName, companyName, currentStage, leadMentorId, assignStatus);
        int totalSubmitted = rows.size();
        int interviewingCount = (int) rows.stream().filter(this::isInterviewingStage).count();
        int offerCount = (int) rows.stream().filter(row -> isStage(row, "offer")).count();
        int rejectedCount = (int) rows.stream().filter(row -> isStage(row, "rejected")).count();
        int withdrawnCount = (int) rows.stream().filter(row -> isStage(row, "withdrawn")).count();

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("appliedCount", totalSubmitted);
        stats.put("interviewingCount", interviewingCount);
        stats.put("offerCount", offerCount);
        stats.put("rejectedCount", rejectedCount);
        stats.put("withdrawnCount", withdrawnCount);
        stats.put("offerRate", roundPercent(offerCount, totalSubmitted));
        stats.put("interviewPassRate", roundPercent(offerCount, interviewingCount + offerCount));
        stats.put("offerRateYoY", formatDelta(deriveMonthlyDelta(rows, true)));
        stats.put("interviewPassRateYoY", formatDelta(deriveMonthlyDelta(rows, false)));
        return stats;
    }

    @Override
    public List<Map<String, Object>> selectJobOverviewFunnel(String studentName, String companyName, String currentStage, Long leadMentorId, String assignStatus)
    {
        List<OsgJobApplication> rows = selectApplications(studentName, companyName, currentStage, leadMentorId, assignStatus);
        int submittedCount = rows.size();
        int interviewingCount = (int) rows.stream().filter(this::isInterviewingStage).count();
        int offerCount = (int) rows.stream().filter(row -> isStage(row, "offer")).count();

        List<Map<String, Object>> result = new ArrayList<>(3);
        result.add(funnelNode("已投递", submittedCount, 100));
        result.add(funnelNode("面试中", interviewingCount, percentOf(interviewingCount, submittedCount)));
        result.add(funnelNode("获Offer", offerCount, percentOf(offerCount, submittedCount)));
        return result;
    }

    @Override
    public List<Map<String, Object>> selectJobOverviewList(String studentName, String companyName, String currentStage, Long leadMentorId, String assignStatus)
    {
        List<OsgJobApplication> rows = selectApplications(studentName, companyName, currentStage, leadMentorId, assignStatus);
        Map<Long, OsgCoaching> coachingMap = selectCoachingMap();
        return rows.stream()
            .sorted(Comparator.comparing(OsgJobApplication::getSubmittedAt, Comparator.nullsLast(Date::compareTo)).reversed())
            .map(row -> toOverviewPayload(row, coachingMap.get(row.getApplicationId())))
            .toList();
    }

    @Override
    public List<Map<String, Object>> selectUnassignedList(String studentName, String companyName, String currentStage, Long leadMentorId)
    {
        return selectApplications(studentName, companyName, currentStage, leadMentorId, "pending").stream()
            .filter(row -> !Objects.equals(normalize(row.getAssignStatus()), "assigned"))
            .sorted(Comparator.comparing(OsgJobApplication::getSubmittedAt, Comparator.nullsLast(Date::compareTo)).reversed())
            .map(this::toUnassignedPayload)
            .toList();
    }

    @Override
    public List<Map<String, Object>> selectUnassignedCoachingList(String studentName, String companyName, Long leadMentorId)
    {
        // §B3 admin coaching 维度待分配列表：
        //   1. 拉所有 coaching（status=pending + mentor_ids 为空 + requested_mentor_count > 0）
        //   2. JOIN application/student 过滤 studentName/companyName/leadMentorId
        //   3. 行维度 = coachingId，一条 application 多条 pending coaching 都展示
        List<OsgCoaching> coachings = coachingMapper.selectCoachingList(new OsgCoaching());
        if (coachings == null || coachings.isEmpty())
        {
            return Collections.emptyList();
        }
        // 拉 application（按 admin 端 unassigned 复用现有 SQL：studentName/companyName/leadMentorId 三选条件）
        OsgJobApplication query = new OsgJobApplication();
        query.setStudentName(studentName);
        query.setCompanyName(companyName);
        query.setLeadMentorId(leadMentorId);
        List<OsgJobApplication> applications = jobApplicationMapper.selectJobApplicationList(query);
        Map<Long, OsgJobApplication> applicationMap = applications == null ? Collections.emptyMap()
            : applications.stream()
                .filter(row -> row != null && row.getApplicationId() != null)
                .collect(Collectors.toMap(OsgJobApplication::getApplicationId, row -> row, (a, b) -> a, LinkedHashMap::new));

        List<Map<String, Object>> result = new ArrayList<>();
        for (OsgCoaching coaching : coachings)
        {
            if (!isPendingCoachingAssignment(coaching))
            {
                continue;
            }
            OsgJobApplication application = applicationMap.get(coaching.getApplicationId());
            if (application == null)
            {
                continue;
            }
            result.add(toUnassignedCoachingPayload(application, coaching));
        }
        result.sort(Comparator.comparing(
            (Map<String, Object> row) -> (Date) row.get("submittedAt"),
            Comparator.nullsLast(Date::compareTo)).reversed());
        return result;
    }

    private boolean isPendingCoachingAssignment(OsgCoaching coaching)
    {
        if (coaching == null)
        {
            return false;
        }
        String status = normalize(coaching.getStatus());
        boolean pendingStatus = status == null || status.isEmpty()
            || "pending".equals(status)
            || "new".equals(status);
        if (!pendingStatus)
        {
            return false;
        }
        if (defaultNumber(coaching.getRequestedMentorCount()) <= 0)
        {
            return false;
        }
        // mentor_ids / mentor_names / mentor_name 任意非空都视为已分配
        return isBlank(coaching.getMentorIds())
            && isBlank(coaching.getMentorNames())
            && isBlank(coaching.getMentorName());
    }

    private boolean isBlank(String value)
    {
        return value == null || value.trim().isEmpty();
    }

    private Map<String, Object> toUnassignedCoachingPayload(OsgJobApplication application, OsgCoaching coaching)
    {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("coachingId", coaching.getCoachingId());
        payload.put("applicationId", application.getApplicationId());
        payload.put("studentId", application.getStudentId());
        payload.put("studentName", application.getStudentName());
        payload.put("companyName", application.getCompanyName());
        payload.put("positionName", application.getPositionName());
        payload.put("region", application.getRegion());
        payload.put("city", coaching.getCity() != null ? coaching.getCity() : application.getCity());
        // coaching 维度的核心字段：来自 coaching 不是 application
        payload.put("interviewStage", coaching.getInterviewStage());
        payload.put("interviewTime", coaching.getInterviewTime());
        payload.put("requestedMentorCount", defaultNumber(coaching.getRequestedMentorCount()));
        payload.put("companyInterviewer", coaching.getCompanyInterviewer());
        payload.put("leadMentorName", application.getLeadMentorName());
        payload.put("requestNote", coaching.getRequestNote());
        payload.put("submittedAt", coaching.getCreateTime() != null ? coaching.getCreateTime() : application.getSubmittedAt());
        return payload;
    }

    @Override
    public Map<String, Object> assignMentorsByCoaching(Long coachingId, Map<String, Object> payload, String operator)
    {
        if (coachingId == null)
        {
            throw new ServiceException("coachingId不能为空");
        }
        OsgCoaching coaching = coachingMapper.selectCoachingByCoachingId(coachingId);
        if (coaching == null)
        {
            throw new ServiceException("辅导申请不存在");
        }
        OsgJobApplication application = jobApplicationMapper.selectJobApplicationByApplicationId(coaching.getApplicationId());
        if (application == null)
        {
            throw new ServiceException("求职申请不存在");
        }

        List<Long> mentorStaffIds = toLongList(payload.get("mentorIds"));
        if (mentorStaffIds.isEmpty())
        {
            throw new ServiceException("请至少选择1位导师");
        }
        Integer requested = coaching.getRequestedMentorCount();
        if (requested != null && requested > 0 && mentorStaffIds.size() != requested)
        {
            throw new ServiceException("导师数量必须等于申请导师数量");
        }
        List<Long> mentorUserIds = mentorStaffIds.stream()
            .map(identityResolver::resolveUserIdByStaffId)
            .toList();

        List<String> mentorNames = toStringList(payload.get("mentorNames"));
        String mentorNamesText = mentorNames.isEmpty() ? null : String.join(", ", mentorNames);
        String assignNote = firstText(payload.get("assignNote"), payload.get("remark"));
        Date now = new Date();

        coaching.setMentorIds(mentorUserIds.stream().map(String::valueOf).collect(Collectors.joining(",")));
        coaching.setMentorNames(mentorNamesText);
        coaching.setMentorName(mentorNames.isEmpty() ? null : mentorNames.get(0));
        coaching.setStatus("assigned");
        coaching.setTotalHours(defaultNumber(coaching.getTotalHours()));
        coaching.setAssignNote(assignNote);
        coaching.setAssignedAt(now);
        coaching.setUpdateBy(operator);
        coaching.setRemark(assignNote);

        if (coachingMapper.updateCoaching(coaching) <= 0)
        {
            throw new ServiceException("分配导师保存失败");
        }

        // 同步 application.assign_status='assigned'（与旧逻辑一致），不动 coaching_status（§F1）
        OsgJobApplication assignment = new OsgJobApplication();
        assignment.setApplicationId(application.getApplicationId());
        assignment.setAssignStatus("assigned");
        assignment.setUpdateBy(operator);
        assignment.setRemark(assignNote);
        jobApplicationMapper.updateJobApplicationAssignment(assignment);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("coachingId", coachingId);
        result.put("applicationId", application.getApplicationId());
        result.put("status", "assigned");
        result.put("mentorIds", mentorUserIds);
        result.put("mentorNames", mentorNamesText);
        result.put("assignNote", assignNote);
        result.put("assignedAt", now);
        return result;
    }

    public List<Map<String, Object>> selectJobOverviewExportRows(String studentName,
                                                                 String companyName,
                                                                 String currentStage,
                                                                 Long leadMentorId,
                                                                 String assignStatus,
                                                                 String tab)
    {
        if ("pending".equalsIgnoreCase(defaultText(tab, "all")))
        {
            return selectUnassignedList(studentName, companyName, currentStage, leadMentorId).stream()
                .map(this::toPendingExportPayload)
                .toList();
        }

        return selectJobOverviewList(studentName, companyName, currentStage, leadMentorId, assignStatus).stream()
            .map(this::toAllExportPayload)
            .toList();
    }

    @Override
    public Map<String, Object> assignMentors(Map<String, Object> payload, String operator)
    {
        Long applicationId = toLong(payload.get("applicationId"));
        if (applicationId == null)
        {
            throw new ServiceException("applicationId不能为空");
        }

        List<Long> mentorStaffIds = toLongList(payload.get("mentorIds"));
        if (mentorStaffIds.isEmpty())
        {
            throw new ServiceException("请至少选择1位导师");
        }
        List<Long> mentorUserIds = mentorStaffIds.stream()
            .map(identityResolver::resolveUserIdByStaffId)
            .toList();

        OsgJobApplication application = jobApplicationMapper.selectJobApplicationByApplicationId(applicationId);
        if (application == null)
        {
            throw new ServiceException("求职申请不存在");
        }
        if (Objects.equals(normalize(application.getAssignStatus()), "assigned"))
        {
            throw new ServiceException("该求职申请已分配导师");
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
        coaching.setMentorIds(mentorUserIds.stream().map(String::valueOf).collect(Collectors.joining(",")));
        coaching.setMentorNames(mentorNamesText);
        coaching.setMentorName(mentorNames.isEmpty() ? null : mentorNames.get(0));
        // §F1：admin 端分配后 osg_coaching.status='assigned'，等辅导者 confirm 才转 'coaching'
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
            throw new ServiceException("分配导师保存失败");
        }

        OsgJobApplication assignment = new OsgJobApplication();
        assignment.setApplicationId(applicationId);
        assignment.setAssignStatus("assigned");
        // §F1：不再设 coachingStatus；保持数据库原值（初始 'none' 或 §B 迁移后的英文枚举）
        assignment.setUpdateBy(operator);
        assignment.setRemark(assignNote);
        if (jobApplicationMapper.updateJobApplicationAssignment(assignment) <= 0)
        {
            throw new ServiceException("求职申请分配状态更新失败");
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("applicationId", applicationId);
        result.put("status", "assigned");
        // §F1：assignMentors 后 coachingStatus 仍为 'none'（等辅导者 confirm 才转）
        result.put("coachingStatus", "none");
        result.put("mentorIds", mentorUserIds);
        result.put("mentorNames", mentorNamesText);
        result.put("assignNote", assignNote);
        result.put("assignedAt", now);
        return result;
    }

    @Override
    public Map<String, Object> updateStage(Map<String, Object> payload, String operator)
    {
        Long applicationId = toLong(payload.get("applicationId"));
        if (applicationId == null)
        {
            throw new ServiceException("applicationId不能为空");
        }

        OsgJobApplication application = jobApplicationMapper.selectJobApplicationByApplicationId(applicationId);
        if (application == null)
        {
            throw new ServiceException("求职申请不存在");
        }

        String currentStage = firstText(payload.get("currentStage"), payload.get("stage"));
        Date interviewTime = toDate(payload.get("interviewTime"));
        Boolean stageUpdated = toBoolean(payload.get("stageUpdated"));
        if (stageUpdated == null)
        {
            stageUpdated = currentStage == null ? Boolean.FALSE : Boolean.TRUE;
        }

        OsgJobApplication stagePatch = new OsgJobApplication();
        stagePatch.setApplicationId(applicationId);
        stagePatch.setCurrentStage(currentStage);
        stagePatch.setInterviewTime(interviewTime);
        stagePatch.setStageUpdated(stageUpdated);
        stagePatch.setUpdateBy(operator);
        stagePatch.setRemark(firstText(payload.get("remark"), payload.get("note")));
        if (jobApplicationMapper.updateJobApplicationStage(stagePatch) <= 0)
        {
            throw new ServiceException("求职阶段更新失败");
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("applicationId", applicationId);
        result.put("currentStage", currentStage == null ? application.getCurrentStage() : currentStage);
        result.put("stageUpdated", stageUpdated);
        result.put("interviewTime", interviewTime == null ? application.getInterviewTime() : interviewTime);
        return result;
    }

    private List<OsgJobApplication> selectApplications(String studentName, String companyName, String currentStage, Long leadMentorId, String assignStatus)
    {
        OsgJobApplication query = new OsgJobApplication();
        query.setStudentName(studentName);
        query.setCompanyName(companyName);
        query.setCurrentStage(currentStage);
        query.setLeadMentorId(leadMentorId);
        query.setAssignStatus(assignStatus);
        List<OsgJobApplication> rows = jobApplicationMapper.selectJobApplicationList(query);
        return rows == null ? Collections.emptyList() : rows;
    }

    private Map<Long, OsgCoaching> selectCoachingMap()
    {
        List<OsgCoaching> coachings = coachingMapper.selectCoachingList(new OsgCoaching());
        if (coachings == null || coachings.isEmpty())
        {
            return Collections.emptyMap();
        }
        return coachings.stream()
            .filter(row -> row.getApplicationId() != null)
            .collect(Collectors.toMap(OsgCoaching::getApplicationId, row -> row, (first, second) -> second, LinkedHashMap::new));
    }

    private Map<String, Object> toOverviewPayload(OsgJobApplication application, OsgCoaching coaching)
    {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("applicationId", application.getApplicationId());
        payload.put("studentId", application.getStudentId());
        payload.put("studentName", application.getStudentName());
        payload.put("companyName", application.getCompanyName());
        payload.put("positionName", application.getPositionName());
        payload.put("region", application.getRegion());
        payload.put("city", application.getCity());
        payload.put("currentStage", application.getCurrentStage());
        payload.put("interviewTime", application.getInterviewTime());
        payload.put("assignedStatus", application.getAssignStatus());
        payload.put("leadMentorName", application.getLeadMentorName());
        payload.put("stageUpdated", application.getStageUpdated());
        payload.put("submittedAt", application.getSubmittedAt());

        if (coaching != null)
        {
            // §B.1：默认值为英文 enum 'assigned'
            payload.put("coachingStatus", defaultText(coaching.getStatus(), "assigned"));
            payload.put("mentorName", defaultText(coaching.getMentorName(), coaching.getMentorNames()));
            payload.put("mentorBackground", defaultText(coaching.getMentorBackground(), "-"));
            payload.put("hoursUsed", defaultNumber(coaching.getTotalHours()));
            payload.put("feedbackSummary", defaultText(coaching.getFeedbackSummary(), "-"));
        }
        else
        {
            // §D.3：fallback 也输出 raw 英文枚举值，前端 composable 统一派生 label
            String fallbackStatus = defaultNumber(application.getRequestedMentorCount()) > 0 ? "pending" : "none";
            payload.put("coachingStatus", defaultText(application.getCoachingStatus(), fallbackStatus));
            payload.put("mentorName", null);
            payload.put("mentorBackground", null);
            payload.put("hoursUsed", 0);
            payload.put("feedbackSummary", null);
        }
        return payload;
    }

    private Map<String, Object> toUnassignedPayload(OsgJobApplication application)
    {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("applicationId", application.getApplicationId());
        payload.put("studentId", application.getStudentId());
        payload.put("studentName", application.getStudentName());
        payload.put("companyName", application.getCompanyName());
        payload.put("positionName", application.getPositionName());
        payload.put("region", application.getRegion());
        payload.put("city", application.getCity());
        payload.put("currentStage", application.getCurrentStage());
        payload.put("interviewTime", application.getInterviewTime());
        payload.put("requestedMentorCount", defaultNumber(application.getRequestedMentorCount()));
        payload.put("preferredMentorNames", application.getPreferredMentorNames());
        payload.put("leadMentorName", application.getLeadMentorName());
        payload.put("submittedAt", application.getSubmittedAt());
        return payload;
    }

    private Map<String, Object> toPendingExportPayload(Map<String, Object> row)
    {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("applicationId", row.get("applicationId"));
        payload.put("studentId", row.get("studentId"));
        payload.put("studentName", row.get("studentName"));
        payload.put("companyName", row.get("companyName"));
        payload.put("positionName", row.get("positionName"));
        payload.put("region", row.get("region"));
        payload.put("city", row.get("city"));
        payload.put("currentStage", toStageLabel(row.get("currentStage")));
        payload.put("interviewTime", row.get("interviewTime"));
        payload.put("assignedStatusLabel", "待分配");
        payload.put("datasetLabel", "待分配导师");
        payload.put("leadMentorName", row.get("leadMentorName"));
        payload.put("mentorName", null);
        payload.put("mentorBackground", null);
        payload.put("stageUpdatedLabel", "");
        payload.put("coachingStatus", COACHING_STATUS_LABELS.get("pending"));
        payload.put("requestedMentorCount", row.get("requestedMentorCount"));
        payload.put("preferredMentorNames", row.get("preferredMentorNames"));
        payload.put("hoursUsed", 0);
        payload.put("feedbackSummary", null);
        payload.put("submittedAt", row.get("submittedAt"));
        return payload;
    }

    private Map<String, Object> toAllExportPayload(Map<String, Object> row)
    {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("applicationId", row.get("applicationId"));
        payload.put("studentId", row.get("studentId"));
        payload.put("studentName", row.get("studentName"));
        payload.put("companyName", row.get("companyName"));
        payload.put("positionName", row.get("positionName"));
        payload.put("region", row.get("region"));
        payload.put("city", row.get("city"));
        payload.put("currentStage", toStageLabel(row.get("currentStage")));
        payload.put("interviewTime", row.get("interviewTime"));
        payload.put("assignedStatusLabel", toAssignedStatusLabel(row.get("assignedStatus")));
        payload.put("datasetLabel", "全部学员");
        payload.put("leadMentorName", row.get("leadMentorName"));
        // 页面在 mentor 未分配时回退到 leadMentor，导出对齐这套兜底
        payload.put("mentorName", coalesceText(row.get("mentorName"), row.get("leadMentorName")));
        payload.put("mentorBackground", row.get("mentorBackground"));
        payload.put("stageUpdatedLabel", toStageUpdatedLabel(row.get("stageUpdated")));
        payload.put("coachingStatus", toCoachingStatusLabel(row.get("coachingStatus")));
        payload.put("requestedMentorCount", null);
        payload.put("preferredMentorNames", null);
        payload.put("hoursUsed", row.get("hoursUsed"));
        payload.put("feedbackSummary", row.get("feedbackSummary"));
        payload.put("submittedAt", row.get("submittedAt"));
        return payload;
    }

    private Map<String, Object> funnelNode(String label, int count, int rate)
    {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("label", label);
        payload.put("count", count);
        payload.put("rate", rate);
        return payload;
    }

    private boolean isInterviewingStage(OsgJobApplication application)
    {
        String stage = normalize(application.getCurrentStage());
        return List.of("hirevue", "first_round", "second_round", "case_study", "final").contains(stage);
    }

    private boolean isStage(OsgJobApplication application, String stage)
    {
        return Objects.equals(normalize(application.getCurrentStage()), normalize(stage));
    }

    private double deriveMonthlyDelta(List<OsgJobApplication> rows, boolean offerRate)
    {
        if (rows.isEmpty())
        {
            return 0D;
        }

        YearMonth currentMonth = rows.stream()
            .map(OsgJobApplication::getSubmittedAt)
            .filter(Objects::nonNull)
            .map(value -> YearMonth.from(value.toInstant().atZone(ZONE_ID)))
            .max(Comparator.naturalOrder())
            .orElse(YearMonth.now());
        YearMonth previousMonth = currentMonth.minusMonths(1);

        double currentRate = computeMonthlyRate(rows, currentMonth, offerRate);
        double previousRate = computeMonthlyRate(rows, previousMonth, offerRate);
        return currentRate - previousRate;
    }

    private double computeMonthlyRate(List<OsgJobApplication> rows, YearMonth month, boolean offerRate)
    {
        List<OsgJobApplication> currentRows = rows.stream()
            .filter(row -> row.getSubmittedAt() != null)
            .filter(row -> YearMonth.from(row.getSubmittedAt().toInstant().atZone(ZONE_ID)).equals(month))
            .toList();
        if (currentRows.isEmpty())
        {
            return 0D;
        }

        if (offerRate)
        {
            long offerCount = currentRows.stream().filter(row -> isStage(row, "offer")).count();
            return roundPercent(offerCount, currentRows.size());
        }

        long interviewingOrOffer = currentRows.stream()
            .filter(row -> isInterviewingStage(row) || isStage(row, "offer"))
            .count();
        long offerCount = currentRows.stream().filter(row -> isStage(row, "offer")).count();
        return roundPercent(offerCount, interviewingOrOffer);
    }

    private String formatDelta(double delta)
    {
        long rounded = Math.round(delta);
        String sign = rounded > 0 ? "+" : "";
        return sign + rounded + "%";
    }

    private int percentOf(long numerator, long denominator)
    {
        if (denominator <= 0)
        {
            return 0;
        }
        return (int) Math.round((double) numerator * 100 / denominator);
    }

    private double roundPercent(long numerator, long denominator)
    {
        if (denominator <= 0)
        {
            return 0D;
        }
        double value = (double) numerator * 100 / denominator;
        return Math.round(value * 10.0D) / 10.0D;
    }

    private int defaultNumber(Integer value)
    {
        return value == null ? 0 : value;
    }

    private String defaultText(String value, String fallback)
    {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String normalize(String value)
    {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String toAssignedStatusLabel(Object assignedStatus)
    {
        String normalized = normalize(assignedStatus == null ? null : String.valueOf(assignedStatus));
        return "assigned".equals(normalized) ? "已分配" : "待分配";
    }

    private String toStageLabel(Object stage)
    {
        if (stage == null)
        {
            return "";
        }
        String normalized = normalize(String.valueOf(stage));
        if (normalized.isEmpty())
        {
            return "";
        }
        return STAGE_LABELS.getOrDefault(normalized, String.valueOf(stage));
    }

    private String toCoachingStatusLabel(Object status)
    {
        if (status == null)
        {
            return COACHING_STATUS_LABELS.get("none");
        }
        String normalized = normalize(String.valueOf(status));
        if (normalized.isEmpty())
        {
            return COACHING_STATUS_LABELS.get("none");
        }
        return COACHING_STATUS_LABELS.getOrDefault(normalized, String.valueOf(status));
    }

    private String toStageUpdatedLabel(Object value)
    {
        if (value instanceof Boolean bool)
        {
            return bool ? "需确认" : "";
        }
        if (value == null)
        {
            return "";
        }
        return "true".equalsIgnoreCase(String.valueOf(value).trim()) ? "需确认" : "";
    }

    private String coalesceText(Object first, Object second)
    {
        String firstText = first == null ? "" : String.valueOf(first).trim();
        if (!firstText.isEmpty())
        {
            return firstText;
        }
        return second == null ? null : String.valueOf(second);
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
        String text = String.valueOf(value).trim();
        if (text.isEmpty())
        {
            return null;
        }
        return Long.valueOf(text);
    }

    private List<Long> toLongList(Object value)
    {
        if (value instanceof Collection<?> collection)
        {
            return collection.stream()
                .map(this::toLong)
                .filter(Objects::nonNull)
                .toList();
        }
        if (value instanceof String text && !text.isBlank())
        {
            return List.of(text.split(",")).stream()
                .map(String::trim)
                .filter(item -> !item.isEmpty())
                .map(Long::valueOf)
                .toList();
        }
        return Collections.emptyList();
    }

    private List<String> toStringList(Object value)
    {
        if (value instanceof Collection<?> collection)
        {
            return collection.stream()
                .map(String::valueOf)
                .map(String::trim)
                .filter(item -> !item.isEmpty())
                .toList();
        }
        if (value instanceof String text && !text.isBlank())
        {
            return List.of(text.split(",")).stream()
                .map(String::trim)
                .filter(item -> !item.isEmpty())
                .toList();
        }
        return Collections.emptyList();
    }

    private Boolean toBoolean(Object value)
    {
        if (value == null)
        {
            return null;
        }
        if (value instanceof Boolean bool)
        {
            return bool;
        }
        return Boolean.valueOf(String.valueOf(value));
    }

    private Date toDate(Object value)
    {
        if (value instanceof Date date)
        {
            return date;
        }
        if (value == null)
        {
            return null;
        }
        String text = String.valueOf(value).trim();
        if (text.isEmpty())
        {
            return null;
        }
        if (text.length() == 10)
        {
            text = text + " 00:00:00";
        }
        text = text.replace("T", " ").replace("Z", "");
        return Timestamp.valueOf(text);
    }

    private String firstText(Object primary, Object fallback)
    {
        String primaryText = primary == null ? null : String.valueOf(primary).trim();
        if (primaryText != null && !primaryText.isEmpty())
        {
            return primaryText;
        }
        String fallbackText = fallback == null ? null : String.valueOf(fallback).trim();
        return fallbackText == null || fallbackText.isEmpty() ? null : fallbackText;
    }
}
