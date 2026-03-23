package com.ruoyi.system.service.impl;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.domain.OsgStaff;
import com.ruoyi.system.domain.OsgStaffChangeRequest;
import com.ruoyi.system.mapper.OsgStaffChangeRequestMapper;
import com.ruoyi.system.mapper.OsgStaffMapper;

@Service
public class OsgLeadMentorProfileService
{
    private static final String DEFAULT_VALUE = "-";

    private static final List<EditableField> EDITABLE_FIELDS = List.of(
        new EditableField("englishName", "englishName", "英文名", true),
        new EditableField("genderLabel", "genderLabel", "性别", true),
        new EditableField("phone", "phone", "手机号", true),
        new EditableField("wechatId", "wechatId", "微信号", false),
        new EditableField("email", "email", "邮箱", true),
        new EditableField("regionArea", "regionArea", "所属地区", true),
        new EditableField("regionCity", "regionCity", "所属城市", true)
    );

    @Autowired
    private OsgStaffMapper staffMapper;

    @Autowired
    private OsgStaffChangeRequestMapper staffChangeRequestMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    public Map<String, Object> selectProfileView(SysUser user)
    {
        StaffContext context = resolveContext(user);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("profile", toProfilePayload(context));

        List<Map<String, Object>> pendingChanges = selectPendingChanges(context.staffId());
        payload.put("pendingChanges", pendingChanges);
        payload.put("pendingCount", pendingChanges.size());
        return payload;
    }

    public Map<String, Object> submitChangeRequest(SysUser user, String operator, Map<String, Object> body)
    {
        rejectLockedFieldEdits(body);

        StaffContext context = resolveContext(user);
        rejectCrossStaffPayload(body, context.staffId());

        Map<String, String> currentValues = currentEditableValues(context);
        List<Map<String, Object>> createdRequests = new ArrayList<>();
        List<Long> requestIds = new ArrayList<>();
        String remark = asText(body.get("remark"));

        for (EditableField field : EDITABLE_FIELDS)
        {
            String afterValue = normalizeSubmittedValue(body, field);
            if (afterValue == null)
            {
                continue;
            }

            String beforeValue = currentValues.get(field.payloadKey());
            if (Objects.equals(beforeValue, afterValue))
            {
                continue;
            }

            OsgStaffChangeRequest request = new OsgStaffChangeRequest();
            request.setStaffId(context.staffId());
            request.setFieldKey(field.payloadKey());
            request.setFieldLabel(field.fieldLabel());
            request.setBeforeValue(beforeValue);
            request.setAfterValue(afterValue);
            request.setStatus("pending");
            request.setRequestedBy(operator);
            request.setCreateBy(operator);
            request.setUpdateBy(operator);
            request.setRemark(remark);
            staffChangeRequestMapper.insertChangeRequest(request);

            requestIds.add(request.getRequestId());
            createdRequests.add(toCreatedRequestPayload(request));
        }

        if (createdRequests.isEmpty())
        {
            throw new ServiceException("未检测到可提交的变更");
        }

        Map<String, Object> refreshed = selectProfileView(user);
        refreshed.put("staffId", context.staffId());
        refreshed.put("changeRequestId", requestIds.get(0));
        refreshed.put("changeRequestIds", requestIds);
        refreshed.put("createdCount", createdRequests.size());
        refreshed.put("requests", createdRequests);
        return refreshed;
    }

    private void rejectLockedFieldEdits(Map<String, Object> body)
    {
        if (hasText(body.get("majorDirection")) || hasText(body.get("subDirection")) || body.get("hourlyRate") != null)
        {
            throw new ServiceException("锁定字段不允许修改");
        }
    }

    private void rejectCrossStaffPayload(Map<String, Object> body, Long ownStaffId)
    {
        Long requestedStaffId = asLong(body.get("staffId"));
        if (requestedStaffId != null && !requestedStaffId.equals(ownStaffId))
        {
            throw new ServiceException("仅允许提交本人资料变更申请");
        }
    }

