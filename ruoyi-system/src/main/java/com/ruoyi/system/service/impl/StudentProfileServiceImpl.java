package com.ruoyi.system.service.impl;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.StudentProfileMapper;
import com.ruoyi.system.service.IStudentProfileService;
import com.ruoyi.system.service.IOsgStudentChangeRequestService;
import com.ruoyi.system.service.ISysUserService;

/**
 * 学生个人资料服务实现
 */
@Service
public class StudentProfileServiceImpl implements IStudentProfileService
{
    private static final List<ReviewField> REVIEW_FIELDS = List.of(
            new ReviewField("school", "学校"),
            new ReviewField("major", "专业"),
            new ReviewField("graduationYear", "毕业年份"),
            new ReviewField("highSchool", "高中"),
            new ReviewField("postgraduatePlan", "是否读研或延毕"),
            new ReviewField("visaStatus", "签证"),
            new ReviewField("targetRegion", "求职地区"),
            new ReviewField("recruitmentCycle", "招聘周期"),
            new ReviewField("primaryDirection", "主攻方向"),
            new ReviewField("secondaryDirection", "子方向"));

    @Autowired
    private StudentProfileMapper studentProfileMapper;

    @Autowired
    private ISysUserService userService;

    @Autowired
    private IOsgStudentChangeRequestService changeRequestService;

    @Autowired
    private OsgIdentityResolver identityResolver;

