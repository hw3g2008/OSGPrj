package com.ruoyi.system.service.impl;

import java.util.Collection;
import java.util.Comparator;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgCoaching;
import com.ruoyi.system.domain.OsgJobApplication;
import com.ruoyi.system.domain.OsgPosition;
import com.ruoyi.system.mapper.OsgCoachingMapper;
import com.ruoyi.system.mapper.OsgJobApplicationMapper;
import com.ruoyi.system.mapper.OsgPositionMapper;
import com.ruoyi.system.service.IOsgLeadMentorPositionService;

@Service
public class OsgLeadMentorPositionServiceImpl implements IOsgLeadMentorPositionService
{
    private static final String PUBLIC_DISPLAY_STATUS = "visible";

    @Autowired
    private OsgPositionMapper positionMapper;

    @Autowired
    private OsgJobApplicationMapper jobApplicationMapper;

    @Autowired
    private OsgCoachingMapper coachingMapper;

    @Override
    public List<Map<String, Object>> selectPositionList(OsgPosition query, Long leadMentorId)
    {
        List<OsgPosition> rows = positionMapper.selectPositionList(normalizeQuery(query));
        Map<Long, Long> scopedCounts = buildScopedCounts(leadMentorId);
        return rows.stream()
            .map(row -> toPositionRow(row, scopedCounts.getOrDefault(row.getPositionId(), 0L).intValue()))
            .toList();
    }

    @Override
    public Map<String, Object> selectPositionMeta()
    {
        List<OsgPosition> rows = positionMapper.selectPositionList(normalizeQuery(null));
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("categories", buildOptions(rows, OsgPosition::getPositionCategory));
        payload.put("displayStatuses", List.of(option(PUBLIC_DISPLAY_STATUS, PUBLIC_DISPLAY_STATUS)));
        payload.put("industries", buildOptions(rows, OsgPosition::getIndustry));
        payload.put("companyTypes", buildOptions(rows, OsgPosition::getCompanyType));
        payload.put("companies", buildOptions(rows, OsgPosition::getCompanyName));
        payload.put("recruitmentCycles", buildOptions(rows, OsgPosition::getRecruitmentCycle));
        payload.put("projectYears", buildOptions(rows, OsgPosition::getProjectYear));
        payload.put("regions", buildOptions(rows, OsgPosition::getRegion));
        payload.put("citiesByRegion", buildCitiesByRegion(rows));
        payload.put("sortOptions", List.of(option("publishTime:desc", "发布时间倒序")));
        return payload;
    }

    @Override
    public List<Map<String, Object>> selectPositionStudents(Long positionId, Long leadMentorId)
    {
        if (positionId == null)
        {
            throw new ServiceException("岗位ID不能为空");
        }
        if (leadMentorId == null)
        {
            return List.of();
        }

        OsgJobApplication query = new OsgJobApplication();
        query.setPositionId(positionId);
        query.setLeadMentorId(leadMentorId);
        List<OsgJobApplication> rows = jobApplicationMapper.selectJobApplicationList(query);
        if (rows == null || rows.isEmpty())
        {
            return List.of();
        }

        return rows.stream()
            .sorted(Comparator.comparing(OsgJobApplication::getSubmittedAt, Comparator.nullsLast(Date::compareTo)).reversed())
            .map(this::toStudentRow)
            .toList();
    }

    private OsgPosition normalizeQuery(OsgPosition query)
    {
        OsgPosition normalized = new OsgPosition();
        if (query != null)
        {
            normalized.setKeyword(trimToNull(query.getKeyword()));
            normalized.setPositionCategory(trimToNull(query.getPositionCategory()));
            normalized.setIndustry(trimToNull(query.getIndustry()));
            normalized.setCompanyName(trimToNull(query.getCompanyName()));
            normalized.setRegion(trimToNull(query.getRegion()));
            normalized.setCity(trimToNull(query.getCity()));
            normalized.setRecruitmentCycle(trimToNull(query.getRecruitmentCycle()));
            normalized.setProjectYear(trimToNull(query.getProjectYear()));
            normalized.setParams(query.getParams());
        }
        normalized.setDisplayStatus(PUBLIC_DISPLAY_STATUS);
        return normalized;
    }

    private Map<Long, Long> buildScopedCounts(Long leadMentorId)
    {
        if (leadMentorId == null)
        {
            return Map.of();
        }

        OsgJobApplication query = new OsgJobApplication();
        query.setLeadMentorId(leadMentorId);
        List<OsgJobApplication> applications = jobApplicationMapper.selectJobApplicationList(query);
        if (applications == null || applications.isEmpty())
        {
            return Map.of();
        }

        return applications.stream()
            .filter(this::countsTowardScopedSummary)
            .map(OsgJobApplication::getPositionId)
            .filter(Objects::nonNull)
            .collect(Collectors.groupingBy(Function.identity(), LinkedHashMap::new, Collectors.counting()));
    }

