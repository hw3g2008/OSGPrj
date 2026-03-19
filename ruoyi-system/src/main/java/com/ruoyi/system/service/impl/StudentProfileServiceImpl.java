package com.ruoyi.system.service.impl;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.mapper.StudentProfileMapper;
import com.ruoyi.system.service.IStudentProfileService;
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

    @Override
    public Map<String, Object> selectProfileView(Long userId)
    {
        Map<String, Object> profile = ensureProfile(userId);
        List<Map<String, Object>> pendingChanges = normalizePendingChanges(
                studentProfileMapper.selectPendingChangesByUserId(userId));

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("profile", normalizeProfile(profile));
        payload.put("pendingChanges", pendingChanges);
        payload.put("pendingCount", pendingChanges.size());
        return payload;
    }

    @Override
    public Map<String, Object> updateProfile(Long userId, Map<String, Object> params)
    {
        Map<String, Object> current = ensureProfile(userId);
        String phone = normalizeEditableString(params.get("phone"), stringValue(current.get("phone")));
        String wechatId = normalizeEditableString(params.get("wechatId"), stringValue(current.get("wechatId")));

        studentProfileMapper.updateImmediateFields(userId, phone, wechatId);
        studentProfileMapper.deletePendingChangesByUserId(userId);

        for (ReviewField field : REVIEW_FIELDS)
        {
            String oldValue = stringValue(current.get(field.key()));
            String newValue = normalizeEditableString(params.get(field.key()), oldValue);
            if (!Objects.equals(oldValue, newValue))
            {
                studentProfileMapper.insertPendingChange(userId, field.key(), field.label(), oldValue, newValue);
            }
        }

        return selectProfileView(userId);
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
            change.put("oldValue", stringValue(row.get("oldValue")));
            change.put("newValue", stringValue(row.get("newValue")));
            change.put("status", stringValue(row.get("status")));
            change.put("submittedAt", stringValue(row.get("submittedAt")));
            changes.add(change);
        }
        return changes;
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
}