    @Override
    public Map<String, Object> selectProfileView(Long userId)
    {
        Map<String, Object> profile = ensureProfile(userId);
        overlayApprovedMainStudent(profile, resolveMainStudent(userId));
        List<Map<String, Object>> pendingChanges = normalizePendingChanges(resolvePendingChanges(userId));

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("profile", normalizeProfile(profile));
        payload.put("pendingChanges", pendingChanges);
        payload.put("pendingCount", pendingChanges.size());
        return payload;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> updateProfile(Long userId, Map<String, Object> params)
    {
        Map<String, Object> current = ensureProfile(userId);
        String phone = normalizeEditableString(params.get("phone"), stringValue(current.get("phone")));
        String wechatId = normalizeEditableString(params.get("wechatId"), stringValue(current.get("wechatId")));

        studentProfileMapper.updateImmediateFields(userId, phone, wechatId);
        List<ReviewChange> reviewChanges = collectReviewChanges(current, params);
        if (reviewChanges.isEmpty())
        {
            return selectProfileView(userId);
        }

        String operator = "student-" + userId;
        if (submitMainChainReviewChanges(userId, reviewChanges, operator))
        {
            return selectProfileView(userId);
        }

        studentProfileMapper.deletePendingChangesByUserId(userId);
        for (ReviewChange change : reviewChanges)
        {
            studentProfileMapper.insertPendingChange(userId, change.key(), change.label(), change.oldValue(), change.newValue());
        }

        return selectProfileView(userId);
    }

    private List<Map<String, Object>> resolvePendingChanges(Long userId)
    {
        try
        {
            Long studentId = identityResolver.resolveStudentIdByUserId(userId);
            return defaultList(changeRequestService.selectChangeRequestList(studentId, "pending"));
        }
        catch (ServiceException ex)
        {
            return defaultList(studentProfileMapper.selectPendingChangesByUserId(userId));
        }
    }

    private boolean submitMainChainReviewChanges(Long userId, List<ReviewChange> reviewChanges, String operator)
    {
        try
        {
            Long studentId = identityResolver.resolveStudentIdByUserId(userId);
            Map<String, Long> existingPending = indexPendingRequests(
                changeRequestService.selectChangeRequestList(studentId, "pending"));

            for (ReviewChange change : reviewChanges)
            {
                Long existingRequestId = existingPending.get(change.key());
                if (existingRequestId != null)
                {
                    changeRequestService.rejectChangeRequest(existingRequestId, operator, "学生重新提交，旧申请已覆盖");
                }

                Map<String, Object> payload = new LinkedHashMap<>();
                payload.put("studentId", studentId);
                payload.put("changeType", "学生资料");
                payload.put("fieldKey", change.key());
                payload.put("fieldLabel", change.label());
                payload.put("beforeValue", change.oldValue());
                payload.put("afterValue", change.newValue());
                payload.put("requestedBy", operator);
                changeRequestService.submitChangeRequest(payload, operator);
            }
            return true;
        }
        catch (ServiceException ex)
        {
            return false;
        }
    }

    private Map<String, Object> ensureProfile(Long userId)
    {
        Map<String, Object> profile = studentProfileMapper.selectProfileByUserId(userId);
        if (profile != null)
        {
            return profile;
        }

        SysUser user = userService.selectUserById(userId);
        if (user == null)
        {
            throw new ServiceException("学生资料不存在");
        }

        Map<String, Object> params = new LinkedHashMap<>();
        params.put("userId", userId);
        params.put("studentCode", "STU-" + userId);
        params.put("fullName", defaultString(user.getNickName(), user.getUserName()));
        params.put("englishName", defaultString(user.getNickName(), user.getUserName()));
        params.put("email", defaultString(user.getEmail(), "-"));
        params.put("sexLabel", sexLabel(user.getSex()));
        params.put("leadMentor", "-");
        params.put("assistantName", "-");
        params.put("school", "-");
        params.put("major", "-");
        params.put("graduationYear", "-");
        params.put("highSchool", "-");
        params.put("postgraduatePlan", "否");
        params.put("visaStatus", "-");
        params.put("targetRegion", "-");
        params.put("recruitmentCycle", "-");
        params.put("primaryDirection", "-");
        params.put("secondaryDirection", "-");
        params.put("phone", defaultString(user.getPhonenumber(), "-"));
        params.put("wechatId", "-");
        studentProfileMapper.insertProfile(params);
        return studentProfileMapper.selectProfileByUserId(userId);
    }

    private OsgStudent resolveMainStudent(Long userId)
    {
        try
        {
            return identityResolver.resolveStudentByUserId(userId);
        }
        catch (ServiceException ex)
        {
            return null;
        }
    }

    private void overlayApprovedMainStudent(Map<String, Object> profile, OsgStudent student)
    {
        if (profile == null || student == null)
        {
            return;
        }

        overlayValue(profile, "email", student.getEmail());
        overlayValue(profile, "school", student.getSchool());
        overlayValue(profile, "major", student.getMajor());
        overlayValue(profile, "graduationYear", student.getGraduationYear());
        overlayValue(profile, "targetRegion", student.getTargetRegion());
        overlayValue(profile, "recruitmentCycle", student.getRecruitmentCycle());
        overlayValue(profile, "primaryDirection", student.getMajorDirection());
        overlayValue(profile, "secondaryDirection", student.getSubDirection());

        Map<String, String> remarkFields = parseRemarkFields(student.getRemark());
        overlayValue(profile, "highSchool", remarkFields.get("highSchool"));
        overlayValue(profile, "postgraduatePlan", firstNonBlank(
            remarkFields.get("postgraduatePlan"),
            remarkFields.get("postgraduate"),
            remarkFields.get("studyPlan")));
        overlayValue(profile, "visaStatus", remarkFields.get("visaStatus"));
    }

    private Map<String, Object> normalizeProfile(Map<String, Object> source)
    {
        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("studentCode", stringValue(source.get("studentCode")));
        profile.put("fullName", stringValue(source.get("fullName")));
        profile.put("englishName", stringValue(source.get("englishName")));
        profile.put("email", stringValue(source.get("email")));
        profile.put("sexLabel", stringValue(source.get("sexLabel")));
        profile.put("statusLabel", "正常");
        profile.put("leadMentor", stringValue(source.get("leadMentor")));
        profile.put("assistantName", stringValue(source.get("assistantName")));
        profile.put("school", stringValue(source.get("school")));
        profile.put("major", stringValue(source.get("major")));
        profile.put("graduationYear", stringValue(source.get("graduationYear")));
        profile.put("highSchool", stringValue(source.get("highSchool")));
        profile.put("postgraduatePlan", stringValue(source.get("postgraduatePlan")));
        profile.put("visaStatus", stringValue(source.get("visaStatus")));
        profile.put("targetRegion", stringValue(source.get("targetRegion")));
        profile.put("recruitmentCycle", stringValue(source.get("recruitmentCycle")));
        profile.put("primaryDirection", stringValue(source.get("primaryDirection")));
        profile.put("secondaryDirection", stringValue(source.get("secondaryDirection")));
        profile.put("phone", stringValue(source.get("phone")));
        profile.put("wechatId", stringValue(source.get("wechatId")));
        return profile;
    }

    private List<Map<String, Object>> normalizePendingChanges(List<Map<String, Object>> source)
    {
        List<Map<String, Object>> changes = new ArrayList<>();
        for (Map<String, Object> row : source)
        {
            Map<String, Object> change = new LinkedHashMap<>();
            change.put("fieldKey", stringValue(row.get("fieldKey")));
            change.put("fieldLabel", stringValue(row.get("fieldLabel")));
            change.put("oldValue", stringValue(firstNonNull(row.get("oldValue"), row.get("beforeValue"))));
            change.put("newValue", stringValue(firstNonNull(row.get("newValue"), row.get("afterValue"))));
            change.put("status", stringValue(row.get("status")));
            change.put("submittedAt", stringValue(firstNonNull(row.get("submittedAt"), row.get("requestedAt"))));
            changes.add(change);
        }
        return changes;
    }

    private List<ReviewChange> collectReviewChanges(Map<String, Object> current, Map<String, Object> params)
    {
        List<ReviewChange> reviewChanges = new ArrayList<>();
        for (ReviewField field : REVIEW_FIELDS)
        {
            String oldValue = stringValue(current.get(field.key()));
            String newValue = normalizeEditableString(params.get(field.key()), oldValue);
            if (!Objects.equals(oldValue, newValue))
            {
                reviewChanges.add(new ReviewChange(field.key(), field.label(), oldValue, newValue));
            }
        }
        return reviewChanges;
    }

    private Map<String, Long> indexPendingRequests(List<Map<String, Object>> rows)
    {
        if (rows == null || rows.isEmpty())
        {
            return Collections.emptyMap();
        }

        Map<String, Long> result = new LinkedHashMap<>();
        for (Map<String, Object> row : rows)
        {
            String fieldKey = stringValue(row.get("fieldKey"));
            Long requestId = asLong(row.get("requestId"));
            if (StringUtils.isEmpty(fieldKey) || requestId == null)
            {
                continue;
            }
            result.put(fieldKey, requestId);
        }
        return result;
    }

    private String normalizeEditableString(Object rawValue, String fallback)
    {
        if (rawValue == null)
        {
            return fallback;
        }
        String value = rawValue.toString().trim();
        return value.isEmpty() ? "-" : value;
    }

    private String stringValue(Object value)
    {
        return value == null ? "-" : value.toString();
    }

    private String defaultString(String primary, String fallback)
    {
        return StringUtils.isNotEmpty(primary) ? primary : fallback;
    }

    private List<Map<String, Object>> defaultList(List<Map<String, Object>> rows)
    {
        return rows == null ? Collections.emptyList() : rows;
    }

    private void overlayValue(Map<String, Object> target, String key, Object value)
    {
        String normalized = stringValue(value);
        if (!"-".equals(normalized))
        {
            target.put(key, normalized);
        }
    }

    private Map<String, String> parseRemarkFields(String remark)
    {
        if (StringUtils.isEmpty(remark))
        {
            return Collections.emptyMap();
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

    private Object firstNonNull(Object primary, Object fallback)
    {
        return primary != null ? primary : fallback;
    }

    private String firstNonBlank(String... values)
    {
        for (String value : values)
        {
            if (StringUtils.isNotEmpty(value) && !"-".equals(value))
            {
                return value;
            }
        }
        return null;
    }

    private Long asLong(Object value)
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
            return Long.parseLong(String.valueOf(value));
        }
        catch (NumberFormatException ex)
        {
            return null;
        }
    }

    private String sexLabel(String sex)
    {
        if ("1".equals(sex))
        {
            return "Female";
        }
        if ("0".equals(sex))
        {
            return "Male";
        }
        return "Unknown";
    }

    private record ReviewField(String key, String label)
    {
    }

    private record ReviewChange(String key, String label, String oldValue, String newValue)
    {
    }
}
