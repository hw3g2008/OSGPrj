package com.ruoyi.system.service.impl;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgMockPractice;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.OsgMockPracticeMapper;
import com.ruoyi.system.mapper.OsgStudentMapper;
import com.ruoyi.system.service.IOsgMockPracticeService;

@Service
public class OsgMockPracticeServiceImpl implements IOsgMockPracticeService
{
    private static final String STATUS_PENDING = "pending";
    private static final String STATUS_SCHEDULED = "scheduled";
    private static final String STATUS_COMPLETED = "completed";
    private static final String STATUS_CANCELLED = "cancelled";

    @Autowired
    private OsgMockPracticeMapper mockPracticeMapper;

    @Autowired
    private OsgStudentMapper studentMapper;

    @Autowired
    private OsgIdentityResolver identityResolver;

    @Override
    public List<OsgMockPractice> selectMentorMockPracticeList(OsgMockPractice query)
    {
        Long currentUserId = query == null ? null : query.getCurrentMentorId();
        if (currentUserId == null)
        {
            return Collections.emptyList();
        }

        String requestedVisibleStatus = normalizeMentorVisibleStatus(query == null ? null : query.getStatus());
        OsgMockPractice mapperQuery = buildMentorListQuery(query, requestedVisibleStatus);
        List<OsgMockPractice> rows = mockPracticeMapper.selectMockPracticeList(mapperQuery);
        return (rows == null ? Collections.<OsgMockPractice>emptyList() : rows).stream()
            .filter(row -> hasMentorRelation(row, currentUserId) || hasAssistantOwnership(row, currentUserId))
            .filter(row -> requestedVisibleStatus == null || Objects.equals(normalizeMentorVisibleStatus(row.getStatus()), requestedVisibleStatus))
            .toList();
    }

