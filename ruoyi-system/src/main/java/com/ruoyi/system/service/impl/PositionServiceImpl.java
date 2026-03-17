package com.ruoyi.system.service.impl;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
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
import com.ruoyi.system.mapper.StudentJobPositionMapper;
import com.ruoyi.system.mapper.StudentProfileMapper;
import com.ruoyi.system.mapper.SysDictDataMapper;
import com.ruoyi.system.service.IPositionService;

/**
 * 岗位信息 业务层实现
 */
@Service
public class PositionServiceImpl implements IPositionService
{
    private static final String DICT_TYPE_POSITION_CATEGORY = "osg_student_position_category";
    private static final String DICT_TYPE_POSITION_INDUSTRY = "osg_student_position_industry";
    private static final String DICT_TYPE_POSITION_LOCATION = "osg_student_position_location";
    private static final String DICT_TYPE_POSITION_COMPANY = "osg_student_position_company_brand";
    private static final String DICT_TYPE_POSITION_APPLY_METHOD = "osg_student_position_apply_method";
    private static final String DICT_TYPE_POSITION_PROGRESS_STAGE = "osg_student_position_progress_stage";
    private static final String DICT_TYPE_POSITION_COACHING_STAGE = "osg_student_position_coaching_stage";
    private static final String DICT_TYPE_POSITION_MENTOR_COUNT = "osg_student_position_mentor_count";
    private static final String DICT_TYPE_APPLICATION_COACHING_STATUS = "osg_student_application_coaching_status";
    private static final String DICT_TYPE_APPLICATION_PAGE_COPY = "osg_student_application_page_copy";
    private static final DateTimeFormatter APPLICATION_DATE_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter APPLICATION_WEEKDAY = DateTimeFormatter.ofPattern("EEE", Locale.CHINA);
    private static final DateTimeFormatter APPLICATION_DAY = DateTimeFormatter.ofPattern("dd", Locale.CHINA);
    private static final DateTimeFormatter APPLICATION_TIME = DateTimeFormatter.ofPattern("HH:mm", Locale.CHINA);
    private static final DateTimeFormatter APPLICATION_MODAL_TIME = DateTimeFormatter.ofPattern("yyyy年M月d日 HH:mm", Locale.CHINA);

    private static final List<DictSeed> CATEGORY_SEEDS = List.of(
            new DictSeed(DICT_TYPE_POSITION_CATEGORY, 1L, "暑期实习", "summer", "blue", null, "岗位分类"),
            new DictSeed(DICT_TYPE_POSITION_CATEGORY, 2L, "全职招聘", "fulltime", "green", null, "岗位分类"),
            new DictSeed(DICT_TYPE_POSITION_CATEGORY, 3L, "非常规周期", "offcycle", "orange", null, "岗位分类"),
            new DictSeed(DICT_TYPE_POSITION_CATEGORY, 4L, "春季实习", "spring", "purple", null, "岗位分类"),
            new DictSeed(DICT_TYPE_POSITION_CATEGORY, 5L, "招聘活动", "events", "red", null, "岗位分类"));

    private static final List<DictSeed> INDUSTRY_SEEDS = List.of(
            new DictSeed(DICT_TYPE_POSITION_INDUSTRY, 1L, "Investment Bank", "ib", "bank", null, "行业展示"),
            new DictSeed(DICT_TYPE_POSITION_INDUSTRY, 2L, "Consulting", "consulting", "bulb", null, "行业展示"),
            new DictSeed(DICT_TYPE_POSITION_INDUSTRY, 3L, "Tech", "tech", "code", null, "行业展示"),
            new DictSeed(DICT_TYPE_POSITION_INDUSTRY, 4L, "PE / VC", "pevc", "fund", null, "行业展示"));

    private static final List<DictSeed> APPLY_METHOD_SEEDS = List.of(
            new DictSeed(DICT_TYPE_POSITION_APPLY_METHOD, 1L, "官网投递", "官网投递", null, null, "投递方式"),
            new DictSeed(DICT_TYPE_POSITION_APPLY_METHOD, 2L, "内推", "内推", null, null, "投递方式"),
            new DictSeed(DICT_TYPE_POSITION_APPLY_METHOD, 3L, "邮件投递", "邮件投递", null, null, "投递方式"));

