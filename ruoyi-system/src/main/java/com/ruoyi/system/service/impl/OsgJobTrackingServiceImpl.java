package com.ruoyi.system.service.impl;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgJobApplication;
import com.ruoyi.system.mapper.OsgJobApplicationMapper;
import com.ruoyi.system.service.IOsgJobTrackingService;

@Service
public class OsgJobTrackingServiceImpl implements IOsgJobTrackingService
{
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() { };
    private static final String META_PREFIX = "JT:";
    private static final Set<String> INTERVIEW_STAGES = Set.of(
        "hirevue", "phone_screen", "first_round", "second_round", "case_study", "final", "final_round"
    );
    private static final Set<String> REJECTED_STAGES = Set.of("rejected", "withdrawn");

    @Autowired
    private OsgJobApplicationMapper jobApplicationMapper;

    @Override
    public Map<String, Object> selectJobTrackingList(String studentName, String leadMentorName, String trackingStatus, String companyName, String location)
    {
        OsgJobApplication query = new OsgJobApplication();
        query.setStudentName(studentName);
        query.setCompanyName(companyName);

        List<OsgJobApplication> rows = jobApplicationMapper.selectJobApplicationList(query);
        List<OsgJobApplication> safeRows = rows == null ? Collections.emptyList() : rows;

        List<Map<String, Object>> filtered = safeRows.stream()
            .filter(row -> matchLeadMentor(row, leadMentorName))
            .filter(row -> matchTrackingStatus(row, trackingStatus))
            .filter(row -> matchLocation(row, location))
            .sorted(Comparator.comparing(OsgJobApplication::getSubmittedAt, Comparator.nullsLast(Date::compareTo)).reversed())
            .map(this::toTrackingRow)
            .toList();

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("stats", buildStats(safeRows));
        payload.put("rows", filtered);
        return payload;
    }

    @Override
    public Map<String, Object> updateJobTracking(Long applicationId, Map<String, Object> payload, String operator)
    {
        OsgJobApplication existing = jobApplicationMapper.selectJobApplicationByApplicationId(applicationId);
        if (existing == null)
        {
            throw new ServiceException("求职申请不存在");
        }

        String trackingStatus = normalize(firstText(payload.get("trackingStatus"), payload.get("status")));
        String interviewStage = normalize(firstText(payload.get("interviewStage"), payload.get("currentStage"), payload.get("stage")));
        String nextStage = deriveStage(trackingStatus, interviewStage);

        Map<String, Object> meta = parseMeta(existing.getRemark());
        upsertMeta(meta, "preferredMentor", firstText(payload.get("preferredMentor"), payload.get("intendedMentor")));
        upsertMeta(meta, "excludedMentor", firstText(payload.get("excludedMentor")));
        upsertMeta(meta, "note", firstText(payload.get("note"), payload.get("remark")));

        Date interviewTime = parseDate(payload.get("interviewTime"));
        OsgJobApplication patch = new OsgJobApplication();
        patch.setApplicationId(applicationId);
        patch.setCurrentStage(nextStage);
        patch.setInterviewTime(interviewTime);
        patch.setStageUpdated(Boolean.FALSE);
        patch.setRemark(encodeMeta(meta));
        patch.setUpdateBy(operator);

        if (jobApplicationMapper.updateJobApplicationStage(patch) <= 0)
        {
            throw new ServiceException("岗位追踪更新失败");
        }

        existing.setCurrentStage(nextStage);
        if (interviewTime != null)
        {
            existing.setInterviewTime(interviewTime);
        }
        existing.setRemark(patch.getRemark());

        Map<String, Object> response = toTrackingRow(existing);
        response.put("trackingStatus", deriveTrackingStatus(nextStage));
        return response;
    }

    private Map<String, Object> buildStats(List<OsgJobApplication> rows)
    {
        int totalStudentCount = (int) rows.stream()
            .map(OsgJobApplication::getStudentId)
            .filter(Objects::nonNull)
            .distinct()
            .count();

        int trackingCount = (int) rows.stream()
            .filter(row -> Objects.equals(deriveTrackingStatus(row.getCurrentStage()), "tracking"))
            .count();
        int interviewingCount = (int) rows.stream()
            .filter(row -> Objects.equals(deriveTrackingStatus(row.getCurrentStage()), "interviewing"))
            .count();
        int offerCount = (int) rows.stream()
            .filter(row -> Objects.equals(deriveTrackingStatus(row.getCurrentStage()), "offer"))
            .count();
        int rejectedCount = (int) rows.stream()
            .filter(row -> Objects.equals(deriveTrackingStatus(row.getCurrentStage()), "rejected"))
            .count();

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalStudentCount", totalStudentCount);
        stats.put("trackingCount", trackingCount);
        stats.put("interviewingCount", interviewingCount);
        stats.put("offerCount", offerCount);
        stats.put("rejectedCount", rejectedCount);
        return stats;
    }

