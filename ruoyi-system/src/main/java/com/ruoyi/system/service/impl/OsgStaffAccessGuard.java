package com.ruoyi.system.service.impl;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.utils.StringUtils;

/**
 * 三端门禁共享守卫：黑名单 + 冻结。
 *
 * <p>顺序：[T1.1] 黑名单先短路 → [T1.2] account_status='frozen' 再短路。
 * 适用 mentor / lead-mentor / assistant 三端 AccessService 顶层。
 */
@Component
public class OsgStaffAccessGuard
{
    @Autowired
    private JdbcTemplate jdbcTemplate;

    /** 通过 email 锁定 staff_id；不存在返回 null。 */
    public Long resolveStaffIdByEmail(String email)
    {
        if (!StringUtils.hasText(email))
        {
            return null;
        }
        return jdbcTemplate.query(
            "select staff_id from osg_staff where lower(trim(email)) = lower(trim(?)) order by staff_id asc limit 1",
            ps -> ps.setString(1, email),
            rs -> rs.next() ? rs.getLong(1) : null
        );
    }

    /** [T1.1] 黑名单存在则返回 true。 */
    public boolean isBlacklisted(Long staffId)
    {
        if (staffId == null)
        {
            return false;
        }
        Integer cnt = jdbcTemplate.queryForObject(
            "select count(1) from osg_staff_blacklist where staff_id = ?",
            Integer.class,
            staffId
        );
        return cnt != null && cnt > 0;
    }

    /** [T1.2] account_status='frozen' 则返回 true。 */
    public boolean isFrozen(Long staffId)
    {
        if (staffId == null)
        {
            return false;
        }
        String status = jdbcTemplate.query(
            "select account_status from osg_staff where staff_id = ?",
            ps -> ps.setLong(1, staffId),
            rs -> rs.next() ? rs.getString(1) : null
        );
        return "frozen".equals(status);
    }

    /**
     * 顶层守卫：黑名单 OR frozen → 拒绝。
     * 顺序遵守 D1：黑名单先（语义更强），frozen 后。
     */
    public boolean isBlocked(SysUser user)
    {
        if (user == null)
        {
            return false;
        }
        Long staffId = resolveStaffIdByEmail(user.getEmail());
        if (staffId == null)
        {
            return false;
        }
        if (isBlacklisted(staffId))
        {
            return true;
        }
        return isFrozen(staffId);
    }
}