    private static final List<DictSeed> PROGRESS_STAGE_SEEDS = List.of(
            new DictSeed(DICT_TYPE_POSITION_PROGRESS_STAGE, 1L, "已投递", "applied", "blue", null, "岗位进度"),
            new DictSeed(DICT_TYPE_POSITION_PROGRESS_STAGE, 2L, "HireVue / OT", "hirevue", "blue", null, "岗位进度"),
            new DictSeed(DICT_TYPE_POSITION_PROGRESS_STAGE, 3L, "First Round", "first", "orange", null, "岗位进度"),
            new DictSeed(DICT_TYPE_POSITION_PROGRESS_STAGE, 4L, "Second Round", "second", "orange", null, "岗位进度"),
            new DictSeed(DICT_TYPE_POSITION_PROGRESS_STAGE, 5L, "Case Study", "case", "gold", null, "岗位进度"),
            new DictSeed(DICT_TYPE_POSITION_PROGRESS_STAGE, 6L, "Offer", "offer", "green", null, "岗位进度"),
            new DictSeed(DICT_TYPE_POSITION_PROGRESS_STAGE, 7L, "已拒绝", "rejected", "red", null, "岗位进度"));

    private static final List<DictSeed> COACHING_STAGE_SEEDS = List.of(
            new DictSeed(DICT_TYPE_POSITION_COACHING_STAGE, 1L, "HireVue / Online Test", "hirevue", null, null, "辅导阶段"),
            new DictSeed(DICT_TYPE_POSITION_COACHING_STAGE, 2L, "Screening", "screening", null, null, "辅导阶段"),
            new DictSeed(DICT_TYPE_POSITION_COACHING_STAGE, 3L, "First Round", "first", null, null, "辅导阶段"),
            new DictSeed(DICT_TYPE_POSITION_COACHING_STAGE, 4L, "Second Round", "second", null, null, "辅导阶段"),
            new DictSeed(DICT_TYPE_POSITION_COACHING_STAGE, 5L, "Third Round+", "third", null, null, "辅导阶段"),
            new DictSeed(DICT_TYPE_POSITION_COACHING_STAGE, 6L, "Case Study", "case", null, null, "辅导阶段"),
            new DictSeed(DICT_TYPE_POSITION_COACHING_STAGE, 7L, "Superday / AC", "superday", null, null, "辅导阶段"));

    private static final List<DictSeed> MENTOR_COUNT_SEEDS = List.of(
            new DictSeed(DICT_TYPE_POSITION_MENTOR_COUNT, 1L, "0 位（仅资料）", "0", null, null, "导师数量"),
            new DictSeed(DICT_TYPE_POSITION_MENTOR_COUNT, 2L, "1 位导师", "1", null, null, "导师数量"),
            new DictSeed(DICT_TYPE_POSITION_MENTOR_COUNT, 3L, "2 位导师", "2", null, null, "导师数量"),
            new DictSeed(DICT_TYPE_POSITION_MENTOR_COUNT, 4L, "3 位导师", "3", null, null, "导师数量"));

    private static final List<DictSeed> APPLICATION_COACHING_STATUS_SEEDS = List.of(
            new DictSeed(DICT_TYPE_APPLICATION_COACHING_STATUS, 1L, "辅导中", "coaching", "purple", null, "求职页辅导状态"),
            new DictSeed(DICT_TYPE_APPLICATION_COACHING_STATUS, 2L, "待审批", "pending", "warning", null, "求职页辅导状态"),
            new DictSeed(DICT_TYPE_APPLICATION_COACHING_STATUS, 3L, "无辅导", "none", "default", null, "求职页辅导状态"));

    private static final List<DictSeed> APPLICATION_PAGE_COPY_SEEDS = List.of(
            new DictSeed(DICT_TYPE_APPLICATION_PAGE_COPY, 1L, "我的求职", "titleZh", null, null, "求职页文案"),
            new DictSeed(DICT_TYPE_APPLICATION_PAGE_COPY, 2L, "My Applications", "titleEn", null, null, "求职页文案"),
            new DictSeed(DICT_TYPE_APPLICATION_PAGE_COPY, 3L, "查看您的岗位申请和面试安排", "subtitle", null, null, "求职页文案"));

    @Autowired
    private StudentJobPositionMapper studentJobPositionMapper;

    @Autowired
    private StudentProfileMapper studentProfileMapper;

    @Autowired
    private SysDictDataMapper sysDictDataMapper;

