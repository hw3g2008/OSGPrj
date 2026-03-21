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
 * Resolves whether a system account can access the lead-mentor portal.
 */
@Service
public class OsgLeadMentorAccessService
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

    public boolean hasLeadMentorAccess(SysUser user)
    {
        return isActiveUser(user)
                && (user.isAdmin() || hasClerkRole(user) || hasActiveLeadMentorStaff(user.getEmail()) || hasLeadMentorBusinessOwnership(user.getUserId()));
    }

    public Set<String> buildPortalRoles(SysUser user)
    {
        if (!hasLeadMentorAccess(user))
        {
            return Collections.emptySet();
        }

        LinkedHashSet<String> roles = new LinkedHashSet<>();
        roles.add("lead-mentor");
        if (user.isAdmin())
        {
            roles.add("admin");
        }
        return roles;
    }

    private boolean hasClerkRole(SysUser user)
    {
        Long userId = user.getUserId();
        if (userId == null)
        {
            return false;
        }

        Integer count = jdbcTemplate.queryForObject(
            """
                select count(1)
                from sys_user_role ur
                inner join sys_role r on r.role_id = ur.role_id
                where ur.user_id = ?
                  and r.role_key = 'clerk'
                  and r.status = '0'
                  and r.del_flag = '0'
                """,
            Integer.class,
            userId
        );
        return count != null && count > 0;
    }

    private boolean isActiveUser(SysUser user)
    {
        return user != null
                && "0".equals(StringUtils.defaultIfBlank(user.getStatus(), "0"))
                && "0".equals(StringUtils.defaultIfBlank(user.getDelFlag(), "0"));
    }

    private boolean hasActiveLeadMentorStaff(String email)
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
                  and staff_type = 'lead_mentor'
                  and (account_status is null or account_status <> 'frozen')
                """,
            Integer.class,
            email
        );
        return count != null && count > 0;
    }

    private boolean hasLeadMentorBusinessOwnership(Long userId)
    {
        if (userId == null)
        {
            return false;
        }

        return exists("select count(1) from osg_student where del_flag = '0' and lead_mentor_id = ?", userId)
                || exists("select count(1) from osg_job_application where del_flag = '0' and lead_mentor_id = ?", userId);
    }

    private boolean exists(String sql, Object... args)
    {
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, args);
        return count != null && count > 0;
    }
}
