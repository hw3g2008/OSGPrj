package com.ruoyi.system.service.impl;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.ruoyi.system.domain.OsgCoaching;
import com.ruoyi.system.domain.OsgJobApplication;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.OsgCoachingMapper;
import com.ruoyi.system.mapper.OsgJobApplicationMapper;
import com.ruoyi.system.mapper.OsgStudentMapper;
import com.ruoyi.system.service.IOsgLeadMentorStudentService;

@Service
public class OsgLeadMentorStudentServiceImpl implements IOsgLeadMentorStudentService
{
    private static final String RELATION_COACHING = "coaching";
    private static final String RELATION_MANAGED = "managed";
    private static final String RELATION_DUAL = "dual";

    @Autowired
    private OsgStudentMapper studentMapper;

    @Autowired
    private OsgCoachingMapper coachingMapper;

    @Autowired
    private OsgJobApplicationMapper jobApplicationMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public List<Map<String, Object>> selectStudentList(String keyword, String relation, String school,
        String majorDirection, String accountStatus, Long currentUserId)
    {
        StudentScopeContext context = buildScopeContext(currentUserId);
        if (context.students().isEmpty())
        {
            return List.of();
        }

        Map<Long, Integer> remainingHoursByStudentId = loadRemainingHoursByStudent(context.students());
        return context.students().stream()
            .filter(student -> matchesFilters(student, context.relationMap().get(student.getStudentId()),
                keyword, relation, school, majorDirection, accountStatus))
            .map(student -> toStudentRow(student, context.relationMap().get(student.getStudentId()),
                context.applicationsByStudentId().get(student.getStudentId()),
                remainingHoursByStudentId.getOrDefault(student.getStudentId(), 0)))
            .toList();
    }

    @Override
    public Map<String, Object> selectStudentMeta(Long currentUserId)
    {
        StudentScopeContext context = buildScopeContext(currentUserId);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("relationOptions", List.of(
            option(RELATION_COACHING, "我教的学员"),
            option(RELATION_MANAGED, "班主任为我"),
            option(RELATION_DUAL, "双关系学员")
        ));
        payload.put("schools", buildOptions(context.students(), OsgStudent::getSchool));
        payload.put("majorDirections", buildCsvOptions(context.students(), OsgStudent::getMajorDirection));
        payload.put("accountStatuses", buildAccountStatusOptions(context.students()));
        return payload;
    }

    private StudentScopeContext buildScopeContext(Long currentUserId)
    {
        if (currentUserId == null)
        {
            return new StudentScopeContext(List.of(), Map.of(), Map.of());
        }

        List<OsgStudent> allStudents = defaultList(studentMapper.selectStudentList(new OsgStudent()));
        if (allStudents.isEmpty())
        {
            return new StudentScopeContext(List.of(), Map.of(), Map.of());
        }

        List<OsgCoaching> coachings = defaultList(coachingMapper.selectCoachingList(new OsgCoaching()));
        List<OsgJobApplication> applications = defaultList(jobApplicationMapper.selectJobApplicationList(new OsgJobApplication()));
        Map<Long, Long> applicationStudentMap = applications.stream()
            .filter(row -> row.getApplicationId() != null && row.getStudentId() != null)
            .collect(Collectors.toMap(OsgJobApplication::getApplicationId, OsgJobApplication::getStudentId, (first, second) -> first, LinkedHashMap::new));

        Map<Long, StudentRelation> relationMap = new LinkedHashMap<>();
        for (OsgStudent student : allStudents)
        {
            if (student.getStudentId() == null)
            {
                continue;
            }
            if (Objects.equals(student.getLeadMentorId(), currentUserId))
            {
                relationMap.put(student.getStudentId(), new StudentRelation(false, true));
            }
        }

        for (OsgCoaching coaching : coachings)
        {
            if (!matchesMentorRelation(coaching, currentUserId))
            {
                continue;
            }
            Long studentId = coaching.getStudentId();
            if (studentId == null)
            {
                studentId = applicationStudentMap.get(coaching.getApplicationId());
            }
            if (studentId == null)
            {
                continue;
            }

            StudentRelation existing = relationMap.get(studentId);
            relationMap.put(studentId, new StudentRelation(true, existing != null && existing.managed()));
        }

        if (relationMap.isEmpty())
        {
            return new StudentScopeContext(List.of(), Map.of(), Map.of());
        }

        Set<Long> accessibleStudentIds = relationMap.keySet();
        List<OsgStudent> scopedStudents = allStudents.stream()
            .filter(student -> student.getStudentId() != null && accessibleStudentIds.contains(student.getStudentId()))
            .toList();

        Map<Long, List<OsgJobApplication>> applicationsByStudentId = applications.stream()
            .filter(row -> row.getStudentId() != null && accessibleStudentIds.contains(row.getStudentId()))
            .collect(Collectors.groupingBy(OsgJobApplication::getStudentId, LinkedHashMap::new, Collectors.toList()));

        return new StudentScopeContext(scopedStudents, relationMap, applicationsByStudentId);
    }