    /**
     * 查询岗位列表
     */
    @Override
    public List<Map<String, Object>> selectPositionList(Long userId)
    {
        List<Map<String, Object>> positions = loadVisiblePositions(userId);
        syncPositionReferenceData(positions);

        Map<String, SysDictData> categoryDict = loadDictValueMap(DICT_TYPE_POSITION_CATEGORY);
        Map<String, SysDictData> industryDict = loadDictValueMap(DICT_TYPE_POSITION_INDUSTRY);
        Map<String, SysDictData> locationDict = loadDictValueMap(DICT_TYPE_POSITION_LOCATION);
        Map<String, SysDictData> companyDict = loadDictValueMap(DICT_TYPE_POSITION_COMPANY);

        for (Map<String, Object> position : positions)
        {
            String category = stringValue(position.get("category"));
            String industry = stringValue(position.get("industry"));
            String location = stringValue(position.get("location"));
            String companyKey = stringValue(position.get("companyKey"));

            SysDictData categoryMeta = categoryDict.get(category);
            if (categoryMeta != null)
            {
                position.put("categoryText", defaultString(categoryMeta.getDictLabel(), category));
                position.put("categoryColor", defaultString(categoryMeta.getCssClass(), "blue"));
            }

            SysDictData industryMeta = industryDict.get(industry);
            if (industryMeta != null)
            {
                position.put("industryLabel", defaultString(industryMeta.getDictLabel(), industry));
                position.put("industryIconKey", defaultString(industryMeta.getCssClass(), "bank"));
            }

            SysDictData locationMeta = locationDict.get(location);
            if (locationMeta != null)
            {
                position.put("locationCode", defaultString(locationMeta.getCssClass(), normalizeLocationCode(location)));
            }

            SysDictData companyMeta = companyDict.get(companyKey);
            if (companyMeta != null)
            {
                position.put("companyBrandColor", defaultString(companyMeta.getCssClass(), colorForCompanyKey(companyKey)));
            }
        }
        return positions;
    }

    /**
     * 查询岗位页元数据
     */
    @Override
    public Map<String, Object> selectPositionMeta(Long userId)
    {
        List<Map<String, Object>> positions = loadVisiblePositions(userId);
        syncPositionReferenceData(positions);

        Map<String, SysDictData> categoryDict = loadDictValueMap(DICT_TYPE_POSITION_CATEGORY);
        Map<String, SysDictData> industryDict = loadDictValueMap(DICT_TYPE_POSITION_INDUSTRY);
        Map<String, SysDictData> locationDict = loadDictValueMap(DICT_TYPE_POSITION_LOCATION);
        Map<String, SysDictData> companyDict = loadDictValueMap(DICT_TYPE_POSITION_COMPANY);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("intentSummary", buildIntentSummary(userId, positions, industryDict));

        Map<String, Object> filterOptions = new LinkedHashMap<>();
        filterOptions.put("categories", buildCategoryOptions(positions, categoryDict));
        filterOptions.put("industries", buildIndustryOptions(positions, industryDict));
        filterOptions.put("companies", buildCompanyOptions(positions, companyDict));
        filterOptions.put("locations", buildLocationOptions(positions, locationDict));
        filterOptions.put("applyMethods", buildStaticOptions(DICT_TYPE_POSITION_APPLY_METHOD));
        filterOptions.put("progressStages", buildStaticOptions(DICT_TYPE_POSITION_PROGRESS_STAGE));
        filterOptions.put("coachingStages", buildStaticOptions(DICT_TYPE_POSITION_COACHING_STAGE));
        filterOptions.put("mentorCounts", buildStaticOptions(DICT_TYPE_POSITION_MENTOR_COUNT));
        payload.put("filterOptions", filterOptions);
        return payload;
    }

    /**
     * 查询申请追踪列表
     */
    @Override
    public List<Map<String, Object>> selectApplicationList(Long userId)
    {
        List<Map<String, Object>> applications = studentJobPositionMapper.selectApplicationList(userId);
        syncApplicationReferenceData(applications);

        Map<String, SysDictData> stageDict = loadDictValueMap(DICT_TYPE_POSITION_PROGRESS_STAGE);
        Map<String, SysDictData> coachingStatusDict = loadDictValueMap(DICT_TYPE_APPLICATION_COACHING_STATUS);
        Map<String, SysDictData> industryDict = loadDictValueMap(DICT_TYPE_POSITION_INDUSTRY);

        for (Map<String, Object> application : applications)
        {
            String stage = stringValue(application.get("stage"));
            String coachingStatus = stringValue(application.get("coachingStatus"));
            String companyType = stringValue(application.get("companyType"));

            SysDictData stageMeta = stageDict.get(stage);
            if (stageMeta != null)
            {
                application.put("stageLabel", defaultString(stageMeta.getDictLabel(), stage));
                application.put("stageColor", defaultString(stageMeta.getCssClass(), stringValue(application.get("stageColor"))));
            }

            SysDictData coachingMeta = coachingStatusDict.get(coachingStatus);
            if (coachingMeta != null)
            {
                application.put("coachingStatusLabel", defaultString(coachingMeta.getDictLabel(), coachingStatus));
                application.put("coachingColor", defaultString(coachingMeta.getCssClass(), stringValue(application.get("coachingColor"))));
            }

            SysDictData companyTypeMeta = industryDict.get(companyType);
            if (companyTypeMeta != null)
            {
                application.put("companyTypeLabel", defaultString(companyTypeMeta.getDictLabel(), companyType));
                application.put("companyTypeIconKey", defaultString(companyTypeMeta.getCssClass(), ""));
            }

            application.put("bucket", resolveApplicationBucket(stage));
        }

        return applications;
    }

