package com.ruoyi.system.service.impl;

import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
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
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.core.domain.entity.SysDictData;
import com.ruoyi.system.domain.OsgCoaching;
import com.ruoyi.system.domain.OsgJobApplication;
import com.ruoyi.system.domain.OsgPosition;
import com.ruoyi.system.mapper.OsgCoachingMapper;
import com.ruoyi.system.mapper.OsgJobApplicationMapper;
import com.ruoyi.system.mapper.OsgPositionMapper;
import com.ruoyi.system.mapper.SysDictDataMapper;
import com.ruoyi.system.service.IOsgPositionService;

@Service
public class OsgPositionServiceImpl implements IOsgPositionService
{
    private static final ZoneId ZONE_ID = ZoneId.systemDefault();
    private static final String DICT_POSITION_CATEGORY = "osg_position_category";
    private static final String DICT_POSITION_DISPLAY_STATUS = "osg_position_display_status";
    private static final String DICT_POSITION_INDUSTRY = "osg_position_industry";
    private static final String DICT_COMPANY_TYPE = "osg_company_type";
    private static final String DICT_RECRUITMENT_CYCLE = "osg_recruitment_cycle";
    private static final String DICT_PROJECT_YEAR = "osg_project_year";
    private static final String DICT_POSITION_REGION = "osg_position_region";
    private static final String DICT_POSITION_CITY = "osg_position_city";
    private static final String DICT_POSITION_PROCESS_GLOSSARY = "osg_position_process_glossary";
    private static final String DICT_POSITION_PUBLISH_PRESET = "osg_position_publish_preset";
    private static final String DICT_POSITION_UI_COPY = "osg_position_ui_copy";

    @Autowired
    private OsgPositionMapper positionMapper;

    @Autowired
    private SysDictDataMapper sysDictDataMapper;

    @Autowired
    private OsgJobApplicationMapper jobApplicationMapper;

    @Autowired
    private OsgCoachingMapper coachingMapper;

    private volatile boolean referenceDataReady;

    @Override
    public OsgPosition selectPositionByPositionId(Long positionId)
    {
        return positionMapper.selectPositionByPositionId(positionId);
    }

    @Override
    public List<OsgPosition> selectPositionList(OsgPosition position)
    {
        List<OsgPosition> rows = positionMapper.selectPositionList(position);
        return rows == null ? new ArrayList<>() : rows;
    }

    @Override
    public Map<String, Object> selectPositionStats(OsgPosition position)
    {
        List<OsgPosition> rows = selectPositionList(position);
        LocalDateTime now = LocalDateTime.now();
        int openPositions = 0;
        int closingSoonPositions = 0;
        int closedPositions = 0;
        int studentApplications = 0;
        for (OsgPosition row : rows)
        {
            String displayStatus = normalizeDisplayStatus(row.getDisplayStatus());
            if ("visible".equals(displayStatus))
            {
                openPositions++;
                if (row.getDeadline() != null)
                {
                    LocalDateTime deadline = LocalDateTime.ofInstant(row.getDeadline().toInstant(), ZONE_ID);
                    if (!deadline.isBefore(now) && !deadline.isAfter(now.plusDays(7)))
                    {
                        closingSoonPositions++;
                    }
                }
            }
            else
            {
                closedPositions++;
            }
            studentApplications += row.getStudentCount() == null ? 0 : row.getStudentCount();
        }

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalPositions", rows.size());
        stats.put("openPositions", openPositions);
        stats.put("closingSoonPositions", closingSoonPositions);
        stats.put("closedPositions", closedPositions);
        stats.put("studentApplications", studentApplications);
        return stats;
    }

    @Override
    public List<Map<String, Object>> selectPositionDrillDown(OsgPosition position)
    {
        List<OsgPosition> rows = selectPositionList(position);
        Map<String, List<OsgPosition>> industryGroups = rows.stream()
            .collect(Collectors.groupingBy(
                row -> defaultText(row.getIndustry(), "Other"),
                LinkedHashMap::new,
                Collectors.toList()
            ));

        List<Map<String, Object>> result = new ArrayList<>(industryGroups.size());
        for (Map.Entry<String, List<OsgPosition>> industryEntry : industryGroups.entrySet())
        {
            List<OsgPosition> industryRows = industryEntry.getValue();
            Map<String, List<OsgPosition>> companyGroups = industryRows.stream()
                .collect(Collectors.groupingBy(
                    row -> defaultText(row.getCompanyName(), "-"),
                    LinkedHashMap::new,
                    Collectors.toList()
                ));

            List<Map<String, Object>> companies = new ArrayList<>(companyGroups.size());
            int industryStudentCount = 0;
            int industryOpenCount = 0;
            for (Map.Entry<String, List<OsgPosition>> companyEntry : companyGroups.entrySet())
            {
                List<OsgPosition> companyRows = companyEntry.getValue();
                int companyStudentCount = companyRows.stream()
                    .mapToInt(row -> row.getStudentCount() == null ? 0 : row.getStudentCount())
                    .sum();
                int companyOpenCount = (int) companyRows.stream()
                    .filter(row -> "visible".equals(normalizeDisplayStatus(row.getDisplayStatus())))
                    .count();

                List<Map<String, Object>> positions = companyRows.stream()
                    .map(this::toPositionMap)
                    .toList();

                Map<String, Object> company = new LinkedHashMap<>();
                company.put("companyName", companyEntry.getKey());
                company.put("companyType", defaultText(companyRows.get(0).getCompanyType(), "-"));
                company.put("companyWebsite", defaultText(companyRows.get(0).getCompanyWebsite(), ""));
                company.put("positionCount", companyRows.size());
                company.put("openCount", companyOpenCount);
                company.put("studentCount", companyStudentCount);
                company.put("positions", positions);
                companies.add(company);

                industryStudentCount += companyStudentCount;
                industryOpenCount += companyOpenCount;
            }

            Map<String, Object> industry = new LinkedHashMap<>();
            industry.put("industry", industryEntry.getKey());
            industry.put("companyCount", companyGroups.size());
            industry.put("positionCount", industryRows.size());
            industry.put("openCount", industryOpenCount);
            industry.put("studentCount", industryStudentCount);
            industry.put("companies", companies);
            result.add(industry);
        }
        return result;
    }

