package com.ruoyi.system.service.impl;

import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.service.ISysUserService;

/**
 * Resolves whether a system account can access the assistant portal.
 */
@Service
public class OsgAssistantAccessService
{
    @Autowired
    private ISysUserService userService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    public SysUser findUserByLogin(String login)
    {
        if (!StringUtils.hasText(login))
        {
            return null;
        }

        String normalizedLogin = login.trim();
        SysUser user = userService.selectUserByUserName(normalizedLogin);
        if (user != null)
        {
            return user;
        }

        Long userId = jdbcTemplate.query(
            "select user_id from sys_user where email = ? and del_flag = '0' order by user_id asc limit 1",
            ps -> ps.setString(1, normalizedLogin),
            rs -> rs.next() ? rs.getLong("user_id") : null
        );
        return userId == null ? null : userService.selectUserById(userId);
    }

    public boolean hasAssistantAccess(SysUser user)
    {
        return isActiveUser(user) && (user.isAdmin() || hasActiveAssistantStaff(user.getEmail()) || hasAssistantOwnership(user.getUserId()));
    }

    public Set<String> buildPortalRoles(SysUser user)
    {
        if (!hasAssistantAccess(user))
        {
            return Collections.emptySet();
        }

        LinkedHashSet<String> roles = new LinkedHashSet<>();
        roles.add("assistant");
        if (user.isAdmin())
        {
            roles.add("admin");
        }
        return roles;
    }

    private boolean isActiveUser(SysUser user)
    {
        return user != null
                && "0".equals(StringUtils.defaultIfBlank(user.getStatus(), "0"))
                && "0".equals(StringUtils.defaultIfBlank(user.getDelFlag(), "0"));
    }

    private boolean hasActiveAssistantStaff(String email)
    {
        if (!StringUtils.hasText(email))
        {
            return false;
        }

        Integer count = jdbcTemplate.queryForObject(
            """
                select count(1)
                from osg_staff
                where email = ?
                  and staff_type = 'assistant'
                  and (account_status is null or account_status <> 'frozen')
                """,
            Integer.class,
            email
        );
        return count != null && count > 0;
    }

    private boolean hasAssistantOwnership(Long userId)
    {
        if (userId == null)
        {
            return false;
        }

        Integer count = jdbcTemplate.queryForObject(
            "select count(1) from osg_student where assistant_id = ?",
            Integer.class,
            userId
        );
        return count != null && count > 0;
    }
}