    /**
     * 查询申请追踪页元数据
     */
    @Override
    public Map<String, Object> selectApplicationMeta(Long userId)
    {
        List<Map<String, Object>> applications = selectApplicationList(userId);
        Map<String, SysDictData> pageCopy = loadDictValueMap(DICT_TYPE_APPLICATION_PAGE_COPY);
        Map<String, SysDictData> industryDict = loadDictValueMap(DICT_TYPE_POSITION_INDUSTRY);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("pageSummary", buildApplicationPageSummary(pageCopy));
        payload.put("tabCounts", buildApplicationTabCounts(applications));

        Map<String, Object> filterOptions = new LinkedHashMap<>();
        filterOptions.put("progressStages", buildStaticOptions(DICT_TYPE_POSITION_PROGRESS_STAGE));
        filterOptions.put("coachingStatuses", buildStaticOptions(DICT_TYPE_APPLICATION_COACHING_STATUS));
        filterOptions.put("companyTypes", buildApplicationCompanyTypeOptions(applications, industryDict));
        filterOptions.put("applyMethods", buildStaticOptions(DICT_TYPE_POSITION_APPLY_METHOD));
        payload.put("filterOptions", filterOptions);
        payload.put("schedule", buildApplicationSchedule(applications));
        return payload;
    }

    /**
     * 标记投递状态
     */
    @Override
    public int updateApplyStatus(Long positionId, Boolean applied, String appliedDate, String method, String note, Long userId)
    {
        ensurePositionVisible(positionId, userId);
        boolean appliedFlag = Boolean.TRUE.equals(applied);
        LocalDate normalizedDate = appliedFlag ? parseRequiredDate(appliedDate) : null;
        String normalizedMethod = appliedFlag ? defaultString(method, "官网投递") : null;
        String normalizedNote = appliedFlag ? defaultString(note, "") : "";
        return studentJobPositionMapper.upsertApplyState(
                positionId,
                userId,
                asFlag(appliedFlag),
                normalizedDate,
                normalizedMethod,
                normalizedNote,
                "applied",
                "");
    }

    /**
     * 收藏岗位
     */
    @Override
    public int updateFavoriteStatus(Long positionId, Boolean favorited, Long userId)
    {
        ensurePositionVisible(positionId, userId);
        return studentJobPositionMapper.upsertFavoriteState(positionId, userId, asFlag(Boolean.TRUE.equals(favorited)));
    }

    /**
     * 记录进度
     */
    @Override
    public int insertProgress(Long positionId, String stage, String notes, Long userId)
    {
        ensurePositionVisible(positionId, userId);
        if (!StringUtils.hasText(stage))
        {
            throw new ServiceException("当前阶段不能为空");
        }
        return studentJobPositionMapper.upsertProgressState(positionId, userId, stage.trim(), defaultString(notes, ""));
    }

    /**
     * 提交岗位辅导申请
     */
    @Override
    public int requestCoaching(Long positionId, String stage, String mentorCount, String note, Long userId)
    {
        ensurePositionVisible(positionId, userId);
        if (!StringUtils.hasText(stage))
        {
            throw new ServiceException("请选择当前面试阶段");
        }
        if (!StringUtils.hasText(mentorCount))
        {
            throw new ServiceException("请选择导师数量");
        }
        return studentJobPositionMapper.upsertCoachingState(
                positionId,
                userId,
                "pending",
                stage.trim(),
                mentorCount.trim(),
                defaultString(note, ""));
    }

