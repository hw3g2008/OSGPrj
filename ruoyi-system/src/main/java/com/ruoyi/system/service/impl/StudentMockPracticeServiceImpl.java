package com.ruoyi.system.service.impl;

import java.util.Date;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import com.ruoyi.common.core.domain.entity.SysDictData;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgMockPractice;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.OsgMockPracticeMapper;
import com.ruoyi.system.mapper.StudentJobPositionMapper;
import com.ruoyi.system.mapper.StudentMockPracticeMapper;
import com.ruoyi.system.mapper.SysDictDataMapper;
import com.ruoyi.system.service.IStudentMockPracticeService;

/**
 * 学生模拟应聘 / 课程申请服务实现
 */
@Service
public class StudentMockPracticeServiceImpl implements IStudentMockPracticeService
{
    private static final String DICT_TYPE_PAGE_COPY = "osg_student_mock_practice_page_copy";
    private static final String DICT_TYPE_PRACTICE_CARD = "osg_student_mock_practice_card";
    private static final String DICT_TYPE_PRACTICE_TYPE = "osg_student_mock_practice_type";
    private static final String DICT_TYPE_PRACTICE_STATUS = "osg_student_mock_practice_status";
    private static final String DICT_TYPE_PRACTICE_RANGE = "osg_student_mock_practice_range";
    private static final String DICT_TYPE_PRACTICE_MENTOR_COUNT = "osg_student_mock_practice_mentor_count";
    private static final String DICT_TYPE_REQUEST_COPY = "osg_student_mock_request_page_copy";
    private static final String DICT_TYPE_REQUEST_TAB = "osg_student_mock_request_tab";
    private static final String DICT_TYPE_REQUEST_TYPE = "osg_student_mock_request_type";
    private static final String DICT_TYPE_REQUEST_STATUS = "osg_student_mock_request_status";
    private static final String DICT_TYPE_COURSE_OPTION = "osg_student_mock_course_option";
    private static final String DICT_TYPE_JOB_STATUS = "osg_student_mock_job_status";