    @Override
    public Map<String, Object> selectPositionMeta()
    {
        ensurePositionReferenceData();

        List<OsgPosition> rows = selectPositionList(new OsgPosition());
        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("categories", buildMergedOptions(distinctValues(rows, OsgPosition::getPositionCategory), DICT_POSITION_CATEGORY));
        meta.put("displayStatuses", buildMergedOptions(distinctValues(rows, OsgPosition::getDisplayStatus), DICT_POSITION_DISPLAY_STATUS));
        meta.put("industries", buildMergedOptions(distinctValues(rows, OsgPosition::getIndustry), DICT_POSITION_INDUSTRY));
        meta.put("companyTypes", buildMergedOptions(distinctValues(rows, OsgPosition::getCompanyType), DICT_COMPANY_TYPE));
        meta.put("recruitmentCycles", buildStaticOptions(DICT_RECRUITMENT_CYCLE));
        meta.put("projectYears", buildMergedOptions(distinctValues(rows, OsgPosition::getProjectYear), DICT_PROJECT_YEAR));
        meta.put("regions", buildMergedOptions(distinctValues(rows, OsgPosition::getRegion), DICT_POSITION_REGION));
        meta.put("citiesByRegion", buildCitiesByRegion(rows));
        meta.put("publishPresets", buildStaticOptions(DICT_POSITION_PUBLISH_PRESET));
        meta.put("processGlossary", buildStaticOptions(DICT_POSITION_PROCESS_GLOSSARY));

        Map<String, SysDictData> uiCopy = loadDictValueMap(DICT_POSITION_UI_COPY);
        meta.put("uploadRuleCopy", dictLabel(uiCopy, "upload_rule", null));
        meta.put("uploadSteps", buildUploadSteps(uiCopy));
        meta.put("trafficSummary", null);
        return meta;
    }

    @Override
    public List<Map<String, Object>> selectPositionCompanyOptions(String keyword)
    {
        String normalizedKeyword = normalizeSearch(keyword);
        return selectPositionList(new OsgPosition()).stream()
            .filter(row -> StringUtils.hasText(row.getCompanyName()))
            .filter(row -> normalizedKeyword == null
                || row.getCompanyName().toLowerCase(Locale.ROOT).contains(normalizedKeyword))
            .collect(Collectors.toMap(
                row -> row.getCompanyName().trim(),
                row -> row,
                (first, second) -> first,
                LinkedHashMap::new
            ))
            .values()
            .stream()
            .sorted(Comparator.comparing(row -> row.getCompanyName().toLowerCase(Locale.ROOT)))
            .map(row -> {
                Map<String, Object> option = new LinkedHashMap<>();
                option.put("value", row.getCompanyName());
                option.put("label", row.getCompanyName());
                option.put("industry", defaultText(row.getIndustry(), ""));
                option.put("companyType", defaultText(row.getCompanyType(), ""));
                option.put("companyWebsite", defaultText(row.getCompanyWebsite(), ""));
                return option;
            })
            .toList();
    }