    /**
     * 手动添加岗位
     */
    @Override
    public Long createManualPosition(String category, String title, String company, String location, Long userId)
    {
        if (!StringUtils.hasText(category) || !StringUtils.hasText(title) || !StringUtils.hasText(company) || !StringUtils.hasText(location))
        {
            throw new ServiceException("请完整填写岗位分类、岗位名称、公司名称和工作地点");
        }

        syncPositionReferenceData(List.of());

        String normalizedCompany = company.trim();
        String normalizedTitle = title.trim();
        String normalizedLocation = location.trim();
        String companyKey = normalizeCompanyKey(normalizedCompany);
        String companyCode = normalizeCompanyCode(normalizedCompany);
        String recruitCycle = resolveProfileField(userId, "recruitmentCycle", "Open");
        String primaryDirection = resolveProfileField(userId, "primaryDirection", "Investment Bank");
        String industryValue = resolveIndustryValue(primaryDirection);

        upsertLocationMeta(normalizedLocation);
        upsertCompanyMeta(companyKey, normalizedCompany, companyCode);

        Map<String, Object> params = new LinkedHashMap<>();
        params.put("businessKey", "manual:" + userId + ":" + System.currentTimeMillis());
        params.put("title", normalizedTitle);
        params.put("company", normalizedCompany);
        params.put("category", category.trim());
        params.put("department", "Pending");
        params.put("location", normalizedLocation);
        params.put("recruitCycle", recruitCycle);
        params.put("publishDate", LocalDate.now());
        params.put("deadline", null);
        params.put("positionUrl", "#");
        params.put("careerUrl", "#");
        params.put("companyKey", companyKey);
        params.put("companyCode", companyCode);
        params.put("industry", industryValue);
        params.put("requirements", "");
        params.put("ownerUserId", userId);
        studentJobPositionMapper.insertManualPosition(params);
        Object positionId = params.get("positionId");
        return positionId instanceof Number ? ((Number) positionId).longValue() : null;
    }

    private List<Map<String, Object>> loadVisiblePositions(Long userId)
    {
        List<Map<String, Object>> positions = studentJobPositionMapper.selectPositionList(userId);
        for (Map<String, Object> position : positions)
        {
            position.put("favorited", asBoolean(position.get("favorited")));
            position.put("applied", asBoolean(position.get("applied")));
        }
        return positions;
    }

    private void syncPositionReferenceData(List<Map<String, Object>> positions)
    {
        seedStaticDicts(CATEGORY_SEEDS);
        seedStaticDicts(INDUSTRY_SEEDS);
        seedStaticDicts(APPLY_METHOD_SEEDS);
        seedStaticDicts(PROGRESS_STAGE_SEEDS);
        seedStaticDicts(COACHING_STAGE_SEEDS);
        seedStaticDicts(MENTOR_COUNT_SEEDS);

        for (Map<String, Object> position : positions)
        {
            String location = stringValue(position.get("location"));
            if (StringUtils.hasText(location))
            {
                upsertLocationMeta(location);
            }

            String companyKey = stringValue(position.get("companyKey"));
            String company = stringValue(position.get("company"));
            String companyCode = stringValue(position.get("companyCode"));
            if (StringUtils.hasText(companyKey) && StringUtils.hasText(company))
            {
                upsertCompanyMeta(companyKey, company, companyCode);
            }
        }
    }

    private void syncApplicationReferenceData(List<Map<String, Object>> applications)
    {
        seedStaticDicts(INDUSTRY_SEEDS);
        seedStaticDicts(APPLY_METHOD_SEEDS);
        seedStaticDicts(PROGRESS_STAGE_SEEDS);
        seedStaticDicts(APPLICATION_COACHING_STATUS_SEEDS);
        seedStaticDicts(APPLICATION_PAGE_COPY_SEEDS);

        for (Map<String, Object> application : applications)
        {
            String companyType = stringValue(application.get("companyType"));
            if (!StringUtils.hasText(companyType))
            {
                continue;
            }

            SysDictData industryMeta = findDict(DICT_TYPE_POSITION_INDUSTRY, companyType);
            if (industryMeta == null)
            {
                upsertDictData(new DictSeed(
                        DICT_TYPE_POSITION_INDUSTRY,
                        nextDynamicSort(DICT_TYPE_POSITION_INDUSTRY),
                        companyType,
                        companyType,
                        "bank",
                        null,
                        "行业展示"));
            }
        }
    }

    private Map<String, Object> buildApplicationPageSummary(Map<String, SysDictData> pageCopy)
    {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("titleZh", dictLabel(pageCopy, "titleZh", "我的求职"));
        summary.put("titleEn", dictLabel(pageCopy, "titleEn", "My Applications"));
        summary.put("subtitle", dictLabel(pageCopy, "subtitle", "查看您的岗位申请和面试安排"));
        return summary;
    }

    private Map<String, Object> buildApplicationTabCounts(List<Map<String, Object>> applications)
    {
        Map<String, Object> counts = new LinkedHashMap<>();
        counts.put("all", applications.size());
        counts.put("applied", applications.stream().filter(application -> Objects.equals("applied", application.get("bucket"))).count());
        counts.put("ongoing", applications.stream().filter(application -> Objects.equals("ongoing", application.get("bucket"))).count());
        counts.put("completed", applications.stream().filter(application -> Objects.equals("completed", application.get("bucket"))).count());
        return counts;
    }