    private Map<String, Object> toPositionRow(OsgPosition position, int myStudentCount)
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("positionId", position.getPositionId());
        row.put("positionCategory", defaultText(position.getPositionCategory()));
        row.put("industry", defaultText(position.getIndustry()));
        row.put("companyName", defaultText(position.getCompanyName()));
        row.put("companyType", defaultText(position.getCompanyType()));
        row.put("companyWebsite", defaultText(position.getCompanyWebsite()));
        row.put("positionName", defaultText(position.getPositionName()));
        row.put("department", defaultText(position.getDepartment()));
        row.put("region", defaultText(position.getRegion()));
        row.put("city", defaultText(position.getCity()));
        row.put("recruitmentCycle", defaultText(position.getRecruitmentCycle()));
        row.put("projectYear", defaultText(position.getProjectYear()));
        row.put("publishTime", position.getPublishTime());
        row.put("deadline", position.getDeadline());
        row.put("displayStatus", defaultText(position.getDisplayStatus()));
        row.put("positionUrl", defaultText(position.getPositionUrl()));
        row.put("applicationNote", defaultText(position.getApplicationNote()));
        row.put("studentCount", myStudentCount);
        row.put("myStudentCount", myStudentCount);
        return row;
    }

    private Map<String, Object> toStudentRow(OsgJobApplication application)
    {
        OsgCoaching coaching = coachingMapper.selectCoachingByApplicationId(application.getApplicationId());
        String currentStage = defaultText(application.getCurrentStage());
        String status = defaultText(application.getCurrentStage(), defaultText(application.getCoachingStatus(), "未申请"));

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("applicationId", application.getApplicationId());
        payload.put("studentId", application.getStudentId());
        payload.put("studentName", defaultText(application.getStudentName(), "-"));
        payload.put("positionId", application.getPositionId());
        payload.put("positionName", defaultText(application.getPositionName(), "-"));
        payload.put("currentStage", currentStage);
        payload.put("status", status);
        payload.put("statusTone", inferStudentStatusTone(status));
        payload.put("usedHours", coaching == null || coaching.getTotalHours() == null ? 0 : coaching.getTotalHours());
        payload.put("statusRemark", defaultText(application.getCoachingStatus(), defaultText(application.getAssignStatus(), "")));
        return payload;
    }

    private List<Map<String, Object>> buildOptions(List<OsgPosition> rows, Function<OsgPosition, String> extractor)
    {
        return rows.stream()
            .map(extractor)
            .map(this::trimToNull)
            .filter(Objects::nonNull)
            .distinct()
            .sorted(String.CASE_INSENSITIVE_ORDER)
            .map(value -> option(value, value))
            .toList();
    }

    private Map<String, List<Map<String, Object>>> buildCitiesByRegion(List<OsgPosition> rows)
    {
        Map<String, List<String>> groupedCities = rows.stream()
            .filter(row -> StringUtils.hasText(row.getRegion()) && StringUtils.hasText(row.getCity()))
            .collect(Collectors.groupingBy(
                row -> row.getRegion().trim(),
                LinkedHashMap::new,
                Collectors.mapping(row -> row.getCity().trim(), Collectors.toList())
            ));

        Map<String, List<Map<String, Object>>> citiesByRegion = new LinkedHashMap<>();
        groupedCities.forEach((region, cities) -> citiesByRegion.put(region, buildTextOptions(cities)));
        return citiesByRegion;
    }

    private List<Map<String, Object>> buildTextOptions(Collection<String> values)
    {
        return values.stream()
            .map(this::trimToNull)
            .filter(Objects::nonNull)
            .distinct()
            .sorted(Comparator.comparing(value -> value.toLowerCase(Locale.ROOT)))
            .map(value -> option(value, value))
            .toList();
    }

    private Map<String, Object> option(String value, String label)
    {
        Map<String, Object> option = new LinkedHashMap<>();
        option.put("value", value);
        option.put("label", label);
        return option;
    }

    private String trimToNull(String value)
    {
        if (!StringUtils.hasText(value))
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
        if (normalized.contains("面试")
            || normalized.contains("一面")
            || normalized.contains("二面")
            || normalized.contains("三面")
            || normalized.contains("interview"))
        {
            return "warning";
        }
        if (normalized.contains("投递") || normalized.contains("apply"))
        {
            return "info";
        }
        return "default";
    }

    private boolean countsTowardScopedSummary(OsgJobApplication application)
    {
        String normalizedStage = defaultText(application == null ? null : application.getCurrentStage(), "")
            .trim()
            .toLowerCase(Locale.ROOT);
        if (normalizedStage.isEmpty())
        {
            return true;
        }
        return !normalizedStage.contains("offer") && !normalizedStage.contains("获得offer");
    }
}
