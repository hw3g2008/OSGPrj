package com.ruoyi.system.service.impl;

import java.time.ZoneId;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.Objects;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import com.ruoyi.common.core.domain.entity.SysDictData;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgJobApplication;
import com.ruoyi.system.domain.OsgPosition;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.domain.OsgStudentPosition;
import com.ruoyi.system.mapper.OsgJobApplicationMapper;
import com.ruoyi.system.mapper.OsgPositionMapper;
import com.ruoyi.system.mapper.OsgStudentPositionMapper;
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
    private static final String PUBLIC_DISPLAY_STATUS = "visible";
    private static final String STUDENT_POSITION_STATUS_PENDING = "pending";
    private static final String STUDENT_POSITION_STATUS_APPROVED = "approved";
    private static final String STUDENT_POSITION_STATUS_REJECTED = "rejected";
    private static final long PUBLIC_POSITION_VISIBILITY_GRACE_MILLIS = 1000L;
    private static final DateTimeFormatter APPLICATION_DATE_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter APPLICATION_WEEKDAY = DateTimeFormatter.ofPattern("EEE", Locale.CHINA);
    private static final DateTimeFormatter APPLICATION_DAY = DateTimeFormatter.ofPattern("dd", Locale.CHINA);
    private static final DateTimeFormatter APPLICATION_TIME = DateTimeFormatter.ofPattern("HH:mm", Locale.CHINA);
    private static final DateTimeFormatter APPLICATION_MODAL_TIME = DateTimeFormatter.ofPattern("yyyy年M月d日 HH:mm", Locale.CHINA);
    private static final DateTimeFormatter MONTH_DAY = DateTimeFormatter.ofPattern("MM-dd");

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

    @Autowired
    private OsgPositionMapper positionMapper;

    @Autowired
    private OsgJobApplicationMapper jobApplicationMapper;

    @Autowired
    private OsgStudentPositionMapper studentPositionMapper;

    @Autowired
    private OsgIdentityResolver identityResolver;

    /**
     * 查询岗位列表
     */
    @Override
    public List<Map<String, Object>> selectPositionList(Long userId)
    {
        Map<String, List<SysDictData>> prefetchedDicts = loadDictRowsByTypes(List.of(
                DICT_TYPE_POSITION_CATEGORY,
                DICT_TYPE_POSITION_INDUSTRY,
                DICT_TYPE_POSITION_LOCATION,
                DICT_TYPE_POSITION_COMPANY));
        Map<String, SysDictData> categoryDict = loadDictValueMap(prefetchedDicts, DICT_TYPE_POSITION_CATEGORY);
        Map<String, SysDictData> industryDict = loadDictValueMap(prefetchedDicts, DICT_TYPE_POSITION_INDUSTRY);
        Map<String, SysDictData> locationDict = loadDictValueMap(prefetchedDicts, DICT_TYPE_POSITION_LOCATION);
        Map<String, SysDictData> companyDict = loadDictValueMap(prefetchedDicts, DICT_TYPE_POSITION_COMPANY);
        List<Map<String, Object>> positions = loadVisiblePositions(userId, industryDict, companyDict, true);

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
            else
            {
                position.put("industryLabel", fallbackIndustryLabel(industry));
                position.put("industryIconKey", fallbackIndustryIcon(industry));
            }

            SysDictData locationMeta = locationDict.get(location);
            if (locationMeta != null)
            {
                position.put("locationCode", defaultString(locationMeta.getCssClass(), normalizeLocationCode(location)));
            }
            else
            {
                position.put("locationCode", normalizeLocationCode(location));
            }

            SysDictData companyMeta = companyDict.get(companyKey);
            if (companyMeta != null)
            {
                position.put("companyBrandColor", defaultString(companyMeta.getCssClass(), colorForCompanyKey(companyKey)));
            }
            else
            {
                position.put("companyBrandColor", defaultString(stringValue(position.get("companyBrandColor")), colorForCompanyKey(companyKey)));
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
        Map<String, List<SysDictData>> prefetchedDicts = loadDictRowsByTypes(List.of(
                DICT_TYPE_POSITION_CATEGORY,
                DICT_TYPE_POSITION_INDUSTRY,
                DICT_TYPE_POSITION_LOCATION,
                DICT_TYPE_POSITION_COMPANY,
                DICT_TYPE_POSITION_APPLY_METHOD,
                DICT_TYPE_POSITION_PROGRESS_STAGE,
                DICT_TYPE_POSITION_COACHING_STAGE,
                DICT_TYPE_POSITION_MENTOR_COUNT));
        Map<String, SysDictData> categoryDict = loadDictValueMap(prefetchedDicts, DICT_TYPE_POSITION_CATEGORY);
        Map<String, SysDictData> industryDict = loadDictValueMap(prefetchedDicts, DICT_TYPE_POSITION_INDUSTRY);
        Map<String, SysDictData> locationDict = loadDictValueMap(prefetchedDicts, DICT_TYPE_POSITION_LOCATION);
        Map<String, SysDictData> companyDict = loadDictValueMap(prefetchedDicts, DICT_TYPE_POSITION_COMPANY);
        List<Map<String, Object>> positions = loadVisiblePositions(userId, industryDict, companyDict, false);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("intentSummary", buildIntentSummary(userId, positions, industryDict));

        Map<String, Object> filterOptions = new LinkedHashMap<>();
        filterOptions.put("categories", buildCategoryOptions(positions, categoryDict));
        filterOptions.put("industries", buildIndustryOptions(positions, industryDict));
        filterOptions.put("companies", buildCompanyOptions(positions, companyDict));
        filterOptions.put("locations", buildLocationOptions(positions, locationDict));
        filterOptions.put("applyMethods", buildStaticOptions(prefetchedDicts, DICT_TYPE_POSITION_APPLY_METHOD));
        filterOptions.put("progressStages", buildStaticOptions(prefetchedDicts, DICT_TYPE_POSITION_PROGRESS_STAGE));
        filterOptions.put("coachingStages", buildStaticOptions(prefetchedDicts, DICT_TYPE_POSITION_COACHING_STAGE));
        filterOptions.put("mentorCounts", buildStaticOptions(prefetchedDicts, DICT_TYPE_POSITION_MENTOR_COUNT));
        payload.put("filterOptions", filterOptions);
        return payload;
    }

    /**
     * 查询申请追踪列表
     */
    @Override
    public List<Map<String, Object>> selectApplicationList(Long userId)
    {
        Long studentId = identityResolver.resolveStudentIdByUserId(userId);
        List<Map<String, Object>> applications = jobApplicationMapper.selectStudentApplicationRecords(studentId);

        Map<String, SysDictData> stageDict = loadDictValueMap(DICT_TYPE_POSITION_PROGRESS_STAGE);
        Map<String, SysDictData> coachingStatusDict = loadDictValueMap(DICT_TYPE_APPLICATION_COACHING_STATUS);
        Map<String, SysDictData> industryDict = loadDictValueMap(DICT_TYPE_POSITION_INDUSTRY);

        for (Map<String, Object> application : applications)
        {
            String stage = stringValue(application.get("stage"));
            String coachingStatus = stringValue(application.get("coachingStatus"));
            String companyType = normalizeApplicationCompanyType(
                    stringValue(application.get("companyType")),
                    stringValue(application.get("company")),
                    stringValue(application.get("position")));
            application.put("companyType", companyType);

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
        filterOptions.put("coachingStages", buildStaticOptions(DICT_TYPE_POSITION_COACHING_STAGE));
        filterOptions.put("mentorCounts", buildStaticOptions(DICT_TYPE_POSITION_MENTOR_COUNT));
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
        PositionReference position = requireVisiblePosition(positionId, userId);
        boolean appliedFlag = Boolean.TRUE.equals(applied);
        LocalDate normalizedDate = appliedFlag ? parseRequiredDate(appliedDate) : null;
        String normalizedMethod = appliedFlag ? defaultString(method, "官网投递") : null;
        String normalizedNote = appliedFlag ? defaultString(note, "") : "";
        int mainRows = upsertMainApplication(positionId, position, userId, "applied", normalizedNote, normalizedDate, "none", null, 0);
        if (position.shadowCompatible())
        {
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
        return mainRows;
    }

    /**
     * 收藏岗位
     */
    @Override
    public int updateFavoriteStatus(Long positionId, Boolean favorited, Long userId)
    {
        requireVisiblePosition(positionId, userId);
        return studentJobPositionMapper.upsertFavoriteState(positionId, userId, asFlag(Boolean.TRUE.equals(favorited)));
    }

    /**
     * 记录进度
     */
    @Override
    public int insertProgress(Long positionId, String stage, String notes, Long userId)
    {
        PositionReference position = requireVisiblePosition(positionId, userId);
        if (!StringUtils.hasText(stage))
        {
            throw new ServiceException("当前阶段不能为空");
        }
        int mainRows = upsertMainApplication(positionId, position, userId, stage.trim(), defaultString(notes, ""), null, null, Boolean.TRUE, null);
        if (position.shadowCompatible())
        {
            return studentJobPositionMapper.upsertProgressState(positionId, userId, stage.trim(), defaultString(notes, ""));
        }
        return mainRows;
    }

    /**
     * 提交岗位辅导申请
     */
    @Override
    public int requestCoaching(Long positionId, String stage, String mentorCount, String note, Long userId)
    {
        PositionReference position = requireVisiblePosition(positionId, userId);
        if (!StringUtils.hasText(stage))
        {
            throw new ServiceException("请选择当前面试阶段");
        }
        if (!StringUtils.hasText(mentorCount))
        {
            throw new ServiceException("请选择导师数量");
        }
        int mainRows = upsertMainApplication(positionId, position, userId, stage.trim(), defaultString(note, ""), null, "pending", Boolean.TRUE,
                parseMentorCount(mentorCount));
        if (position.shadowCompatible())
        {
            return studentJobPositionMapper.upsertCoachingState(
                    positionId,
                    userId,
                    "pending",
                    stage.trim(),
                    mentorCount.trim(),
                    defaultString(note, ""));
        }
        return mainRows;
    }

    /**
     * 手动添加岗位
     */
    @Override
    public Long createManualPosition(Map<String, Object> params, Long userId)
    {
        String category = stringValue(params.get("category"));
        String title = stringValue(params.get("title"));
        String company = stringValue(params.get("company"));
        String location = stringValue(params.get("location"));
        String recruitmentCycle = stringValue(params.get("recruitmentCycle"));
        String projectYear = stringValue(params.get("projectYear"));
        String companyType = stringValue(params.get("companyType"));
        String region = stringValue(params.get("region"));
        String city = stringValue(params.get("city"));
        String website = stringValue(params.get("website"));
        String link = stringValue(params.get("link"));
        String deadline = stringValue(params.get("deadline"));
        boolean needCoaching = Boolean.parseBoolean(String.valueOf(params.get("needCoaching")));
        String coachingStage = stringValue(params.get("coachingStage"));
        String mentorCount = stringValue(params.get("mentorCount"));
        String note = stringValue(params.get("note"));
        String hirevueType = stringValue(params.get("hirevueType"));
        String viLink = stringValue(params.get("viLink"));
        String otLink = stringValue(params.get("otLink"));
        String otAccount = stringValue(params.get("otAccount"));
        String otPassword = stringValue(params.get("otPassword"));
        String hirevueDeadline = stringValue(params.get("hirevueDeadline"));
        String inviteScreenshotName = stringValue(params.get("inviteScreenshotName"));
        String mentorHelp = stringValue(params.get("mentorHelp"));
        String interviewTime = stringValue(params.get("interviewTime"));
        String preferMentor = stringValue(params.get("preferMentor"));
        String excludeMentor = stringValue(params.get("excludeMentor"));

        if (!StringUtils.hasText(category) || !StringUtils.hasText(title) || !StringUtils.hasText(company) || !StringUtils.hasText(location))
        {
            throw new ServiceException("请填写所有必填字段");
        }

        if (!StringUtils.hasText(recruitmentCycle)
                || !StringUtils.hasText(projectYear)
                || !StringUtils.hasText(companyType)
                || !StringUtils.hasText(region)
                || !StringUtils.hasText(city)
                || !StringUtils.hasText(website)
                || !StringUtils.hasText(link))
        {
            throw new ServiceException("请填写所有必填字段");
        }

        if (needCoaching)
        {
            if (!StringUtils.hasText(coachingStage))
            {
                throw new ServiceException("请选择面试阶段");
            }
            if ("hirevue".equals(coachingStage))
            {
                if (!StringUtils.hasText(hirevueType))
                {
                    throw new ServiceException("请选择 HireVue / OT 类型");
                }
                if ("vi".equals(hirevueType) && !StringUtils.hasText(viLink))
                {
                    throw new ServiceException("请填写 VI 链接");
                }
                if ("ot".equals(hirevueType))
                {
                    if (!StringUtils.hasText(otLink))
                    {
                        throw new ServiceException("请填写 OT 链接");
                    }
                    if (!StringUtils.hasText(otAccount))
                    {
                        throw new ServiceException("请填写 OT 登录账号");
                    }
                    if (!StringUtils.hasText(otPassword))
                    {
                        throw new ServiceException("请填写 OT 登录密码");
                    }
                }
                if (!StringUtils.hasText(hirevueDeadline))
                {
                    throw new ServiceException("请填写 HireVue / OT 截止时间");
                }
                if (!StringUtils.hasText(inviteScreenshotName))
                {
                    throw new ServiceException("请上传邀请邮件截图");
                }
                if (!StringUtils.hasText(mentorHelp))
                {
                    throw new ServiceException("请选择是否需要导师协助");
                }
            }
            else
            {
                if (!StringUtils.hasText(mentorCount))
                {
                    throw new ServiceException("请选择导师数量");
                }
                if (!StringUtils.hasText(interviewTime))
                {
                    throw new ServiceException("请填写该阶段的面试时间");
                }
            }
        }

        syncPositionReferenceData(List.of());

        String normalizedCompany = company.trim();
        String normalizedTitle = title.trim();
        String normalizedLocation = city.trim();
        String companyKey = normalizeCompanyKey(normalizedCompany);
        String companyCode = normalizeCompanyCode(normalizedCompany);
        String recruitCycle = defaultString(recruitmentCycle, resolveProfileField(userId, "recruitmentCycle", "Open"));
        String normalizedProjectYear = defaultString(projectYear, resolveProjectYear(recruitCycle));
        String normalizedCompanyType = defaultString(companyType, resolveIndustryLabel(resolveProfileField(userId, "primaryDirection", "Investment Bank")));
        String industryLabel = defaultString(normalizedCompanyType, "ib");

        upsertLocationMeta(normalizedLocation);
        upsertCompanyMeta(companyKey, normalizedCompany, companyCode);

        OsgStudent student = identityResolver.resolveStudentByUserId(userId);

        OsgStudentPosition reviewRow = new OsgStudentPosition();
        reviewRow.setStudentId(student.getStudentId());
        reviewRow.setStudentName(defaultString(student.getStudentName(), "学员" + student.getStudentId()));
        reviewRow.setPositionCategory(category.trim());
        reviewRow.setIndustry(industryLabel);
        reviewRow.setCompanyName(normalizedCompany);
        reviewRow.setCompanyType(normalizedCompanyType);
        reviewRow.setCompanyWebsite(defaultString(website, null));
        reviewRow.setPositionName(normalizedTitle);
        reviewRow.setDepartment("Pending");
        reviewRow.setRegion(defaultString(region, resolveManualRegion(normalizedLocation)));
        reviewRow.setCity(defaultString(city, normalizedLocation));
        reviewRow.setRecruitmentCycle(recruitCycle);
        reviewRow.setProjectYear(normalizedProjectYear);
        reviewRow.setDeadline(parseOptionalDate(deadline));
        reviewRow.setPositionUrl(defaultString(link, "#"));
        reviewRow.setStatus(STUDENT_POSITION_STATUS_PENDING);
        reviewRow.setHasCoachingRequest(needCoaching ? "yes" : "no");
        reviewRow.setFlowStatus("pending_review");
        reviewRow.setCreateBy(defaultString(student.getStudentName(), "student"));
        reviewRow.setUpdateBy(defaultString(student.getStudentName(), "student"));
        reviewRow.setRemark(buildManualPositionRemark(
                needCoaching,
                coachingStage,
                mentorCount,
                note,
                hirevueType,
                viLink,
                otLink,
                otAccount,
                otPassword,
                hirevueDeadline,
                inviteScreenshotName,
                mentorHelp,
                interviewTime,
                preferMentor,
                excludeMentor));
        studentPositionMapper.insertStudentPosition(reviewRow);
        return reviewRow.getStudentPositionId();
    }

    private List<Map<String, Object>> loadVisiblePositions(
            Long userId,
            Map<String, SysDictData> industryDict,
            Map<String, SysDictData> companyDict,
            boolean includeDynamicState
    )
    {
        LinkedHashMap<Long, Map<String, Object>> positions = new LinkedHashMap<>();
        Map<String, String> industryAliases = buildIndustryAliases(industryDict);
        Map<String, SysDictData> companyDictByLabel = buildDictLabelMap(companyDict);

        for (OsgStudentPosition reviewPosition : loadOwnedManualReviewPositions(userId))
        {
            Long reviewId = reviewPosition.getStudentPositionId();
            if (reviewId == null || positions.containsKey(reviewId))
            {
                continue;
            }
            positions.put(reviewId, toStudentPositionRow(reviewPosition, industryAliases, companyDictByLabel));
        }

        OsgPosition query = new OsgPosition();
        query.setDisplayStatus(PUBLIC_DISPLAY_STATUS);
        for (OsgPosition publicPosition : positionMapper.selectVisiblePublicPositionList(query))
        {
            if (!isVisiblePublicPosition(publicPosition))
            {
                continue;
            }
            Long publicPositionId = publicPosition.getPositionId();
            if (publicPositionId == null || positions.containsKey(publicPositionId))
            {
                continue;
            }
            positions.put(publicPositionId, toStudentPositionRow(publicPosition, industryAliases, companyDictByLabel));
        }

        if (includeDynamicState)
        {
            Set<Long> shadowFavoritePositionIds = overlayShadowFavoriteState(positions, userId);
            overlayMainApplicationState(positions, userId, shadowFavoritePositionIds);
        }
        return new ArrayList<>(positions.values());
    }

    private Set<Long> overlayShadowFavoriteState(LinkedHashMap<Long, Map<String, Object>> positions, Long userId)
    {
        Set<Long> shadowPositionIds = new LinkedHashSet<>();
        if (positions.isEmpty())
        {
            return shadowPositionIds;
        }

        List<Map<String, Object>> shadowRows = studentJobPositionMapper.selectPositionList(userId);
        if (shadowRows == null || shadowRows.isEmpty())
        {
            return shadowPositionIds;
        }

        for (Map<String, Object> shadowRow : shadowRows)
        {
            Long positionId = toLong(shadowRow.get("id"));
            if (positionId == null)
            {
                continue;
            }

            Map<String, Object> visibleRow = positions.get(positionId);
            if (visibleRow == null || !Objects.equals("global", visibleRow.get("sourceType")))
            {
                continue;
            }
            shadowPositionIds.add(positionId);
            visibleRow.put("favorited", asBoolean(shadowRow.get("favorited")));
        }
        return shadowPositionIds;
    }

    private void overlayMainApplicationState(LinkedHashMap<Long, Map<String, Object>> positions, Long userId, Set<Long> shadowFavoritePositionIds)
    {
        if (positions.isEmpty())
        {
            return;
        }

        Long studentId;
        try
        {
            studentId = identityResolver.resolveStudentIdByUserId(userId);
        }
        catch (ServiceException ex)
        {
            return;
        }

        List<Map<String, Object>> applicationRows = jobApplicationMapper.selectStudentApplicationRecords(studentId);
        if (applicationRows == null || applicationRows.isEmpty())
        {
            return;
        }

        Map<Long, Map<String, Object>> applicationsByPositionId = new LinkedHashMap<>();
        Map<String, Map<String, Object>> applicationsByCompanyAndTitle = new LinkedHashMap<>();
        Map<String, Integer> visibleCompanyAndTitleCounts = new LinkedHashMap<>();
        for (Map<String, Object> applicationRow : applicationRows)
        {
            Long positionId = toLong(applicationRow.get("positionId"));
            if (positionId != null)
            {
                applicationsByPositionId.putIfAbsent(positionId, applicationRow);
            }

            String companyAndTitle = applicationPositionKey(
                    stringValue(applicationRow.get("company")),
                    stringValue(applicationRow.get("position")));
            if (StringUtils.hasText(companyAndTitle))
            {
                applicationsByCompanyAndTitle.putIfAbsent(companyAndTitle, applicationRow);
            }
        }

        for (Map<String, Object> position : positions.values())
        {
            if (!Objects.equals("global", position.get("sourceType")))
            {
                continue;
            }

            String companyAndTitle = applicationPositionKey(
                    stringValue(position.get("company")),
                    stringValue(position.get("title")));
            if (!StringUtils.hasText(companyAndTitle))
            {
                continue;
            }

            visibleCompanyAndTitleCounts.merge(companyAndTitle, 1, Integer::sum);
        }

        for (Map.Entry<Long, Map<String, Object>> entry : positions.entrySet())
        {
            Map<String, Object> position = entry.getValue();
            if (!Objects.equals("global", position.get("sourceType")))
            {
                continue;
            }

            Map<String, Object> applicationRow = applicationsByPositionId.get(entry.getKey());
            boolean matchedByExactPositionId = applicationRow != null;
            if (applicationRow == null)
            {
                String companyAndTitle = applicationPositionKey(
                        stringValue(position.get("company")),
                        stringValue(position.get("title")));
                if (visibleCompanyAndTitleCounts.getOrDefault(companyAndTitle, 0) == 1)
                {
                    applicationRow = applicationsByCompanyAndTitle.get(companyAndTitle);
                }
            }
            if (applicationRow == null)
            {
                continue;
            }

            if (matchedByExactPositionId || !shadowFavoritePositionIds.contains(entry.getKey()))
            {
                position.put("favorited", true);
            }
            position.put("applied", true);
            position.put("appliedDate", defaultString(stringValue(applicationRow.get("appliedDate")), ""));
            position.put("applyMethod", defaultString(stringValue(applicationRow.get("applyMethod")), ""));
            position.put("progressStage", defaultString(stringValue(applicationRow.get("stage")), stringValue(position.get("progressStage"))));
            position.put("progressNote", defaultString(stringValue(applicationRow.get("progressNote")), ""));
            position.put("coachingStatus", defaultString(stringValue(applicationRow.get("coachingStatus")), "none"));
            position.put("coachingStatusLabel", defaultString(stringValue(applicationRow.get("coachingStatusLabel")), ""));
            position.put("coachingColor", defaultString(stringValue(applicationRow.get("coachingColor")), ""));
        }
    }

    private List<OsgStudentPosition> loadOwnedManualReviewPositions(Long userId)
    {
        Long studentId;
        try
        {
            studentId = identityResolver.resolveStudentIdByUserId(userId);
        }
        catch (ServiceException ex)
        {
            return List.of();
        }
        OsgStudentPosition query = new OsgStudentPosition();
        query.setStudentId(studentId);
        List<OsgStudentPosition> rows = studentPositionMapper.selectStudentPositionList(query);
        if (rows == null || rows.isEmpty())
        {
            return List.of();
        }
        return rows.stream()
            .filter(row -> !STUDENT_POSITION_STATUS_APPROVED.equals(defaultString(row.getStatus(), STUDENT_POSITION_STATUS_PENDING)))
            .toList();
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
        OsgStudent mainStudent = resolveMainProfileStudent(userId);
        Map<String, Object> profileSnapshot = mainStudent == null ? studentProfileMapper.selectProfileByUserId(userId) : null;

        String recruitmentCycle = resolveProfileSummaryField(mainStudent, profileSnapshot, "recruitmentCycle",
                positions.stream().map(position -> stringValue(position.get("recruitCycle"))).filter(StringUtils::hasText).findFirst().orElse("-"));
        String targetRegion = resolveProfileSummaryField(mainStudent, profileSnapshot, "targetRegion",
                positions.stream().map(position -> stringValue(position.get("location"))).filter(StringUtils::hasText).findFirst().orElse("-"));
        String primaryDirection = resolveProfileSummaryField(mainStudent, profileSnapshot, "primaryDirection",
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

    private String resolveProfileSummaryField(OsgStudent mainStudent, Map<String, Object> profileSnapshot, String key, String fallback)
    {
        String mainValue = switch (key)
        {
            case "recruitmentCycle" -> mainStudent == null ? null : mainStudent.getRecruitmentCycle();
            case "targetRegion" -> mainStudent == null ? null : mainStudent.getTargetRegion();
            case "primaryDirection" -> mainStudent == null ? null : mainStudent.getMajorDirection();
            default -> null;
        };
        String resolvedMainValue = resolveSummaryValue(mainValue, null);
        if (StringUtils.hasText(resolvedMainValue))
        {
            return resolvedMainValue;
        }

        if (profileSnapshot == null)
        {
            return fallback;
        }
        return resolveSummaryValue(profileSnapshot.get(key), fallback);
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
        LinkedHashMap<String, Map<String, Object>> options = new LinkedHashMap<>();
        for (Map<String, Object> position : positions)
        {
            String companyKey = stringValue(position.get("companyKey"));
            if (!StringUtils.hasText(companyKey) || options.containsKey(companyKey))
            {
                continue;
            }
            SysDictData metadata = companyDict.get(companyKey);
            options.put(companyKey, option(
                    companyKey,
                    metadata == null ? stringValue(position.get("company")) : defaultString(metadata.getDictLabel(), stringValue(position.get("company"))),
                    metadata == null ? defaultString(stringValue(position.get("companyBrandColor")), colorForCompanyKey(companyKey)) : metadata.getCssClass(),
                    metadata == null ? stringValue(position.get("companyCode")) : defaultString(metadata.getListClass(), stringValue(position.get("companyCode"))),
                    metadata == null ? null : metadata.getDictSort()));
        }
        return new ArrayList<>(options.values());
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
        for (SysDictData item : resolveDictRows(null, dictType))
        {
            options.add(option(item.getDictValue(), item.getDictLabel(), item.getCssClass(), item.getListClass(), item.getDictSort()));
        }
        return options;
    }

    private List<Map<String, Object>> buildStaticOptions(Map<String, List<SysDictData>> prefetchedDicts, String dictType)
    {
        List<Map<String, Object>> options = new ArrayList<>();
        for (SysDictData item : resolveDictRows(prefetchedDicts, dictType))
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
        for (SysDictData item : resolveDictRows(null, dictType))
        {
            dict.put(item.getDictValue(), item);
        }
        return dict;
    }

    private Map<String, SysDictData> loadDictValueMap(Map<String, List<SysDictData>> prefetchedDicts, String dictType)
    {
        Map<String, SysDictData> dict = new LinkedHashMap<>();
        for (SysDictData item : resolveDictRows(prefetchedDicts, dictType))
        {
            dict.put(item.getDictValue(), item);
        }
        return dict;
    }

    private Map<String, List<SysDictData>> loadDictRowsByTypes(List<String> dictTypes)
    {
        List<SysDictData> rows = sysDictDataMapper.selectDictDataByTypes(dictTypes);
        if (rows == null)
        {
            return null;
        }

        Map<String, List<SysDictData>> grouped = new LinkedHashMap<>();
        for (String dictType : dictTypes)
        {
            grouped.put(dictType, new ArrayList<>());
        }
        for (SysDictData row : rows)
        {
            grouped.computeIfAbsent(row.getDictType(), ignored -> new ArrayList<>()).add(row);
        }
        return grouped;
    }

    private List<SysDictData> resolveDictRows(Map<String, List<SysDictData>> prefetchedDicts, String dictType)
    {
        if (prefetchedDicts != null)
        {
            List<SysDictData> rows = prefetchedDicts.get(dictType);
            if (rows != null)
            {
                return rows;
            }
        }
        return sysDictDataMapper.selectDictDataByType(dictType);
    }

    private Map<String, SysDictData> buildDictLabelMap(Map<String, SysDictData> dictByValue)
    {
        Map<String, SysDictData> dict = new LinkedHashMap<>();
        for (SysDictData item : dictByValue.values())
        {
            String labelKey = normalizeLookupKey(item.getDictLabel());
            if (StringUtils.hasText(labelKey))
            {
                dict.putIfAbsent(labelKey, item);
            }
        }
        return dict;
    }

    private Map<String, String> buildIndustryAliases(Map<String, SysDictData> industryDict)
    {
        Map<String, String> aliases = new LinkedHashMap<>();
        for (SysDictData item : industryDict.values())
        {
            String valueKey = normalizeLookupKey(item.getDictValue());
            if (StringUtils.hasText(valueKey))
            {
                aliases.putIfAbsent(valueKey, item.getDictValue());
            }

            String labelKey = normalizeLookupKey(item.getDictLabel());
            if (StringUtils.hasText(labelKey))
            {
                aliases.putIfAbsent(labelKey, item.getDictValue());
            }
        }
        return aliases;
    }

    private void upsertLocationMeta(String location)
    {
        SysDictData existing = findDict(DICT_TYPE_POSITION_LOCATION, location);
        upsertDictData(new DictSeed(
                DICT_TYPE_POSITION_LOCATION,
                resolveDynamicSort(existing, DICT_TYPE_POSITION_LOCATION),
                location,
                location,
                normalizeLocationCode(location),
                null,
                "地区展示"));
    }

    private void upsertCompanyMeta(String companyKey, String company, String companyCode)
    {
        SysDictData existing = findDict(DICT_TYPE_POSITION_COMPANY, companyKey);
        upsertDictData(new DictSeed(
                DICT_TYPE_POSITION_COMPANY,
                resolveDynamicSort(existing, DICT_TYPE_POSITION_COMPANY),
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
            if (sameDictMetadata(existing, seed))
            {
                return;
            }
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

    private boolean sameDictMetadata(SysDictData existing, DictSeed seed)
    {
        return Objects.equals(existing.getDictSort(), seed.sort())
                && Objects.equals(existing.getDictLabel(), seed.label())
                && Objects.equals(existing.getCssClass(), seed.cssClass())
                && Objects.equals(existing.getListClass(), seed.listClass())
                && Objects.equals(existing.getStatus(), "0")
                && Objects.equals(existing.getRemark(), seed.remark());
    }

    private Long resolveDynamicSort(SysDictData existing, String dictType)
    {
        if (existing != null && existing.getDictSort() != null)
        {
            return existing.getDictSort();
        }
        return nextDynamicSort(dictType);
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

    private String resolveIndustryValue(String primaryDirection, Map<String, String> industryAliases)
    {
        String normalized = defaultString(primaryDirection, "");
        String dictValue = industryAliases.get(normalizeLookupKey(normalized));
        if (StringUtils.hasText(dictValue))
        {
            return dictValue;
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

    private String resolveIndustryLabel(String primaryDirection)
    {
        String normalized = defaultString(primaryDirection, "");
        for (SysDictData item : sysDictDataMapper.selectDictDataByType(DICT_TYPE_POSITION_INDUSTRY))
        {
            if (normalized.equalsIgnoreCase(item.getDictLabel()) || normalized.equalsIgnoreCase(item.getDictValue()))
            {
                return defaultString(item.getDictLabel(), normalized);
            }
        }

        return switch (resolveIndustryValue(primaryDirection, buildIndustryAliases(loadDictValueMap(DICT_TYPE_POSITION_INDUSTRY))))
        {
            case "consulting" -> "Consulting";
            case "tech" -> "Tech";
            case "pevc" -> "PE / VC";
            default -> "Investment Bank";
        };
    }

    private String fallbackIndustryLabel(String industry)
    {
        return switch (defaultString(industry, "ib"))
        {
            case "consulting" -> "Consulting";
            case "tech" -> "Tech";
            case "pevc" -> "PE / VC";
            default -> "Investment Bank";
        };
    }

    private String fallbackIndustryIcon(String industry)
    {
        return switch (defaultString(industry, "ib"))
        {
            case "consulting" -> "bulb";
            case "tech" -> "code";
            case "pevc" -> "fund";
            default -> "bank";
        };
    }

    private String resolveProfileField(Long userId, String key, String fallback)
    {
        OsgStudent mainStudent = resolveMainProfileStudent(userId);
        String mainValue = switch (key)
        {
            case "recruitmentCycle" -> mainStudent == null ? null : mainStudent.getRecruitmentCycle();
            case "targetRegion" -> mainStudent == null ? null : mainStudent.getTargetRegion();
            case "primaryDirection" -> mainStudent == null ? null : mainStudent.getMajorDirection();
            default -> null;
        };
        String resolvedMainValue = resolveSummaryValue(mainValue, null);
        if (StringUtils.hasText(resolvedMainValue))
        {
            return resolvedMainValue;
        }

        Map<String, Object> profile = studentProfileMapper.selectProfileByUserId(userId);
        if (profile == null)
        {
            return fallback;
        }
        return resolveSummaryValue(profile.get(key), fallback);
    }

    private OsgStudent resolveMainProfileStudent(Long userId)
    {
        try
        {
            return identityResolver.resolveStudentByUserId(userId);
        }
        catch (ServiceException ex)
        {
            return null;
        }
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

    private int upsertMainApplication(Long positionId, PositionReference positionReference, Long userId, String stage, String remark, LocalDate appliedDate,
            String coachingStatus, Boolean stageUpdated, Integer requestedMentorCount)
    {
        OsgStudent student = identityResolver.resolveStudentByUserId(userId);
        Map<String, Object> position = positionReference.position();
        String companyName = stringValue(position.get("company"));
        String positionName = stringValue(position.get("title"));

        OsgJobApplication existing = jobApplicationMapper.selectLatestByStudentAndCompanyAndPosition(
                student.getStudentId(),
                companyName,
                positionName);
        if (existing == null)
        {
            OsgJobApplication created = new OsgJobApplication();
            created.setStudentId(student.getStudentId());
            created.setPositionId(positionId);
            created.setLeadMentorId(student.getLeadMentorId());
            created.setStudentName(defaultString(student.getStudentName(), "学员" + student.getStudentId()));
            created.setCompanyName(companyName);
            created.setPositionName(positionName);
            created.setCity(stringValue(position.get("location")));
            created.setRegion(normalizeRegion(stringValue(position.get("location"))));
            created.setCurrentStage(defaultString(stage, "applied"));
            created.setAssignStatus("pending");
            created.setCoachingStatus(defaultString(coachingStatus, "none"));
            created.setRequestedMentorCount(requestedMentorCount == null ? 0 : requestedMentorCount);
            created.setStageUpdated(Boolean.TRUE.equals(stageUpdated));
            created.setSubmittedAt(java.sql.Timestamp.valueOf((appliedDate == null ? LocalDate.now() : appliedDate).atStartOfDay()));
            created.setRemark(remark);
            int rows = jobApplicationMapper.insertJobApplication(created);
            if (rows <= 0)
            {
                throw new ServiceException("求职主链写入失败，请稍后重试");
            }
            return rows;
        }

        OsgJobApplication stagePatch = new OsgJobApplication();
        stagePatch.setApplicationId(existing.getApplicationId());
        stagePatch.setCurrentStage(defaultString(stage, existing.getCurrentStage()));
        stagePatch.setStageUpdated(stageUpdated);
        stagePatch.setRemark(remark);
        int rows = jobApplicationMapper.updateJobApplicationStage(stagePatch);

        if (coachingStatus != null || requestedMentorCount != null)
        {
            OsgJobApplication coachingPatch = new OsgJobApplication();
            coachingPatch.setApplicationId(existing.getApplicationId());
            coachingPatch.setCurrentStage(defaultString(stage, existing.getCurrentStage()));
            coachingPatch.setAssignStatus("pending");
            coachingPatch.setCoachingStatus(defaultString(coachingStatus, existing.getCoachingStatus()));
            coachingPatch.setRequestedMentorCount(requestedMentorCount == null
                    ? defaultRequestedMentorCount(existing.getRequestedMentorCount())
                    : requestedMentorCount);
            coachingPatch.setRemark(remark);
            rows = Math.max(rows, jobApplicationMapper.updateJobApplicationCoaching(coachingPatch));
        }
        if (rows <= 0)
        {
            throw new ServiceException("求职主链写入失败，请稍后重试");
        }
        return rows;
    }

    private int defaultRequestedMentorCount(Integer value)
    {
        return value == null ? 0 : value;
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

    private String normalizeRegion(String location)
    {
        String normalized = defaultString(location, "").toLowerCase(Locale.ROOT);
        if (normalized.contains("new york") || normalized.contains("san francisco"))
        {
            return "na";
        }
        if (normalized.contains("london"))
        {
            return "uk";
        }
        if (normalized.contains("hong kong") || normalized.contains("shanghai") || normalized.contains("singapore"))
        {
            return "apac";
        }
        return "";
    }

    private String resolveManualRegion(String location)
    {
        String normalized = defaultString(location, "").toLowerCase(Locale.ROOT);
        if (normalized.contains("new york") || normalized.contains("san francisco"))
        {
            return "na";
        }
        if (normalized.contains("london"))
        {
            return "uk";
        }
        if (normalized.contains("hong kong") || normalized.contains("shanghai") || normalized.contains("singapore"))
        {
            return "ap";
        }
        return "";
    }

    private String resolveProjectYear(String recruitCycle)
    {
        var matcher = Pattern.compile("(20\\d{2})").matcher(defaultString(recruitCycle, ""));
        if (matcher.find())
        {
            return matcher.group(1);
        }
        return String.valueOf(LocalDate.now().getYear());
    }

    private String resolveStudentPositionStatusLabel(String status)
    {
        return switch (defaultString(status, STUDENT_POSITION_STATUS_PENDING))
        {
            case STUDENT_POSITION_STATUS_REJECTED -> "已拒绝";
            case STUDENT_POSITION_STATUS_APPROVED -> "已通过";
            default -> "待审核";
        };
    }

    private PositionReference requireVisiblePosition(Long positionId, Long userId)
    {
        if (positionId == null)
        {
            throw new ServiceException("岗位不存在或无权操作");
        }

        boolean shadowCompatible = studentJobPositionMapper.countVisiblePosition(positionId, userId) > 0;
        OsgPosition publicPosition = positionMapper.selectPositionByPositionId(positionId);
        if (isVisiblePublicPosition(publicPosition))
        {
            return new PositionReference(toStudentPositionRow(publicPosition), shadowCompatible);
        }

        PositionReference ownedApplicationPosition = resolveOwnedApplicationPosition(positionId, userId);
        if (ownedApplicationPosition != null)
        {
            return ownedApplicationPosition;
        }

        throw new ServiceException("岗位不存在或无权操作");
    }

    private PositionReference resolveOwnedApplicationPosition(Long positionId, Long userId)
    {
        Long studentId;
        try
        {
            studentId = identityResolver.resolveStudentIdByUserId(userId);
        }
        catch (ServiceException ex)
        {
            return null;
        }
        if (studentId == null)
        {
            return null;
        }

        List<Map<String, Object>> applications = jobApplicationMapper.selectStudentApplicationRecords(studentId);
        if (applications == null || applications.isEmpty())
        {
            return null;
        }

        for (Map<String, Object> application : applications)
        {
            if (!Objects.equals(positionId, toLong(application.get("positionId"))))
            {
                continue;
            }
            String company = defaultString(stringValue(application.get("company")), "");
            String title = defaultString(stringValue(application.get("position")), "");
            if (!StringUtils.hasText(company) || !StringUtils.hasText(title))
            {
                continue;
            }

            Map<String, Object> fallbackPosition = new LinkedHashMap<>();
            fallbackPosition.put("id", positionId);
            fallbackPosition.put("company", company);
            fallbackPosition.put("title", title);
            fallbackPosition.put("location", defaultString(stringValue(application.get("location")), ""));
            fallbackPosition.put("sourceType", "global");
            return new PositionReference(fallbackPosition, false);
        }
        return null;
    }

    private boolean isVisiblePublicPosition(OsgPosition position)
    {
        if (position == null)
        {
            return false;
        }
        if (!PUBLIC_DISPLAY_STATUS.equals(normalizeDisplayStatus(position.getDisplayStatus())))
        {
            return false;
        }

        Date now = new Date();
        if (position.getDisplayStartTime() != null
                && position.getDisplayStartTime().getTime() - now.getTime() > PUBLIC_POSITION_VISIBILITY_GRACE_MILLIS)
        {
            return false;
        }
        if (position.getDisplayEndTime() != null
                && now.getTime() - position.getDisplayEndTime().getTime() > PUBLIC_POSITION_VISIBILITY_GRACE_MILLIS)
        {
            return false;
        }
        return true;
    }

    private String applicationPositionKey(String company, String title)
    {
        String normalizedCompany = defaultString(company, "").trim().toLowerCase(Locale.ROOT);
        String normalizedTitle = defaultString(title, "").trim().toLowerCase(Locale.ROOT);
        if (!StringUtils.hasText(normalizedCompany) || !StringUtils.hasText(normalizedTitle))
        {
            return "";
        }
        return normalizedCompany + "|" + normalizedTitle;
    }

    private Map<String, Object> toStudentPositionRow(OsgPosition position)
    {
        Map<String, SysDictData> industryDict = loadDictValueMap(DICT_TYPE_POSITION_INDUSTRY);
        Map<String, SysDictData> companyDict = loadDictValueMap(DICT_TYPE_POSITION_COMPANY);
        return toStudentPositionRow(position, buildIndustryAliases(industryDict), buildDictLabelMap(companyDict));
    }

    private Map<String, Object> toStudentPositionRow(
            OsgPosition position,
            Map<String, String> industryAliases,
            Map<String, SysDictData> companyDictByLabel
    )
    {
        Map<String, Object> row = new LinkedHashMap<>();
        String companyName = defaultString(position.getCompanyName(), "");
        String positionUrl = defaultString(position.getPositionUrl(), "#");
        CompanyIdentity companyIdentity = resolveCompanyIdentity(companyName, companyDictByLabel);
        row.put("id", position.getPositionId());
        row.put("title", defaultString(position.getPositionName(), ""));
        row.put("url", positionUrl);
        row.put("category", defaultString(position.getPositionCategory(), "summer"));
        row.put("categoryText", defaultString(position.getPositionCategory(), "summer"));
        row.put("department", defaultString(position.getDepartment(), ""));
        row.put("location", publicPositionLocation(position));
        row.put("recruitCycle", defaultString(position.getRecruitmentCycle(), ""));
        row.put("publishDate", formatMonthDay(position.getPublishTime()));
        row.put("deadline", formatMonthDay(position.getDeadline()));
        row.put("company", companyName);
        row.put("companyKey", companyIdentity.key());
        row.put("companyCode", companyIdentity.code());
        row.put("companyBrandColor", companyIdentity.brandColor());
        row.put("careerUrl", positionUrl);
        row.put("industry", resolveIndustryValue(position.getIndustry(), industryAliases));
        row.put("sourceType", "global");
        row.put("favorited", false);
        row.put("applied", false);
        row.put("progressStage", "applied");
        row.put("progressNote", "");
        row.put("appliedDate", "");
        row.put("applyMethod", "");
        row.put("coachingStatus", "none");
        row.put("requirements", defaultString(position.getApplicationNote(), ""));
        return row;
    }

    private Map<String, Object> toStudentPositionRow(OsgStudentPosition position)
    {
        Map<String, SysDictData> industryDict = loadDictValueMap(DICT_TYPE_POSITION_INDUSTRY);
        Map<String, SysDictData> companyDict = loadDictValueMap(DICT_TYPE_POSITION_COMPANY);
        return toStudentPositionRow(position, buildIndustryAliases(industryDict), buildDictLabelMap(companyDict));
    }

    private Map<String, Object> toStudentPositionRow(
            OsgStudentPosition position,
            Map<String, String> industryAliases,
            Map<String, SysDictData> companyDictByLabel
    )
    {
        Map<String, Object> row = new LinkedHashMap<>();
        String companyName = defaultString(position.getCompanyName(), "");
        String positionUrl = defaultString(position.getPositionUrl(), "#");
        String status = defaultString(position.getStatus(), STUDENT_POSITION_STATUS_PENDING);
        CompanyIdentity companyIdentity = resolveCompanyIdentity(companyName, companyDictByLabel);
        row.put("id", position.getStudentPositionId());
        row.put("title", defaultString(position.getPositionName(), ""));
        row.put("url", positionUrl);
        row.put("category", defaultString(position.getPositionCategory(), "summer"));
        row.put("categoryText", defaultString(position.getPositionCategory(), "summer"));
        row.put("department", defaultString(position.getDepartment(), ""));
        row.put("location", reviewPositionLocation(position));
        row.put("recruitCycle", defaultString(position.getRecruitmentCycle(), ""));
        row.put("publishDate", formatMonthDay(position.getCreateTime()));
        row.put("deadline", formatMonthDay(position.getDeadline()));
        row.put("company", companyName);
        row.put("companyKey", companyIdentity.key());
        row.put("companyCode", companyIdentity.code());
        row.put("companyBrandColor", companyIdentity.brandColor());
        row.put("careerUrl", positionUrl);
        row.put("industry", resolveIndustryValue(position.getIndustry(), industryAliases));
        row.put("sourceType", "manual");
        row.put("favorited", false);
        row.put("applied", false);
        row.put("progressStage", "applied");
        row.put("progressNote", "");
        row.put("reviewStatus", status);
        row.put("reviewStatusLabel", resolveStudentPositionStatusLabel(status));
        row.put("rejectReason", defaultString(position.getRejectReason(), ""));
        row.put("requirements", defaultString(position.getRejectReason(), ""));
        return row;
    }

    private String publicPositionLocation(OsgPosition position)
    {
        if (StringUtils.hasText(position.getCity()))
        {
            return position.getCity().trim();
        }
        if (StringUtils.hasText(position.getRegion()))
        {
            return position.getRegion().trim();
        }
        return "";
    }

    private String reviewPositionLocation(OsgStudentPosition position)
    {
        if (StringUtils.hasText(position.getCity()))
        {
            return position.getCity().trim();
        }
        if (StringUtils.hasText(position.getRegion()))
        {
            return position.getRegion().trim();
        }
        return "";
    }

    private String formatMonthDay(Date value)
    {
        if (value == null)
        {
            return "--";
        }
        return MONTH_DAY.format(value.toInstant().atZone(ZoneId.systemDefault()).toLocalDate());
    }

    private String normalizeDisplayStatus(String displayStatus)
    {
        if (!StringUtils.hasText(displayStatus))
        {
            return PUBLIC_DISPLAY_STATUS;
        }

        String normalized = displayStatus.trim().toLowerCase(Locale.ROOT);
        return switch (normalized)
        {
            case "0", "visible" -> "visible";
            case "1", "hidden" -> "hidden";
            case "2", "expired" -> "expired";
            default -> normalized;
        };
    }

    private Long toLong(Object value)
    {
        if (value instanceof Number number)
        {
            return number.longValue();
        }
        if (value == null || !StringUtils.hasText(String.valueOf(value)))
        {
            return null;
        }
        return Long.valueOf(String.valueOf(value).trim());
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

    private Date parseOptionalDate(String dateValue)
    {
        if (!StringUtils.hasText(dateValue))
        {
            return null;
        }
        try
        {
            return java.sql.Date.valueOf(LocalDate.parse(dateValue.trim()));
        }
        catch (DateTimeParseException error)
        {
            throw new ServiceException("截止日期格式不正确");
        }
    }

    private String buildManualPositionRemark(
            boolean needCoaching,
            String coachingStage,
            String mentorCount,
            String note,
            String hirevueType,
            String viLink,
            String otLink,
            String otAccount,
            String otPassword,
            String hirevueDeadline,
            String inviteScreenshotName,
            String mentorHelp,
            String interviewTime,
            String preferMentor,
            String excludeMentor)
    {
        List<String> lines = new ArrayList<>();
        if (needCoaching)
        {
            lines.add("needCoaching=yes");
            if (StringUtils.hasText(coachingStage))
            {
                lines.add("stage=" + coachingStage.trim());
            }
            if ("hirevue".equals(coachingStage))
            {
                if (StringUtils.hasText(hirevueType))
                {
                    lines.add("hirevueType=" + hirevueType.trim());
                }
                if (StringUtils.hasText(viLink))
                {
                    lines.add("viLink=" + viLink.trim());
                }
                if (StringUtils.hasText(otLink))
                {
                    lines.add("otLink=" + otLink.trim());
                }
                if (StringUtils.hasText(otAccount))
                {
                    lines.add("otAccount=" + otAccount.trim());
                }
                if (StringUtils.hasText(otPassword))
                {
                    lines.add("otPassword=" + otPassword.trim());
                }
                if (StringUtils.hasText(hirevueDeadline))
                {
                    lines.add("hirevueDeadline=" + hirevueDeadline.trim());
                }
                if (StringUtils.hasText(inviteScreenshotName))
                {
                    lines.add("inviteScreenshot=" + inviteScreenshotName.trim());
                }
                if (StringUtils.hasText(mentorHelp))
                {
                    lines.add("mentorHelp=" + mentorHelp.trim());
                }
            }
            else
            {
                if (StringUtils.hasText(interviewTime))
                {
                    lines.add("interviewTime=" + interviewTime.trim());
                }
                if (StringUtils.hasText(mentorCount))
                {
                    lines.add("mentorCount=" + mentorCount.trim());
                }
                if (StringUtils.hasText(preferMentor))
                {
                    lines.add("preferMentor=" + preferMentor.trim());
                }
                if (StringUtils.hasText(excludeMentor))
                {
                    lines.add("excludeMentor=" + excludeMentor.trim());
                }
            }
        }
        if (StringUtils.hasText(note))
        {
            lines.add("note=" + note.trim());
        }
        return String.join("\n", lines);
    }

    private String normalizeCompanyKey(String company)
    {
        String normalized = company.replaceAll("[^A-Za-z0-9]", "").toLowerCase(Locale.ROOT);
        if (normalized.isEmpty())
        {
            return "manual";
        }
        if (normalized.length() <= 24)
        {
            return normalized;
        }
        return normalized.substring(0, 18) + normalized.substring(normalized.length() - 6);
    }

    private String normalizeCompanyCode(String company)
    {
        String normalized = company.replaceAll("[^A-Za-z0-9]", "").toUpperCase(Locale.ROOT);
        if (normalized.isEmpty())
        {
            return "MAN";
        }
        return normalized.substring(0, Math.min(3, normalized.length()));
    }

    private CompanyIdentity resolveCompanyIdentity(String companyName, Map<String, SysDictData> companyDictByLabel)
    {
        SysDictData existing = companyDictByLabel.get(normalizeLookupKey(companyName));
        if (existing != null)
        {
            String key = defaultString(existing.getDictValue(), normalizeCompanyKey(companyName));
            return new CompanyIdentity(
                    key,
                    defaultString(existing.getListClass(), normalizeCompanyCode(companyName)),
                    defaultString(existing.getCssClass(), colorForCompanyKey(key)));
        }

        String fallbackKey = normalizeCompanyKey(companyName);
        return new CompanyIdentity(
                fallbackKey,
                normalizeCompanyCode(companyName),
                colorForCompanyKey(fallbackKey));
    }

    private String normalizeLookupKey(String value)
    {
        return defaultString(value, "").trim().toLowerCase(Locale.ROOT);
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

    private String normalizeApplicationCompanyType(String rawCompanyType, String company, String position)
    {
        String normalized = defaultString(rawCompanyType, "").toLowerCase(Locale.ROOT);
        String context = (defaultString(company, "") + " " + defaultString(position, "")).toLowerCase(Locale.ROOT);

        if (looksLikeConsulting(context))
        {
            return "consulting";
        }
        if (looksLikeTech(context))
        {
            return "tech";
        }
        if (looksLikePevc(context))
        {
            return "pevc";
        }
        if (looksLikeIb(context))
        {
            return "ib";
        }

        if ("consulting".equals(normalized) || "tech".equals(normalized) || "pevc".equals(normalized) || "ib".equals(normalized))
        {
            return normalized;
        }
        return "ib";
    }

    private boolean looksLikeConsulting(String context)
    {
        return containsAny(context, "mckinsey", "bcg", "bain", "consulting", "strategy&");
    }

    private boolean looksLikeTech(String context)
    {
        return containsAny(context, "google", "meta", "amazon", "microsoft", "apple", "tech", "software", "engineer");
    }

    private boolean looksLikePevc(String context)
    {
        return containsAny(context, "private equity", "venture capital", "pe / vc", "pe&vc", "buyout");
    }

    private boolean looksLikeIb(String context)
    {
        return containsAny(context,
                "goldman",
                "jp morgan",
                "jpmorgan",
                "morgan stanley",
                "ubs",
                "citigroup",
                "barclays",
                "deutsche bank",
                "bank of america",
                "investment bank",
                "s&t",
                "sales & trading");
    }

    private boolean containsAny(String value, String... tokens)
    {
        for (String token : tokens)
        {
            if (value.contains(token))
            {
                return true;
            }
        }
        return false;
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

    private record PositionReference(Map<String, Object> position, boolean shadowCompatible)
    {
    }

    private record DictSeed(String type, Long sort, String label, String value, String cssClass, String listClass,
            String remark)
    {
    }

    private record CompanyIdentity(String key, String code, String brandColor)
    {
    }
}