    private List<Map<String, Object>> buildApplicationCompanyTypeOptions(
            List<Map<String, Object>> applications,
            Map<String, SysDictData> industryDict
    )
    {
        LinkedHashSet<String> values = new LinkedHashSet<>();
        for (Map<String, Object> application : applications)
        {
            values.add(stringValue(application.get("companyType")));
        }
        return buildDynamicOptions(values, industryDict);
    }

    private List<Map<String, Object>> buildApplicationSchedule(List<Map<String, Object>> applications)
    {
        List<Map<String, Object>> scheduleItems = new ArrayList<>();
        List<Map<String, Object>> sorted = new ArrayList<>(applications);
        sorted.removeIf(application -> parseApplicationInterviewAt(stringValue(application.get("interviewAt"))) == null);
        sorted.sort((left, right) -> {
            LocalDateTime leftTime = parseApplicationInterviewAt(stringValue(left.get("interviewAt")));
            LocalDateTime rightTime = parseApplicationInterviewAt(stringValue(right.get("interviewAt")));
            if (leftTime == null && rightTime == null)
            {
                return 0;
            }
            if (leftTime == null)
            {
                return 1;
            }
            if (rightTime == null)
            {
                return -1;
            }
            return leftTime.compareTo(rightTime);
        });

        for (int index = 0; index < Math.min(sorted.size(), 2); index++)
        {
            Map<String, Object> application = sorted.get(index);
            LocalDateTime interviewAt = parseApplicationInterviewAt(stringValue(application.get("interviewAt")));
            if (interviewAt == null)
            {
                continue;
            }

            String accent = switch (index)
            {
                case 0 -> "danger";
                case 1 -> "warning";
                default -> "info";
            };

            Map<String, Object> scheduleItem = new LinkedHashMap<>();
            scheduleItem.put("id", application.get("id"));
            scheduleItem.put("shortLabel", buildApplicationScheduleShortLabel(application));
            scheduleItem.put("title", stringValue(application.get("company")) + " - " + stringValue(application.get("stageLabel")));
            scheduleItem.put("position", stringValue(application.get("position")));
            scheduleItem.put("location", stringValue(application.get("location")));
            scheduleItem.put("weekdayLabel", APPLICATION_WEEKDAY.format(interviewAt));
            scheduleItem.put("dayLabel", APPLICATION_DAY.format(interviewAt));
            scheduleItem.put("timeLabel", APPLICATION_TIME.format(interviewAt));
            scheduleItem.put("modalTime", APPLICATION_MODAL_TIME.format(interviewAt));
            scheduleItem.put("accentClass", accent + "-chip");
            scheduleItem.put("borderClass", accent + "-border");
            scheduleItems.add(scheduleItem);
        }
        return scheduleItems;
    }

    private String buildApplicationScheduleShortLabel(Map<String, Object> application)
    {
        String company = stringValue(application.get("company"));
        String stageLabel = stringValue(application.get("stageLabel"));
        return toCompanyShortLabel(company) + " " + stageLabel;
    }

    private void seedStaticDicts(List<DictSeed> seeds)
    {
        for (DictSeed seed : seeds)
        {
            upsertDictData(seed);
        }
    }

    private Map<String, Object> buildIntentSummary(
            Long userId,
            List<Map<String, Object>> positions,
            Map<String, SysDictData> industryDict
    )
    {
        Map<String, Object> profile = studentProfileMapper.selectProfileByUserId(userId);
        String recruitmentCycle = resolveSummaryValue(profile == null ? null : profile.get("recruitmentCycle"),
                positions.stream().map(position -> stringValue(position.get("recruitCycle"))).filter(StringUtils::hasText).findFirst().orElse("-"));
        String targetRegion = resolveSummaryValue(profile == null ? null : profile.get("targetRegion"),
                positions.stream().map(position -> stringValue(position.get("location"))).filter(StringUtils::hasText).findFirst().orElse("-"));
        String primaryDirection = resolveSummaryValue(profile == null ? null : profile.get("primaryDirection"),
                positions.stream()
                        .map(position -> industryDict.get(stringValue(position.get("industry"))))
                        .filter(Objects::nonNull)
                        .map(SysDictData::getDictLabel)
                        .filter(StringUtils::hasText)
                        .findFirst()
                        .orElse("-"));

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("recruitmentCycle", recruitmentCycle);
        summary.put("targetRegion", targetRegion);
        summary.put("primaryDirection", primaryDirection);
        return summary;
    }