    private Map<String, Object> toTrackingRow(OsgJobApplication row)
    {
        Map<String, Object> meta = parseMeta(row.getRemark());
        String trackingStatus = deriveTrackingStatus(row.getCurrentStage());

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("applicationId", row.getApplicationId());
        payload.put("studentId", row.getStudentId());
        payload.put("studentName", row.getStudentName());
        payload.put("mentorName", row.getLeadMentorName());
        payload.put("companyName", row.getCompanyName());
        payload.put("positionName", row.getPositionName());
        payload.put("location", firstText(row.getCity(), row.getRegion()));
        payload.put("trackingStatus", trackingStatus);
        payload.put("currentStage", row.getCurrentStage());
        payload.put("interviewStage", "interviewing".equals(trackingStatus) ? row.getCurrentStage() : null);
        payload.put("interviewTime", row.getInterviewTime());
        payload.put("preferredMentor", meta.get("preferredMentor"));
        payload.put("excludedMentor", meta.get("excludedMentor"));
        payload.put("note", meta.get("note"));
        payload.put("submittedAt", row.getSubmittedAt());
        return payload;
    }

    private boolean matchLeadMentor(OsgJobApplication row, String leadMentorName)
    {
        if (leadMentorName == null || leadMentorName.isBlank())
        {
            return true;
        }
        return containsIgnoreCase(row.getLeadMentorName(), leadMentorName);
    }

    private boolean matchTrackingStatus(OsgJobApplication row, String trackingStatus)
    {
        if (trackingStatus == null || trackingStatus.isBlank())
        {
            return true;
        }
        return Objects.equals(deriveTrackingStatus(row.getCurrentStage()), normalize(trackingStatus));
    }

    private boolean matchLocation(OsgJobApplication row, String location)
    {
        if (location == null || location.isBlank())
        {
            return true;
        }
        return containsIgnoreCase(row.getCity(), location) || containsIgnoreCase(row.getRegion(), location);
    }

    private boolean containsIgnoreCase(String value, String keyword)
    {
        if (value == null || keyword == null)
        {
            return false;
        }
        return value.toLowerCase(Locale.ROOT).contains(keyword.toLowerCase(Locale.ROOT));
    }

    private String deriveStage(String trackingStatus, String interviewStage)
    {
        return switch (normalize(trackingStatus))
        {
            case "interviewing" -> interviewStage == null || interviewStage.isBlank() ? "first_round" : interviewStage;
            case "offer" -> "offer";
            case "rejected" -> "rejected";
            default -> "applied";
        };
    }

    private String deriveTrackingStatus(String currentStage)
    {
        String stage = normalize(currentStage);
        if (INTERVIEW_STAGES.contains(stage))
        {
            return "interviewing";
        }
        if (Objects.equals(stage, "offer"))
        {
            return "offer";
        }
        if (REJECTED_STAGES.contains(stage))
        {
            return "rejected";
        }
        return "tracking";
    }

    private Date parseDate(Object raw)
    {
        if (raw == null)
        {
            return null;
        }
        if (raw instanceof Date date)
        {
            return date;
        }
        if (raw instanceof String text && !text.isBlank())
        {
            try
            {
                return Timestamp.valueOf(LocalDateTime.parse(text));
            }
            catch (DateTimeParseException ex)
            {
                throw new ServiceException("interviewTime 格式非法");
            }
        }
        throw new ServiceException("interviewTime 格式非法");
    }

    private Map<String, Object> parseMeta(String remark)
    {
        if (remark == null || remark.isBlank() || !remark.startsWith(META_PREFIX))
        {
            return new LinkedHashMap<>();
        }

        try
        {
            return OBJECT_MAPPER.readValue(remark.substring(META_PREFIX.length()), MAP_TYPE);
        }
        catch (Exception ex)
        {
            throw new ServiceException("岗位追踪备注解析失败");
        }
    }

    private String encodeMeta(Map<String, Object> meta)
    {
        if (meta.isEmpty())
        {
            return null;
        }

        try
        {
            return META_PREFIX + OBJECT_MAPPER.writeValueAsString(meta);
        }
        catch (Exception ex)
        {
            throw new ServiceException("岗位追踪备注保存失败");
        }
    }

    private void upsertMeta(Map<String, Object> meta, String key, String value)
    {
        if (value == null || value.isBlank())
        {
            meta.remove(key);
            return;
        }
        meta.put(key, value);
    }

    private String firstText(Object... candidates)
    {
        for (Object candidate : candidates)
        {
            if (candidate instanceof String text && !text.isBlank())
            {
                return text.trim();
            }
        }
        return null;
    }

    private String normalize(String value)
    {
        return value == null ? null : value.trim().toLowerCase(Locale.ROOT);
    }
}
