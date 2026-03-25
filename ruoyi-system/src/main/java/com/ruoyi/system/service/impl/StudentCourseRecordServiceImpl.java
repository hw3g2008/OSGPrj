package com.ruoyi.system.service.impl;

import java.math.BigDecimal;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import com.ruoyi.common.core.domain.entity.SysDictData;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgClassRecord;
import com.ruoyi.system.mapper.OsgClassRecordMapper;
import com.ruoyi.system.mapper.StudentCourseRecordMapper;
import com.ruoyi.system.mapper.SysDictDataMapper;
import com.ruoyi.system.service.IStudentCourseRecordService;

/**
 * 学生课程记录服务实现
 */
@Service
public class StudentCourseRecordServiceImpl implements IStudentCourseRecordService
{
    private static final String DICT_TYPE_PAGE_COPY = "osg_student_class_records_page_copy";
    private static final String DICT_TYPE_TAB = "osg_student_class_records_tab";
    private static final String DICT_TYPE_TIME_RANGE = "osg_student_class_records_time_range";
    private static final String DICT_TYPE_COACHING_TYPE = "osg_student_class_records_coaching_type";
    private static final String DICT_TYPE_CONTENT_TYPE = "osg_student_class_records_content_type";
    private static final String DICT_TYPE_RATING_TAG = "osg_student_class_records_rating_tag";