    private static final List<DictSeed> PAGE_COPY_SEEDS = List.of(
            new DictSeed(DICT_TYPE_PAGE_COPY, 1L, "应聘演练", "titleZh", null, null, "页面文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 2L, "Mock Practice", "titleEn", null, null, "页面文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 3L, "申请模拟面试、人际关系测试或期中考试", "subtitle", null, null, "页面文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 4L, "我的模拟应聘记录", "recordsTitle", null, null, "页面文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 5L, "搜索...", "practiceKeywordPlaceholder", null, null, "页面文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 6L, "全部类型", "practiceTypePlaceholder", null, null, "页面文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 7L, "全部状态", "practiceStatusPlaceholder", null, null, "页面文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 8L, "时间范围", "practiceRangePlaceholder", null, null, "页面文案"));

    private static final List<DictSeed> PRACTICE_CARD_SEEDS = List.of(
            new DictSeed(
                    DICT_TYPE_PRACTICE_CARD,
                    1L,
                    "模拟面试",
                    "mock",
                    "MI",
                    "linear-gradient(135deg, #7399C6, #9BB8D9)",
                    "与导师进行1对1模拟面试练习，获取专业反馈||申请模拟面试||primary||||申请模拟面试"),
            new DictSeed(
                    DICT_TYPE_PRACTICE_CARD,
                    2L,
                    "人际关系测试",
                    "networking",
                    "RT",
                    "linear-gradient(135deg, #F59E0B, #FBBF24)",
                    "测试您的职场沟通和人际交往能力||申请测试||default||#F59E0B||申请人际关系测试"),
            new DictSeed(
                    DICT_TYPE_PRACTICE_CARD,
                    3L,
                    "期中考试",
                    "midterm",
                    "EX",
                    "linear-gradient(135deg, #8B5CF6, #A78BFA)",
                    "阶段性知识检测，评估学习进度||申请考试||default||#8B5CF6||申请期中考试"));

    private static final List<DictSeed> PRACTICE_TYPE_SEEDS = List.of(
            new DictSeed(DICT_TYPE_PRACTICE_TYPE, 1L, "模拟面试", "mock", "blue", null, "模拟面试申请"),
            new DictSeed(DICT_TYPE_PRACTICE_TYPE, 2L, "人际关系测试", "networking", "orange", null, "人际关系测试"),
            new DictSeed(DICT_TYPE_PRACTICE_TYPE, 3L, "期中考试", "midterm", "purple", null, "期中考试测试"));

    private static final List<DictSeed> PRACTICE_STATUS_SEEDS = List.of(
            new DictSeed(DICT_TYPE_PRACTICE_STATUS, 1L, "待分配", "待分配", "orange", null, "模拟应聘状态"),
            new DictSeed(DICT_TYPE_PRACTICE_STATUS, 2L, "已完成", "已完成", "green", null, "模拟应聘状态"));

    private static final List<DictSeed> PRACTICE_RANGE_SEEDS = List.of(
            new DictSeed(DICT_TYPE_PRACTICE_RANGE, 1L, "本周", "week", null, null, "时间范围"),
            new DictSeed(DICT_TYPE_PRACTICE_RANGE, 2L, "本月", "month", null, null, "时间范围"),
            new DictSeed(DICT_TYPE_PRACTICE_RANGE, 3L, "全部", "all", null, null, "时间范围"));

    private static final List<DictSeed> PRACTICE_MENTOR_COUNT_SEEDS = List.of(
            new DictSeed(DICT_TYPE_PRACTICE_MENTOR_COUNT, 1L, "1位导师", "1位导师", null, null, "导师数量"),
            new DictSeed(DICT_TYPE_PRACTICE_MENTOR_COUNT, 2L, "2位导师", "2位导师", null, null, "导师数量"),
            new DictSeed(DICT_TYPE_PRACTICE_MENTOR_COUNT, 3L, "3位导师", "3位导师", null, null, "导师数量"));

    private static final List<DictSeed> REQUEST_COPY_SEEDS = List.of(
            new DictSeed(DICT_TYPE_REQUEST_COPY, 1L, "课程申请", "titleZh", null, null, "页面文案"),
            new DictSeed(DICT_TYPE_REQUEST_COPY, 2L, "Class Request", "titleEn", null, null, "页面文案"),
            new DictSeed(DICT_TYPE_REQUEST_COPY, 3L, "申请Staffing或Hirevue/OT课程辅导", "subtitle", null, null, "页面文案"),
            new DictSeed(DICT_TYPE_REQUEST_COPY, 4L, "需要预约课程？", "heroTitle", null, null, "页面文案"),
            new DictSeed(DICT_TYPE_REQUEST_COPY, 5L, "点击右侧按钮快速提交申请", "heroSubtitle", null, null, "页面文案"),
            new DictSeed(DICT_TYPE_REQUEST_COPY, 6L, "新建申请", "actionButtonText", null, null, "页面文案"),
            new DictSeed(DICT_TYPE_REQUEST_COPY, 7L, "申请记录 My Requests", "tableTitle", null, null, "页面文案"),
            new DictSeed(DICT_TYPE_REQUEST_COPY, 8L, "搜索公司...", "keywordPlaceholder", null, null, "页面文案"),
            new DictSeed(DICT_TYPE_REQUEST_COPY, 9L, "类型", "typePlaceholder", null, null, "页面文案"),
            new DictSeed(DICT_TYPE_REQUEST_COPY, 10L, "状态", "statusPlaceholder", null, null, "页面文案"),
            new DictSeed(DICT_TYPE_REQUEST_COPY, 11L, "新建课程申请", "modalTitle", null, null, "页面文案"));

    private static final List<DictSeed> REQUEST_TAB_SEEDS = List.of(
            new DictSeed(DICT_TYPE_REQUEST_TAB, 1L, "全部", "all", null, null, "申请记录 tab"),
            new DictSeed(DICT_TYPE_REQUEST_TAB, 2L, "处理中", "processing", null, null, "申请记录 tab"),
            new DictSeed(DICT_TYPE_REQUEST_TAB, 3L, "已完成", "completed", null, null, "申请记录 tab"));

    private static final List<DictSeed> REQUEST_TYPE_SEEDS = List.of(
            new DictSeed(DICT_TYPE_REQUEST_TYPE, 1L, "Staffing", "Staffing", "purple", null, "课程申请类型"),
            new DictSeed(DICT_TYPE_REQUEST_TYPE, 2L, "Hirevue", "Hirevue", "blue", null, "课程申请类型"),
            new DictSeed(DICT_TYPE_REQUEST_TYPE, 3L, "OT", "OT", "gold", null, "课程申请类型"));

    private static final List<DictSeed> REQUEST_STATUS_SEEDS = List.of(
            new DictSeed(DICT_TYPE_REQUEST_STATUS, 1L, "Processing", "Processing", "orange", null, "课程申请状态"),
            new DictSeed(DICT_TYPE_REQUEST_STATUS, 2L, "Completed", "Completed", "green", null, "课程申请状态"));

    private static final List<DictSeed> COURSE_OPTION_SEEDS = List.of(
            new DictSeed(
                    DICT_TYPE_COURSE_OPTION,
                    1L,
                    "我有一个入职面试",
                    "interview",
                    "IN",
                    "linear-gradient(135deg, #7399C6, #5A7BA3)",
                    "Staffing||我有一个入职面试"),
            new DictSeed(
                    DICT_TYPE_COURSE_OPTION,
                    2L,
                    "我需要模拟面试",
                    "mock",
                    "MK",
                    "linear-gradient(135deg, #22C55E, #16A34A)",
                    "Staffing||我需要模拟面试"),
            new DictSeed(
                    DICT_TYPE_COURSE_OPTION,
                    3L,
                    "我有一个笔试，需要帮我做题",
                    "test",
                    "OT",
                    "linear-gradient(135deg, #F59E0B, #FBBF24)",
                    "OT||我有一个笔试，需要帮我做题"),
            new DictSeed(
                    DICT_TYPE_COURSE_OPTION,
                    4L,
                    "模拟期中考试",
                    "midterm",
                    "ME",
                    "linear-gradient(135deg, #8B5CF6, #A78BFA)",
                    "Hirevue||模拟期中考试"),
            new DictSeed(
                    DICT_TYPE_COURSE_OPTION,
                    5L,
                    "人际关系期中考试",
                    "network",
                    "NW",
                    "linear-gradient(135deg, #EC4899, #F472B6)",
                    "Hirevue||人际关系期中考试"),
            new DictSeed(
                    DICT_TYPE_COURSE_OPTION,
                    6L,
                    "我申请题库",
                    "qbank",
                    "QB",
                    "linear-gradient(135deg, #06B6D4, #67E8F9)",
                    "OT||我申请题库"));

    private static final List<DictSeed> JOB_STATUS_SEEDS = List.of(
            new DictSeed(DICT_TYPE_JOB_STATUS, 1L, "已申请", "已申请", null, null, "求职状态"),
            new DictSeed(DICT_TYPE_JOB_STATUS, 2L, "面试中", "面试中", null, null, "求职状态"),
            new DictSeed(DICT_TYPE_JOB_STATUS, 3L, "已获Offer", "已获Offer", null, null, "求职状态"));

    @Autowired
    private StudentMockPracticeMapper studentMockPracticeMapper;

    @Autowired
    private StudentJobPositionMapper studentJobPositionMapper;

    @Autowired
    private SysDictDataMapper sysDictDataMapper;

    @Autowired
    private OsgMockPracticeMapper osgMockPracticeMapper;

    @Autowired
    private OsgIdentityResolver identityResolver;

    private final Object referenceDataLock = new Object();

    private volatile boolean referenceDataReady = false;

    @Override
    public Map<String, Object> selectMeta(Long userId)
    {
        syncReferenceData();
        List<Map<String, Object>> practiceRecords = loadPracticeRecords(userId);
        List<Map<String, Object>> requestRecords = loadRequestRecords(userId);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("pageSummary", buildPageSummary(loadDictValueMap(DICT_TYPE_PAGE_COPY)));
        payload.put("practiceSection", buildPracticeSection(loadDictValueMap(DICT_TYPE_PAGE_COPY)));
        payload.put("practiceCards", buildPracticeCards());

        Map<String, Object> practiceFilters = new LinkedHashMap<>();
        practiceFilters.put("typeOptions", buildPracticeTypeOptions(practiceRecords));
        practiceFilters.put("statusOptions", buildPracticeStatusOptions(practiceRecords));
        practiceFilters.put("rangeOptions", buildStaticOptions(DICT_TYPE_PRACTICE_RANGE));
        payload.put("practiceFilters", practiceFilters);

        Map<String, Object> practiceForm = new LinkedHashMap<>();
        practiceForm.put("mentorCountOptions", buildStaticOptions(DICT_TYPE_PRACTICE_MENTOR_COUNT));
        payload.put("practiceForm", practiceForm);

        payload.put("requestSection", buildRequestSection(loadDictValueMap(DICT_TYPE_REQUEST_COPY)));
        payload.put("requestTabs", buildRequestTabs(requestRecords));

        Map<String, Object> requestFilters = new LinkedHashMap<>();
        requestFilters.put("typeOptions", buildRequestTypeOptions(requestRecords));
        requestFilters.put("statusOptions", buildRequestStatusOptions(requestRecords));
        payload.put("requestFilters", requestFilters);

        payload.put("requestCourseOptions", buildRequestCourseOptions());

        Map<String, Object> requestForm = new LinkedHashMap<>();
        requestForm.put("companyOptions", buildCompanyOptions(userId, requestRecords));
        requestForm.put("jobStatusOptions", buildStaticOptions(DICT_TYPE_JOB_STATUS));
        payload.put("requestForm", requestForm);
        return payload;
    }

    @Override
    public Map<String, Object> selectOverview(Long userId)
    {
        syncReferenceData();
        Map<String, Object> overview = new LinkedHashMap<>();
        overview.put("practiceRecords", loadPracticeRecords(userId));
        overview.put("requestRecords", loadRequestRecords(userId));
        return overview;
    }

    @Override
    public Long createPracticeRequest(String practiceType, String reason, String mentorCount, String preferredMentor,
            String excludedMentor, String remark, Long userId)
    {
        syncReferenceData();
        OsgStudent student = identityResolver.resolveStudentByUserId(userId);
        PracticeTypeMeta practiceMeta = resolvePracticeMeta(practiceType);

        Map<String, Object> params = new LinkedHashMap<>();
        params.put("userId", userId);
        params.put("requestGroup", "practice");
        params.put("requestType", practiceMeta.label());
        params.put("courseType", practiceMeta.value());
        params.put("company", null);
        params.put("jobStatus", null);
        params.put("requestStatus", "待分配");
        params.put("requestContent", practiceMeta.requestContent());
        params.put("requestReason", normalizeOptional(reason));
        params.put("mentorCount", requireOptionalOrDefault(mentorCount, "2位导师"));
        params.put("preferredMentor", normalizeOptional(preferredMentor));
        params.put("excludedMentor", normalizeOptional(excludedMentor));
        params.put("mentorName", "待分配");
        params.put("mentorMeta", "班主任分配中");
        params.put("hoursFeedback", "-");
        params.put("feedbackSummary", "-");
        params.put("feedbackHint", "-");
        params.put("remark", normalizeOptional(remark));
        studentMockPracticeMapper.insertRequest(params);

        OsgMockPractice practice = new OsgMockPractice();
        practice.setStudentId(student.getStudentId());
        practice.setStudentName(defaultString(student.getStudentName(), "学员" + student.getStudentId()));
        practice.setPracticeType(toMainPracticeType(practiceMeta.value()));
        practice.setRequestContent(practiceMeta.label());
        practice.setRequestedMentorCount(parseMentorCount(mentorCount));
        practice.setPreferredMentorNames(normalizeOptional(preferredMentor));
        practice.setStatus("pending");
        practice.setCompletedHours(0);
        practice.setSubmittedAt(new Date());
        practice.setRemark(normalizeOptional(remark));
        practice.setCreateBy("student");
        practice.setUpdateBy("student");
        osgMockPracticeMapper.insertMockPractice(practice);
        return practice.getPracticeId() == null ? toRequestId(params.get("requestId")) : practice.getPracticeId();
    }

    @Override
    public Long createClassRequest(String courseType, String company, String jobStatus, String remark, Long userId)
    {
        syncReferenceData();
        CourseOptionMeta courseMeta = resolveCourseOption(courseType);
        String normalizedCompany = requireText(company, "请选择目标公司");
        String normalizedJobStatus = requireText(jobStatus, "请选择当前状态");

        Map<String, Object> params = new LinkedHashMap<>();
        params.put("userId", userId);
        params.put("requestGroup", "course");
        params.put("requestType", courseMeta.requestType());
        params.put("courseType", courseMeta.value());
        params.put("company", normalizedCompany);
        params.put("jobStatus", normalizedJobStatus);
        params.put("requestStatus", "Processing");
        params.put("requestContent", courseMeta.requestContent());
        params.put("requestReason", "");
        params.put("mentorCount", null);
        params.put("preferredMentor", null);
        params.put("excludedMentor", null);
        params.put("mentorName", null);
        params.put("mentorMeta", null);
        params.put("hoursFeedback", "");
        params.put("feedbackSummary", "");
        params.put("feedbackHint", "");
        params.put("remark", normalizeOptional(remark));
        studentMockPracticeMapper.insertRequest(params);
        return toRequestId(params.get("requestId"));
    }

    private List<Map<String, Object>> loadPracticeRecords(Long userId)
    {
        Long studentId = identityResolver.resolveStudentIdByUserId(userId);
        List<Map<String, Object>> practiceRecords = projectPracticeRecords(osgMockPracticeMapper.selectStudentPracticeList(studentId));
        Map<String, SysDictData> practiceTypeDict = loadDictValueMap(DICT_TYPE_PRACTICE_TYPE);
        Map<String, SysDictData> practiceTypeLabelDict = loadDictLabelMap(DICT_TYPE_PRACTICE_TYPE);
        Map<String, SysDictData> practiceStatusDict = loadDictValueMap(DICT_TYPE_PRACTICE_STATUS);

        for (Map<String, Object> record : practiceRecords)
        {
            String typeValue = stringValue(record.get("typeValue"));
            if (!StringUtils.hasText(typeValue))
            {
                SysDictData practiceType = practiceTypeLabelDict.get(stringValue(record.get("type")));
                if (practiceType != null)
                {
                    typeValue = practiceType.getDictValue();
                }
            }
            record.put("typeValue", typeValue);

            SysDictData practiceType = practiceTypeDict.get(typeValue);
            if (practiceType != null)
            {
                record.put("type", defaultString(practiceType.getDictLabel(), stringValue(record.get("type"))));
                record.put("typeColor", defaultString(practiceType.getCssClass(), "blue"));
            }
            else
            {
                record.put("typeColor", defaultString(stringValue(record.get("typeColor")), "blue"));
            }

            String statusValue = stringValue(record.get("status"));
            record.put("statusValue", statusValue);
            SysDictData practiceStatus = practiceStatusDict.get(statusValue);
            if (practiceStatus != null)
            {
                record.put("status", defaultString(practiceStatus.getDictLabel(), statusValue));
                record.put("statusColor", defaultString(practiceStatus.getCssClass(), "default"));
            }
        }
        return practiceRecords;
    }

    private List<Map<String, Object>> projectPracticeRecords(List<OsgMockPractice> rows)
    {
        if (rows == null || rows.isEmpty())
        {
            return new ArrayList<>();
        }
        List<Map<String, Object>> records = new ArrayList<>(rows.size());
        for (OsgMockPractice row : rows)
        {
            Map<String, Object> record = new LinkedHashMap<>();
            record.put("id", "MP" + row.getPracticeId());
            record.put("type", toPracticeTypeLabel(row.getPracticeType()));
            record.put("typeValue", toPracticeTypeValue(row.getPracticeType()));
            record.put("content", defaultString(row.getRequestContent(), "-"));
            record.put("appliedAt", row.getSubmittedAt() == null ? "" : new java.text.SimpleDateFormat("MM/dd HH:mm").format(row.getSubmittedAt()));
            record.put("submittedAtValue", row.getSubmittedAt() == null ? "" : new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(row.getSubmittedAt()));
            record.put("mentor", defaultString(row.getMentorNames(), "待分配"));
            record.put("mentorMeta", defaultString(row.getMentorBackgrounds(), "班主任分配中"));
            record.put("hours", row.getCompletedHours() == null || row.getCompletedHours() == 0 ? "-" : String.valueOf(row.getCompletedHours()));
            record.put("feedback", defaultString(row.getFeedbackSummary(), "-"));
            record.put("feedbackHint", defaultString(row.getRemark(), "-"));
            record.put("status", defaultString(row.getStatus(), ""));
            records.add(record);
        }
        return records;
    }

    private List<Map<String, Object>> loadRequestRecords(Long userId)
    {
        List<Map<String, Object>> requestRecords = studentMockPracticeMapper.selectClassRequestList(userId);
        Map<String, SysDictData> requestTypeDict = loadDictValueMap(DICT_TYPE_REQUEST_TYPE);
        Map<String, SysDictData> requestStatusDict = loadDictValueMap(DICT_TYPE_REQUEST_STATUS);

        for (Map<String, Object> record : requestRecords)
        {
            String typeValue = stringValue(record.get("type"));
            record.put("typeValue", typeValue);
            SysDictData requestType = requestTypeDict.get(typeValue);
            if (requestType != null)
            {
                record.put("type", defaultString(requestType.getDictLabel(), typeValue));
                record.put("typeColor", defaultString(requestType.getCssClass(), "default"));
            }
            else
            {
                record.put("typeColor", defaultString(stringValue(record.get("typeColor")), "default"));
            }

            String statusValue = stringValue(record.get("status"));
            record.put("statusValue", statusValue);
            SysDictData requestStatus = requestStatusDict.get(statusValue);
            if (requestStatus != null)
            {
                record.put("status", defaultString(requestStatus.getDictLabel(), statusValue));
                record.put("statusColor", defaultString(requestStatus.getCssClass(), "default"));
            }
            else
            {
                record.put("statusColor", defaultString(stringValue(record.get("statusColor")), "default"));
            }
        }
        return requestRecords;
    }

    private void syncReferenceData()
    {
        if (referenceDataReady)
        {
            return;
        }

        synchronized (referenceDataLock)
        {
            if (referenceDataReady)
            {
                return;
            }

            seedStaticDicts(PAGE_COPY_SEEDS);
            seedStaticDicts(PRACTICE_CARD_SEEDS);
            seedStaticDicts(PRACTICE_TYPE_SEEDS);
            seedStaticDicts(PRACTICE_STATUS_SEEDS);
            seedStaticDicts(PRACTICE_RANGE_SEEDS);
            seedStaticDicts(PRACTICE_MENTOR_COUNT_SEEDS);
            seedStaticDicts(REQUEST_COPY_SEEDS);
            seedStaticDicts(REQUEST_TAB_SEEDS);
            seedStaticDicts(REQUEST_TYPE_SEEDS);
            seedStaticDicts(REQUEST_STATUS_SEEDS);
            seedStaticDicts(COURSE_OPTION_SEEDS);
            seedStaticDicts(JOB_STATUS_SEEDS);
            referenceDataReady = true;
        }
    }

    private Map<String, Object> buildPageSummary(Map<String, SysDictData> pageCopy)
    {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("titleZh", dictLabel(pageCopy, "titleZh", "应聘演练"));
        summary.put("titleEn", dictLabel(pageCopy, "titleEn", "Mock Practice"));
        summary.put("subtitle", dictLabel(pageCopy, "subtitle", "申请模拟面试、人际关系测试或期中考试"));
        return summary;
    }

    private Map<String, Object> buildPracticeSection(Map<String, SysDictData> pageCopy)
    {
        Map<String, Object> section = new LinkedHashMap<>();
        section.put("recordsTitle", dictLabel(pageCopy, "recordsTitle", "我的模拟应聘记录"));
        section.put("keywordPlaceholder", dictLabel(pageCopy, "practiceKeywordPlaceholder", "搜索..."));
        section.put("typePlaceholder", dictLabel(pageCopy, "practiceTypePlaceholder", "全部类型"));
        section.put("statusPlaceholder", dictLabel(pageCopy, "practiceStatusPlaceholder", "全部状态"));
        section.put("rangePlaceholder", dictLabel(pageCopy, "practiceRangePlaceholder", "时间范围"));
        return section;
    }

    private Map<String, Object> buildRequestSection(Map<String, SysDictData> requestCopy)
    {
        Map<String, Object> section = new LinkedHashMap<>();
        section.put("titleZh", dictLabel(requestCopy, "titleZh", "课程申请"));
        section.put("titleEn", dictLabel(requestCopy, "titleEn", "Class Request"));
        section.put("subtitle", dictLabel(requestCopy, "subtitle", "申请Staffing或Hirevue/OT课程辅导"));
        section.put("heroTitle", dictLabel(requestCopy, "heroTitle", "需要预约课程？"));
        section.put("heroSubtitle", dictLabel(requestCopy, "heroSubtitle", "点击右侧按钮快速提交申请"));
        section.put("actionButtonText", dictLabel(requestCopy, "actionButtonText", "新建申请"));
        section.put("tableTitle", dictLabel(requestCopy, "tableTitle", "申请记录 My Requests"));
        section.put("keywordPlaceholder", dictLabel(requestCopy, "keywordPlaceholder", "搜索公司..."));
        section.put("typePlaceholder", dictLabel(requestCopy, "typePlaceholder", "类型"));
        section.put("statusPlaceholder", dictLabel(requestCopy, "statusPlaceholder", "状态"));
        section.put("modalTitle", dictLabel(requestCopy, "modalTitle", "新建课程申请"));
        return section;
    }

    private List<Map<String, Object>> buildPracticeCards()
    {
        List<Map<String, Object>> cards = new ArrayList<>();
        for (SysDictData item : loadDictItems(DICT_TYPE_PRACTICE_CARD))
        {
            String[] extras = splitRemark(item.getRemark(), 5);
            Map<String, Object> card = new LinkedHashMap<>();
            card.put("id", item.getDictValue());
            card.put("badge", defaultString(item.getCssClass(), ""));
            card.put("title", defaultString(item.getDictLabel(), item.getDictValue()));
            card.put("description", extras[0]);
            card.put("cta", extras[1]);
            card.put("buttonType", defaultString(extras[2], "default"));
            card.put("buttonColor", extras[3]);
            card.put("gradient", defaultString(item.getListClass(), ""));
            card.put("modalTitle", extras[4]);
            cards.add(card);
        }
        return cards;
    }

    private List<Map<String, Object>> buildPracticeTypeOptions(List<Map<String, Object>> practiceRecords)
    {
        LinkedHashSet<String> values = new LinkedHashSet<>();
        for (Map<String, Object> record : practiceRecords)
        {
            values.add(stringValue(record.get("typeValue")));
        }
        return buildDynamicOptions(values, loadDictValueMap(DICT_TYPE_PRACTICE_TYPE));
    }

    private List<Map<String, Object>> buildPracticeStatusOptions(List<Map<String, Object>> practiceRecords)
    {
        LinkedHashSet<String> values = new LinkedHashSet<>();
        for (Map<String, Object> record : practiceRecords)
        {
            values.add(stringValue(record.get("statusValue")));
        }
        return buildDynamicOptions(values, loadDictValueMap(DICT_TYPE_PRACTICE_STATUS));
    }

    private List<Map<String, Object>> buildRequestTypeOptions(List<Map<String, Object>> requestRecords)
    {
        LinkedHashSet<String> values = new LinkedHashSet<>();
        for (Map<String, Object> record : requestRecords)
        {
            values.add(stringValue(record.get("typeValue")));
        }
        return buildDynamicOptions(values, loadDictValueMap(DICT_TYPE_REQUEST_TYPE));
    }

    private List<Map<String, Object>> buildRequestStatusOptions(List<Map<String, Object>> requestRecords)
    {
        LinkedHashSet<String> values = new LinkedHashSet<>();
        for (Map<String, Object> record : requestRecords)
        {
            values.add(stringValue(record.get("statusValue")));
        }
        return buildDynamicOptions(values, loadDictValueMap(DICT_TYPE_REQUEST_STATUS));
    }

    private List<Map<String, Object>> buildRequestTabs(List<Map<String, Object>> requestRecords)
    {
        List<Map<String, Object>> tabs = new ArrayList<>();
        for (SysDictData item : loadDictItems(DICT_TYPE_REQUEST_TAB))
        {
            Map<String, Object> tab = new LinkedHashMap<>();
            tab.put("key", item.getDictValue());
            tab.put("label", item.getDictLabel());
            tab.put("count", countRequestTab(item.getDictValue(), requestRecords));
            tabs.add(tab);
        }
        return tabs;
    }

    private List<Map<String, Object>> buildRequestCourseOptions()
    {
        List<Map<String, Object>> options = new ArrayList<>();
        for (SysDictData item : loadDictItems(DICT_TYPE_COURSE_OPTION))
        {
            String[] extras = splitRemark(item.getRemark(), 2);
            Map<String, Object> option = new LinkedHashMap<>();
            option.put("value", item.getDictValue());
            option.put("label", item.getDictLabel());
            option.put("badge", defaultString(item.getCssClass(), ""));
            option.put("gradient", defaultString(item.getListClass(), ""));
            option.put("requestType", extras[0]);
            option.put("requestContent", extras[1]);
            options.add(option);
        }
        return options;
    }

    private List<Map<String, Object>> buildCompanyOptions(Long userId, List<Map<String, Object>> requestRecords)
    {
        LinkedHashSet<String> values = new LinkedHashSet<>();
        for (Map<String, Object> position : studentJobPositionMapper.selectPositionList(userId))
        {
            values.add(stringValue(position.get("company")));
        }
        for (Map<String, Object> requestRecord : requestRecords)
        {
            values.add(stringValue(requestRecord.get("company")));
        }

        List<Map<String, Object>> options = new ArrayList<>();
        for (String value : values)
        {
            if (!StringUtils.hasText(value))
            {
                continue;
            }
            options.add(option(value, value, null, null, null));
        }
        return options;
    }

    private PracticeTypeMeta resolvePracticeMeta(String practiceType)
    {
        String normalized = requireText(practiceType, "请选择申请类型").toLowerCase(Locale.ROOT);
        SysDictData item = findDict(DICT_TYPE_PRACTICE_TYPE, normalized);
        if (item == null)
        {
            return switch (normalized) {
                case "mock" -> new PracticeTypeMeta("mock", "模拟面试", "模拟面试");
                case "networking" -> new PracticeTypeMeta("networking", "人际关系测试", "人际关系测试");
                case "midterm" -> new PracticeTypeMeta("midterm", "期中考试", "期中考试");
                default -> throw new ServiceException("不支持的模拟应聘类型");
            };
        }
        return new PracticeTypeMeta(item.getDictValue(), item.getDictLabel(), defaultString(item.getRemark(), item.getDictLabel()));
    }

    private CourseOptionMeta resolveCourseOption(String courseType)
    {
        String normalized = requireText(courseType, "请选择课程类型");
        SysDictData item = findDict(DICT_TYPE_COURSE_OPTION, normalized);
        if (item == null)
        {
            throw new ServiceException("不支持的课程申请类型");
        }
        String[] extras = splitRemark(item.getRemark(), 2);
        return new CourseOptionMeta(item.getDictValue(), item.getDictLabel(), extras[0], extras[1]);
    }

    private int countRequestTab(String tabKey, List<Map<String, Object>> requestRecords)
    {
        if ("all".equals(tabKey))
        {
            return requestRecords.size();
        }

        String targetStatus = "processing".equals(tabKey) ? "Processing" : "completed".equals(tabKey) ? "Completed" : "";
        int count = 0;
        for (Map<String, Object> requestRecord : requestRecords)
        {
            if (Objects.equals(targetStatus, requestRecord.get("statusValue")))
            {
                count++;
            }
        }
        return count;
    }

    private void seedStaticDicts(List<DictSeed> seeds)
    {
        for (DictSeed seed : seeds)
        {
            upsertDictData(seed);
        }
    }

    private List<Map<String, Object>> buildStaticOptions(String dictType)
    {
        List<Map<String, Object>> options = new ArrayList<>();
        for (SysDictData item : loadDictItems(dictType))
        {
            options.add(option(item.getDictValue(), item.getDictLabel(), item.getCssClass(), item.getListClass(), item.getDictSort()));
        }
        return options;
    }

    private List<Map<String, Object>> buildDynamicOptions(LinkedHashSet<String> values, Map<String, SysDictData> dict)
    {
        List<Map<String, Object>> options = new ArrayList<>();
        for (String value : values)
        {
            if (!StringUtils.hasText(value))
            {
                continue;
            }
            SysDictData metadata = dict.get(value);
            if (metadata == null)
            {
                options.add(option(value, value, null, null, null));
                continue;
            }
            options.add(option(metadata.getDictValue(), metadata.getDictLabel(), metadata.getCssClass(), metadata.getListClass(),
                    metadata.getDictSort()));
        }
        return options;
    }

    private Map<String, Object> option(String value, String label, String cssClass, String listClass, Long sort)
    {
        Map<String, Object> option = new LinkedHashMap<>();
        option.put("value", value);
        option.put("label", label);
        if (StringUtils.hasText(cssClass))
        {
            option.put("color", cssClass);
        }
        if (StringUtils.hasText(listClass))
        {
            option.put("code", listClass);
        }
        if (sort != null)
        {
            option.put("sort", sort);
        }
        return option;
    }

    private List<SysDictData> loadDictItems(String dictType)
    {
        Map<String, SysDictData> deduped = new LinkedHashMap<>();
        for (SysDictData item : sysDictDataMapper.selectDictDataByType(dictType))
        {
            deduped.putIfAbsent(item.getDictValue(), item);
        }
        return new ArrayList<>(deduped.values());
    }

    private Map<String, SysDictData> loadDictValueMap(String dictType)
    {
        Map<String, SysDictData> dict = new LinkedHashMap<>();
        for (SysDictData item : loadDictItems(dictType))
        {
            dict.put(item.getDictValue(), item);
        }
        return dict;
    }

    private Map<String, SysDictData> loadDictLabelMap(String dictType)
    {
        Map<String, SysDictData> dict = new LinkedHashMap<>();
        for (SysDictData item : loadDictItems(dictType))
        {
            dict.put(item.getDictLabel(), item);
        }
        return dict;
    }

    private void upsertDictData(DictSeed seed)
    {
        SysDictData existing = findDict(seed.type(), seed.value());
        if (existing != null)
        {
            existing.setDictSort(seed.sort());
            existing.setDictLabel(seed.label());
            existing.setCssClass(seed.cssClass());
            existing.setListClass(seed.listClass());
            existing.setStatus("0");
            existing.setRemark(seed.remark());
            existing.setUpdateBy("codex");
            sysDictDataMapper.updateDictData(existing);
            return;
        }

        SysDictData created = new SysDictData();
        created.setDictSort(seed.sort());
        created.setDictLabel(seed.label());
        created.setDictValue(seed.value());
        created.setDictType(seed.type());
        created.setCssClass(seed.cssClass());
        created.setListClass(seed.listClass());
        created.setIsDefault("N");
        created.setStatus("0");
        created.setRemark(seed.remark());
        created.setCreateBy("codex");
        sysDictDataMapper.insertDictData(created);
    }

    private SysDictData findDict(String dictType, String dictValue)
    {
        for (SysDictData item : loadDictItems(dictType))
        {
            if (Objects.equals(item.getDictValue(), dictValue))
            {
                return item;
            }
        }
        return null;
    }

    private String dictLabel(Map<String, SysDictData> dict, String value, String fallback)
    {
        SysDictData item = dict.get(value);
        if (item == null)
        {
            return fallback;
        }
        return defaultString(item.getDictLabel(), fallback);
    }

    private String[] splitRemark(String remark, int size)
    {
        String[] tokens = defaultString(remark, "").split("\\|\\|", -1);
        String[] values = new String[size];
        for (int index = 0; index < size; index++)
        {
            values[index] = index < tokens.length ? tokens[index] : "";
        }
        return values;
    }

    private String requireText(String value, String message)
    {
        if (!StringUtils.hasText(value))
        {
            throw new ServiceException(message);
        }
        return value.trim();
    }

    private String normalizeOptional(String value)
    {
        return StringUtils.hasText(value) ? value.trim() : "";
    }

    private String requireOptionalOrDefault(String value, String fallback)
    {
        return StringUtils.hasText(value) ? value.trim() : fallback;
    }

    private int parseMentorCount(String mentorCount)
    {
        String normalized = defaultString(mentorCount, "").replaceAll("[^0-9]", "");
        if (!StringUtils.hasText(normalized))
        {
            return 0;
        }
        return Integer.parseInt(normalized);
    }

    private String toMainPracticeType(String value)
    {
        return switch (defaultString(value, "")) {
            case "mock" -> "mock_interview";
            case "networking" -> "communication_test";
            case "midterm" -> "midterm_exam";
            default -> value;
        };
    }

    private String toPracticeTypeValue(String practiceType)
    {
        return switch (defaultString(practiceType, "")) {
            case "mock_interview" -> "mock";
            case "communication_test" -> "networking";
            case "midterm_exam" -> "midterm";
            default -> practiceType;
        };
    }

    private String toPracticeTypeLabel(String practiceType)
    {
        return switch (defaultString(practiceType, "")) {
            case "mock_interview" -> "模拟面试";
            case "communication_test" -> "人际关系测试";
            case "midterm_exam" -> "期中考试";
            default -> practiceType;
        };
    }


    private Long toRequestId(Object requestId)
    {
        return requestId instanceof Number ? ((Number) requestId).longValue() : null;
    }

    private String defaultString(String value, String fallback)
    {
        return StringUtils.hasText(value) ? value.trim() : fallback;
    }

    private String stringValue(Object value)
    {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private record DictSeed(String type, Long sort, String label, String value, String cssClass, String listClass,
            String remark)
    {
    }

    private record PracticeTypeMeta(String value, String label, String requestContent)
    {
    }

    private record CourseOptionMeta(String value, String label, String requestType, String requestContent)
    {
    }
}