    private StaffContext resolveContext(SysUser user)
    {
        if (user == null)
        {
            throw new ServiceException("班主任资料不存在");
        }

        String email = StringUtils.trimToNull(user.getEmail());
        if (email == null)
        {
            throw new ServiceException("班主任资料不存在");
        }

        Long staffId;
        try
        {
            staffId = jdbcTemplate.queryForObject(
                """
                    select staff_id
                    from osg_staff
                    where email = ?
                      and staff_type = 'lead_mentor'
                      and (account_status is null or account_status <> 'frozen')
                    order by staff_id asc
                    limit 1
                    """,
                Long.class,
                email
            );
        }
        catch (EmptyResultDataAccessException ex)
        {
            staffId = null;
        }

        if (staffId == null)
        {
            throw new ServiceException("班主任资料不存在");
        }

        OsgStaff staff = staffMapper.selectStaffByStaffId(staffId);
        if (staff == null)
        {
            throw new ServiceException("班主任资料不存在");
        }

        return new StaffContext(staffId, staff, user);
    }

    private Map<String, Object> toProfilePayload(StaffContext context)
    {
        OsgStaff staff = context.staff();
        SysUser user = context.user();

        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("staffId", context.staffId());
        profile.put("englishName", resolveEnglishName(user, staff));
        profile.put("genderLabel", resolveGenderLabel(user.getSex()));
        profile.put("typeLabel", "班主任");
        profile.put("email", firstText(user.getEmail(), staff.getEmail()));
        profile.put("phone", firstText(user.getPhonenumber(), staff.getPhone()));
        profile.put("wechatId", DEFAULT_VALUE);
        profile.put("regionArea", defaultText(staff.getRegion()));
        profile.put("regionCity", defaultText(staff.getCity()));
        profile.put("regionLabel", joinRegion(staff.getRegion(), staff.getCity()));
        profile.put("majorDirection", defaultText(staff.getMajorDirection()));
        profile.put("subDirection", defaultText(staff.getSubDirection()));
        profile.put("hourlyRate", normalizeHourlyRate(staff.getHourlyRate()));
        profile.put("statusLabel", normalizeStatusLabel(staff.getAccountStatus()));
        return profile;
    }

    private List<Map<String, Object>> selectPendingChanges(Long staffId)
    {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
            """
                select request_id as changeRequestId,
                       field_key as fieldKey,
                       field_label as fieldLabel,
                       before_value as beforeValue,
                       after_value as afterValue,
                       status,
                       requested_by as requestedBy,
                       create_time as submittedAt,
                       remark
                from osg_staff_change_request
                where staff_id = ?
                order by request_id desc
                """,
            staffId
        );