    private static final List<DictSeed> PAGE_COPY_SEEDS = List.of(
            new DictSeed(DICT_TYPE_PAGE_COPY, 1L, "课程记录", "titleZh", null, null, "页面文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 2L, "Class Records", "titleEn", null, null, "页面文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 3L, "查看我的上课记录和导师反馈", "subtitle", null, null, "页面文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 4L, "CR", "reminderIconLabel", null, null, "提醒文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 5L, "新增课程记录", "reminderTitle", null, null, "提醒文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 6L, "导师", "reminderLeadText", null, null, "提醒文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 7L, "为您填报了", "reminderMiddleText", null, null, "提醒文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 8L, "条新的上课记录，请及时评价", "reminderSuffixText", null, null, "提醒文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 9L, "去评价", "reminderCtaLabel", null, null, "提醒文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 10L, "搜索导师...", "keywordPlaceholder", null, null, "筛选文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 11L, "辅导类型", "coachingTypePlaceholder", null, null, "筛选文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 12L, "课程内容", "courseContentPlaceholder", null, null, "筛选文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 13L, "时间范围", "timeRangePlaceholder", null, null, "筛选文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 14L, "重置", "resetLabel", null, null, "筛选文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 15L, "记录ID", "tableRecordId", null, null, "表头文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 16L, "辅导内容", "tableCoachingDetail", null, null, "表头文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 17L, "课程内容", "tableCourseContent", null, null, "表头文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 18L, "导师", "tableMentor", null, null, "表头文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 19L, "上课日期", "tableClassDate", null, null, "表头文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 20L, "时长", "tableDuration", null, null, "表头文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 21L, "我的评价", "tableRating", null, null, "表头文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 22L, "操作", "tableAction", null, null, "表头文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 23L, "待评价", "pendingRatingLabel", null, null, "状态文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 24L, "评价", "rateActionLabel", null, null, "状态文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 25L, "查看详情", "detailActionLabel", null, null, "状态文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 26L, "课程详情", "detailDefaultTitle", null, null, "弹窗文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 27L, "关闭", "detailCloseLabel", null, null, "弹窗文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 28L, "修改评价", "detailConfirmLabel", null, null, "弹窗文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 29L, "课程评价", "ratingTitle", null, null, "弹窗文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 30L, "整体评分", "ratingScoreLabel", null, null, "弹窗文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 31L, "评价标签", "ratingTagLabel", null, null, "弹窗文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 32L, "详细反馈", "ratingFeedbackLabel", null, null, "弹窗文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 33L, "请选择评价标签", "ratingTagPlaceholder", null, null, "弹窗文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 34L, "请详细描述您的上课体验、导师表现以及改进建议...", "ratingFeedbackPlaceholder", null, null, "弹窗文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 35L, "取消", "ratingCancelLabel", null, null, "弹窗文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 36L, "提交评价", "ratingSubmitLabel", null, null, "弹窗文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 37L, "评价提交成功", "ratingSuccessMessage", null, null, "提示文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 38L, "记录ID", "detailRecordIdLabel", null, null, "详情文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 39L, "辅导内容", "detailCoachingDetailLabel", null, null, "详情文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 40L, "课程内容", "detailCourseContentLabel", null, null, "详情文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 41L, "导师", "detailMentorLabel", null, null, "详情文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 42L, "上课日期", "detailClassDateLabel", null, null, "详情文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 43L, "时长", "detailDurationLabel", null, null, "详情文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 44L, "NEW", "newBadgeLabel", null, null, "状态文案"),
            new DictSeed(DICT_TYPE_PAGE_COPY, 45L, "Jerry Li", "reminderFallbackMentor", null, null, "提醒文案"));

    private static final List<DictSeed> TAB_SEEDS = List.of(
            new DictSeed(DICT_TYPE_TAB, 1L, "全部", "all", null, null, "Tab 文案"),
            new DictSeed(DICT_TYPE_TAB, 2L, "待评价", "pending", null, null, "Tab 文案"),
            new DictSeed(DICT_TYPE_TAB, 3L, "已评价", "evaluated", null, null, "Tab 文案"));

    private static final List<DictSeed> TIME_RANGE_SEEDS = List.of(
            new DictSeed(DICT_TYPE_TIME_RANGE, 1L, "本周", "week", null, null, "时间范围"),
            new DictSeed(DICT_TYPE_TIME_RANGE, 2L, "本月", "month", null, null, "时间范围"),
            new DictSeed(DICT_TYPE_TIME_RANGE, 3L, "全部", "all", null, null, "时间范围"));

    private static final List<DictSeed> COACHING_TYPE_SEEDS = List.of(
            new DictSeed(DICT_TYPE_COACHING_TYPE, 1L, "岗位辅导", "岗位辅导", "blue", null, "辅导类型"),
            new DictSeed(DICT_TYPE_COACHING_TYPE, 2L, "模拟应聘", "模拟应聘", "green", null, "辅导类型"));

    private static final List<DictSeed> CONTENT_TYPE_SEEDS = List.of(
            new DictSeed(DICT_TYPE_CONTENT_TYPE, 1L, "新简历", "新简历", "cyan", "课程详情", "课程内容"),
            new DictSeed(DICT_TYPE_CONTENT_TYPE, 2L, "简历更新", "简历更新", "gold", "课程详情", "课程内容"),
            new DictSeed(DICT_TYPE_CONTENT_TYPE, 3L, "Case准备", "Case准备", "processing", "课程详情", "课程内容"),
            new DictSeed(DICT_TYPE_CONTENT_TYPE, 4L, "模拟面试", "模拟面试", "success", "课程详情", "课程内容"),
            new DictSeed(DICT_TYPE_CONTENT_TYPE, 5L, "人际关系期中考试", "人际关系期中考试", "purple", "人际关系期中考试详情", "课程内容"),
            new DictSeed(DICT_TYPE_CONTENT_TYPE, 6L, "模拟期中考试", "模拟期中考试", "orange", "模拟期中考试详情", "课程内容"));

    private static final List<DictSeed> RATING_TAG_SEEDS = List.of(
            new DictSeed(DICT_TYPE_RATING_TAG, 1L, "专业能力强", "专业能力强", null, null, "评价标签"),
            new DictSeed(DICT_TYPE_RATING_TAG, 2L, "耐心细致", "耐心细致", null, null, "评价标签"),
            new DictSeed(DICT_TYPE_RATING_TAG, 3L, "反馈及时", "反馈及时", null, null, "评价标签"),
            new DictSeed(DICT_TYPE_RATING_TAG, 4L, "收获很大", "收获很大", null, null, "评价标签"),
            new DictSeed(DICT_TYPE_RATING_TAG, 5L, "准时守约", "准时守约", null, null, "评价标签"));

    @Autowired
    private StudentCourseRecordMapper studentCourseRecordMapper;

    @Autowired
    private SysDictDataMapper sysDictDataMapper;

    @Autowired
    private OsgClassRecordMapper osgClassRecordMapper;

    @Autowired
    private OsgIdentityResolver identityResolver;

    private final Object referenceDataLock = new Object();

    private volatile boolean referenceDataReady = false;

    @Override
    public Map<String, Object> selectCourseRecordMeta(Long userId)
    {
        List<Map<String, Object>> records = selectCourseRecordList(userId);
        Map<String, SysDictData> pageCopy = loadDictValueMap(DICT_TYPE_PAGE_COPY);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("pageSummary", buildPageSummary(pageCopy));
        payload.put("reminderBanner", buildReminderBanner(records, pageCopy));
        payload.put("tabDefinitions", buildTabDefinitions(records));
        payload.put("filters", buildFilters(records, pageCopy));
        payload.put("tableHeaders", buildTableHeaders(pageCopy));
        payload.put("detailDialog", buildDetailDialog(pageCopy));
        payload.put("ratingDialog", buildRatingDialog(pageCopy));
        return payload;
    }

    @Override
    public List<Map<String, Object>> selectCourseRecordList(Long userId)
    {
        syncReferenceData();
        Long studentId = identityResolver.resolveStudentIdByUserId(userId);
        List<Map<String, Object>> records = projectMainRecords(osgClassRecordMapper.selectStudentApprovedClassRecordList(studentId));
        Map<String, SysDictData> pageCopy = loadDictValueMap(DICT_TYPE_PAGE_COPY);
        Map<String, SysDictData> coachingTypeDict = loadDictValueMap(DICT_TYPE_COACHING_TYPE);
        Map<String, SysDictData> contentTypeDict = loadDictValueMap(DICT_TYPE_CONTENT_TYPE);

        for (Map<String, Object> record : records)
        {
            String coachingType = stringValue(record.get("coachingType"));
            String courseContent = stringValue(record.get("courseContent"));
            String ratingScoreValue = stringValue(record.get("ratingScoreValue"));
            boolean rated = StringUtils.hasText(ratingScoreValue);

            SysDictData coachingMeta = coachingTypeDict.get(coachingType);
            if (coachingMeta != null)
            {
                record.put("coachingTagColor", defaultString(coachingMeta.getCssClass(), "blue"));
            }

            SysDictData contentMeta = contentTypeDict.get(courseContent);
            if (contentMeta != null)
            {
                record.put("contentTagColor", defaultString(contentMeta.getCssClass(), "default"));
            }

            record.put("ratingLabel", rated ? "⭐ " + ratingScoreValue : dictLabel(pageCopy, "pendingRatingLabel", "待评价"));
            record.put("ratingColor", rated ? "green" : "orange");
            record.put("actionLabel", rated
                    ? dictLabel(pageCopy, "detailActionLabel", "查看详情")
                    : dictLabel(pageCopy, "rateActionLabel", "评价"));
            record.put("actionKind", rated ? "detail" : "rate");
            record.put("detailTitle", resolveDetailTitle(rated, contentMeta, pageCopy));
            record.put("tab", rated ? "evaluated" : "pending");
            record.put("newBadgeLabel", dictLabel(pageCopy, "newBadgeLabel", "NEW"));
        }
        return records;
    }

    @Override
    public int rateCourseRecord(String recordId, Integer ratingScore, List<String> ratingTags, String ratingFeedback, Long userId)
    {
        syncReferenceData();
        String normalizedRecordId = requireText(recordId, "课程记录不存在");
        Long studentId = identityResolver.resolveStudentIdByUserId(userId);
        OsgClassRecord record = osgClassRecordMapper.selectStudentClassRecordByClassId(normalizedRecordId, studentId);
        if (record == null)
        {
            Long fallbackRecordId = parseFallbackRecordId(normalizedRecordId);
            if (fallbackRecordId != null)
            {
                OsgClassRecord candidate = osgClassRecordMapper.selectClassRecordByRecordId(fallbackRecordId);
                if (candidate != null && studentId.equals(candidate.getStudentId()))
                {
                    record = candidate;
                }
            }
        }
        if (record == null)
        {
            throw new ServiceException("课程记录不存在或无权操作");
        }
        int normalizedScore = ratingScore == null ? 5 : ratingScore;
        if (normalizedScore < 1 || normalizedScore > 5)
        {
            throw new ServiceException("评分范围必须在1到5之间");
        }
        String normalizedTags = ratingTags == null || ratingTags.isEmpty() ? "" : String.join(",", ratingTags);
        String normalizedFeedback = requireText(ratingFeedback, "请填写详细反馈");
        OsgClassRecord patch = new OsgClassRecord();
        patch.setRecordId(record.getRecordId());
        patch.setRate(String.valueOf(normalizedScore));
        patch.setTopics(normalizedTags);
        patch.setComments(normalizedFeedback);
        patch.setRemark(normalizedFeedback);
        return osgClassRecordMapper.updateStudentClassRecordRating(patch);
    }

    private Long parseFallbackRecordId(String recordId)
    {
        String normalized = defaultString(recordId, "").trim();
        if (normalized.startsWith("#"))
        {
            normalized = normalized.substring(1).trim();
        }
        if (!normalized.chars().allMatch(Character::isDigit))
        {
            return null;
        }
        try
        {
            return Long.valueOf(normalized);
        }
        catch (NumberFormatException error)
        {
            return null;
        }
    }

    private List<Map<String, Object>> projectMainRecords(List<OsgClassRecord> rows)
    {
        if (rows == null || rows.isEmpty())
        {
            return new ArrayList<>();
        }
        SimpleDateFormat classDateFormatter = new SimpleDateFormat("MM/dd");
        SimpleDateFormat classDateRawFormatter = new SimpleDateFormat("yyyy-MM-dd");

        List<Map<String, Object>> projected = new ArrayList<>(rows.size());
        for (OsgClassRecord row : rows)
        {
            Map<String, Object> record = new LinkedHashMap<>();
            record.put("recordId", defaultString(row.getClassId(), "#" + row.getRecordId()));
            record.put("coachingType", toCoachingTypeLabel(row.getCourseType()));
            record.put("coachingDetail", toCoachingDetail(row));
            record.put("courseContent", toCourseContentLabel(row.getClassStatus()));
            record.put("mentor", defaultString(row.getMentorName(), "-"));
            record.put("mentorRole", toReporterRoleLabel(row.getCourseSource()));
            record.put("classDate", row.getClassDate() == null ? "" : classDateFormatter.format(row.getClassDate()));
            record.put("classDateRaw", row.getClassDate() == null ? "" : classDateRawFormatter.format(row.getClassDate()));
            record.put("isNew", !StringUtils.hasText(row.getRate()));
            record.put("duration", formatDuration(row.getDurationHours()));
            record.put("ratingScoreValue", defaultString(row.getRate(), ""));
            record.put("ratingTags", defaultString(row.getTopics(), ""));
            record.put("ratingFeedback", defaultString(row.getComments(), ""));
            projected.add(record);
        }
        return projected;
    }

    private String toCoachingDetail(OsgClassRecord row)
    {
        String courseContent = toCourseContentLabel(row.getClassStatus());
        if ("岗位辅导".equals(toCoachingTypeLabel(row.getCourseType())))
        {
            return courseContent;
        }
        return courseContent;
    }

    private String toCoachingTypeLabel(String courseType)
    {
        if ("mock_practice".equalsIgnoreCase(defaultString(courseType, "")))
        {
            return "模拟应聘";
        }
        return "岗位辅导";
    }

    private String toCourseContentLabel(String classStatus)
    {
        if (!StringUtils.hasText(classStatus))
        {
            return "其他";
        }
        return switch (classStatus.trim().toLowerCase()) {
            case "resume_revision" -> "新简历";
            case "resume_update" -> "简历更新";
            case "case_prep" -> "Case准备";
            case "mock_interview" -> "模拟面试";
            case "networking_midterm", "communication_midterm" -> "人际关系期中考试";
            case "mock_midterm", "midterm_exam" -> "模拟期中考试";
            case "behavioral" -> "Behavioral";
            default -> classStatus;
        };
    }

    private String toReporterRoleLabel(String courseSource)
    {
        if (!StringUtils.hasText(courseSource))
        {
            return "导师";
        }
        return switch (courseSource.trim().toLowerCase()) {
            case "assistant" -> "助教";
            case "clerk" -> "班主任";
            default -> "导师";
        };
    }

    private String formatDuration(Double durationHours)
    {
        if (durationHours == null)
        {
            return "";
        }
        BigDecimal value = BigDecimal.valueOf(durationHours).stripTrailingZeros();
        return value.toPlainString() + "h";
    }

    private Map<String, Object> buildPageSummary(Map<String, SysDictData> pageCopy)
    {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("titleZh", dictLabel(pageCopy, "titleZh", "课程记录"));
        summary.put("titleEn", dictLabel(pageCopy, "titleEn", "Class Records"));
        summary.put("subtitle", dictLabel(pageCopy, "subtitle", "查看我的上课记录和导师反馈"));
        return summary;
    }

    private Map<String, Object> buildReminderBanner(List<Map<String, Object>> records, Map<String, SysDictData> pageCopy)
    {
        long newRecordCount = records.stream().filter(this::isNewRecord).count();
        String mentorName = records.stream()
                .filter(this::isNewRecord)
                .map(record -> stringValue(record.get("mentor")))
                .filter(StringUtils::hasText)
                .findFirst()
                .orElse(dictLabel(pageCopy, "reminderFallbackMentor", "Jerry Li"));

        Map<String, Object> banner = new LinkedHashMap<>();
        banner.put("iconLabel", dictLabel(pageCopy, "reminderIconLabel", "CR"));
        banner.put("title", dictLabel(pageCopy, "reminderTitle", "新增课程记录"));
        banner.put("leadText", dictLabel(pageCopy, "reminderLeadText", "导师"));
        banner.put("mentorName", mentorName);
        banner.put("middleText", dictLabel(pageCopy, "reminderMiddleText", "为您填报了"));
        banner.put("newRecordCount", newRecordCount);
        banner.put("suffixText", dictLabel(pageCopy, "reminderSuffixText", "条新的上课记录，请及时评价"));
        banner.put("ctaLabel", dictLabel(pageCopy, "reminderCtaLabel", "去评价"));
        return banner;
    }

    private List<Map<String, Object>> buildTabDefinitions(List<Map<String, Object>> records)
    {
        Map<String, Integer> counts = new LinkedHashMap<>();
        counts.put("all", records.size());
        counts.put("pending", (int) records.stream().filter(record -> "pending".equals(stringValue(record.get("tab")))).count());
        counts.put("evaluated", (int) records.stream().filter(record -> "evaluated".equals(stringValue(record.get("tab")))).count());

        List<Map<String, Object>> tabs = new java.util.ArrayList<>();
        for (SysDictData item : loadDictItems(DICT_TYPE_TAB))
        {
            String key = item.getDictValue();
            int count = counts.getOrDefault(key, 0);
            Map<String, Object> tab = new LinkedHashMap<>();
            tab.put("key", key);
            tab.put("label", item.getDictLabel());
            tab.put("count", count);
            tab.put("displayLabel", "pending".equals(key) ? item.getDictLabel() + " " + count : item.getDictLabel());
            tabs.add(tab);
        }
        return tabs;
    }

    private Map<String, Object> buildFilters(List<Map<String, Object>> records, Map<String, SysDictData> pageCopy)
    {
        LinkedHashSet<String> coachingTypes = new LinkedHashSet<>();
        LinkedHashSet<String> courseContents = new LinkedHashSet<>();
        for (Map<String, Object> record : records)
        {
            if (StringUtils.hasText(stringValue(record.get("coachingType"))))
            {
                coachingTypes.add(stringValue(record.get("coachingType")));
            }
            if (StringUtils.hasText(stringValue(record.get("courseContent"))))
            {
                courseContents.add(stringValue(record.get("courseContent")));
            }
        }

        Map<String, Object> filters = new LinkedHashMap<>();
        filters.put("keywordPlaceholder", dictLabel(pageCopy, "keywordPlaceholder", "搜索导师..."));
        filters.put("coachingTypePlaceholder", dictLabel(pageCopy, "coachingTypePlaceholder", "辅导类型"));
        filters.put("courseContentPlaceholder", dictLabel(pageCopy, "courseContentPlaceholder", "课程内容"));
        filters.put("timeRangePlaceholder", dictLabel(pageCopy, "timeRangePlaceholder", "时间范围"));
        filters.put("resetLabel", dictLabel(pageCopy, "resetLabel", "重置"));
        filters.put("coachingTypeOptions", buildDynamicOptions(coachingTypes, loadDictValueMap(DICT_TYPE_COACHING_TYPE)));
        filters.put("courseContentOptions", buildDynamicOptions(courseContents, loadDictValueMap(DICT_TYPE_CONTENT_TYPE)));
        filters.put("timeRangeOptions", buildStaticOptions(DICT_TYPE_TIME_RANGE));
        return filters;
    }

    private Map<String, Object> buildTableHeaders(Map<String, SysDictData> pageCopy)
    {
        Map<String, Object> headers = new LinkedHashMap<>();
        headers.put("recordId", dictLabel(pageCopy, "tableRecordId", "记录ID"));
        headers.put("coachingDetail", dictLabel(pageCopy, "tableCoachingDetail", "辅导内容"));
        headers.put("courseContent", dictLabel(pageCopy, "tableCourseContent", "课程内容"));
        headers.put("mentor", dictLabel(pageCopy, "tableMentor", "导师"));
        headers.put("classDate", dictLabel(pageCopy, "tableClassDate", "上课日期"));
        headers.put("duration", dictLabel(pageCopy, "tableDuration", "时长"));
        headers.put("rating", dictLabel(pageCopy, "tableRating", "我的评价"));
        headers.put("action", dictLabel(pageCopy, "tableAction", "操作"));
        return headers;
    }

    private Map<String, Object> buildDetailDialog(Map<String, SysDictData> pageCopy)
    {
        Map<String, Object> dialog = new LinkedHashMap<>();
        dialog.put("closeLabel", dictLabel(pageCopy, "detailCloseLabel", "关闭"));
        dialog.put("confirmLabel", dictLabel(pageCopy, "detailConfirmLabel", "修改评价"));

        Map<String, Object> fields = new LinkedHashMap<>();
        fields.put("recordId", dictLabel(pageCopy, "detailRecordIdLabel", "记录ID"));
        fields.put("coachingDetail", dictLabel(pageCopy, "detailCoachingDetailLabel", "辅导内容"));
        fields.put("courseContent", dictLabel(pageCopy, "detailCourseContentLabel", "课程内容"));
        fields.put("mentor", dictLabel(pageCopy, "detailMentorLabel", "导师"));
        fields.put("classDate", dictLabel(pageCopy, "detailClassDateLabel", "上课日期"));
        fields.put("duration", dictLabel(pageCopy, "detailDurationLabel", "时长"));
        dialog.put("fields", fields);
        return dialog;
    }

    private Map<String, Object> buildRatingDialog(Map<String, SysDictData> pageCopy)
    {
        Map<String, Object> dialog = new LinkedHashMap<>();
        dialog.put("title", dictLabel(pageCopy, "ratingTitle", "课程评价"));
        dialog.put("scoreLabel", dictLabel(pageCopy, "ratingScoreLabel", "整体评分"));
        dialog.put("tagLabel", dictLabel(pageCopy, "ratingTagLabel", "评价标签"));
        dialog.put("feedbackLabel", dictLabel(pageCopy, "ratingFeedbackLabel", "详细反馈"));
        dialog.put("tagPlaceholder", dictLabel(pageCopy, "ratingTagPlaceholder", "请选择评价标签"));
        dialog.put("feedbackPlaceholder", dictLabel(pageCopy, "ratingFeedbackPlaceholder", "请详细描述您的上课体验、导师表现以及改进建议..."));
        dialog.put("cancelLabel", dictLabel(pageCopy, "ratingCancelLabel", "取消"));
        dialog.put("submitLabel", dictLabel(pageCopy, "ratingSubmitLabel", "提交评价"));
        dialog.put("successMessage", dictLabel(pageCopy, "ratingSuccessMessage", "评价提交成功"));
        dialog.put("tagOptions", buildStaticOptions(DICT_TYPE_RATING_TAG));
        return dialog;
    }

    private String resolveDetailTitle(boolean rated, SysDictData contentMeta, Map<String, SysDictData> pageCopy)
    {
        if (!rated)
        {
            return dictLabel(pageCopy, "ratingTitle", "课程评价");
        }
        if (contentMeta != null && StringUtils.hasText(contentMeta.getRemark()))
        {
            return contentMeta.getRemark();
        }
        return dictLabel(pageCopy, "detailDefaultTitle", "课程详情");
    }

    private boolean isNewRecord(Map<String, Object> record)
    {
        return "true".equalsIgnoreCase(stringValue(record.get("isNew"))) || "1".equals(stringValue(record.get("isNew")));
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

            for (DictSeed seed : PAGE_COPY_SEEDS)
            {
                upsertDictData(seed);
            }
            for (DictSeed seed : TAB_SEEDS)
            {
                upsertDictData(seed);
            }
            for (DictSeed seed : TIME_RANGE_SEEDS)
            {
                upsertDictData(seed);
            }
            for (DictSeed seed : COACHING_TYPE_SEEDS)
            {
                upsertDictData(seed);
            }
            for (DictSeed seed : CONTENT_TYPE_SEEDS)
            {
                upsertDictData(seed);
            }
            for (DictSeed seed : RATING_TAG_SEEDS)
            {
                upsertDictData(seed);
            }

            referenceDataReady = true;
        }
    }