    @Override
    public List<Map<String, Object>> selectPositionStudents(Long positionId)
    {
        if (positionId == null)
        {
            throw new ServiceException("岗位ID不能为空");
        }

        OsgJobApplication query = new OsgJobApplication();
        query.setPositionId(positionId);
        List<OsgJobApplication> rows = jobApplicationMapper.selectJobApplicationList(query);
        if (rows == null || rows.isEmpty())
        {
            return List.of();
        }

        return rows.stream()
            .sorted(Comparator.comparing(OsgJobApplication::getSubmittedAt, Comparator.nullsLast(Date::compareTo)).reversed())
            .map(row -> {
                OsgCoaching coaching = coachingMapper.selectCoachingByApplicationId(row.getApplicationId());
                String status = defaultText(row.getCurrentStage(), defaultText(row.getCoachingStatus(), "未申请"));
                Map<String, Object> payload = new LinkedHashMap<>();
                payload.put("studentId", row.getStudentId());
                payload.put("studentName", defaultText(row.getStudentName(), "-"));
                payload.put("positionName", defaultText(row.getPositionName(), "-"));
                payload.put("status", status);
                payload.put("statusTone", inferStudentStatusTone(status));
                payload.put("usedHours", coaching == null || coaching.getTotalHours() == null ? 0 : coaching.getTotalHours());
                return payload;
            })
            .toList();
    }

    @Override
    public Map<String, Object> createPosition(Map<String, Object> body, String username)
    {
        OsgPosition position = buildPosition(body, true);
        position.setCreateBy(username);
        position.setUpdateBy(username);
        if (positionMapper.insertPosition(position) <= 0)
        {
            throw new ServiceException("岗位新增失败");
        }

        OsgPosition persisted = positionMapper.selectPositionByPositionId(position.getPositionId());
        return toPositionMap(persisted == null ? position : persisted);
    }

    @Override
    public Map<String, Object> updatePosition(Map<String, Object> body, String username)
    {
        Long positionId = asLong(body.get("positionId"));
        if (positionId == null)
        {
            throw new ServiceException("岗位ID不能为空");
        }

        OsgPosition existing = positionMapper.selectPositionByPositionId(positionId);
        if (existing == null)
        {
            throw new ServiceException("岗位不存在");
        }

        OsgPosition position = buildPosition(body, false);
        position.setPositionId(positionId);
        position.setUpdateBy(username);
        if (positionMapper.updatePosition(position) <= 0)
        {
            throw new ServiceException("岗位更新失败");
        }

        OsgPosition persisted = positionMapper.selectPositionByPositionId(positionId);
        return toPositionMap(persisted == null ? mergeFallback(existing, position) : persisted);
    }

