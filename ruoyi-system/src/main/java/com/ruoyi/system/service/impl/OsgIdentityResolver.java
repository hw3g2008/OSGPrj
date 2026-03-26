package com.ruoyi.system.service.impl;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgStaff;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.OsgStaffMapper;
import com.ruoyi.system.mapper.OsgStudentMapper;
import com.ruoyi.system.service.ISysUserService;

@Component
public class OsgIdentityResolver
{
    @Autowired
    private OsgStudentMapper studentMapper;

    @Autowired
    private OsgStaffMapper staffMapper;

    @Autowired
    private ISysUserService sysUserService;

    public Long resolveStudentIdByUserId(Long userId)
    {
        OsgStudent student = resolveStudentByUserId(userId);
        return student.getStudentId();
    }

    public OsgStudent resolveStudentByUserId(Long userId)
    {
        SysUser account = requireUserAccount(userId);
        String email = resolveAccountEmail(account, "学员账号邮箱缺失，无法建立五端主链");
        OsgStudent student = studentMapper.selectStudentByEmail(email);
        if (student == null || student.getStudentId() == null)
        {
            throw new ServiceException("学员主数据不存在，无法建立五端主链");
        }
        return student;
    }

    public Long resolveUserIdByStaffId(Long staffId)
    {
        OsgStaff staff = requireStaff(staffId);
        String email = requireEmail(staff.getEmail(), "员工邮箱缺失，无法完成导师分配");
        SysUser account = resolveAccountByEmail(email);
        if (account == null || account.getUserId() == null)
        {
            throw new ServiceException("员工账号不存在，无法完成导师分配");
        }
        return account.getUserId();
    }

    public List<Long> resolveUserIdsByStaffIds(List<Long> staffIds)
    {
        if (staffIds == null || staffIds.isEmpty())
        {
            return List.of();
        }
        List<Long> userIds = new ArrayList<>(staffIds.size());
        for (Long staffId : staffIds)
        {
            userIds.add(resolveUserIdByStaffId(staffId));
        }
        return userIds;
    }

    private SysUser requireUserAccount(Long userId)
    {
        if (userId == null)
        {
            throw new ServiceException("学员账号不存在，无法建立五端主链");
        }
        SysUser account = sysUserService.selectUserById(userId);
        if (account == null)
        {
            throw new ServiceException("学员账号不存在，无法建立五端主链");
        }
        return account;
    }

    private OsgStaff requireStaff(Long staffId)
    {
        if (staffId == null)
        {
            throw new ServiceException("员工主数据不存在，无法完成导师分配");
        }
        OsgStaff staff = staffMapper.selectStaffByStaffId(staffId);
        if (staff == null)
        {
            throw new ServiceException("员工主数据不存在，无法完成导师分配");
        }
        return staff;
    }

    private String requireEmail(String value, String message)
    {
        if (!StringUtils.hasText(value))
        {
            throw new ServiceException(message);
        }
        return value.trim();
    }

    private String resolveAccountEmail(SysUser account, String message)
    {
        String email = StringUtils.hasText(account.getEmail()) ? account.getEmail().trim() : "";
        if (StringUtils.hasText(email))
        {
            return email;
        }
        return requireEmail(account.getUserName(), message);
    }

    private SysUser resolveAccountByEmail(String email)
    {
        SysUser account = sysUserService.selectUserByUserName(email);
        if (account != null)
        {
            return account;
        }

        SysUser query = new SysUser();
        query.setEmail(email);
        List<SysUser> matches = sysUserService.selectUserList(query);
        if (matches == null || matches.isEmpty())
        {
            return null;
        }
        return matches.get(0);
    }
}