    private List<Map<String, Object>> buildCategoryOptions(List<Map<String, Object>> positions, Map<String, SysDictData> categoryDict)
    {
        LinkedHashSet<String> values = new LinkedHashSet<>();
        for (Map<String, Object> position : positions)
        {
            values.add(stringValue(position.get("category")));
        }
        return buildDynamicOptions(values, categoryDict);
    }

    private List<Map<String, Object>> buildIndustryOptions(List<Map<String, Object>> positions, Map<String, SysDictData> industryDict)
    {
        LinkedHashSet<String> values = new LinkedHashSet<>();
        for (Map<String, Object> position : positions)
        {
            values.add(stringValue(position.get("industry")));
        }
        return buildDynamicOptions(values, industryDict);
    }

    private List<Map<String, Object>> buildCompanyOptions(List<Map<String, Object>> positions, Map<String, SysDictData> companyDict)
    {
        LinkedHashSet<String> values = new LinkedHashSet<>();
        for (Map<String, Object> position : positions)
        {
            values.add(stringValue(position.get("companyKey")));
        }
        return buildDynamicOptions(values, companyDict);
    }

    private List<Map<String, Object>> buildLocationOptions(List<Map<String, Object>> positions, Map<String, SysDictData> locationDict)
    {
        LinkedHashSet<String> values = new LinkedHashSet<>();
        for (Map<String, Object> position : positions)
        {
            values.add(stringValue(position.get("location")));
        }
        return buildDynamicOptions(values, locationDict);
    }