    @Override
    public Map<String, Object> batchUploadPositions(MultipartFile file, String username)
    {
        if (file == null || file.isEmpty())
        {
            throw new ServiceException("上传文件不能为空");
        }

        List<OsgPosition> existingRows = selectPositionList(new OsgPosition());
        Set<String> existingKeys = existingRows.stream()
            .map(this::buildDedupKey)
            .filter(Objects::nonNull)
            .collect(Collectors.toCollection(LinkedHashSet::new));

        int totalCount = 0;
        int successCount = 0;
        List<String> duplicates = new ArrayList<>();
        Set<String> seenInFile = new LinkedHashSet<>();
        DataFormatter formatter = new DataFormatter();

        try (InputStream inputStream = file.getInputStream(); XSSFWorkbook workbook = new XSSFWorkbook(inputStream))
        {
            XSSFSheet sheet = workbook.getSheetAt(0);
            Map<String, Integer> headerIndexes = readHeaderIndexes(sheet.getRow(0), formatter);
            for (int rowIndex = 1; rowIndex <= sheet.getLastRowNum(); rowIndex++)
            {
                Row row = sheet.getRow(rowIndex);
                if (row == null || isBlankRow(row, headerIndexes, formatter))
                {
                    continue;
                }

                totalCount++;
                OsgPosition position = buildPositionFromRow(row, headerIndexes, formatter);
                String dedupKey = buildDedupKey(position);
                String label = buildDuplicateLabel(position);
                if (existingKeys.contains(dedupKey) || seenInFile.contains(dedupKey))
                {
                    duplicates.add(label);
                    continue;
                }

                position.setCreateBy(username);
                position.setUpdateBy(username);
                positionMapper.insertPosition(position);
                successCount++;
                existingKeys.add(dedupKey);
                seenInFile.add(dedupKey);
            }
        }
        catch (ServiceException ex)
        {
            throw ex;
        }
        catch (Exception ex)
        {
            throw new ServiceException("岗位批量上传解析失败");
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalCount", totalCount);
        result.put("successCount", successCount);
        result.put("duplicateCount", duplicates.size());
        result.put("duplicates", duplicates);
        return result;
    }

    private void ensurePositionReferenceData()
    {
        if (referenceDataReady)
        {
            return;
        }
        synchronized (this)
        {
            if (referenceDataReady)
            {
                return;
            }

            seedStaticDicts(List.of(
                new DictSeed(DICT_POSITION_CATEGORY, "summer", "暑期实习", 1L, null, null, null),
                new DictSeed(DICT_POSITION_CATEGORY, "fulltime", "全职招聘", 2L, null, null, null),
                new DictSeed(DICT_POSITION_CATEGORY, "offcycle", "非常规周期", 3L, null, null, null),
                new DictSeed(DICT_POSITION_CATEGORY, "spring", "春季实习", 4L, null, null, null),
                new DictSeed(DICT_POSITION_CATEGORY, "events", "招聘活动", 5L, null, null, null),
                new DictSeed(DICT_POSITION_DISPLAY_STATUS, "visible", "展示中", 1L, "success", null, null),
                new DictSeed(DICT_POSITION_DISPLAY_STATUS, "hidden", "已隐藏", 2L, "muted", null, null),
                new DictSeed(DICT_POSITION_DISPLAY_STATUS, "expired", "已过期", 3L, "danger", null, null),
                new DictSeed(DICT_POSITION_INDUSTRY, "Investment Bank", "Investment Bank", 1L, "gold", "mdi-star", null),
                new DictSeed(DICT_POSITION_INDUSTRY, "Consulting", "Consulting", 2L, "violet", "mdi-lightbulb", null),
                new DictSeed(DICT_POSITION_INDUSTRY, "Tech", "Tech", 3L, "blue", "mdi-laptop", null),
                new DictSeed(DICT_POSITION_INDUSTRY, "PE/VC", "PE/VC", 4L, "amber", "mdi-chart-line", null),
                new DictSeed(DICT_COMPANY_TYPE, "Investment Bank", "Investment Bank", 1L, null, null, null),
                new DictSeed(DICT_COMPANY_TYPE, "Consulting", "Consulting", 2L, null, null, null),
                new DictSeed(DICT_COMPANY_TYPE, "Tech", "Tech", 3L, null, null, null),
                new DictSeed(DICT_COMPANY_TYPE, "PE/VC", "PE/VC", 4L, null, null, null),
                new DictSeed(DICT_COMPANY_TYPE, "PE", "PE", 5L, null, null, null),
                new DictSeed(DICT_COMPANY_TYPE, "VC", "VC", 6L, null, null, null),
                new DictSeed(DICT_COMPANY_TYPE, "Other", "Other", 7L, null, null, null),
                new DictSeed(DICT_RECRUITMENT_CYCLE, "Spring Week", "Spring Week", 1L, null, null, null),
                new DictSeed(DICT_RECRUITMENT_CYCLE, "2024 Spring", "2024 Spring", 2L, null, null, null),
                new DictSeed(DICT_RECRUITMENT_CYCLE, "2025 Spring", "2025 Spring", 3L, null, null, null),
                new DictSeed(DICT_RECRUITMENT_CYCLE, "2026 Spring", "2026 Spring", 4L, null, null, null),
                new DictSeed(DICT_RECRUITMENT_CYCLE, "2027 Spring", "2027 Spring", 5L, null, null, null),
                new DictSeed(DICT_RECRUITMENT_CYCLE, "2024 Summer", "2024 Summer", 6L, null, null, null),
                new DictSeed(DICT_RECRUITMENT_CYCLE, "2025 Summer", "2025 Summer", 7L, null, null, null),
                new DictSeed(DICT_RECRUITMENT_CYCLE, "2026 Summer", "2026 Summer", 8L, null, null, null),
                new DictSeed(DICT_RECRUITMENT_CYCLE, "2027 Summer", "2027 Summer", 9L, null, null, null),
                new DictSeed(DICT_RECRUITMENT_CYCLE, "2024 Autumn", "2024 Autumn", 10L, null, null, null),
                new DictSeed(DICT_RECRUITMENT_CYCLE, "2025 Autumn", "2025 Autumn", 11L, null, null, null),
                new DictSeed(DICT_RECRUITMENT_CYCLE, "2026 Autumn", "2026 Autumn", 12L, null, null, null),
                new DictSeed(DICT_RECRUITMENT_CYCLE, "2027 Autumn", "2027 Autumn", 13L, null, null, null),
                new DictSeed(DICT_RECRUITMENT_CYCLE, "2024 Full-time", "2024 Full-time", 14L, null, null, null),
                new DictSeed(DICT_RECRUITMENT_CYCLE, "2025 Full-time", "2025 Full-time", 15L, null, null, null),
                new DictSeed(DICT_RECRUITMENT_CYCLE, "2026 Full-time", "2026 Full-time", 16L, null, null, null),
                new DictSeed(DICT_RECRUITMENT_CYCLE, "2027 Full-time", "2027 Full-time", 17L, null, null, null),
                new DictSeed(DICT_RECRUITMENT_CYCLE, "Off-cycle", "Off-cycle", 18L, null, null, null),
                new DictSeed(DICT_PROJECT_YEAR, "2024", "2024", 1L, null, null, null),
                new DictSeed(DICT_PROJECT_YEAR, "2025", "2025", 2L, null, null, null),
                new DictSeed(DICT_PROJECT_YEAR, "2026", "2026", 3L, null, null, null),
                new DictSeed(DICT_PROJECT_YEAR, "2027", "2027", 4L, null, null, null),
                new DictSeed(DICT_POSITION_REGION, "na", "北美", 1L, null, null, null),
                new DictSeed(DICT_POSITION_REGION, "eu", "欧洲", 2L, null, null, null),
                new DictSeed(DICT_POSITION_REGION, "ap", "亚太", 3L, null, null, null),
                new DictSeed(DICT_POSITION_REGION, "cn", "中国大陆", 4L, null, null, null),
                new DictSeed(DICT_POSITION_CITY, "New York", "New York", 1L, null, "na", null),
                new DictSeed(DICT_POSITION_CITY, "San Francisco", "San Francisco", 2L, null, "na", null),
                new DictSeed(DICT_POSITION_CITY, "Chicago", "Chicago", 3L, null, "na", null),
                new DictSeed(DICT_POSITION_CITY, "Boston", "Boston", 4L, null, "na", null),
                new DictSeed(DICT_POSITION_CITY, "London", "London", 5L, null, "eu", null),
                new DictSeed(DICT_POSITION_CITY, "Frankfurt", "Frankfurt", 6L, null, "eu", null),
                new DictSeed(DICT_POSITION_CITY, "Hong Kong", "Hong Kong", 7L, null, "ap", null),
                new DictSeed(DICT_POSITION_CITY, "Singapore", "Singapore", 8L, null, "ap", null),
                new DictSeed(DICT_POSITION_CITY, "Tokyo", "Tokyo", 9L, null, "ap", null),
                new DictSeed(DICT_POSITION_CITY, "Shanghai", "Shanghai", 10L, null, "cn", null),
                new DictSeed(DICT_POSITION_CITY, "Beijing", "Beijing", 11L, null, "cn", null),
                new DictSeed(DICT_POSITION_PUBLISH_PRESET, "week", "本周", 1L, null, null, null),
                new DictSeed(DICT_POSITION_PUBLISH_PRESET, "month", "本月", 2L, null, null, null),
                new DictSeed(DICT_POSITION_PUBLISH_PRESET, "quarter", "近三个月", 3L, null, null, null),
                new DictSeed(DICT_POSITION_PROCESS_GLOSSARY, "OA", "Online Assessment", 1L, null, null, null),
                new DictSeed(DICT_POSITION_PROCESS_GLOSSARY, "VI", "Video Interview", 2L, null, null, null),
                new DictSeed(DICT_POSITION_PROCESS_GLOSSARY, "HV", "Hirevue", 3L, null, null, null),
                new DictSeed(DICT_POSITION_PROCESS_GLOSSARY, "AC", "Assessment Centre", 4L, null, null, null),
                new DictSeed(DICT_POSITION_PROCESS_GLOSSARY, "SD", "Super Day", 5L, null, null, null),
                new DictSeed(DICT_POSITION_PROCESS_GLOSSARY, "Case", "Case Interview", 6L, null, null, null),
                new DictSeed(DICT_POSITION_UI_COPY, "upload_rule", "银行名称 + 岗位名称 + 地区 + 项目时间；当前系统按公司名称 + 岗位名称 + 地区 + 项目时间 相同视为重复，将跳过导入", 1L, null, null, null),
                new DictSeed(DICT_POSITION_UI_COPY, "upload_step_1", "点击上方\"下载模板\"按钮获取Excel模板", 2L, null, null, null),
                new DictSeed(DICT_POSITION_UI_COPY, "upload_step_2", "按模板格式填写岗位信息（所有字段必填）", 3L, null, null, null),
                new DictSeed(DICT_POSITION_UI_COPY, "upload_step_3", "上传填写好的文件", 4L, null, null, null)
            ));
            purgeObsoleteDictValues(DICT_RECRUITMENT_CYCLE, Set.of("2024", "2025", "2026", "2027"));
            normalizeLegacyRecruitmentCycles();

            referenceDataReady = true;
        }
    }

    private void seedStaticDicts(List<DictSeed> seeds)
    {
        for (DictSeed seed : seeds)
        {
            upsertDictData(seed);
        }
    }

    private void purgeObsoleteDictValues(String dictType, Set<String> obsoleteValues)
    {
        if (obsoleteValues == null || obsoleteValues.isEmpty())
        {
            return;
        }
        for (SysDictData item : loadDictItems(dictType))
        {
            if (!obsoleteValues.contains(item.getDictValue()))
            {
                continue;
            }
            sysDictDataMapper.deleteDictDataById(item.getDictCode());
        }
    }

    private void normalizeLegacyRecruitmentCycles()
    {
        for (OsgPosition row : selectPositionList(new OsgPosition()))
        {
            String normalizedCycle = normalizeLegacyRecruitmentCycleValue(row);
            if (!StringUtils.hasText(normalizedCycle) || Objects.equals(normalizedCycle, row.getRecruitmentCycle()))
            {
                continue;
            }
            OsgPosition patch = new OsgPosition();
            patch.setPositionId(row.getPositionId());
            patch.setRecruitmentCycle(normalizedCycle);
            patch.setUpdateBy("codex");
            positionMapper.updatePosition(patch);
        }
    }

    private String normalizeLegacyRecruitmentCycleValue(OsgPosition position)
    {
        String recruitmentCycle = asText(position.getRecruitmentCycle());
        if (!StringUtils.hasText(recruitmentCycle) || !recruitmentCycle.matches("\\d{4}"))
        {
            return recruitmentCycle;
        }

        String category = defaultText(asText(position.getPositionCategory()), "").toLowerCase(Locale.ROOT);
        return switch (category)
        {
            case "summer", "暑期实习" -> recruitmentCycle + " Summer";
            case "fulltime", "全职招聘" -> recruitmentCycle + " Full-time";
            case "spring", "春季实习" -> recruitmentCycle + " Spring";
            case "offcycle", "非常规周期" -> "Off-cycle";
            default -> recruitmentCycle;
        };
    }

    private List<String> distinctValues(List<OsgPosition> rows, java.util.function.Function<OsgPosition, String> getter)
    {
        LinkedHashSet<String> values = new LinkedHashSet<>();
        for (OsgPosition row : rows)
        {
            String value = getter.apply(row);
            if (StringUtils.hasText(value))
            {
                values.add(value.trim());
            }
        }
        return new ArrayList<>(values);
    }

    private List<Map<String, Object>> buildMergedOptions(Collection<String> observedValues, String dictType)
    {
        List<Map<String, Object>> options = buildStaticOptions(dictType);
        Set<String> existing = options.stream()
            .map(item -> String.valueOf(item.get("value")))
            .collect(Collectors.toCollection(LinkedHashSet::new));
        for (String value : observedValues)
        {
            if (!StringUtils.hasText(value) || existing.contains(value))
            {
                continue;
            }
            options.add(option(value, value, null, null, null));
        }
        return options;
    }

    private List<Map<String, Object>> buildStaticOptions(String dictType)
    {
        List<Map<String, Object>> options = new ArrayList<>();
        for (SysDictData item : loadDictItems(dictType))
        {
            options.add(option(
                item.getDictValue(),
                item.getDictLabel(),
                item.getCssClass(),
                item.getListClass(),
                item.getRemark()
            ));
        }
        return options;
    }

    private Map<String, List<Map<String, Object>>> buildCitiesByRegion(List<OsgPosition> rows)
    {
        Map<String, List<Map<String, Object>>> cities = new LinkedHashMap<>();
        for (SysDictData item : loadDictItems(DICT_POSITION_CITY))
        {
            String parent = defaultText(item.getListClass(), item.getRemark());
            if (!StringUtils.hasText(parent))
            {
                continue;
            }
            cities.computeIfAbsent(parent, ignored -> new ArrayList<>())
                .add(option(item.getDictValue(), item.getDictLabel(), item.getCssClass(), parent, item.getRemark()));
        }

        for (OsgPosition row : rows)
        {
            if (!StringUtils.hasText(row.getRegion()) || !StringUtils.hasText(row.getCity()))
            {
                continue;
            }
            List<Map<String, Object>> options = cities.computeIfAbsent(row.getRegion(), ignored -> new ArrayList<>());
            boolean exists = options.stream().anyMatch(item -> Objects.equals(item.get("value"), row.getCity()));
            if (!exists)
            {
                options.add(option(row.getCity(), row.getCity(), null, row.getRegion(), null));
            }
        }
        return cities;
    }

    private List<String> buildUploadSteps(Map<String, SysDictData> uiCopy)
    {
        List<String> steps = new ArrayList<>();
        for (int index = 1; index <= 3; index++)
        {
            String step = dictLabel(uiCopy, "upload_step_" + index, null);
            if (StringUtils.hasText(step))
            {
                steps.add(step);
            }
        }
        return steps;
    }

    private Map<String, Object> option(String value, String label, String tone, String listClass, String remark)
    {
        Map<String, Object> option = new LinkedHashMap<>();
        option.put("value", value);
        option.put("label", defaultText(label, value));
        if (StringUtils.hasText(tone))
        {
            option.put("tone", tone);
        }
        if (StringUtils.hasText(listClass))
        {
            if (listClass.startsWith("mdi-"))
            {
                option.put("icon", listClass);
            }
            else
            {
                option.put("parent", listClass);
            }
        }
        if (StringUtils.hasText(remark))
        {
            option.put("remark", remark);
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

    private void upsertDictData(DictSeed seed)
    {
        SysDictData existing = findDict(seed.type(), seed.value());
        if (existing != null)
        {
            existing.setDictSort(seed.sort());
            existing.setDictLabel(seed.label());
            existing.setCssClass(seed.cssClass());
            existing.setListClass(seed.listClass());
            existing.setRemark(seed.remark());
            existing.setStatus("0");
            existing.setUpdateBy("codex");
            sysDictDataMapper.updateDictData(existing);
            return;
        }

        SysDictData created = new SysDictData();
        created.setDictType(seed.type());
        created.setDictValue(seed.value());
        created.setDictLabel(seed.label());
        created.setDictSort(seed.sort());
        created.setCssClass(seed.cssClass());
        created.setListClass(seed.listClass());
        created.setRemark(seed.remark());
        created.setIsDefault("N");
        created.setStatus("0");
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

    private OsgPosition buildPosition(Map<String, Object> body, boolean validateRequired)
    {
        OsgPosition position = new OsgPosition();
        position.setPositionCategory(asText(body.get("positionCategory")));
        position.setIndustry(asText(body.get("industry")));
        position.setCompanyName(asText(body.get("companyName")));
        position.setCompanyType(defaultText(asText(body.get("companyType")), position.getIndustry()));
        position.setCompanyWebsite(asText(body.get("companyWebsite")));
        position.setPositionName(asText(body.get("positionName")));
        position.setDepartment(asText(body.get("department")));
        position.setRegion(asText(body.get("region")));
        position.setCity(asText(body.get("city")));
        position.setRecruitmentCycle(asText(body.get("recruitmentCycle")));
        position.setProjectYear(asText(body.get("projectYear")));
        position.setPublishTime(asDate(body.get("publishTime")));
        position.setDeadline(asDate(body.get("deadline")));
        position.setDisplayStatus(normalizeDisplayStatus(asText(body.get("displayStatus"))));
        position.setDisplayStartTime(asDate(body.get("displayStartTime")));
        position.setDisplayEndTime(asDate(body.get("displayEndTime")));
        position.setPositionUrl(asText(body.get("positionUrl")));
        position.setApplicationNote(asText(body.get("applicationNote")));
        position.setKeyword(asText(body.get("keyword")));

        if (validateRequired)
        {
            require(position.getPositionCategory(), "岗位分类不能为空");
            require(position.getIndustry(), "行业不能为空");
            require(position.getCompanyName(), "公司名称不能为空");
            require(position.getPositionName(), "岗位名称不能为空");
            require(position.getRegion(), "大区不能为空");
            require(position.getCity(), "城市不能为空");
            require(position.getRecruitmentCycle(), "招聘周期不能为空");
            require(position.getProjectYear(), "项目时间不能为空");
        }

        if (position.getPublishTime() == null)
        {
            position.setPublishTime(new Date());
        }
        if (position.getDisplayStartTime() == null)
        {
            position.setDisplayStartTime(new Date());
        }
        if (position.getDisplayEndTime() == null)
        {
            position.setDisplayEndTime(Date.from(LocalDateTime.now().plusDays(90).atZone(ZONE_ID).toInstant()));
        }
        if (position.getDisplayStatus() == null)
        {
            position.setDisplayStatus("visible");
        }
        return position;
    }

    private OsgPosition buildPositionFromRow(Row row, Map<String, Integer> headerIndexes, DataFormatter formatter)
    {
        OsgPosition position = new OsgPosition();
        position.setCompanyName(readCell(row, headerIndexes, formatter, "company_name"));
        position.setPositionName(readCell(row, headerIndexes, formatter, "position_name"));
        position.setRegion(readCell(row, headerIndexes, formatter, "region"));
        position.setCity(readCell(row, headerIndexes, formatter, "city"));
        position.setProjectYear(readCell(row, headerIndexes, formatter, "project_year"));
        position.setIndustry(defaultText(readCell(row, headerIndexes, formatter, "industry"), "Other"));
        position.setPositionCategory(defaultText(readCell(row, headerIndexes, formatter, "position_category"), "summer"));
        position.setCompanyType(defaultText(readCell(row, headerIndexes, formatter, "company_type"), position.getIndustry()));
        position.setRecruitmentCycle(defaultText(readCell(row, headerIndexes, formatter, "recruitment_cycle"), position.getProjectYear()));
        position.setPublishTime(new Date());
        position.setDisplayStatus("visible");
        position.setDisplayStartTime(new Date());
        position.setDisplayEndTime(Date.from(LocalDateTime.now().plusDays(90).atZone(ZONE_ID).toInstant()));

        require(position.getCompanyName(), "公司名称不能为空");
        require(position.getPositionName(), "岗位名称不能为空");
        require(position.getRegion(), "大区不能为空");
        require(position.getCity(), "城市不能为空");
        require(position.getProjectYear(), "项目时间不能为空");
        return position;
    }

    private Map<String, Integer> readHeaderIndexes(Row headerRow, DataFormatter formatter)
    {
        if (headerRow == null)
        {
            throw new ServiceException("Excel表头不能为空");
        }

        Map<String, Integer> indexes = new LinkedHashMap<>();
        for (Cell cell : headerRow)
        {
            String name = formatter.formatCellValue(cell);
            if (name != null && !name.isBlank())
            {
                indexes.put(name.trim().toLowerCase(Locale.ROOT), cell.getColumnIndex());
            }
        }
        return indexes;
    }

    private boolean isBlankRow(Row row, Map<String, Integer> headerIndexes, DataFormatter formatter)
    {
        for (Integer columnIndex : headerIndexes.values())
        {
            String value = formatter.formatCellValue(row.getCell(columnIndex));
            if (value != null && !value.isBlank())
            {
                return false;
            }
        }
        return true;
    }

    private String readCell(Row row, Map<String, Integer> headerIndexes, DataFormatter formatter, String key)
    {
        Integer columnIndex = headerIndexes.get(key);
        if (columnIndex == null)
        {
            return null;
        }
        return asText(formatter.formatCellValue(row.getCell(columnIndex)));
    }

    private String buildDedupKey(OsgPosition position)
    {
        if (position == null)
        {
            return null;
        }
        return String.join("::",
            defaultText(position.getCompanyName(), ""),
            defaultText(position.getPositionName(), ""),
            defaultText(position.getRegion(), ""),
            defaultText(position.getCity(), ""),
            defaultText(position.getProjectYear(), "")
        ).toLowerCase(Locale.ROOT);
    }

    private String buildDuplicateLabel(OsgPosition position)
    {
        return "%s / %s / %s / %s".formatted(
            defaultText(position.getCompanyName(), "-"),
            defaultText(position.getPositionName(), "-"),
            defaultText(position.getCity(), "-"),
            defaultText(position.getProjectYear(), "-")
        );
    }

    private Map<String, Object> toPositionMap(OsgPosition position)
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("positionId", position.getPositionId());
        row.put("positionCategory", position.getPositionCategory());
        row.put("industry", position.getIndustry());
        row.put("companyName", position.getCompanyName());
        row.put("companyType", position.getCompanyType());
        row.put("companyWebsite", defaultText(position.getCompanyWebsite(), ""));
        row.put("positionName", position.getPositionName());
        row.put("department", defaultText(position.getDepartment(), ""));
        row.put("region", position.getRegion());
        row.put("city", position.getCity());
        row.put("recruitmentCycle", position.getRecruitmentCycle());
        row.put("projectYear", position.getProjectYear());
        row.put("publishTime", position.getPublishTime());
        row.put("deadline", position.getDeadline());
        row.put("displayStatus", normalizeDisplayStatus(position.getDisplayStatus()));
        row.put("displayStartTime", position.getDisplayStartTime());
        row.put("displayEndTime", position.getDisplayEndTime());
        row.put("positionUrl", defaultText(position.getPositionUrl(), ""));
        row.put("applicationNote", defaultText(position.getApplicationNote(), ""));
        row.put("studentCount", position.getStudentCount() == null ? 0 : position.getStudentCount());
        return row;
    }

    private OsgPosition mergeFallback(OsgPosition current, OsgPosition payload)
    {
        if (payload.getDisplayStatus() != null)
        {
            current.setDisplayStatus(payload.getDisplayStatus());
        }
        if (payload.getApplicationNote() != null)
        {
            current.setApplicationNote(payload.getApplicationNote());
        }
        return current;
    }

    private Date asDate(Object value)
    {
        String text = asText(value);
        if (text == null)
        {
            return null;
        }
        try
        {
            return Date.from(LocalDateTime.parse(text).atZone(ZONE_ID).toInstant());
        }
        catch (Exception ignored)
        {
            return null;
        }
    }

    private Long asLong(Object value)
    {
        if (value instanceof Number number)
        {
            return number.longValue();
        }
        String text = asText(value);
        if (text == null)
        {
            return null;
        }
        try
        {
            return Long.parseLong(text);
        }
        catch (NumberFormatException ex)
        {
            return null;
        }
    }

    private String asText(Object value)
    {
        if (value == null)
        {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
    }

    private String defaultText(String value, String defaultValue)
    {
        return value == null || value.isBlank() ? defaultValue : value;
    }

    private String normalizeSearch(String value)
    {
        return StringUtils.hasText(value) ? value.trim().toLowerCase(Locale.ROOT) : null;
    }

    private String dictLabel(Map<String, SysDictData> dict, String value, String fallback)
    {
        SysDictData item = dict.get(value);
        if (item == null)
        {
            return fallback;
        }
        return defaultText(item.getDictLabel(), fallback);
    }

    private String normalizeDisplayStatus(String displayStatus)
    {
        if (displayStatus == null || displayStatus.isBlank())
        {
            return null;
        }
        String normalized = displayStatus.trim().toLowerCase(Locale.ROOT);
        return switch (normalized)
        {
            case "visible", "hidden", "expired" -> normalized;
            case "0" -> "visible";
            case "1" -> "hidden";
            default -> normalized;
        };
    }

    private String inferStudentStatusTone(String status)
    {
        String normalized = defaultText(status, "").toLowerCase(Locale.ROOT);
        if (normalized.contains("offer") || normalized.contains("通过") || normalized.contains("成功"))
        {
            return "success";
        }
        if (normalized.contains("拒") || normalized.contains("淘汰"))
        {
            return "danger";
        }
        if (normalized.contains("面试") || normalized.contains("interview"))
        {
            return "warning";
        }
        if (normalized.contains("投递") || normalized.contains("apply"))
        {
            return "info";
        }
        return "default";
    }

    private void require(String value, String message)
    {
        if (value == null || value.isBlank())
        {
            throw new ServiceException(message);
        }
    }

    private record DictSeed(String type, String value, String label, Long sort, String cssClass, String listClass, String remark)
    {
    }
}
