package com.ruoyi.system.service.impl;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.domain.OsgMentorProfileChangeRequest;
import com.ruoyi.system.mapper.OsgMentorProfileChangeRequestMapper;
import com.ruoyi.system.mapper.SysUserMapper;

@Service
public class OsgMentorProfileChangeRequestServiceImpl
{
    private static final String STATUS_PENDING = "pending";
    private static final String STATUS_APPROVED = "approved";
    private static final String STATUS_REJECTED = "rejected";

    @Autowired
    private OsgMentorProfileChangeRequestMapper changeRequestMapper;

    @Autowired
    private SysUserMapper sysUserMapper;

    @Autowired
    private ObjectMapper objectMapper;

    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> submitChangeRequest(SysUser currentUser, String operator, Map<String, Object> body)
    {
        if (currentUser == null || currentUser.getUserId() == null)
        {
            throw new ServiceException("导师资料不存在");
        }
        if (body == null || body.isEmpty())
        {
            throw new ServiceException("变更参数不能为空");
        }

        List<String> changedFields = collectChangedFields(currentUser, body);
        if (changedFields.isEmpty())
        {
            throw new ServiceException("未检测到可提交的变更");
        }

        OsgMentorProfileChangeRequest request = new OsgMentorProfileChangeRequest();
        request.setUserId(currentUser.getUserId());
        request.setPayloadJson(toJson(body));
        request.setChangeSummary(String.join(", ", changedFields));
        request.setStatus(STATUS_PENDING);
        request.setRequestedBy(defaultText(operator, "system"));
        request.setCreateBy(defaultText(operator, "system"));
        request.setUpdateBy(defaultText(operator, "system"));
        request.setRemark("mentor profile pending review");
        changeRequestMapper.insertChangeRequest(request);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("requestId", request.getRequestId());
        result.put("status", request.getStatus());
        result.put("changedFields", changedFields);
        return result;
    }

    private List<String> collectChangedFields(SysUser currentUser, Map<String, Object> body)
    {
        List<String> changedFields = new ArrayList<>();
        addIfChanged(changedFields, "nickName", currentUser.getNickName(), body.get("nickName"));
        addIfChanged(changedFields, "sex", currentUser.getSex(), body.get("sex"));
        addIfChanged(changedFields, "phonenumber", currentUser.getPhonenumber(), body.get("phonenumber"));
        addIfChanged(changedFields, "email", currentUser.getEmail(), body.get("email"));
        addIfChanged(changedFields, "remark", currentUser.getRemark(), body.get("remark"));
        addIfChanged(changedFields, "region", null, body.get("region"));
        addIfChanged(changedFields, "city", null, body.get("city"));
        return changedFields;
    }

    private void addIfChanged(List<String> changedFields, String field, Object currentValue, Object submittedValue)
    {
        String nextValue = toText(submittedValue);
        if (!StringUtils.hasText(nextValue))
        {
            return;
        }
        String currentText = toText(currentValue);
        if (!Objects.equals(currentText, nextValue))
        {
            changedFields.add(field);
        }
    }

    private String toJson(Map<String, Object> body)
    {
        try
        {
            return objectMapper.writeValueAsString(body);
        }
        catch (JsonProcessingException ex)
        {
            throw new ServiceException("保存变更信息失败");
        }
    }

    private String toText(Object value)
    {
        return value == null ? null : String.valueOf(value).trim();
    }

    private String defaultText(String value, String fallback)
    {
        return StringUtils.hasText(value) ? value : fallback;
    }

    /**
     * A-AU-001 admin 端审核入口：列出待审核 / 全部变更申请。
     */
    public List<Map<String, Object>> listChangeRequests(String status, Long userId)
    {
        Map<String, Object> params = new HashMap<>();
        if (StringUtils.hasText(status))
        {
            params.put("status", status);
        }
        if (userId != null)
        {
            params.put("userId", userId);
        }
        List<OsgMentorProfileChangeRequest> rows = changeRequestMapper.selectChangeRequestList(params);
        List<Map<String, Object>> result = new ArrayList<>();
        for (OsgMentorProfileChangeRequest row : rows)
        {
            result.add(toPayload(row));
        }
        return result;
    }

    /**
     * A-AU-001：通过变更申请，把 payloadJson 中字段写回 sys_user。
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> approveChangeRequest(Long requestId, String reviewer)
    {
        OsgMentorProfileChangeRequest request = requirePendingRequest(requestId);
        Map<String, Object> payload = parsePayload(request.getPayloadJson());

        SysUser user = sysUserMapper.selectUserById(request.getUserId());
        if (user == null)
        {
            throw new ServiceException("导师账号不存在");
        }
        applyChangesToSysUser(user, payload);
        sysUserMapper.updateUser(user);

        request.setStatus(STATUS_APPROVED);
        request.setReviewer(defaultText(reviewer, "system"));
        request.setReviewedAt(new Date());
        request.setUpdateBy(defaultText(reviewer, "system"));
        changeRequestMapper.updateChangeRequestReview(request);

        return toPayload(request);
    }

    /**
     * A-AU-001：驳回变更申请，不动 sys_user。
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> rejectChangeRequest(Long requestId, String reason, String reviewer)
    {
        if (!StringUtils.hasText(reason))
        {
            throw new ServiceException("驳回原因不能为空");
        }
        OsgMentorProfileChangeRequest request = requirePendingRequest(requestId);
        request.setStatus(STATUS_REJECTED);
        request.setReviewer(defaultText(reviewer, "system"));
        request.setReviewedAt(new Date());
        request.setRemark(reason);
        request.setUpdateBy(defaultText(reviewer, "system"));
        changeRequestMapper.updateChangeRequestReview(request);
        return toPayload(request);
    }

    private OsgMentorProfileChangeRequest requirePendingRequest(Long requestId)
    {
        OsgMentorProfileChangeRequest request = changeRequestMapper.selectChangeRequestById(requestId);
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

    private Map<String, Object> parsePayload(String payloadJson)
    {
        if (!StringUtils.hasText(payloadJson))
        {
            return Map.of();
        }
        try
        {
            return objectMapper.readValue(payloadJson, new TypeReference<Map<String, Object>>() {});
        }
        catch (JsonProcessingException ex)
        {
            throw new ServiceException("解析变更内容失败");
        }
    }

    private void applyChangesToSysUser(SysUser user, Map<String, Object> payload)
    {
        if (payload == null || payload.isEmpty())
        {
            return;
        }
        String nickName = toText(payload.get("nickName"));
        if (StringUtils.hasText(nickName)) user.setNickName(nickName);
        String sex = toText(payload.get("sex"));
        if (StringUtils.hasText(sex)) user.setSex(sex);
        String phonenumber = toText(payload.get("phonenumber"));
        if (StringUtils.hasText(phonenumber)) user.setPhonenumber(phonenumber);
        String email = toText(payload.get("email"));
        if (StringUtils.hasText(email)) user.setEmail(email);
        String remark = toText(payload.get("remark"));
        if (remark != null) user.setRemark(remark);
    }

    private Map<String, Object> toPayload(OsgMentorProfileChangeRequest request)
    {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("requestId", request.getRequestId());
        map.put("userId", request.getUserId());
        map.put("changeSummary", request.getChangeSummary());
        map.put("payloadJson", request.getPayloadJson());
        map.put("status", request.getStatus());
        map.put("requestedBy", request.getRequestedBy());
        map.put("reviewer", request.getReviewer());
        map.put("reviewedAt", request.getReviewedAt());
        map.put("createTime", request.getCreateTime());
        map.put("remark", request.getRemark());
        return map;
    }
}