    private boolean matchesFilters(OsgStudent student, StudentRelation relationState, String keyword, String relation,
        String school, String majorDirection, String accountStatus)
    {
        if (student == null || relationState == null)
        {
            return false;
        }
        if (!matchesRelation(relationState, relation))
        {
            return false;
        }
        if (!matchesContains(student.getStudentName(), keyword) && !matchesContains(student.getEmail(), keyword))
        {
            return false;
        }
        if (!matchesContains(student.getSchool(), school))
        {
            return false;
        }
        if (!matchesMajorDirection(student.getMajorDirection(), majorDirection))
        {
            return false;
        }
        return matchesText(defaultText(student.getAccountStatus(), "0"), accountStatus);
    }

    private Map<String, Object> toStudentRow(OsgStudent student, StudentRelation relationState,
        List<OsgJobApplication> applications, int remainingHours)
    {
        List<OsgJobApplication> currentApplications = applications == null ? List.of() : applications;
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("studentId", student.getStudentId());
        payload.put("studentName", defaultText(student.getStudentName(), "-"));
        payload.put("email", defaultText(student.getEmail(), "-"));
        payload.put("school", defaultText(student.getSchool(), "-"));
        payload.put("majorDirection", defaultText(student.getMajorDirection(), "-"));
        payload.put("relations", buildRelations(relationState));
        payload.put("relationCodes", buildRelationCodes(relationState));
        payload.put("applyCount", currentApplications.size());
        payload.put("interviewCount", (int) currentApplications.stream().filter(this::isInterviewingStage).count());
        payload.put("offerCount", (int) currentApplications.stream().filter(this::isOfferStage).count());
        payload.put("remainingHours", remainingHours);
        payload.put("accountStatus", defaultText(student.getAccountStatus(), "0"));
        payload.put("accountStatusLabel", formatAccountStatus(student.getAccountStatus()));
        return payload;
    }

    private List<Map<String, Object>> buildRelations(StudentRelation relationState)
    {
        List<Map<String, Object>> relations = new ArrayList<>();
        if (relationState.coaching())
        {
            relations.add(relationPayload(RELATION_COACHING, "我教的学员", "primary"));
        }
        if (relationState.managed())
        {
            relations.add(relationPayload(RELATION_MANAGED, "班主任为我", "warning"));
        }
        return relations;
    }

    private List<String> buildRelationCodes(StudentRelation relationState)
    {
        List<String> codes = new ArrayList<>();
        if (relationState.coaching())
        {
            codes.add(RELATION_COACHING);
        }
        if (relationState.managed())
        {
            codes.add(RELATION_MANAGED);
        }
        return codes;
    }

    private Map<String, Object> relationPayload(String value, String label, String tone)
    {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("value", value);
        payload.put("label", label);
        payload.put("tone", tone);
        return payload;
    }

    private boolean matchesRelation(StudentRelation relationState, String relation)
    {
        String normalized = normalize(relation);
        if (normalized.isEmpty())
        {
            return true;
        }
        return switch (normalized)
        {
            case RELATION_COACHING -> relationState.coaching();
            case RELATION_MANAGED -> relationState.managed();
            case RELATION_DUAL -> relationState.coaching() && relationState.managed();
            default -> true;
        };
    }

    private boolean matchesMentorRelation(OsgCoaching coaching, Long currentUserId)
    {
        if (coaching == null || currentUserId == null)
        {
            return false;
        }
        if (Objects.equals(coaching.getMentorId(), currentUserId))
        {
            return true;
        }
        String mentorIds = coaching.getMentorIds();
        if (!StringUtils.hasText(mentorIds))
        {
            return false;
        }
        String token = String.valueOf(currentUserId);
        return java.util.Arrays.stream(mentorIds.split(","))
            .map(String::trim)
            .anyMatch(token::equals);
    }

    private Map<Long, Integer> loadRemainingHoursByStudent(Collection<OsgStudent> students)
    {
        if (students == null || students.isEmpty())
        {
            return Map.of();
        }

        List<Long> studentIds = students.stream()
            .map(OsgStudent::getStudentId)
            .filter(Objects::nonNull)
            .distinct()
            .toList();
        if (studentIds.isEmpty())
        {
            return Map.of();
        }

        Map<Long, Integer> remainingHoursByStudentId = new LinkedHashMap<>();
        for (Long studentId : studentIds)
        {
            remainingHoursByStudentId.put(studentId, 0);
        }

        String placeholders = studentIds.stream()
            .map(ignored -> "?")
            .collect(Collectors.joining(", "));
        String sql = """
            select student_id as studentId, coalesce(sum(remaining_hours), 0) as remainingHours
            from osg_contract
            where student_id in (%s)
            group by student_id
            """.formatted(placeholders);

        Map<Long, Integer> loadedHours = jdbcTemplate.query(
            sql,
            ps -> {
                int index = 1;
                for (Long studentId : studentIds)
                {
                    ps.setLong(index++, studentId);
                }
            },
            rs -> {
                Map<Long, Integer> resolved = new LinkedHashMap<>();
                while (rs.next())
                {
                    resolved.put(rs.getLong("studentId"), rs.getInt("remainingHours"));
                }
                return resolved;
            }
        );
        if (loadedHours != null)
        {
            remainingHoursByStudentId.putAll(loadedHours);
        }
        return remainingHoursByStudentId;
    }

