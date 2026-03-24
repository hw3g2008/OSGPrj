package com.ruoyi.system.service.impl;

import java.util.Objects;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.domain.OsgStaff;
import com.ruoyi.system.domain.OsgStaffChangeRequest;
import com.ruoyi.system.mapper.OsgStaffChangeRequestMapper;
import com.ruoyi.system.mapper.OsgStaffMapper;
import com.ruoyi.system.service.ISysUserService;
import com.ruoyi.system.service.IOsgStaffService;

@Service
public class OsgStaffServiceImpl implements IOsgStaffService
{
    private static final String DEFAULT_STAFF_PASSWORD = "Osg@2026";
    private static final int SYS_USER_NICKNAME_MAX_LENGTH = 30;

    @Autowired
    private OsgStaffMapper staffMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private OsgStaffChangeRequestMapper staffChangeRequestMapper;

    @Autowired
    private ISysUserService sysUserService;

    @Override
    public OsgStaff selectStaffByStaffId(Long staffId)
    {
        return staffMapper.selectStaffByStaffId(staffId);
    }

    @Override
    public List<OsgStaff> selectStaffList(OsgStaff staff)
    {
        return staffMapper.selectStaffList(staff);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int insertStaff(OsgStaff staff)
    {
        validateAccountEmail(staff.getEmail());
        ensureStaffEmailAvailable(staff.getEmail(), null);
        int rows = staffMapper.insertStaff(staff);
        if (rows > 0)
        {
            ensureStaffAccount(staff, staff.getCreateBy());
        }
        return rows;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int updateStaff(OsgStaff staff)
    {
        OsgStaff existing = staffMapper.selectStaffByStaffId(staff.getStaffId());
        if (existing == null)
        {
            return 0;
        }
        validateAccountEmail(staff.getEmail());
        ensureStaffEmailAvailable(staff.getEmail(), existing.getEmail());
        int rows = staffMapper.updateStaff(staff);
        if (rows > 0)
        {
            syncStaffAccount(existing, staff, staff.getUpdateBy());
        }
        return rows;
    }

    @Override
    public int updateStaffStatus(OsgStaff staff)
    {
        return staffMapper.updateStaffStatus(staff);
    }

    public int updateStaffStatus(Long staffId, String accountStatus, String updateBy)
    {
        OsgStaff staff = new OsgStaff();
        staff.setStaffId(staffId);
        staff.setAccountStatus(accountStatus);
        staff.setUpdateBy(updateBy);
        return staffMapper.updateStaffStatus(staff);
    }

    @Override
    public int deleteStaffByStaffId(Long staffId)
    {
        return staffMapper.deleteStaffByStaffId(staffId);
    }

    @Override
    public Map<Long, Integer> selectStudentCounts(List<Long> staffIds)
    {
        if (staffIds == null || staffIds.isEmpty())
        {
            return Collections.emptyMap();
        }

        List<Long> uniqueIds = staffIds.stream().filter(id -> id != null).distinct().collect(Collectors.toList());
        if (uniqueIds.isEmpty())
        {
            return Collections.emptyMap();
        }

        String placeholders = uniqueIds.stream().map(id -> "?").collect(Collectors.joining(", "));
        String sql = """
            select mentor_id, count(1) as student_count
            from (
                select lead_mentor_id as mentor_id from osg_student where lead_mentor_id in (%s)
                union all
                select assistant_id as mentor_id from osg_student where assistant_id in (%s)
            ) counts
            group by mentor_id
            """.formatted(placeholders, placeholders);

        Object[] args = new Object[uniqueIds.size() * 2];
        for (int i = 0; i < uniqueIds.size(); i++)
        {
            args[i] = uniqueIds.get(i);
            args[i + uniqueIds.size()] = uniqueIds.get(i);
        }

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, args);
        Map<Long, Integer> counts = new LinkedHashMap<>();
        for (Map<String, Object> row : rows)
        {
            Object mentorId = row.get("mentor_id");
            Object studentCount = row.get("student_count");
            if (mentorId instanceof Number mentorNumber)
            {
                counts.put(mentorNumber.longValue(), studentCount instanceof Number countNumber ? countNumber.intValue() : 0);
            }
        }
        return counts;
    }

    public int updateStaffBlacklist(Long staffId, String action, String reason, Long operatorId)
    {
        if ("remove".equals(action))
        {
            return jdbcTemplate.update("delete from osg_staff_blacklist where staff_id = ?", staffId);
        }

        return jdbcTemplate.update(
            """
                insert into osg_staff_blacklist (staff_id, blacklist_reason, operator_id, added_at)
                values (?, ?, ?, now())
                on duplicate key update
                    blacklist_reason = values(blacklist_reason),
                    operator_id = values(operator_id),
                    added_at = values(added_at)
                """,
            staffId,
            reason,
            operatorId
        );
    }

    public List<Long> selectBlacklistedStaffIds(List<Long> staffIds)
    {
        if (staffIds == null || staffIds.isEmpty())
        {
            return Collections.emptyList();
        }

        List<Long> nonNullStaffIds = staffIds.stream()
            .filter(id -> id != null)
            .distinct()
            .collect(Collectors.toList());
        if (nonNullStaffIds.isEmpty())
        {
            return Collections.emptyList();
        }

        String placeholders = nonNullStaffIds.stream().map(id -> "?").collect(Collectors.joining(", "));
        String sql = "select staff_id from osg_staff_blacklist where staff_id in (" + placeholders + ")";
        List<Long> blacklistedIds = jdbcTemplate.queryForList(sql, Long.class, nonNullStaffIds.toArray());
        return blacklistedIds == null ? new ArrayList<>() : blacklistedIds;
    }

    public Map<String, Object> selectStaffDetail(Long staffId)
    {
        OsgStaff staff = staffMapper.selectStaffByStaffId(staffId);
        if (staff == null)
        {
            return Collections.emptyMap();
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("staffId", staff.getStaffId());
        payload.put("staffName", staff.getStaffName());
        payload.put("email", staff.getEmail());
        payload.put("phone", staff.getPhone());
        payload.put("staffType", staff.getStaffType());
        payload.put("majorDirection", staff.getMajorDirection());
        payload.put("subDirection", staff.getSubDirection());
        payload.put("region", staff.getRegion());
        payload.put("city", staff.getCity());
        payload.put("hourlyRate", staff.getHourlyRate());
        payload.put("studentCount", staff.getStudentCount());
        payload.put("accountStatus", normalizeAccountStatus(staff.getAccountStatus()));
        payload.put("isBlacklisted", selectBlacklistedStaffIds(List.of(staffId)).contains(staffId));
        return payload;
    }

    public int selectPendingReviewCount()
    {
        return staffChangeRequestMapper.selectPendingReviewCount();
    }

    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> submitChangeRequest(Map<String, Object> payload, String operator)
    {
        Long staffId = asLong(payload.get("staffId"));
        String fieldKey = asText(payload.get("fieldKey"));
        String fieldLabel = asText(payload.get("fieldLabel"));
        String afterValue = asText(payload.get("afterValue"));
        if (staffId == null)
        {
            throw new ServiceException("staffId不能为空");
        }
        if (fieldKey == null || fieldLabel == null || afterValue == null)
        {
            throw new ServiceException("变更字段不能为空");
        }

        OsgStaff staff = staffMapper.selectStaffByStaffId(staffId);
        if (staff == null)
        {
            throw new ServiceException("导师不存在");
        }

        OsgStaffChangeRequest request = new OsgStaffChangeRequest();
        request.setStaffId(staffId);
        request.setFieldKey(fieldKey);
        request.setFieldLabel(fieldLabel);
        request.setBeforeValue(asText(payload.get("beforeValue")));
        request.setAfterValue(afterValue);
        request.setStatus("pending");
        request.setRequestedBy(operator);
        request.setCreateBy(operator);
        request.setUpdateBy(operator);
        request.setRemark(asText(payload.get("remark")));
        staffChangeRequestMapper.insertChangeRequest(request);
        return toChangeRequestPayload(request, staff);
    }

    public Map<String, Object> resetStaffPassword(Long staffId, String operator)
    {
        OsgStaff staff = staffMapper.selectStaffByStaffId(staffId);
        if (staff == null)
        {
            throw new ServiceException("导师不存在");
        }

        SysUser account = ensureStaffAccount(staff, operator);
        if (sysUserService.resetUserPwd(account.getUserId(), SecurityUtils.encryptPassword(DEFAULT_STAFF_PASSWORD)) <= 0)
        {
            throw new ServiceException("导师密码重置失败");
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("staffId", staffId);
        result.put("loginAccount", staff.getEmail());
        result.put("defaultPassword", DEFAULT_STAFF_PASSWORD);
        return result;
    }

    private void ensureStaffEmailAvailable(String nextEmail, String currentEmail)
    {
        if (nextEmail == null || Objects.equals(nextEmail, currentEmail))
        {
            return;
        }

        SysUser query = new SysUser();
        query.setUserName(nextEmail);
        query.setEmail(nextEmail);
        if (!sysUserService.checkUserNameUnique(query) || !sysUserService.checkEmailUnique(query))
        {
            throw new ServiceException("邮箱已存在");
        }
    }

    private SysUser ensureStaffAccount(OsgStaff staff, String operator)
    {
        SysUser account = sysUserService.selectUserByUserName(staff.getEmail());
        if (account != null)
        {
            return account;
        }

        SysUser user = new SysUser();
        user.setUserName(staff.getEmail());
        user.setNickName(normalizeAccountNickname(staff.getStaffName(), "导师"));
        user.setEmail(staff.getEmail());
        user.setPhonenumber(staff.getPhone());
        user.setPassword(SecurityUtils.encryptPassword(DEFAULT_STAFF_PASSWORD));
        user.setStatus(toSysUserStatus(staff.getAccountStatus()));
        user.setCreateBy(operator);
        user.setRemark("OSG staff auto-created account");
        if (sysUserService.insertUser(user) <= 0)
        {
            throw new ServiceException("导师账号创建失败");
        }

        account = sysUserService.selectUserByUserName(staff.getEmail());
        if (account == null)
        {
            throw new ServiceException("导师账号创建失败");
        }
        return account;
    }

    private Map<String, Object> toChangeRequestPayload(OsgStaffChangeRequest request, OsgStaff staff)
    {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("requestId", request.getRequestId());
        payload.put("staffId", request.getStaffId());
        payload.put("staffName", staff.getStaffName());
        payload.put("fieldKey", request.getFieldKey());
        payload.put("fieldLabel", request.getFieldLabel());
        payload.put("beforeValue", request.getBeforeValue());
        payload.put("afterValue", request.getAfterValue());
        payload.put("status", request.getStatus());
        payload.put("requestedBy", request.getRequestedBy());
        payload.put("reviewedAt", request.getReviewedAt());
        payload.put("remark", request.getRemark());
        return payload;
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

    private void syncStaffAccount(OsgStaff existing, OsgStaff update, String operator)
    {
        SysUser account = sysUserService.selectUserByUserName(existing.getEmail());
        if (account == null)
        {
            ensureStaffAccount(mergeExisting(existing, update), operator);
            return;
        }

        String nextEmail = defaultText(update.getEmail(), existing.getEmail());
        jdbcTemplate.update(
            """
                update sys_user
                set user_name = ?,
                    nick_name = ?,
                    email = ?,
                    phonenumber = ?,
                    status = ?,
                    update_by = ?,
                    update_time = sysdate()
                where user_id = ?
            """,
            nextEmail,
            normalizeAccountNickname(defaultText(update.getStaffName(), existing.getStaffName()), "导师"),
            nextEmail,
            defaultText(update.getPhone(), existing.getPhone()),
            toSysUserStatus(defaultText(update.getAccountStatus(), existing.getAccountStatus())),
            operator,
            account.getUserId()
        );
    }

    private OsgStaff mergeExisting(OsgStaff existing, OsgStaff update)
    {
        OsgStaff merged = new OsgStaff();
        merged.setStaffId(existing.getStaffId());
        merged.setStaffName(defaultText(update.getStaffName(), existing.getStaffName()));
        merged.setEmail(defaultText(update.getEmail(), existing.getEmail()));
        merged.setPhone(defaultText(update.getPhone(), existing.getPhone()));
        merged.setStaffType(defaultText(update.getStaffType(), existing.getStaffType()));
        merged.setMajorDirection(defaultText(update.getMajorDirection(), existing.getMajorDirection()));
        merged.setSubDirection(defaultText(update.getSubDirection(), existing.getSubDirection()));
        merged.setRegion(defaultText(update.getRegion(), existing.getRegion()));
        merged.setCity(defaultText(update.getCity(), existing.getCity()));
        merged.setHourlyRate(update.getHourlyRate() == null ? existing.getHourlyRate() : update.getHourlyRate());
        merged.setStudentCount(existing.getStudentCount());
        merged.setAccountStatus(defaultText(update.getAccountStatus(), existing.getAccountStatus()));
        return merged;
    }

    private String defaultText(String value, String fallback)
    {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String normalizeAccountNickname(String value, String fallback)
    {
        String nickname = defaultText(value, fallback);
        if (nickname.length() <= SYS_USER_NICKNAME_MAX_LENGTH)
        {
            return nickname;
        }
        return nickname.substring(0, SYS_USER_NICKNAME_MAX_LENGTH);
    }

    private void validateAccountEmail(String email)
    {
        if (email == null || email.isBlank())
        {
            return;
        }
        if (email.length() > 30)
        {
            throw new ServiceException("登录邮箱长度不能超过30个字符");
        }
    }

    private String normalizeAccountStatus(String accountStatus)
    {
        return "frozen".equals(accountStatus) ? "1" : "0";
    }

    private String toSysUserStatus(String accountStatus)
    {
        return "frozen".equals(accountStatus) ? "1" : "0";
    }
}
