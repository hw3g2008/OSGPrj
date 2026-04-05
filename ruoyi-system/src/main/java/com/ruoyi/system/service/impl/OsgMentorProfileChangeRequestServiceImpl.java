package com.ruoyi.system.service.impl;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.domain.OsgMentorProfileChangeRequest;
import com.ruoyi.system.mapper.OsgMentorProfileChangeRequestMapper;

@Service
public class OsgMentorProfileChangeRequestServiceImpl
{
    private static final String STATUS_PENDING = "pending";

    @Autowired
    private OsgMentorProfileChangeRequestMapper changeRequestMapper;

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
}