    private List<Map<String, Object>> buildOptions(Collection<OsgStudent> students, Function<OsgStudent, String> extractor)
    {
        return students.stream()
            .map(extractor)
            .map(this::trimToNull)
            .filter(Objects::nonNull)
            .distinct()
            .sorted(Comparator.comparing(value -> value.toLowerCase(Locale.ROOT)))
            .map(value -> option(value, value))
            .toList();
    }

    private List<Map<String, Object>> buildCsvOptions(Collection<OsgStudent> students, Function<OsgStudent, String> extractor)
    {
        return students.stream()
            .map(extractor)
            .filter(Objects::nonNull)
            .flatMap(value -> splitCsv(value).stream())
            .map(this::trimToNull)
            .filter(Objects::nonNull)
            .distinct()
            .sorted(Comparator.comparing(value -> value.toLowerCase(Locale.ROOT)))
            .map(value -> option(value, value))
            .toList();
    }

    private List<Map<String, Object>> buildAccountStatusOptions(Collection<OsgStudent> students)
    {
        return students.stream()
            .map(OsgStudent::getAccountStatus)
            .map(value -> defaultText(value, "0"))
            .distinct()
            .sorted()
            .map(value -> option(value, formatAccountStatus(value)))
            .toList();
    }

    private Map<String, Object> option(String value, String label)
    {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("value", value);
        payload.put("label", label);
        return payload;
    }

    private boolean matchesContains(String actual, String expected)
    {
        String normalizedExpected = normalize(expected);
        if (normalizedExpected.isEmpty())
        {
            return true;
        }
        return normalize(actual).contains(normalizedExpected);
    }

    private boolean matchesText(String actual, String expected)
    {
        String normalizedExpected = normalize(expected);
        return normalizedExpected.isEmpty() || Objects.equals(normalize(actual), normalizedExpected);
    }

    private boolean matchesMajorDirection(String actual, String expected)
    {
        String normalizedExpected = normalize(expected);
        if (normalizedExpected.isEmpty())
        {
            return true;
        }
        if (normalize(actual).contains(normalizedExpected))
        {
            return true;
        }
        return splitCsv(actual).stream()
            .map(this::normalize)
            .anyMatch(normalizedExpected::equals);
    }

    private boolean isInterviewingStage(OsgJobApplication application)
    {
        String stage = normalize(application == null ? null : application.getCurrentStage());
        if (stage.isEmpty() || isOfferStage(application))
        {
            return false;
        }
        return stage.contains("面试")
            || stage.contains("一面")
            || stage.contains("二面")
            || stage.contains("三面")
            || stage.contains("终面")
            || stage.contains("interview")
            || stage.contains("hirevue")
            || stage.contains("case")
            || stage.contains("round")
            || stage.contains("final");
    }

    private boolean isOfferStage(OsgJobApplication application)
    {
        String stage = normalize(application == null ? null : application.getCurrentStage());
        return stage.contains("offer") || stage.contains("获offer") || stage.contains("获得offer");
    }

    private List<String> splitCsv(String value)
    {
        if (!StringUtils.hasText(value))
        {
            return List.of();
        }
        return java.util.Arrays.stream(value.split(","))
            .map(this::trimToNull)
            .filter(Objects::nonNull)
            .toList();
    }

    private String formatAccountStatus(String accountStatus)
    {
        return switch (defaultText(accountStatus, "0"))
        {
            case "1" -> "冻结";
            case "2" -> "已结束";
            case "3" -> "退费";
            default -> "正常";
        };
    }

    private String trimToNull(String value)
    {
        if (!StringUtils.hasText(value))
        {
            return null;
        }
        return value.trim();
    }

    private String normalize(String value)
    {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String defaultText(String value, String fallback)
    {
        return StringUtils.hasText(value) ? value.trim() : fallback;
    }

    private <T> List<T> defaultList(List<T> rows)
    {
        return rows == null ? List.of() : rows;
    }

    private record StudentRelation(boolean coaching, boolean managed)
    {
    }

    private record StudentScopeContext(List<OsgStudent> students,
                                       Map<Long, StudentRelation> relationMap,
                                       Map<Long, List<OsgJobApplication>> applicationsByStudentId)
    {
    }
}