    @Override
    public OsgMockPractice selectMentorMockPracticeById(Long id)
    {
        return mockPracticeMapper.selectMentorMockPracticeById(id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int confirmMentorMockPractice(OsgMockPractice record)
    {
        OsgMockPractice persisted = requireMentorOwnedPractice(record == null ? null : record.getPracticeId(), record == null ? null : record.getCurrentMentorId());
        record.setUpdateTime(new Date());
        record.setPracticeId(persisted.getPracticeId());
        return mockPracticeMapper.updateMentorMockPracticeStatus(record);
    }

    @Override
    public Map<String, Object> selectMockPracticeStats(String keyword, String practiceType, String status)
    {
        List<OsgMockPractice> rows = selectPractices(keyword, practiceType, status, null);
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("pendingCount", countByStatus(rows, STATUS_PENDING));
        stats.put("scheduledCount", countByStatus(rows, STATUS_SCHEDULED));
        stats.put("completedCount", countByStatus(rows, STATUS_COMPLETED));
        stats.put("cancelledCount", countByStatus(rows, STATUS_CANCELLED));
        stats.put("totalCount", rows.size());
        return stats;
    }

    @Override
    public List<Map<String, Object>> selectMockPracticeList(String keyword, String practiceType, String status, String tab)
    {
        List<OsgMockPractice> rows = selectPractices(keyword, practiceType, status, tab);
        if (rows.isEmpty())
        {
            return Collections.emptyList();
        }

        List<Map<String, Object>> result = new ArrayList<>(rows.size());
        for (OsgMockPractice row : rows)
        {
            result.add(toPayload(row));
        }
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> assignMockPractice(Map<String, Object> payload, String operator)
    {
        Long practiceId = toLong(payload == null ? null : payload.get("practiceId"));
        if (practiceId == null)
        {
            throw new ServiceException("practiceId不能为空");
        }

        List<Long> mentorStaffIds = toLongList(payload.get("mentorIds"));
        if (mentorStaffIds.isEmpty())
        {
            throw new ServiceException("请至少选择1位导师");
        }
        List<Long> mentorUserIds = mentorStaffIds.stream()
            .map(identityResolver::resolveUserIdByStaffId)
            .toList();

        Date scheduledAt = toDate(payload.get("scheduledAt"));
        if (scheduledAt == null)
        {
            throw new ServiceException("预约时间不能为空");
        }

        OsgMockPractice practice = requirePendingPractice(practiceId);
        List<String> mentorNames = toStringList(payload.get("mentorNames"));
        List<String> mentorBackgrounds = toStringList(payload.get("mentorBackgrounds"));

        practice.setStatus(STATUS_SCHEDULED);
        practice.setMentorIds(mentorUserIds.stream().map(String::valueOf).collect(Collectors.joining(",")));
        practice.setMentorNames(mentorNames.isEmpty() ? null : String.join(", ", mentorNames));
        practice.setMentorBackgrounds(mentorBackgrounds.isEmpty() ? null : String.join(" / ", mentorBackgrounds));
        practice.setScheduledAt(scheduledAt);
        practice.setUpdateBy(defaultText(operator, "system"));
        practice.setRemark(firstText(payload.get("note"), payload.get("remark")));

        if (mockPracticeMapper.updateMockPracticeAssignment(practice) <= 0)
        {
            throw new ServiceException("模拟应聘分配失败");
        }

        return toPayload(practice);
    }

    private OsgMockPractice requirePendingPractice(Long practiceId)
    {
        OsgMockPractice practice = mockPracticeMapper.selectMockPracticeByPracticeId(practiceId);
        if (practice == null)
        {
            throw new ServiceException("模拟应聘申请不存在");
        }
        if (!Objects.equals(normalize(practice.getStatus()), STATUS_PENDING))
        {
            throw new ServiceException("该模拟应聘申请已安排，不能重复分配");
        }
        return practice;
    }

    private OsgMockPractice requireMentorOwnedPractice(Long practiceId, Long currentUserId)
    {
        OsgMockPractice practice = mockPracticeMapper.selectMockPracticeByPracticeId(practiceId);
        if (practice == null)
        {
            throw new ServiceException("模拟应聘申请不存在");
        }
        if (!hasMentorRelation(practice, currentUserId))
        {
            throw new ServiceException("无权确认该模拟应聘记录");
        }
        return practice;
    }

    private List<OsgMockPractice> selectPractices(String keyword, String practiceType, String status, String tab)
    {
        OsgMockPractice query = new OsgMockPractice();
        query.setKeyword(keyword);
        query.setPracticeType(practiceType);
        query.setStatus(status);
        query.setTab(tab);
        List<OsgMockPractice> rows = mockPracticeMapper.selectMockPracticeList(query);
        return rows == null ? Collections.emptyList() : rows;
    }

    private OsgMockPractice buildMentorListQuery(OsgMockPractice source, String requestedVisibleStatus)
    {
        OsgMockPractice query = new OsgMockPractice();
        if (source == null)
        {
            return query;
        }
        query.setCurrentMentorId(source.getCurrentMentorId());
        query.setPracticeType(source.getPracticeType());
        query.setStatus(Objects.equals(requestedVisibleStatus, STATUS_PENDING) ? null : source.getStatus());
        return query;
    }

    private String normalizeMentorVisibleStatus(String status)
    {
        String normalized = normalize(status);
        if (Objects.equals(normalized, STATUS_SCHEDULED) || Objects.equals(normalized, "confirmed"))
        {
            return STATUS_PENDING;
        }
        return normalized;
    }

    private int countByStatus(List<OsgMockPractice> rows, String status)
    {
        return (int) rows.stream().filter(row -> Objects.equals(normalize(row.getStatus()), status)).count();
    }

    private boolean hasMentorRelation(OsgMockPractice practice, Long currentUserId)
    {
        if (practice == null || currentUserId == null)
        {
            return false;
        }

        String mentorIds = practice.getMentorIds();
        if (mentorIds == null || mentorIds.isBlank())
        {
            return false;
        }

        String token = String.valueOf(currentUserId);
        return java.util.Arrays.stream(mentorIds.split(","))
            .map(String::trim)
            .anyMatch(token::equals);
    }

    private boolean hasAssistantOwnership(OsgMockPractice practice, Long currentUserId)
    {
        if (practice == null || practice.getStudentId() == null || currentUserId == null)
        {
            return false;
        }

        OsgStudent student = studentMapper.selectStudentByStudentId(practice.getStudentId());
        return student != null && Objects.equals(student.getAssistantId(), currentUserId);
    }

    private Map<String, Object> toPayload(OsgMockPractice row)
    {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("practiceId", row.getPracticeId());
        payload.put("studentId", row.getStudentId());
        payload.put("studentName", row.getStudentName());
        payload.put("practiceType", row.getPracticeType());
        payload.put("requestContent", row.getRequestContent());
        payload.put("requestedMentorCount", row.getRequestedMentorCount());
        payload.put("preferredMentorNames", row.getPreferredMentorNames());
        payload.put("status", row.getStatus());
        payload.put("mentorIds", row.getMentorIds());
        payload.put("mentorNames", row.getMentorNames());
        payload.put("mentorBackgrounds", row.getMentorBackgrounds());
        payload.put("scheduledAt", row.getScheduledAt());
        payload.put("completedHours", row.getCompletedHours());
        payload.put("feedbackRating", row.getFeedbackRating());
        payload.put("feedbackSummary", row.getFeedbackSummary());
        payload.put("submittedAt", row.getSubmittedAt());
        payload.put("note", row.getRemark());
        return payload;
    }

    private Long toLong(Object value)
    {
        if (value instanceof Number number)
        {
            return number.longValue();
        }
        if (value == null)
        {
            return null;
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

    private List<Long> toLongList(Object value)
    {
        if (!(value instanceof List<?> list))
        {
            return Collections.emptyList();
        }
        List<Long> result = new ArrayList<>(list.size());
        for (Object item : list)
        {
            Long converted = toLong(item);
            if (converted != null)
            {
                result.add(converted);
            }
        }
        return result;
    }

    private List<String> toStringList(Object value)
    {
        if (!(value instanceof List<?> list))
        {
            return Collections.emptyList();
        }
        List<String> result = new ArrayList<>(list.size());
        for (Object item : list)
        {
            String text = firstText(item);
            if (text != null)
            {
                result.add(text);
            }
        }
        return result;
    }

    private Date toDate(Object value)
    {
        if (value instanceof Date date)
        {
            return date;
        }
        String text = firstText(value);
        if (text == null)
        {
            return null;
        }
        String normalized = text.replace("T", " ");
        if (normalized.length() == 16)
        {
            normalized = normalized + ":00";
        }
        try
        {
            return Timestamp.valueOf(normalized);
        }
        catch (IllegalArgumentException ex)
        {
            throw new ServiceException("预约时间格式不正确");
        }
    }

    private String firstText(Object... values)
    {
        for (Object value : values)
        {
            if (value == null)
            {
                continue;
            }
            String text = String.valueOf(value).trim();
            if (!text.isEmpty())
            {
                return text;
            }
        }
        return null;
    }

    private String defaultText(String value, String fallback)
    {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String normalize(String value)
    {
        return value == null ? null : value.trim().toLowerCase();
    }
}