    private List<Map<String, Object>> buildStaticOptions(String dictType)
    {
        List<Map<String, Object>> options = new ArrayList<>();
        for (SysDictData item : sysDictDataMapper.selectDictDataByType(dictType))
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
            options.add(option(metadata.getDictValue(), metadata.getDictLabel(), metadata.getCssClass(), metadata.getListClass(), metadata.getDictSort()));
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
            if (cssClass.startsWith("#"))
            {
                option.put("brandColor", cssClass);
            }
            else if (cssClass.length() <= 16)
            {
                option.put("iconKey", cssClass);
                option.put("color", cssClass);
            }
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

    private Map<String, SysDictData> loadDictValueMap(String dictType)
    {
        Map<String, SysDictData> dict = new LinkedHashMap<>();
        for (SysDictData item : sysDictDataMapper.selectDictDataByType(dictType))
        {
            dict.put(item.getDictValue(), item);
        }
        return dict;
    }

    private void upsertLocationMeta(String location)
    {
        upsertDictData(new DictSeed(
                DICT_TYPE_POSITION_LOCATION,
                nextDynamicSort(DICT_TYPE_POSITION_LOCATION),
                location,
                location,
                normalizeLocationCode(location),
                null,
                "地区展示"));
    }

    private void upsertCompanyMeta(String companyKey, String company, String companyCode)
    {
        upsertDictData(new DictSeed(
                DICT_TYPE_POSITION_COMPANY,
                nextDynamicSort(DICT_TYPE_POSITION_COMPANY),
                company,
                companyKey,
                colorForCompanyKey(companyKey),
                defaultString(companyCode, normalizeCompanyCode(company)),
                "公司品牌"));
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
        for (SysDictData item : sysDictDataMapper.selectDictDataByType(dictType))
        {
            if (Objects.equals(item.getDictValue(), dictValue))
            {
                return item;
            }
        }
        return null;
    }

    private long nextDynamicSort(String dictType)
    {
        List<SysDictData> dicts = sysDictDataMapper.selectDictDataByType(dictType);
        return dicts.stream().map(SysDictData::getDictSort).filter(Objects::nonNull).max(Long::compareTo).orElse(0L) + 1L;
    }

    private String resolveIndustryValue(String primaryDirection)
    {
        String normalized = defaultString(primaryDirection, "");
        for (SysDictData item : sysDictDataMapper.selectDictDataByType(DICT_TYPE_POSITION_INDUSTRY))
        {
            if (normalized.equalsIgnoreCase(item.getDictLabel()) || normalized.equalsIgnoreCase(item.getDictValue()))
            {
                return item.getDictValue();
            }
        }
        String lower = normalized.toLowerCase(Locale.ROOT);
        if (lower.contains("consult"))
        {
            return "consulting";
        }
        if (lower.contains("tech"))
        {
            return "tech";
        }
        if (lower.contains("pe") || lower.contains("vc"))
        {
            return "pevc";
        }
        return "ib";
    }

    private String resolveProfileField(Long userId, String key, String fallback)
    {
        Map<String, Object> profile = studentProfileMapper.selectProfileByUserId(userId);
        if (profile == null)
        {
            return fallback;
        }
        return resolveSummaryValue(profile.get(key), fallback);
    }

    private String resolveSummaryValue(Object value, String fallback)
    {
        String normalized = stringValue(value);
        if (!StringUtils.hasText(normalized) || "-".equals(normalized))
        {
            return fallback;
        }
        return normalized;
    }

    private String normalizeLocationCode(String location)
    {
        String normalized = defaultString(location, "").trim().toLowerCase(Locale.ROOT);
        if (normalized.contains("hong kong"))
        {
            return "hk";
        }
        if (normalized.contains("new york"))
        {
            return "ny";
        }
        if (normalized.contains("shanghai"))
        {
            return "sh";
        }
        if (normalized.contains("san francisco"))
        {
            return "sf";
        }
        if (normalized.contains("london"))
        {
            return "ldn";
        }
        if (normalized.isEmpty())
        {
            return "na";
        }
        return normalized.replaceAll("[^a-z0-9]", "").substring(0, Math.min(3, normalized.replaceAll("[^a-z0-9]", "").length()));
    }

    private String colorForCompanyKey(String companyKey)
    {
        Map<String, String> colors = Map.of(
                "gs", "#4F46E5",
                "jpm", "#0369A1",
                "mck", "#7C3AED",
                "goog", "#EA4335",
                "ms", "#1D4ED8",
                "bcg", "#059669");
        if (colors.containsKey(companyKey))
        {
            return colors.get(companyKey);
        }

        String[] palette = { "#2563EB", "#0F766E", "#7C3AED", "#D97706", "#DC2626", "#4F46E5" };
        int index = Math.abs(defaultString(companyKey, "company").hashCode()) % palette.length;
        return palette[index];
    }

    private void ensurePositionVisible(Long positionId, Long userId)
    {
        if (positionId == null || studentJobPositionMapper.countVisiblePosition(positionId, userId) == 0)
        {
            throw new ServiceException("岗位不存在或无权操作");
        }
    }

    private LocalDate parseRequiredDate(String appliedDate)
    {
        if (!StringUtils.hasText(appliedDate))
        {
            throw new ServiceException("请选择投递日期");
        }
        try
        {
            return LocalDate.parse(appliedDate.trim());
        }
        catch (DateTimeParseException error)
        {
            throw new ServiceException("投递日期格式不正确");
        }
    }

    private String normalizeCompanyKey(String company)
    {
        String normalized = company.replaceAll("[^A-Za-z0-9]", "").toLowerCase(Locale.ROOT);
        if (normalized.isEmpty())
        {
            return "manual";
        }
        return normalized.substring(0, Math.min(3, normalized.length()));
    }

    private String normalizeCompanyCode(String company)
    {
        return normalizeCompanyKey(company).toUpperCase(Locale.ROOT);
    }

    private LocalDateTime parseApplicationInterviewAt(String value)
    {
        if (!StringUtils.hasText(value))
        {
            return null;
        }
        try
        {
            return LocalDateTime.parse(value, APPLICATION_DATE_TIME);
        }
        catch (DateTimeParseException error)
        {
            return null;
        }
    }

    private String resolveApplicationBucket(String stage)
    {
        if ("offer".equals(stage) || "rejected".equals(stage))
        {
            return "completed";
        }
        if ("applied".equals(stage))
        {
            return "applied";
        }
        return "ongoing";
    }

    private String toCompanyShortLabel(String company)
    {
        if ("Goldman Sachs".equals(company))
        {
            return "GS";
        }
        if ("McKinsey".equals(company))
        {
            return "MCK";
        }
        if ("JP Morgan".equals(company))
        {
            return "JPM";
        }
        StringBuilder label = new StringBuilder();
        for (String segment : company.split(" "))
        {
            if (segment.isBlank())
            {
                continue;
            }
            label.append(Character.toUpperCase(segment.charAt(0)));
        }
        return label.isEmpty() ? "APP" : label.toString();
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

    private boolean asBoolean(Object value)
    {
        if (value instanceof Boolean)
        {
            return (Boolean) value;
        }
        if (value instanceof Number)
        {
            return ((Number) value).intValue() != 0;
        }
        return "1".equals(String.valueOf(value)) || "true".equalsIgnoreCase(String.valueOf(value));
    }

    private String asFlag(boolean value)
    {
        return value ? "1" : "0";
    }

    private String defaultString(String value, String defaultValue)
    {
        return StringUtils.hasText(value) ? value.trim() : defaultValue;
    }

    private String stringValue(Object value)
    {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private record DictSeed(String type, Long sort, String label, String value, String cssClass, String listClass,
            String remark)
    {
    }
}
