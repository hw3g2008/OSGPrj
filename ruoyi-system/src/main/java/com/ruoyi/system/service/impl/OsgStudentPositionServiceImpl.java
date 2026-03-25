package com.ruoyi.system.service.impl;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgPosition;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.domain.OsgStudentPosition;
import com.ruoyi.system.mapper.OsgPositionMapper;
import com.ruoyi.system.mapper.OsgStudentMapper;
import com.ruoyi.system.mapper.OsgStudentPositionMapper;
import com.ruoyi.system.service.IOsgStudentPositionService;

@Service
public class OsgStudentPositionServiceImpl implements IOsgStudentPositionService
{
    private static final String STATUS_PENDING = "pending";
    private static final String STATUS_APPROVED = "approved";
    private static final String STATUS_REJECTED = "rejected";
    private static final long DEFAULT_PUBLIC_POSITION_VISIBLE_DAYS = 90L;

    @Autowired
    private OsgStudentPositionMapper studentPositionMapper;

    @Autowired
    private OsgPositionMapper positionMapper;

    @Autowired
    private OsgStudentMapper studentMapper;

    @Override
    public List<Map<String, Object>> selectStudentPositionList(String status, String positionCategory, String hasCoachingRequest, String keyword)
    {
        OsgStudentPosition query = new OsgStudentPosition();
        query.setStatus(defaultText(status, STATUS_PENDING));
        query.setPositionCategory(positionCategory);
        query.setHasCoachingRequest(hasCoachingRequest);
        query.setKeyword(keyword);
        List<OsgStudentPosition> rows = studentPositionMapper.selectStudentPositionList(query);
        if (rows == null || rows.isEmpty())
        {
            return Collections.emptyList();
        }

        List<Map<String, Object>> result = new ArrayList<>(rows.size());
        for (OsgStudentPosition row : rows)
        {
            result.add(toPayload(row));
        }
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> approveStudentPosition(Long studentPositionId, Map<String, Object> payload, String reviewer)
    {
        OsgStudentPosition request = requirePendingStudentPosition(studentPositionId);
        OsgStudent student = requireStudent(request.getStudentId());
        OsgStudentPosition merged = mergeForApproval(request, payload);

        if (isDuplicatePublicPosition(merged))
        {
            throw new ServiceException("岗位已存在公共岗位库，不能重复通过");
        }

        OsgPosition publicPosition = toPublicPosition(merged, reviewer);
        if (positionMapper.insertPosition(publicPosition) <= 0)
        {
            throw new ServiceException("公共岗位写入失败");
        }

        request.setPositionCategory(merged.getPositionCategory());
        request.setIndustry(merged.getIndustry());
        request.setCompanyName(merged.getCompanyName());
        request.setCompanyType(merged.getCompanyType());
        request.setCompanyWebsite(merged.getCompanyWebsite());
        request.setPositionName(merged.getPositionName());
        request.setDepartment(merged.getDepartment());
        request.setRegion(merged.getRegion());
        request.setCity(merged.getCity());
        request.setRecruitmentCycle(merged.getRecruitmentCycle());
        request.setProjectYear(merged.getProjectYear());
        request.setDeadline(merged.getDeadline());
        request.setPositionUrl(merged.getPositionUrl());
        request.setStatus(STATUS_APPROVED);
        request.setReviewer(defaultText(reviewer, "system"));
        request.setReviewedAt(new Date());
        request.setPublicPositionId(publicPosition.getPositionId());
        request.setFlowStatus("yes".equals(defaultText(request.getHasCoachingRequest(), "no")) ? "queued_to_lead_mentor" : "public_only");
        request.setUpdateBy(defaultText(reviewer, "system"));
        if (student.getStudentName() != null)
        {
            request.setStudentName(student.getStudentName());
        }

        if (studentPositionMapper.updateStudentPositionReview(request) <= 0)
        {
            throw new ServiceException("学生自添岗位审核状态更新失败");
        }

        Map<String, Object> result = toPayload(request);
        result.put("positionId", publicPosition.getPositionId());
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> rejectStudentPosition(Long studentPositionId, Map<String, Object> payload, String reviewer)
    {
        OsgStudentPosition request = requirePendingStudentPosition(studentPositionId);
        String rejectReason = payload == null ? null : asText(payload.get("reason"));
        if (isBlank(rejectReason))
        {
            throw new ServiceException("拒绝原因不能为空");
        }

        request.setStatus(STATUS_REJECTED);
        request.setRejectReason(rejectReason);
        request.setRejectNote(payload == null ? null : asText(payload.get("note")));
        request.setReviewer(defaultText(reviewer, "system"));
        request.setReviewedAt(new Date());
        request.setFlowStatus("rejected");
        request.setUpdateBy(defaultText(reviewer, "system"));
        if (studentPositionMapper.updateStudentPositionReview(request) <= 0)
        {
            throw new ServiceException("学生自添岗位驳回失败");
        }
        return toPayload(request);
    }

    private OsgStudentPosition requirePendingStudentPosition(Long studentPositionId)
    {
        OsgStudentPosition request = studentPositionMapper.selectStudentPositionById(studentPositionId);
        if (request == null)
        {
            throw new ServiceException("学生自添岗位不存在");
        }
        if (!STATUS_PENDING.equals(request.getStatus()))
        {
            throw new ServiceException("该学生自添岗位已处理，不能重复审核");
        }
        return request;
    }

    private OsgStudent requireStudent(Long studentId)
    {
        OsgStudent student = studentMapper.selectStudentByStudentId(studentId);
        if (student == null)
        {
            throw new ServiceException("提交学生不存在");
        }
        return student;
    }

    private OsgStudentPosition mergeForApproval(OsgStudentPosition request, Map<String, Object> payload)
    {
        OsgStudentPosition merged = new OsgStudentPosition();
        merged.setStudentPositionId(request.getStudentPositionId());
        merged.setStudentId(request.getStudentId());
        merged.setStudentName(request.getStudentName());
        merged.setPositionCategory(resolveText(payload, "positionCategory", request.getPositionCategory()));
        merged.setIndustry(resolveText(payload, "industry", request.getIndustry()));
        merged.setCompanyName(resolveText(payload, "companyName", request.getCompanyName()));
        merged.setCompanyType(resolveText(payload, "companyType", request.getCompanyType()));
        merged.setCompanyWebsite(resolveText(payload, "companyWebsite", request.getCompanyWebsite()));
        merged.setPositionName(resolveText(payload, "positionName", request.getPositionName()));
        merged.setDepartment(resolveText(payload, "department", request.getDepartment()));
        merged.setRegion(resolveText(payload, "region", request.getRegion()));
        merged.setCity(resolveText(payload, "city", request.getCity()));
        merged.setRecruitmentCycle(resolveText(payload, "recruitmentCycle", request.getRecruitmentCycle()));
        merged.setProjectYear(resolveText(payload, "projectYear", request.getProjectYear()));
        merged.setDeadline(resolveDate(payload, "deadline", request.getDeadline()));
        merged.setPositionUrl(resolveText(payload, "positionUrl", request.getPositionUrl()));
        merged.setHasCoachingRequest(request.getHasCoachingRequest());

        require(merged.getPositionCategory(), "岗位分类不能为空");
        require(merged.getIndustry(), "岗位分类行业不能为空");
        require(merged.getCompanyName(), "公司名称不能为空");
        require(merged.getPositionName(), "岗位名称不能为空");
        require(merged.getRegion(), "大区不能为空");
        require(merged.getCity(), "城市不能为空");
        require(merged.getRecruitmentCycle(), "招聘周期不能为空");
        require(merged.getProjectYear(), "项目时间不能为空");
        return merged;
    }

    private OsgPosition toPublicPosition(OsgStudentPosition request, String reviewer)
    {
        Date visibleFrom = new Date();
        OsgPosition position = new OsgPosition();
        position.setPositionCategory(request.getPositionCategory());
        position.setIndustry(request.getIndustry());
        position.setCompanyName(request.getCompanyName());
        position.setCompanyType(defaultText(request.getCompanyType(), request.getIndustry()));
        position.setCompanyWebsite(request.getCompanyWebsite());
        position.setPositionName(request.getPositionName());
        position.setDepartment(request.getDepartment());
        position.setRegion(request.getRegion());
        position.setCity(request.getCity());
        position.setRecruitmentCycle(request.getRecruitmentCycle());
        position.setProjectYear(request.getProjectYear());
        position.setDeadline(request.getDeadline());
        position.setDisplayStatus("visible");
        position.setPublishTime(visibleFrom);
        position.setDisplayStartTime(visibleFrom);
        position.setDisplayEndTime(resolveVisibleUntil(request.getDeadline(), visibleFrom));
        position.setPositionUrl(request.getPositionUrl());
        position.setApplicationNote("student-submitted");
        position.setCreateBy(defaultText(reviewer, "system"));
        position.setUpdateBy(defaultText(reviewer, "system"));
        return position;
    }

    private Date resolveVisibleUntil(Date deadline, Date visibleFrom)
    {
        if (deadline != null && deadline.after(visibleFrom))
        {
            return deadline;
        }
        return Date.from(Instant.ofEpochMilli(visibleFrom.getTime()).plus(DEFAULT_PUBLIC_POSITION_VISIBLE_DAYS, ChronoUnit.DAYS));
    }

    private boolean isDuplicatePublicPosition(OsgStudentPosition request)
    {
        List<OsgPosition> existing = positionMapper.selectPositionList(new OsgPosition());
        if (existing == null || existing.isEmpty())
        {
            return false;
        }
        String candidateKey = buildDedupKey(
            request.getCompanyName(),
            request.getPositionName(),
            request.getRegion(),
            request.getCity(),
            request.getProjectYear()
        );
        return existing.stream().anyMatch(row -> Objects.equals(candidateKey, buildDedupKey(
            row.getCompanyName(),
            row.getPositionName(),
            row.getRegion(),
            row.getCity(),
            row.getProjectYear()
        )));
    }

    private Map<String, Object> toPayload(OsgStudentPosition request)
    {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("studentPositionId", request.getStudentPositionId());
        payload.put("studentId", request.getStudentId());
        payload.put("studentName", request.getStudentName());
        payload.put("positionCategory", request.getPositionCategory());
        payload.put("industry", request.getIndustry());
        payload.put("companyName", request.getCompanyName());
        payload.put("companyType", request.getCompanyType());
        payload.put("companyWebsite", request.getCompanyWebsite());
        payload.put("positionName", request.getPositionName());
        payload.put("department", request.getDepartment());
        payload.put("region", request.getRegion());
        payload.put("city", request.getCity());
        payload.put("recruitmentCycle", request.getRecruitmentCycle());
        payload.put("projectYear", request.getProjectYear());
        payload.put("deadline", request.getDeadline());
        payload.put("positionUrl", request.getPositionUrl());
        payload.put("status", request.getStatus());
        payload.put("hasCoachingRequest", request.getHasCoachingRequest());
        payload.put("rejectReason", request.getRejectReason());
        payload.put("rejectNote", request.getRejectNote());
        payload.put("reviewer", request.getReviewer());
        payload.put("reviewedAt", request.getReviewedAt());
        payload.put("positionId", request.getPublicPositionId());
        payload.put("flowStatus", request.getFlowStatus());
        payload.put("submittedAt", request.getCreateTime());
        return payload;
    }

    private String resolveText(Map<String, Object> payload, String key, String fallback)
    {
        if (payload == null || !payload.containsKey(key))
        {
            return fallback;
        }
        String value = asText(payload.get(key));
        return value == null ? fallback : value;
    }

    private Date resolveDate(Map<String, Object> payload, String key, Date fallback)
    {
        if (payload == null || !payload.containsKey(key))
        {
            return fallback;
        }
        Date value = asDate(payload.get(key));
        return value == null ? fallback : value;
    }

    private String buildDedupKey(String companyName, String positionName, String region, String city, String projectYear)
    {
        return String.join("|",
            defaultText(companyName, "").trim().toLowerCase(),
            defaultText(positionName, "").trim().toLowerCase(),
            defaultText(region, "").trim().toLowerCase(),
            defaultText(city, "").trim().toLowerCase(),
            defaultText(projectYear, "").trim().toLowerCase()
        );
    }

    private Date asDate(Object value)
    {
        if (value instanceof Date date)
        {
            return date;
        }
        if (value == null)
        {
            return null;
        }
        try
        {
            return java.sql.Timestamp.valueOf(String.valueOf(value).replace("T", " "));
        }
        catch (IllegalArgumentException ex)
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

    private void require(String value, String message)
    {
        if (isBlank(value))
        {
            throw new ServiceException(message);
        }
    }
}