    private List<Map<String, Object>> buildStaticOptions(String dictType)
    {
        List<Map<String, Object>> options = new java.util.ArrayList<>();
        for (SysDictData item : loadDictItems(dictType))
        {
            Map<String, Object> option = new LinkedHashMap<>();
            option.put("value", item.getDictValue());
            option.put("label", item.getDictLabel());
            if (StringUtils.hasText(item.getCssClass()))
            {
                option.put("color", item.getCssClass());
            }
            if (StringUtils.hasText(item.getRemark()))
            {
                option.put("remark", item.getRemark());
            }
            options.add(option);
        }
        return options;
    }

    private List<Map<String, Object>> buildDynamicOptions(LinkedHashSet<String> values, Map<String, SysDictData> dict)
    {
        List<Map<String, Object>> options = new java.util.ArrayList<>();
        for (String value : values)
        {
            SysDictData metadata = dict.get(value);
            Map<String, Object> option = new LinkedHashMap<>();
            option.put("value", value);
            option.put("label", metadata == null ? value : defaultString(metadata.getDictLabel(), value));
            if (metadata != null && StringUtils.hasText(metadata.getCssClass()))
            {
                option.put("color", metadata.getCssClass());
            }
            options.add(option);
        }
        return options;
    }

    private List<SysDictData> loadDictItems(String dictType)
    {
        Map<String, SysDictData> deduped = new LinkedHashMap<>();
        for (SysDictData item : sysDictDataMapper.selectDictDataByType(dictType))
        {
            deduped.putIfAbsent(item.getDictValue(), item);
        }
        return List.copyOf(deduped.values());
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

    private void upsertDictData(DictSeed seed)
    {
        SysDictData existing = findDict(seed.type(), seed.value());
        if (existing != null)
        {
            existing.setDictLabel(seed.label());
            existing.setCssClass(seed.cssClass());
            existing.setRemark(seed.remark());
            sysDictDataMapper.updateDictData(existing);
            return;
        }

        SysDictData created = new SysDictData();
        created.setDictType(seed.type());
        created.setDictLabel(seed.label());
        created.setDictValue(seed.value());
        created.setDictSort(seed.sort());
        created.setCssClass(seed.cssClass());
        created.setRemark(seed.remark());
        created.setStatus("0");
        sysDictDataMapper.insertDictData(created);
    }

    private SysDictData findDict(String dictType, String dictValue)
    {
        for (SysDictData item : loadDictItems(dictType))
        {
            if (dictValue.equals(item.getDictValue()))
            {
                return item;
            }
        }
        return null;
    }

    private String dictLabel(Map<String, SysDictData> dict, String value, String fallback)
    {
        SysDictData item = dict.get(value);
        return item == null ? fallback : defaultString(item.getDictLabel(), fallback);
    }

    private String requireText(String value, String message)
    {
        if (!StringUtils.hasText(value))
        {
            throw new ServiceException(message);
        }
        return value.trim();
    }

    private String defaultString(String value, String fallback)
    {
        return StringUtils.hasText(value) ? value : fallback;
    }

    private String stringValue(Object value)
    {
        return value == null ? "" : value.toString().trim();
    }

    private record DictSeed(String type, Long sort, String label, String value, String cssClass, String remark,
            String listClass)
    {
    }
}