        List<Map<String, Object>> pendingChanges = new ArrayList<>();
        for (Map<String, Object> row : rows)
        {
            Map<String, Object> change = new LinkedHashMap<>();
            change.put("changeRequestId", row.get("changeRequestId"));
            change.put("fieldKey", defaultText(asText(row.get("fieldKey"))));
            change.put("fieldLabel", defaultText(asText(row.get("fieldLabel"))));
            change.put("beforeValue", defaultText(asText(row.get("beforeValue"))));
            change.put("afterValue", defaultText(asText(row.get("afterValue"))));
            change.put("status", defaultText(asText(row.get("status"))));
            change.put("requestedBy", defaultText(asText(row.get("requestedBy"))));
            change.put("submittedAt", row.get("submittedAt"));
            change.put("remark", defaultText(asText(row.get("remark"))));
            pendingChanges.add(change);
        }
        return pendingChanges;
    }

    private Map<String, String> currentEditableValues(StaffContext context)
    {
        Map<String, String> currentValues = new LinkedHashMap<>();
        currentValues.put("englishName", resolveEnglishName(context.user(), context.staff()));
        currentValues.put("genderLabel", resolveGenderLabel(context.user().getSex()));
        currentValues.put("phone", firstText(context.user().getPhonenumber(), context.staff().getPhone()));
        currentValues.put("wechatId", DEFAULT_VALUE);
        currentValues.put("email", firstText(context.user().getEmail(), context.staff().getEmail()));
        currentValues.put("regionArea", defaultText(context.staff().getRegion()));
        currentValues.put("regionCity", defaultText(context.staff().getCity()));
        return currentValues;
    }

    private String normalizeSubmittedValue(Map<String, Object> body, EditableField field)
    {
        Object rawValue = body.get(field.inputKey());
        if (rawValue == null && "wechatId".equals(field.inputKey()))
        {
            rawValue = body.get("wechat");
        }
        if (rawValue == null && "genderLabel".equals(field.inputKey()))
        {
            rawValue = body.get("sexLabel");
        }
        if (rawValue == null)
        {
            return null;
        }

        String value = asText(rawValue);
        if (value == null)
        {
            if (field.required())
            {
                throw new ServiceException(field.fieldLabel() + "不能为空");
            }
            return DEFAULT_VALUE;
        }
        return value;
    }

    private Map<String, Object> toCreatedRequestPayload(OsgStaffChangeRequest request)
    {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("changeRequestId", request.getRequestId());
        payload.put("fieldKey", request.getFieldKey());
        payload.put("fieldLabel", request.getFieldLabel());
        payload.put("beforeValue", defaultText(request.getBeforeValue()));
        payload.put("afterValue", defaultText(request.getAfterValue()));
        payload.put("status", request.getStatus());
        payload.put("requestedBy", request.getRequestedBy());
        payload.put("remark", defaultText(request.getRemark()));
        return payload;
    }

    private String resolveEnglishName(SysUser user, OsgStaff staff)
    {
        return firstText(user == null ? null : user.getNickName(), staff == null ? null : staff.getStaffName());
    }

    private String resolveGenderLabel(String sex)
    {
        if ("0".equals(sex))
        {
            return "Male";
        }
        if ("1".equals(sex))
        {
            return "Female";
        }
        return "Unknown";
    }

    private String normalizeStatusLabel(String accountStatus)
    {
        if ("frozen".equals(accountStatus))
        {
            return "冻结";
        }
        return "正常";
    }

    private Object normalizeHourlyRate(BigDecimal hourlyRate)
    {
        return hourlyRate == null ? 0 : hourlyRate.stripTrailingZeros();
    }

    private String joinRegion(String region, String city)
    {
        String area = StringUtils.trimToNull(region);
        String resolvedCity = StringUtils.trimToNull(city);
        if (area == null && resolvedCity == null)
        {
            return DEFAULT_VALUE;
        }
        if (area == null)
        {
            return resolvedCity;
        }
        if (resolvedCity == null)
        {
            return area;
        }
        return area + " · " + resolvedCity;
    }

    private boolean hasText(Object value)
    {
        return asText(value) != null;
    }

    private Long asLong(Object value)
    {
        if (value instanceof Number number)
        {
            return number.longValue();
        }
        if (value instanceof String text && !text.isBlank())
        {
            try
            {
                return Long.parseLong(text.trim());
            }
            catch (NumberFormatException ex)
            {
                return null;
            }
        }
        return null;
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

    private String firstText(String primary, String fallback)
    {
        String resolvedPrimary = StringUtils.trimToNull(primary);
        return resolvedPrimary == null ? defaultText(fallback) : resolvedPrimary;
    }

    private String defaultText(String value)
    {
        String resolved = StringUtils.trimToNull(value);
        return resolved == null ? DEFAULT_VALUE : resolved;
    }

    private record EditableField(String inputKey, String payloadKey, String fieldLabel, boolean required)
    {
    }

    private record StaffContext(Long staffId, OsgStaff staff, SysUser user)
    {
    }
}
