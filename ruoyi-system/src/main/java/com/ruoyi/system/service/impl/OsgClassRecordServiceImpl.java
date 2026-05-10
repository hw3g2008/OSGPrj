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
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import com.github.pagehelper.Page;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.MessageUtils;
import com.ruoyi.system.domain.OsgClassRecord;
import com.ruoyi.system.constant.OsgClassReportConstants;
import com.ruoyi.system.domain.OsgClassRecordAttachment;
import com.ruoyi.system.domain.OsgCoaching;
import com.ruoyi.system.domain.OsgJobApplication;
import com.ruoyi.system.domain.OsgMockPractice;
import com.ruoyi.system.domain.OsgStaff;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.domain.OsgStudentPosition;
import com.ruoyi.system.mapper.OsgClassRecordAttachmentMapper;
import com.ruoyi.system.mapper.OsgClassRecordMapper;
import com.ruoyi.system.mapper.OsgCoachingMapper;
import com.ruoyi.system.mapper.OsgJobApplicationMapper;
import com.ruoyi.system.mapper.OsgMockPracticeMapper;
import com.ruoyi.system.mapper.OsgStaffMapper;
import com.ruoyi.system.mapper.OsgStudentMapper;
import com.ruoyi.system.mapper.OsgStudentPositionMapper;
import com.ruoyi.system.service.IOsgClassRecordService;
import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.ruoyi.system.domain.dto.feedback.BaseCourseFeedback;
import com.ruoyi.system.domain.dto.feedback.JobCoachingFeedback;
import com.ruoyi.system.domain.dto.feedback.MidtermFeedback;
import com.ruoyi.system.domain.dto.feedback.MockInterviewFeedback;
import com.ruoyi.system.domain.dto.feedback.RelationFeedback;

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

    @Autowired
    private OsgClassRecordAttachmentMapper attachmentMapper;

    @Autowired
    private OsgStudentPositionMapper studentPositionMapper;

    @Autowired
    private OsgCoachingMapper coachingMapper;

    @Autowired
    private OsgMockPracticeMapper mockPracticeMapper;

    @Autowired
    private OsgJobApplicationMapper jobApplicationMapper;

    @Autowired
    private OsgClassReportValidator classReportValidator;

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
        validateCourseSourceLink(record);

        OsgStudent student = requireManagedStudent(record.getStudentId(), record.getMentorId());
        record.setStudentName(student.getStudentName());
        record.setCourseSource("clerk");
        classReportValidator.validateSubmit(record, record.getMentorId(), OsgClassReportValidator.END_LEAD_MENTOR);
        normalizeCreateDefaults(record);
        if (classRecordMapper.insertMentorClassRecord(record) <= 0)
        {
            throw new ServiceException("课程记录提交失败");
        }
        return toLeadMentorCreatePayload(record);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> createAssistantClassRecord(OsgClassRecord record)
    {
        validateLeadMentorCreate(record);
        validateCourseSourceLink(record);

        OsgStudent student = requireAssistantOwnedStudent(record.getStudentId(), record.getMentorId());
        record.setStudentName(student.getStudentName());
        record.setCourseSource("assistant");
        classReportValidator.validateSubmit(record, record.getMentorId(), OsgClassReportValidator.END_ASSISTANT);
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
        if (record != null && record.getStudentId() != null
            && (record.getStudentName() == null || record.getStudentName().isBlank()))
        {
            OsgStudent student = studentMapper.selectStudentByStudentId(record.getStudentId());
            if (student == null)
            {
                throw new ServiceException("学员不存在");
            }
            record.setStudentName(student.getStudentName());
        }
        if (record != null && (record.getCourseSource() == null || record.getCourseSource().isBlank()))
        {
            record.setCourseSource("mentor");
        }
        validateCourseSourceLink(record);
        classReportValidator.validateSubmit(record, record.getMentorId(), OsgClassReportValidator.END_MENTOR);
        normalizeCreateDefaults(record);
        return classRecordMapper.insertMentorClassRecord(record);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int updateMentorClassRecord(OsgClassRecord record)
    {
        return classRecordMapper.updateMentorClassRecord(record);
    }

    // ====================================================================
    // S-055 §3.1 / §3.3 课消上报共用接口实现：listReportableStudents / listReferenceCandidates
    // ====================================================================

    @Override
    public List<Map<String, Object>> listReportableStudents(Long currentUserId, String end)
    {
        if (currentUserId == null)
        {
            return Collections.emptyList();
        }
        String normalizedEnd = end == null ? "" : end.trim();
        if (!OsgClassReportValidator.END_MENTOR.equalsIgnoreCase(normalizedEnd)
            && !OsgClassReportValidator.END_LEAD_MENTOR.equalsIgnoreCase(normalizedEnd)
            && !OsgClassReportValidator.END_ASSISTANT.equalsIgnoreCase(normalizedEnd))
        {
            throw new ServiceException("Unsupported class report end");
        }

        Set<Long> studentIds = collectReportableStudentIds(currentUserId, normalizedEnd);
        if (studentIds.isEmpty())
        {
            return Collections.emptyList();
        }
        List<OsgStudent> students = studentMapper.selectStudentByStudentIds(new ArrayList<>(studentIds));
        if (students == null || students.isEmpty())
        {
            return Collections.emptyList();
        }
        return students.stream()
            .filter(s -> s.getStudentId() != null)
            .sorted((a, b) -> {
                String an = a.getStudentName() == null ? "" : a.getStudentName();
                String bn = b.getStudentName() == null ? "" : b.getStudentName();
                return an.compareTo(bn);
            })
            .map(s -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("studentId", s.getStudentId());
                m.put("studentName", s.getStudentName());
                m.put("id", s.getStudentId());
                m.put("label", s.getStudentName());
                return m;
            })
            .collect(Collectors.toList());
    }

    /**
     * 计算 currentUserId 在指定 end 下可上报的 studentId 集合（DISTINCT）。
     */
    private Set<Long> collectReportableStudentIds(Long currentUserId, String end)
    {
        Set<Long> studentIds = new java.util.LinkedHashSet<>();
        if (OsgClassReportValidator.END_MENTOR.equalsIgnoreCase(end))
        {
            // mentor: osg_coaching.mentor_ids 含 currentUserId  ∪  osg_mock_practice.mentor_ids 含 currentUserId
            List<OsgCoaching> coachings = coachingMapper.selectCoachingList(new OsgCoaching());
            if (coachings != null)
            {
                for (OsgCoaching c : coachings)
                {
                    if (c.getStudentId() != null && isUserInCsv(c.getMentorIds(), currentUserId))
                    {
                        studentIds.add(c.getStudentId());
                    }
                }
            }
            List<OsgMockPractice> practices = mockPracticeMapper.selectMockPracticeList(new OsgMockPractice());
            if (practices != null)
            {
                for (OsgMockPractice p : practices)
                {
                    if (p.getStudentId() != null && isUserInCsv(p.getMentorIds(), currentUserId))
                    {
                        studentIds.add(p.getStudentId());
                    }
                }
            }
        }
        else if (OsgClassReportValidator.END_LEAD_MENTOR.equalsIgnoreCase(end))
        {
            // lead-mentor: osg_job_application.lead_mentor_id=currentUserId  ∪  coaching.mentor_ids 含 currentUserId  ∪  student.lead_mentor_id/lead_mentor_ids
            List<OsgJobApplication> apps = jobApplicationMapper.selectJobApplicationList(new OsgJobApplication());
            if (apps != null)
            {
                for (OsgJobApplication a : apps)
                {
                    if (a.getStudentId() != null && Objects.equals(a.getLeadMentorId(), currentUserId))
                    {
                        studentIds.add(a.getStudentId());
                    }
                }
            }
            List<OsgCoaching> coachings = coachingMapper.selectCoachingList(new OsgCoaching());
            if (coachings != null)
            {
                for (OsgCoaching c : coachings)
                {
                    if (c.getStudentId() != null && isUserInCsv(c.getMentorIds(), currentUserId))
                    {
                        studentIds.add(c.getStudentId());
                    }
                }
            }
            List<OsgStudent> all = studentMapper.selectStudentList(new OsgStudent());
            if (all != null)
            {
                for (OsgStudent s : all)
                {
                    if (s.getStudentId() == null) continue;
                    if (Objects.equals(s.getLeadMentorId(), currentUserId)
                        || isUserInCsv(s.getLeadMentorIds(), currentUserId))
                    {
                        studentIds.add(s.getStudentId());
                    }
                }
            }
        }
        else
        {
            // assistant: osg_student.assistant_id=currentUserId  ∪  FIND_IN_SET(currentUserId, assistant_ids)
            List<OsgStudent> all = studentMapper.selectStudentList(new OsgStudent());
            if (all != null)
            {
                for (OsgStudent s : all)
                {
                    if (s.getStudentId() == null) continue;
                    if (Objects.equals(s.getAssistantId(), currentUserId)
                        || isUserInCsv(s.getAssistantIds(), currentUserId))
                    {
                        studentIds.add(s.getStudentId());
                    }
                }
            }
        }
        return studentIds;
    }

    @Override
    public List<Map<String, Object>> listReferenceCandidates(Long currentUserId, String end, Long studentId, String refType)
    {
        if (currentUserId == null || studentId == null || refType == null || refType.isBlank())
        {
            return Collections.emptyList();
        }
        String normalizedEnd = end == null ? "" : end.trim();
        if (!OsgClassReportValidator.END_MENTOR.equalsIgnoreCase(normalizedEnd)
            && !OsgClassReportValidator.END_LEAD_MENTOR.equalsIgnoreCase(normalizedEnd)
            && !OsgClassReportValidator.END_ASSISTANT.equalsIgnoreCase(normalizedEnd))
        {
            throw new ServiceException("Unsupported class report end");
        }

        // 跨学员防护：studentId 必须在当前 end 可上报范围内，否则返回 []
        Set<Long> reportable = collectReportableStudentIds(currentUserId, normalizedEnd);
        if (!reportable.contains(studentId))
        {
            return Collections.emptyList();
        }

        String type = refType.trim();
        if (OsgClassReportConstants.REFERENCE_TYPE_JOB_COACHING.equals(type))
        {
            return buildJobCoachingCandidates(currentUserId, normalizedEnd, studentId);
        }
        if (OsgClassReportConstants.REFERENCE_TYPE_APPLICATION.equals(type))
        {
            // 兼容路径：旧前端仍可能传 reference_type=application；保留直到全链路切换完成。
            return buildApplicationCandidates(currentUserId, normalizedEnd, studentId);
        }
        if (OsgClassReportConstants.REFERENCE_TYPE_MOCK_INTERVIEW.equals(type)
            || OsgClassReportConstants.REFERENCE_TYPE_RELATION_TEST.equals(type)
            || OsgClassReportConstants.REFERENCE_TYPE_COMMUNICATION_TEST.equals(type))
        {
            return buildMockPracticeCandidates(currentUserId, normalizedEnd, studentId, type);
        }
        // base_course / 其它：无候选
        return Collections.emptyList();
    }

    private List<Map<String, Object>> buildApplicationCandidates(Long currentUserId, String end, Long studentId)
    {
        List<OsgJobApplication> apps = jobApplicationMapper.selectByStudentIds(List.of(studentId));
        if (apps == null || apps.isEmpty())
        {
            return Collections.emptyList();
        }
        // 按 end 过滤当前用户被分配
        List<OsgJobApplication> visible = new ArrayList<>();
        for (OsgJobApplication a : apps)
        {
            if (a.getApplicationId() == null) continue;
            boolean assigned;
            if (OsgClassReportValidator.END_MENTOR.equalsIgnoreCase(end))
            {
                OsgCoaching c = coachingMapper.selectCoachingByApplicationId(a.getApplicationId());
                assigned = c != null && isUserInCsv(c.getMentorIds(), currentUserId);
            }
            else if (OsgClassReportValidator.END_LEAD_MENTOR.equalsIgnoreCase(end))
            {
                assigned = Objects.equals(a.getLeadMentorId(), currentUserId);
            }
            else
            {
                // assistant: studentId 已通过上层 reportable 校验即可
                assigned = true;
            }
            if (assigned)
            {
                visible.add(a);
            }
        }
        // 时间降序：按 interviewTime, 兜底 submittedAt
        visible.sort((x, y) -> {
            Date xt = x.getInterviewTime() != null ? x.getInterviewTime() : x.getSubmittedAt();
            Date yt = y.getInterviewTime() != null ? y.getInterviewTime() : y.getSubmittedAt();
            if (xt == null && yt == null) return 0;
            if (xt == null) return 1;
            if (yt == null) return -1;
            return yt.compareTo(xt);
        });
        // 去重 + 拼装
        Set<Long> seen = new java.util.HashSet<>();
        List<Map<String, Object>> result = new ArrayList<>();
        for (OsgJobApplication a : visible)
        {
            if (!seen.add(a.getApplicationId())) continue;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("referenceType", OsgClassReportConstants.REFERENCE_TYPE_APPLICATION);
            m.put("referenceId", a.getApplicationId());
            m.put("id", a.getApplicationId());
            m.put("label", buildApplicationLabel(a));
            Map<String, Object> raw = new LinkedHashMap<>();
            raw.put("applicationId", a.getApplicationId());
            raw.put("companyName", a.getCompanyName());
            raw.put("positionName", a.getPositionName());
            raw.put("currentStage", a.getCurrentStage());
            raw.put("interviewTime", a.getInterviewTime());
            m.put("raw", raw);
            result.add(m);
        }
        return result;
    }

    private List<Map<String, Object>> buildMockPracticeCandidates(Long currentUserId, String end, Long studentId, String refType)
    {
        // refType 与 practice_type 一致
        OsgMockPractice query = new OsgMockPractice();
        query.setStudentId(studentId);
        query.setPracticeType(refType);
        List<OsgMockPractice> practices = mockPracticeMapper.selectMockPracticeList(query);
        if (practices == null || practices.isEmpty())
        {
            return Collections.emptyList();
        }
        List<OsgMockPractice> visible = new ArrayList<>();
        for (OsgMockPractice p : practices)
        {
            if (p.getPracticeId() == null) continue;
            if (!Objects.equals(p.getStudentId(), studentId)) continue;
            if (!refType.equals(p.getPracticeType())) continue;
            boolean assigned;
            if (OsgClassReportValidator.END_MENTOR.equalsIgnoreCase(end))
            {
                assigned = isUserInCsv(p.getMentorIds(), currentUserId);
            }
            else
            {
                // lead-mentor / assistant：studentId 已经通过 reportable 校验
                assigned = true;
            }
            if (assigned)
            {
                visible.add(p);
            }
        }
        visible.sort((x, y) -> {
            Date xt = x.getSubmittedAt() != null ? x.getSubmittedAt() : x.getScheduledAt();
            Date yt = y.getSubmittedAt() != null ? y.getSubmittedAt() : y.getScheduledAt();
            if (xt == null && yt == null) return 0;
            if (xt == null) return 1;
            if (yt == null) return -1;
            return yt.compareTo(xt);
        });
        Set<Long> seen = new java.util.HashSet<>();
        List<Map<String, Object>> result = new ArrayList<>();
        for (OsgMockPractice p : visible)
        {
            if (!seen.add(p.getPracticeId())) continue;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("referenceType", refType);
            m.put("referenceId", p.getPracticeId());
            m.put("id", p.getPracticeId());
            m.put("label", buildMockPracticeLabel(p));
            Map<String, Object> raw = new LinkedHashMap<>();
            raw.put("practiceId", p.getPracticeId());
            raw.put("practiceType", p.getPracticeType());
            raw.put("submittedAt", p.getSubmittedAt());
            raw.put("status", p.getStatus());
            m.put("raw", raw);
            result.add(m);
        }
        return result;
    }

    private String buildApplicationLabel(OsgJobApplication a)
    {
        String company = nullToDash(a.getCompanyName());
        String pos = nullToDash(a.getPositionName());
        String stage = nullToDash(a.getCurrentStage());
        String interview = a.getInterviewTime() == null ? "-" : a.getInterviewTime().toString();
        return company + " / " + pos + " / " + stage + " / " + interview;
    }

    /**
     * Fix 4：job_coaching reference 候选构建。
     * 行维度 = osg_coaching（一个 application 可有多条），label 含公司/岗位/阶段/面试时间。
     * 阶段优先用 coaching.interview_stage，回退到 application.current_stage。
     * 面试时间优先用 coaching.interview_time，回退到 application.interview_time。
     */
    private List<Map<String, Object>> buildJobCoachingCandidates(Long currentUserId, String end, Long studentId)
    {
        OsgCoaching query = new OsgCoaching();
        query.setStudentId(studentId);
        List<OsgCoaching> coachings = coachingMapper.selectCoachingList(query);
        if (coachings == null || coachings.isEmpty())
        {
            return Collections.emptyList();
        }
        List<OsgCoaching> visible = new ArrayList<>();
        for (OsgCoaching c : coachings)
        {
            if (c.getCoachingId() == null) continue;
            if (!Objects.equals(c.getStudentId(), studentId)) continue;
            boolean assigned;
            if (OsgClassReportValidator.END_MENTOR.equalsIgnoreCase(end))
            {
                assigned = isUserInCsv(c.getMentorIds(), currentUserId);
            }
            else if (OsgClassReportValidator.END_LEAD_MENTOR.equalsIgnoreCase(end))
            {
                OsgJobApplication app = c.getApplicationId() == null
                    ? null
                    : jobApplicationMapper.selectJobApplicationByApplicationId(c.getApplicationId());
                assigned = app != null && Objects.equals(app.getLeadMentorId(), currentUserId);
            }
            else
            {
                // assistant：studentId 已通过 reportable 校验
                assigned = true;
            }
            if (assigned)
            {
                visible.add(c);
            }
        }
        // 按 coaching 自身 interview_time 倒序，回退到 coaching_id 倒序
        visible.sort((x, y) -> {
            Date xt = x.getInterviewTime();
            Date yt = y.getInterviewTime();
            if (xt != null && yt != null) return yt.compareTo(xt);
            if (xt == null && yt == null) return Long.compare(
                y.getCoachingId() == null ? 0L : y.getCoachingId(),
                x.getCoachingId() == null ? 0L : x.getCoachingId());
            if (xt == null) return 1;
            return -1;
        });
        Set<Long> seen = new java.util.HashSet<>();
        List<Map<String, Object>> result = new ArrayList<>();
        for (OsgCoaching c : visible)
        {
            if (!seen.add(c.getCoachingId())) continue;
            OsgJobApplication app = c.getApplicationId() == null
                ? null
                : jobApplicationMapper.selectJobApplicationByApplicationId(c.getApplicationId());
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("referenceType", OsgClassReportConstants.REFERENCE_TYPE_JOB_COACHING);
            m.put("referenceId", c.getCoachingId());
            m.put("id", c.getCoachingId());
            m.put("label", buildJobCoachingLabel(c, app));
            Map<String, Object> raw = new LinkedHashMap<>();
            raw.put("coachingId", c.getCoachingId());
            raw.put("applicationId", c.getApplicationId());
            raw.put("companyName", app == null ? null : app.getCompanyName());
            raw.put("positionName", app == null ? null : app.getPositionName());
            raw.put("currentStage", c.getInterviewStage() != null
                ? c.getInterviewStage()
                : (app == null ? null : app.getCurrentStage()));
            raw.put("interviewTime", c.getInterviewTime() != null
                ? c.getInterviewTime()
                : (app == null ? null : app.getInterviewTime()));
            m.put("raw", raw);
            result.add(m);
        }
        return result;
    }

    private String buildJobCoachingLabel(OsgCoaching c, OsgJobApplication app)
    {
        String company = nullToDash(app == null ? null : app.getCompanyName());
        String pos = nullToDash(app == null ? null : app.getPositionName());
        String stage = nullToDash(c.getInterviewStage() != null
            ? c.getInterviewStage()
            : (app == null ? null : app.getCurrentStage()));
        Date when = c.getInterviewTime() != null
            ? c.getInterviewTime()
            : (app == null ? null : app.getInterviewTime());
        String interview = when == null ? "-" : when.toString();
        return company + " / " + pos + " / " + stage + " / " + interview;
    }

    private String buildMockPracticeLabel(OsgMockPractice p)
    {
        String type = nullToDash(p.getPracticeType());
        String submitted = p.getSubmittedAt() == null ? "-" : p.getSubmittedAt().toString();
        String status = nullToDash(p.getStatus());
        return type + " / " + submitted + " / " + status;
    }

    private String nullToDash(String s)
    {
        return (s == null || s.isBlank()) ? "-" : s;
    }


    public List<Map<String, Object>> selectClassRecordList(String keyword)
    {
        return selectClassRecordList(keyword, null, null, null, null, null, null);
    }

    public List<Map<String, Object>> selectClassRecordList(String keyword,
                                                           String courseType,
                                                           String classStatus,
                                                           String courseSource,
                                                           String tab,
                                                           Date classDateStart,
                                                           Date classDateEnd)
    {
        List<OsgClassRecord> rows = selectRows(keyword, courseType, classStatus, courseSource, tab, classDateStart, classDateEnd);
        if (rows.isEmpty())
        {
            return Collections.emptyList();
        }

        Map<Long, BigDecimal> hourlyRates = loadHourlyRates(rows);
        return mapPreservingPage(rows, row -> toClassRecordPayload(row, hourlyRates));
    }

    public List<Map<String, Object>> selectClassRecordExportList(String keyword,
                                                                 String courseType,
                                                                 String classStatus,
                                                                 String courseSource,
                                                                 String tab,
                                                                 Date classDateStart,
                                                                 Date classDateEnd)
    {
        List<OsgClassRecord> rows = selectRows(keyword, courseType, classStatus, courseSource, tab, classDateStart, classDateEnd);
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

    public List<Map<String, Object>> selectAssistantClassRecordList(String keyword, Long assistantUserId)
    {
        return selectAssistantClassRecordList(keyword, null, null, null, null, null, null, assistantUserId, null);
    }

    public List<Map<String, Object>> selectAssistantClassRecordList(String keyword,
                                                                    String courseType,
                                                                    String classStatus,
                                                                    String courseSource,
                                                                    String tab,
                                                                    Date classDateStart,
                                                                    Date classDateEnd,
                                                                    Long assistantUserId)
    {
        return selectAssistantClassRecordList(keyword, courseType, classStatus, courseSource, tab, classDateStart, classDateEnd, assistantUserId, null);
    }

    public List<Map<String, Object>> selectAssistantClassRecordList(String keyword,
                                                                    String courseType,
                                                                    String classStatus,
                                                                    String courseSource,
                                                                    String tab,
                                                                    Date classDateStart,
                                                                    Date classDateEnd,
                                                                    Long assistantUserId,
                                                                    String scope)
    {
        List<OsgClassRecord> rows = filterByScope(
            selectRows(keyword, courseType, classStatus, courseSource, tab, classDateStart, classDateEnd),
            scope, assistantUserId
        );
        if (rows.isEmpty())
        {
            return Collections.emptyList();
        }

        Map<Long, BigDecimal> hourlyRates = loadHourlyRates(rows);
        return mapPreservingPage(rows, row -> toClassRecordPayload(row, hourlyRates));
    }

    public Map<String, Object> selectClassRecordStats(String keyword)
    {
        return selectClassRecordStats(keyword, null, null, null, null, null, null);
    }

    public Map<String, Object> selectClassRecordStats(String keyword,
                                                      String courseType,
                                                      String classStatus,
                                                      String courseSource,
                                                      String tab,
                                                      Date classDateStart,
                                                      Date classDateEnd)
    {
        List<OsgClassRecord> rows = selectRows(keyword, courseType, classStatus, courseSource, tab, classDateStart, classDateEnd);
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

    public Map<String, Object> selectAssistantClassRecordStats(String keyword, Long assistantUserId)
    {
        return selectAssistantClassRecordStats(keyword, null, null, null, null, null, null, assistantUserId, null);
    }

    public Map<String, Object> selectAssistantClassRecordStats(String keyword,
                                                               String courseType,
                                                               String classStatus,
                                                               String courseSource,
                                                               String tab,
                                                               Date classDateStart,
                                                               Date classDateEnd,
                                                               Long assistantUserId)
    {
        return selectAssistantClassRecordStats(keyword, courseType, classStatus, courseSource, tab, classDateStart, classDateEnd, assistantUserId, null);
    }

    public Map<String, Object> selectAssistantClassRecordStats(String keyword,
                                                               String courseType,
                                                               String classStatus,
                                                               String courseSource,
                                                               String tab,
                                                               Date classDateStart,
                                                               Date classDateEnd,
                                                               Long assistantUserId,
                                                               String scope)
    {
        List<OsgClassRecord> allRows = selectRows(keyword, courseType, classStatus, courseSource, tab, classDateStart, classDateEnd);
        List<OsgClassRecord> rows = filterByScope(allRows, scope, assistantUserId);
        Map<Long, BigDecimal> hourlyRates = loadHourlyRates(rows);
        BigDecimal pendingSettlementAmount = rows.stream()
            .filter(row -> Objects.equals(normalizeReviewStatus(row.getStatus()), STATUS_PENDING))
            .map(row -> resolveCourseFee(row, hourlyRates))
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(1, RoundingMode.HALF_UP);

        int mineCount = filterByScope(allRows, "mine", assistantUserId).size();
        int managedCount = filterAssistantOwnedRows(allRows, assistantUserId).size();

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalCount", rows.size());
        summary.put("pendingCount", countByStatus(rows, STATUS_PENDING));
        summary.put("approvedCount", countByStatus(rows, STATUS_APPROVED));
        summary.put("rejectedCount", countByStatus(rows, STATUS_REJECTED));
        summary.put("pendingSettlementAmount", pendingSettlementAmount.toPlainString());
        summary.put("mineCount", mineCount);
        summary.put("managedCount", managedCount);
        summary.put("flowSteps", List.of(
            "学员申请岗位/模拟应聘",
            "班主任分配导师",
            "导师上课并申报记录",
            "后台审核",
            "结算中心转账"
        ));
        return summary;
    }

    public List<Map<String, Object>> selectLeadMentorClassRecordList(String keyword,
                                                                    String courseType,
                                                                    String classStatus,
                                                                    String courseSource,
                                                                    String tab,
                                                                    Date classDateStart,
                                                                    Date classDateEnd,
                                                                    Long leadMentorUserId)
    {
        return selectLeadMentorClassRecordList(keyword, courseType, classStatus, courseSource,
            tab, classDateStart, classDateEnd, leadMentorUserId, null);
    }

    public List<Map<String, Object>> selectLeadMentorClassRecordList(String keyword,
                                                                    String courseType,
                                                                    String classStatus,
                                                                    String courseSource,
                                                                    String tab,
                                                                    Date classDateStart,
                                                                    Date classDateEnd,
                                                                    Long leadMentorUserId,
                                                                    String scope)
    {
        List<OsgClassRecord> rows = filterByLeadMentorScope(
            selectRows(keyword, courseType, classStatus, courseSource, tab, classDateStart, classDateEnd),
            scope, leadMentorUserId
        );
        if (rows.isEmpty())
        {
            return Collections.emptyList();
        }

        Map<Long, BigDecimal> hourlyRates = loadHourlyRates(rows);
        return mapPreservingPage(rows, row -> toClassRecordPayload(row, hourlyRates));
    }

    public Map<String, Object> selectLeadMentorClassRecordStats(String keyword,
                                                                String courseType,
                                                                String classStatus,
                                                                String courseSource,
                                                                String tab,
                                                                Date classDateStart,
                                                                Date classDateEnd,
                                                                Long leadMentorUserId)
    {
        return selectLeadMentorClassRecordStats(keyword, courseType, classStatus, courseSource,
            tab, classDateStart, classDateEnd, leadMentorUserId, null);
    }

    public Map<String, Object> selectLeadMentorClassRecordStats(String keyword,
                                                                String courseType,
                                                                String classStatus,
                                                                String courseSource,
                                                                String tab,
                                                                Date classDateStart,
                                                                Date classDateEnd,
                                                                Long leadMentorUserId,
                                                                String scope)
    {
        List<OsgClassRecord> allRows = selectRows(keyword, courseType, classStatus, courseSource, tab, classDateStart, classDateEnd);
        List<OsgClassRecord> rows = filterByLeadMentorScope(allRows, scope, leadMentorUserId);
        Map<Long, BigDecimal> hourlyRates = loadHourlyRates(rows);
        BigDecimal pendingSettlementAmount = rows.stream()
            .filter(row -> Objects.equals(normalizeReviewStatus(row.getStatus()), STATUS_PENDING))
            .map(row -> resolveCourseFee(row, hourlyRates))
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(1, RoundingMode.HALF_UP);

        int mineCount = filterByLeadMentorScope(allRows, "mine", leadMentorUserId).size();
        int managedCount = filterLeadMentorOwnedRows(allRows, leadMentorUserId).size();

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalCount", rows.size());
        summary.put("pendingCount", countByStatus(rows, STATUS_PENDING));
        summary.put("approvedCount", countByStatus(rows, STATUS_APPROVED));
        summary.put("rejectedCount", countByStatus(rows, STATUS_REJECTED));
        summary.put("pendingSettlementAmount", pendingSettlementAmount.toPlainString());
        summary.put("mineCount", mineCount);
        summary.put("managedCount", managedCount);
        summary.put("flowSteps", List.of(
            "学员申请岗位/模拟应聘",
            "班主任分配导师",
            "导师上课并申报记录",
            "后台审核",
            "结算中心转账"
        ));
        return summary;
    }

    private List<OsgClassRecord> filterByLeadMentorScope(List<OsgClassRecord> rows, String scope, Long leadMentorUserId)
    {
        if ("mine".equals(scope))
        {
            if (leadMentorUserId == null || rows == null || rows.isEmpty())
            {
                return Collections.emptyList();
            }
            return rows.stream()
                .filter(row -> Objects.equals(row.getMentorId(), leadMentorUserId)
                    && "clerk".equals(row.getCourseSource()))
                .toList();
        }
        return filterLeadMentorOwnedRows(rows, leadMentorUserId);
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
        Map<Long, BigDecimal> hourlyRates = loadHourlyRates(rows);
        int pendingReviewCount = countByStatus(selectRows(keyword, courseType, courseSource, null), STATUS_PENDING);
        for (OsgClassRecord row : rows)
        {
            result.add(toPayload(row, pendingReviewCount, hourlyRates));
        }
        return result;
    }

    @Override
    public Map<String, Object> selectReportDetail(Long recordId)
    {
        OsgClassRecord record = requireRecord(recordId);
        Map<Long, BigDecimal> hourlyRates = loadHourlyRates(List.of(record));
        return toPayload(record, null, hourlyRates);
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
        String reviewRemark = resolveReviewRemark(targetStatus, payload);
        record.setStatus(targetStatus);
        record.setReviewRemark(reviewRemark);
        record.setReviewedAt(new Timestamp(System.currentTimeMillis()));
        record.setUpdateBy(defaultText(operator, "system"));

        if (classRecordMapper.updateClassRecordReview(record) <= 0)
        {
            throw new ServiceException("课时审核更新失败");
        }
        // §A.1 审核通过时回写上游主链 completedHours / totalHours
        if (Objects.equals(targetStatus, STATUS_APPROVED))
        {
            writeBackToMainline(record);
        }
        Map<Long, BigDecimal> hourlyRates = loadHourlyRates(List.of(record));
        return toPayload(record, null, hourlyRates);
    }

    /**
     * §A.1 审核通过时回写上游主链：mock_practice.completed_hours / coaching.total_hours。
     * 用原子 SQL（COALESCE + +）规避并发竞态。事务在 reviewRecord 调用方持有，
     * 这里抛出异常会触发整个事务回滚。
     */
    private void writeBackToMainline(OsgClassRecord record)
    {
        if (record == null || record.getDurationHours() == null || record.getDurationHours() <= 0)
        {
            return;
        }
        Long practiceId = record.getPracticeId();
        Long applicationId = record.getApplicationId();
        if (practiceId == null && applicationId == null)
        {
            // 历史数据无关联：跳过回写（向前兼容；§F5 拒绝补刷历史）
            return;
        }
        if (practiceId != null)
        {
            int affected = mockPracticeMapper.incrementCompletedHours(practiceId, record.getDurationHours());
            if (affected <= 0)
            {
                throw new ServiceException("回写模拟应聘 completedHours 失败");
            }
        }
        else
        {
            BigDecimal duration = BigDecimal.valueOf(record.getDurationHours());
            int affected = coachingMapper.incrementTotalHours(applicationId, duration);
            if (affected <= 0)
            {
                throw new ServiceException("回写辅导记录 totalHours 失败");
            }
        }
    }

    private String resolveReviewRemark(String targetStatus, Map<String, Object> payload)
    {
        String reviewRemark = firstText(payload == null ? null : payload.get("remark"));
        if (reviewRemark == null || reviewRemark.isBlank())
        {
            reviewRemark = firstText(payload == null ? null : payload.get("rejectReason"));
        }
        if (reviewRemark == null || reviewRemark.isBlank())
        {
            reviewRemark = firstText(payload == null ? null : payload.get("reason"));
        }
        if (Objects.equals(targetStatus, STATUS_REJECTED) && (reviewRemark == null || reviewRemark.isBlank()))
        {
            throw new ServiceException("驳回原因不能为空");
        }
        return reviewRemark;
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
        return selectRows(keyword, courseType, null, courseSource, tab, null, null);
    }

    private List<OsgClassRecord> selectRows(String keyword,
                                            String courseType,
                                            String classStatus,
                                            String courseSource,
                                            String tab,
                                            Date classDateStart,
                                            Date classDateEnd)
    {
        OsgClassRecord query = new OsgClassRecord();
        query.setKeyword(keyword);
        query.setCourseType(normalizeCourseTypeFilter(courseType));
        query.setClassStatus(normalizeClassStatusFilter(classStatus));
        query.setCourseSource(normalizeCourseSourceFilter(courseSource));
        query.setTab(normalizeTab(tab));
        query.setClassDateStart(normalizeClassDateStart(classDateStart));
        query.setClassDateEnd(normalizeClassDateEnd(classDateEnd));
        List<OsgClassRecord> rows = classRecordMapper.selectClassRecordList(query);
        return rows == null ? Collections.emptyList() : rows;
    }

    private List<OsgClassRecord> filterAssistantOwnedRows(List<OsgClassRecord> rows, Long assistantUserId)
    {
        if (assistantUserId == null || rows == null || rows.isEmpty())
        {
            return Collections.emptyList();
        }

        List<Long> studentIds = rows.stream()
            .map(OsgClassRecord::getStudentId)
            .filter(Objects::nonNull)
            .distinct()
            .toList();
        if (studentIds.isEmpty())
        {
            return Collections.emptyList();
        }

        List<OsgStudent> students = studentMapper.selectStudentByStudentIds(studentIds);
        if (students == null || students.isEmpty())
        {
            return Collections.emptyList();
        }

        Set<Long> scopedStudentIds = students.stream()
            .filter(student -> Objects.equals(student.getAssistantId(), assistantUserId))
            .map(OsgStudent::getStudentId)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());
        if (scopedStudentIds.isEmpty())
        {
            return Collections.emptyList();
        }

        return rows.stream()
            .filter(row -> scopedStudentIds.contains(row.getStudentId()))
            .toList();
    }

    private List<OsgClassRecord> filterLeadMentorOwnedRows(List<OsgClassRecord> rows, Long leadMentorUserId)
    {
        if (leadMentorUserId == null || rows == null || rows.isEmpty())
        {
            return Collections.emptyList();
        }

        List<Long> studentIds = rows.stream()
            .map(OsgClassRecord::getStudentId)
            .filter(Objects::nonNull)
            .distinct()
            .toList();
        if (studentIds.isEmpty())
        {
            return Collections.emptyList();
        }

        List<OsgStudent> students = studentMapper.selectStudentByStudentIds(studentIds);
        if (students == null || students.isEmpty())
        {
            return Collections.emptyList();
        }

        Set<Long> scopedStudentIds = students.stream()
            .filter(student -> Objects.equals(student.getLeadMentorId(), leadMentorUserId))
            .map(OsgStudent::getStudentId)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());
        if (scopedStudentIds.isEmpty())
        {
            return Collections.emptyList();
        }

        return rows.stream()
            .filter(row -> scopedStudentIds.contains(row.getStudentId()))
            .toList();
    }

    private List<OsgClassRecord> filterByScope(List<OsgClassRecord> rows, String scope, Long assistantUserId)
    {
        if ("mine".equals(scope))
        {
            if (assistantUserId == null || rows == null || rows.isEmpty())
            {
                return Collections.emptyList();
            }
            return rows.stream()
                .filter(row -> Objects.equals(row.getMentorId(), assistantUserId)
                    && "assistant".equals(row.getCourseSource()))
                .toList();
        }
        return filterAssistantOwnedRows(rows, assistantUserId);
    }

    /**
     * §A.0.2 检验课时记录与上游主链（模拟应聘 / 真实岗位申请）的关联。
     * 向后兼容：practiceId 与 applicationId 都为 null 时跳过校验（§A.0.4 前端表单上线后
     * 应强制传一个）。传了一个以后才走：二选一 + studentId 一致性 + mentor_ids CSV 权限。
     */
    private void validateCourseSourceLink(OsgClassRecord record)
    {
        if (record == null)
        {
            return;
        }
        Long practiceId = record.getPracticeId();
        Long applicationId = record.getApplicationId();
        if (practiceId == null && applicationId == null)
        {
            // 向后兼容：现有前端未传该字段时不报错；A.0.4 上线后由前端强制
            return;
        }
        if (practiceId != null && applicationId != null)
        {
            throw new ServiceException("practiceId 与 applicationId 不能同时填写，二选一");
        }
        Long currentMentorId = record.getMentorId();
        Long studentIdInRecord = record.getStudentId();
        if (practiceId != null)
        {
            OsgMockPractice practice = mockPracticeMapper.selectMockPracticeByPracticeId(practiceId);
            if (practice == null)
            {
                throw new ServiceException("模拟应聘记录不存在");
            }
            if (studentIdInRecord != null && !Objects.equals(practice.getStudentId(), studentIdInRecord))
            {
                throw new ServiceException("课时记录的学员与模拟应聘学员不一致");
            }
            if (!isUserInCsv(practice.getMentorIds(), currentMentorId))
            {
                throw new ServiceException("无权为该模拟应聘提交课时记录");
            }
        }
        else
        {
            OsgCoaching coaching = coachingMapper.selectCoachingByApplicationId(applicationId);
            if (coaching == null)
            {
                throw new ServiceException("辅导记录不存在");
            }
            if (studentIdInRecord != null && !Objects.equals(coaching.getStudentId(), studentIdInRecord))
            {
                throw new ServiceException("课时记录的学员与辅导申请学员不一致");
            }
            if (!isUserInCsv(coaching.getMentorIds(), currentMentorId))
            {
                throw new ServiceException("无权为该辅导申请提交课时记录");
            }
        }
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
        if (record.getClassStatus() == null || record.getClassStatus().isBlank())
        {
            throw new ServiceException("课程内容不能为空");
        }
        // absent(旷课) 场景：学员未到场，无 courseType/durationHours/feedbackContent 可言
        boolean isAbsent = "absent".equalsIgnoreCase(record.getClassStatus());
        if (!isAbsent)
        {
            if (record.getDurationHours() == null || record.getDurationHours() <= 0)
            {
                throw new ServiceException("学习时长不能为空");
            }
            if (record.getCourseType() == null || record.getCourseType().isBlank())
            {
                throw new ServiceException("课程类型不能为空");
            }
            if (record.getFeedbackContent() == null || record.getFeedbackContent().isBlank())
            {
                throw new ServiceException("课程反馈不能为空");
            }
        }
        validateStudentAccountForClassRecord(record.getStudentId());
    }

    /**
     * 学员账号状态守卫：
     * - account_status=1（冻结）→ 抛 class_record.student.frozen
     * - account_status=3（退费）→ 抛 class_record.student.refunded
     * - 其他（0/2/黑名单）→ 通过（合同结束/黑名单不拦申报）
     *
     * 由 lead-mentor 与 assistant 申报路径共用（assistant 也走 validateLeadMentorCreate）。
     */
    private void validateStudentAccountForClassRecord(Long studentId)
    {
        OsgStudent student = studentMapper.selectStudentByStudentId(studentId);
        if (student == null)
        {
            throw new ServiceException("学员不存在");
        }
        String accountStatus = student.getAccountStatus();
        if ("1".equals(accountStatus))
        {
            throw new ServiceException(MessageUtils.message("class_record.student.frozen"));
        }
        if ("3".equals(accountStatus))
        {
            throw new ServiceException(MessageUtils.message("class_record.student.refunded"));
        }
    }

    private void normalizeCreateDefaults(OsgClassRecord record)
    {
        record.setStatus(STATUS_PENDING);
        record.setReviewRemark(null);
        record.setReviewedAt(null);
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
        // absent 记录：事实上不存在的字段必须 NULL 化（防御性，不信任前端）
        if ("absent".equalsIgnoreCase(record.getClassStatus()))
        {
            record.setCourseType(null);
            record.setDurationHours(null);
            record.setFeedbackContent(null);
            record.setTopics(null);
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

    private OsgStudent requireAssistantOwnedStudent(Long studentId, Long assistantUserId)
    {
        OsgStudent student = studentMapper.selectStudentByStudentId(studentId);
        if (student == null)
        {
            throw new ServiceException("学员不存在");
        }
        if (assistantUserId == null || !Objects.equals(student.getAssistantId(), assistantUserId))
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

    private Map<String, Object> toPayload(OsgClassRecord row, Integer fallbackPendingReviewCount, Map<Long, BigDecimal> hourlyRates)
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
        if (hourlyRates != null)
        {
            payload.put("courseFee", resolveCourseFee(row, hourlyRates).toPlainString());
        }
        List<OsgClassRecordAttachment> attachments = attachmentMapper.selectByRecordId(row.getRecordId());
        if (attachments != null && !attachments.isEmpty())
        {
            List<Map<String, Object>> attList = new ArrayList<>();
            for (OsgClassRecordAttachment att : attachments)
            {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("attachmentId", att.getAttachmentId());
                m.put("fileName", att.getFileName());
                m.put("filePath", att.getFilePath());
                m.put("fileSize", att.getFileSize());
                m.put("fileType", att.getFileType());
                m.put("attachmentTag", att.getAttachmentTag());
                attList.add(m);
            }
            payload.put("attachments", attList);
        }
        else
        {
            payload.put("attachments", Collections.emptyList());
        }
        if (row.getStudentPositionId() != null)
        {
            OsgStudentPosition pos = studentPositionMapper.selectStudentPositionById(row.getStudentPositionId());
            if (pos != null && pos.getCompanyName() != null)
            {
                payload.put("coachingCompany", pos.getCompanyName());
            }
        }
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
        payload.put("classStatus", row.getClassStatus());
        payload.put("reporterRole", toReporterRoleLabel(row.getCourseSource()));
        payload.put("classDate", row.getClassDate());
        payload.put("durationHours", row.getDurationHours());
        payload.put("courseFee", resolveCourseFee(row, hourlyRates).toPlainString());
        payload.put("studentRating", row.getRate());
        payload.put("status", normalizeReviewStatus(row.getStatus()));
        payload.put("reviewRemark", row.getReviewRemark());
        payload.put("feedbackContent", row.getFeedbackContent());
        payload.put("comments", row.getComments());
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
        if (courseType == null || courseType.isBlank())
        {
            return null;
        }
        String normalized = courseType.trim().toLowerCase();
        if ("mock_practice".equals(normalized))
        {
            return "模拟应聘";
        }
        if ("basic_course".equals(normalized))
        {
            return "基础课程";
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
            case "technical" -> "技术的";
            case "behavioral" -> "行为训练";
            case "resume_update" -> "简历更新";
            case "mock_interview" -> "模拟面试的课程";
            case "networking_midterm" -> "人际关系的课程";
            case "mock_midterm" -> "模拟期中考试";
            case "case_prep" -> "咨询案例准备";
            case "other" -> "其他";
            case "absent" -> "旷课";
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

    private String normalizeCourseTypeFilter(String courseType)
    {
        String normalized = normalize(courseType);
        if (normalized == null || normalized.isBlank())
        {
            return null;
        }
        if ("mock_application".equals(normalized))
        {
            return "mock_practice";
        }
        return normalized;
    }

    private String normalizeClassStatusFilter(String classStatus)
    {
        String normalized = normalize(classStatus);
        if (normalized == null || normalized.isBlank())
        {
            return null;
        }
        return switch (normalized)
        {
            case "new_resume" -> "resume_revision";
            case "communication_midterm" -> "networking_midterm";
            case "midterm_exam" -> "mock_midterm";
            default -> normalized;
        };
    }

    private String normalizeCourseSourceFilter(String courseSource)
    {
        String normalized = normalize(courseSource);
        if (normalized == null || normalized.isBlank())
        {
            return null;
        }
        if ("headteacher".equals(normalized))
        {
            return "clerk";
        }
        return normalized;
    }

    private Date normalizeClassDateStart(Date classDateStart)
    {
        return classDateStart;
    }

    private Date normalizeClassDateEnd(Date classDateEnd)
    {
        if (classDateEnd == null)
        {
            return null;
        }
        return new Date(classDateEnd.getTime() + 24L * 60L * 60L * 1000L - 1L);
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

    /**
     * 映射 List 但保留 PageHelper 的 Page 元数据（total/pageNum/pageSize），避免 total 退化为当前页大小。
     */
    private static <S, T> List<T> mapPreservingPage(List<S> source, Function<S, T> mapper)
    {
        if (source instanceof Page<?>)
        {
            Page<?> srcPage = (Page<?>) source;
            Page<T> resultPage = new Page<>();
            resultPage.setPageNum(srcPage.getPageNum());
            resultPage.setPageSize(srcPage.getPageSize());
            resultPage.setTotal(srcPage.getTotal());
            for (S item : source) { resultPage.add(mapper.apply(item)); }
            return resultPage;
        }
        List<T> result = new ArrayList<>(source.size());
        for (S item : source) { result.add(mapper.apply(item)); }
        return result;
    }


    // ====================================================================
    // T-523: serializeFeedback — 按 courseType 路由解析 5 类 feedback DTO
    // ====================================================================

    /**
     * 按 courseType 路由解析 feedback JSON，校验 schemaVersion=1，并回写
     * {@link OsgClassRecord#setFeedbackContent(String)}。
     *
     * @param courseType  课程类型
     * @param feedbackMap 前端传入的 feedback JSON（Map 形式）
     * @param record      待回写的课消记录
     * @return 解析后的 feedback DTO（供调用方做进一步校验）
     */
    public Object serializeFeedback(String courseType, Map<String, Object> feedbackMap, OsgClassRecord record)
    {
        if (feedbackMap == null || feedbackMap.isEmpty())
        {
            return null;
        }
        String feedbackJson = JSON.toJSONString(feedbackMap);
        JSONObject feedbackObj = JSON.parseObject(feedbackJson);

        Integer schemaVersion = feedbackObj.getInteger("schemaVersion");
        if (schemaVersion == null)
        {
            throw new ServiceException("feedbackContent 缺少 schemaVersion 字段");
        }
        if (schemaVersion != 1)
        {
            throw new ServiceException("feedbackContent schemaVersion 必须为 1，当前值：" + schemaVersion);
        }

        Object dto;
        if (OsgClassReportConstants.COURSE_TYPE_JOB_COACHING.equals(courseType))
        {
            dto = feedbackObj.toJavaObject(JobCoachingFeedback.class);
        }
        else if (OsgClassReportConstants.COURSE_TYPE_MOCK_INTERVIEW.equals(courseType))
        {
            dto = feedbackObj.toJavaObject(MockInterviewFeedback.class);
        }
        else if (OsgClassReportConstants.COURSE_TYPE_RELATION_TEST.equals(courseType))
        {
            dto = feedbackObj.toJavaObject(RelationFeedback.class);
        }
        else if (OsgClassReportConstants.COURSE_TYPE_COMMUNICATION_TEST.equals(courseType))
        {
            dto = feedbackObj.toJavaObject(RelationFeedback.class);
        }
        else if (OsgClassReportConstants.COURSE_TYPE_BASE_COURSE.equals(courseType))
        {
            dto = feedbackObj.toJavaObject(BaseCourseFeedback.class);
        }
        else
        {
            throw new ServiceException("课程类型不支持 feedback 序列化：" + courseType);
        }

        record.setFeedbackContent(feedbackJson);
        return dto;
    }

}
