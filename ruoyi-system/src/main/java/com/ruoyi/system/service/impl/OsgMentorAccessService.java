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
 * Resolves whether a system account can access the mentor portal.
 */
@Service
public class OsgMentorAccessService
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

    public boolean hasMentorAccess(SysUser user)
    {
        return isActiveUser(user) && (user.isAdmin() || hasMentorRole(user));
    }

    public Set<String> buildPortalRoles(SysUser user)
    {
        if (!isActiveUser(user))
        {
            return Collections.emptySet();
        }

        LinkedHashSet<String> roles = new LinkedHashSet<>();
        if (hasMentorRole(user))
        {
            roles.add("mentor");
        }
        if (user.isAdmin())
        {
            roles.add("admin");
        }
        return roles;
    }

    private boolean hasMentorRole(SysUser user)
    {
        Long userId = user.getUserId();
        if (userId == null)
        {
            return false;
        }
        return hasActiveMentorStaff(user.getEmail()) || hasMentorBusinessOwnership(userId);
    }

    private boolean isActiveUser(SysUser user)
    {
        return user != null
                && "0".equals(StringUtils.defaultIfBlank(user.getStatus(), "0"))
                && "0".equals(StringUtils.defaultIfBlank(user.getDelFlag(), "0"));
    }

    private boolean hasActiveMentorStaff(String email)
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
                  and staff_type = 'mentor'
                  and (account_status is null or account_status <> 'frozen')
                """,
            Integer.class,
            email
        );
        return count != null && count > 0;
    }

    private boolean hasMentorBusinessOwnership(Long userId)
    {
        return exists("select count(1) from osg_job_coaching where del_flag = '0' and mentor_id = ?", userId)
                || exists("select count(1) from osg_class_record where del_flag = '0' and mentor_id = ?", userId)
                || exists("select count(1) from osg_mentor_schedule where del_flag = '0' and mentor_id = ?", userId)
                || exists("select count(1) from osg_mock_practice where del_flag = '0' and find_in_set(?, mentor_ids)", String.valueOf(userId));
    }

    private boolean exists(String sql, Object... args)
    {
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, args);
        return count != null && count > 0;
    }
}
