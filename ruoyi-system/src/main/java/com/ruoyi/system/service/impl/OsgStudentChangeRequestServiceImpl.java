package com.ruoyi.system.service.impl;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.domain.OsgStudentChangeRequest;
import com.ruoyi.system.mapper.OsgStudentChangeRequestMapper;
import com.ruoyi.system.mapper.OsgStudentMapper;
import com.ruoyi.system.service.IOsgStudentChangeRequestService;

@Service
public class OsgStudentChangeRequestServiceImpl implements IOsgStudentChangeRequestService
{
    private static final String STATUS_PENDING = "pending";
    private static final String STATUS_APPROVED = "approved";
    private static final String STATUS_REJECTED = "rejected";
    private static final String STATUS_AUTO_APPLIED = "auto_applied";

    private static final Set<String> CONTACT_FIELDS = new LinkedHashSet<>(List.of("phone", "wechat", "backupEmail"));

    @Autowired
    private OsgStudentChangeRequestMapper changeRequestMapper;

    @Autowired
    private OsgStudentMapper studentMapper;

    @Override
    public List<Map<String, Object>> selectChangeRequestList(Long studentId, String status)
    {
        OsgStudentChangeRequest query = new OsgStudentChangeRequest();
        query.setStudentId(studentId);
        query.setStatus(status);
        List<OsgStudentChangeRequest> rows = changeRequestMapper.selectChangeRequestList(query);
        if (rows == null || rows.isEmpty())
        {
            return Collections.emptyList();
        }

        List<Map<String, Object>> result = new ArrayList<>(rows.size());
        for (OsgStudentChangeRequest row : rows)
        {
            result.add(toPayload(row));
        }
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> submitChangeRequest(Map<String, Object> payload, String operator)
    {
        OsgStudentChangeRequest request = buildRequest(payload, operator);
        OsgStudent student = requireStudent(request.getStudentId());

        request.setStatus(isContactField(request.getFieldKey()) ? STATUS_AUTO_APPLIED : STATUS_PENDING);
        request.setRequestedBy(defaultText(operator, "system"));
        request.setCreateBy(defaultText(operator, "system"));
        request.setUpdateBy(defaultText(operator, "system"));
        if (STATUS_AUTO_APPLIED.equals(request.getStatus()))
        {
            request.setReviewer(defaultText(operator, "system"));
            request.setReviewedAt(new Date());
            applyChangeToStudent(student, request);
        }

        changeRequestMapper.insertChangeRequest(request);

        Map<String, Object> result = toPayload(request);
        result.put("requestId", request.getRequestId());
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> approveChangeRequest(Long requestId, String reviewer)
    {
        OsgStudentChangeRequest request = requirePendingRequest(requestId);
        OsgStudent student = requireStudent(request.getStudentId());

        applyChangeToStudent(student, request);
        request.setStatus(STATUS_APPROVED);
        request.setReviewer(defaultText(reviewer, "system"));
        request.setReviewedAt(new Date());
        request.setUpdateBy(defaultText(reviewer, "system"));
        changeRequestMapper.updateChangeRequestReview(request);
        return toPayload(request);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> rejectChangeRequest(Long requestId, String reviewer, String reason)
    {
        OsgStudentChangeRequest request = requirePendingRequest(requestId);
        request.setStatus(STATUS_REJECTED);
        request.setReviewer(defaultText(reviewer, "system"));
        request.setReviewedAt(new Date());
        request.setUpdateBy(defaultText(reviewer, "system"));
        request.setRemark(reason);
        changeRequestMapper.updateChangeRequestReview(request);
        return toPayload(request);
    }

    private OsgStudentChangeRequest buildRequest(Map<String, Object> payload, String operator)
    {
        if (payload == null || payload.isEmpty())
        {
            throw new ServiceException("变更申请参数缺失");
        }

        OsgStudentChangeRequest request = new OsgStudentChangeRequest();
        request.setStudentId(asLong(payload.get("studentId")));
        request.setChangeType(asText(payload.get("changeType")));
        request.setFieldKey(asText(payload.get("fieldKey")));
        request.setFieldLabel(asText(payload.get("fieldLabel")));
        request.setBeforeValue(asText(payload.get("beforeValue")));
        request.setAfterValue(asText(payload.get("afterValue")));
        request.setRemark(asText(payload.get("remark")));
        if (request.getStudentId() == null || isBlank(request.getFieldKey()) || request.getAfterValue() == null)
        {
            throw new ServiceException("变更申请参数不完整");
        }
        request.setRequestedBy(defaultText(asText(payload.get("requestedBy")), operator));
        return request;
    }

    private OsgStudentChangeRequest requirePendingRequest(Long requestId)
    {
        OsgStudentChangeRequest request = changeRequestMapper.selectChangeRequestById(requestId);
        if (request == null)
        {
            throw new ServiceException("变更申请不存在");
        }
        if (!STATUS_PENDING.equals(request.getStatus()))
        {
            throw new ServiceException("该变更申请已处理，不能重复审核");
        }
        return request;
    }

    private OsgStudent requireStudent(Long studentId)
    {
        OsgStudent student = studentMapper.selectStudentByStudentId(studentId);
        if (student == null)
        {
            throw new ServiceException("学员不存在");
        }
        return student;
    }

    private void applyChangeToStudent(OsgStudent student, OsgStudentChangeRequest request)
    {
        switch (defaultText(request.getFieldKey(), "")) {
            case "studentName" -> student.setStudentName(request.getAfterValue());
            case "email" -> student.setEmail(request.getAfterValue());
            case "school" -> student.setSchool(request.getAfterValue());
            case "major" -> student.setMajor(request.getAfterValue());
            case "graduationYear" -> student.setGraduationYear(asInteger(request.getAfterValue()));
            case "majorDirection" -> student.setMajorDirection(request.getAfterValue());
            case "subDirection" -> student.setSubDirection(request.getAfterValue());
            case "targetRegion" -> student.setTargetRegion(request.getAfterValue());
            case "recruitmentCycle" -> student.setRecruitmentCycle(request.getAfterValue());
            case "leadMentorId" -> student.setLeadMentorId(asLong(request.getAfterValue()));
            case "assistantId" -> student.setAssistantId(asLong(request.getAfterValue()));
            case "phone", "wechat", "backupEmail", "studyPlan", "deferredGraduation" -> {
                Map<String, String> remarkFields = parseRemarkFields(student.getRemark());
                remarkFields.put(request.getFieldKey(), defaultText(request.getAfterValue(), ""));
                student.setRemark(joinRemarkFields(remarkFields));
            }
            default -> throw new ServiceException("暂不支持该字段审核: " + request.getFieldKey());
        }

        if (studentMapper.updateStudent(student) <= 0)
        {
            throw new ServiceException("学员信息更新失败");
        }
    }

    private Map<String, Object> toPayload(OsgStudentChangeRequest request)
    {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("requestId", request.getRequestId());
        payload.put("studentId", request.getStudentId());
        payload.put("changeType", request.getChangeType());
        payload.put("fieldKey", request.getFieldKey());
        payload.put("fieldLabel", request.getFieldLabel());
        payload.put("beforeValue", request.getBeforeValue());
        payload.put("afterValue", request.getAfterValue());
        payload.put("status", request.getStatus());
        payload.put("reviewer", request.getReviewer());
        payload.put("reviewedAt", request.getReviewedAt());
        payload.put("requestedBy", request.getRequestedBy());
        payload.put("requestedAt", request.getCreateTime());
        payload.put("remark", request.getRemark());
        return payload;
    }

    private Map<String, String> parseRemarkFields(String remark)
    {
        if (isBlank(remark))
        {
            return new LinkedHashMap<>();
        }
        Map<String, String> fields = new LinkedHashMap<>();
        String normalized = remark.replace(" | ", ";");
        for (String segment : normalized.split(";"))
        {
            String trimmed = segment.trim();
            if (trimmed.isEmpty() || !trimmed.contains("="))
            {
                continue;
            }
            String[] parts = trimmed.split("=", 2);
            fields.put(parts[0].trim(), parts[1].trim());
        }
        return fields;
    }

    private String joinRemarkFields(Map<String, String> remarkFields)
    {
        List<String> segments = new ArrayList<>();
        for (Map.Entry<String, String> entry : remarkFields.entrySet())
        {
            if (isBlank(entry.getKey()))
            {
                continue;
            }
            segments.add(entry.getKey() + "=" + defaultText(entry.getValue(), ""));
        }
        return String.join("; ", segments);
    }

    private boolean isContactField(String fieldKey)
    {
        return CONTACT_FIELDS.contains(defaultText(fieldKey, ""));
    }

    private Long asLong(Object value)
    {
        if (value == null)
        {
            return null;
        }
        if (value instanceof Number number)
        {
            return number.longValue();
        }
        try
        {
            return Long.parseLong(String.valueOf(value));
        }
        catch (NumberFormatException ex)
        {
            return null;
        }
    }

    private Integer asInteger(Object value)
    {
        if (value == null)
        {
            return null;
        }
        if (value instanceof Number number)
        {
            return number.intValue();
        }
        try
        {
            return Integer.parseInt(String.valueOf(value));
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

    private String defaultText(String value, String fallback)
    {
        return isBlank(value) ? fallback : value;
    }

    private boolean isBlank(String value)
    {
        return value == null || value.isBlank();
    }
}
