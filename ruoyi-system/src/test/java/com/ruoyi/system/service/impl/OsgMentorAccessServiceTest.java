package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.system.service.ISysUserService;

/**
 * T1.1 + T1.2：mentor 端访问守卫顶层短路。
 */
@ExtendWith(MockitoExtension.class)
class OsgMentorAccessServiceTest
{
    @InjectMocks
    private OsgMentorAccessService service;

    @Mock
    private ISysUserService userService;

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private OsgStaffAccessGuard staffAccessGuard;

    private SysUser activeUser(Long userId)
    {
        SysUser u = new SysUser();
        u.setUserId(userId);
        u.setStatus("0");
        u.setDelFlag("0");
        u.setEmail("m@osg.com");
        return u;
    }

    @Test
    void hasMentorAccess_blockedByGuard_returnsFalse_evenForAdmin()
    {
        SysUser admin = activeUser(1L); // userId=1 → admin
        when(staffAccessGuard.isBlocked(admin)).thenReturn(true);
        assertFalse(service.hasMentorAccess(admin));
    }

    @Test
    void hasMentorAccess_passesWhenNotBlockedAndAdmin()
    {
        SysUser admin = activeUser(1L);
        when(staffAccessGuard.isBlocked(admin)).thenReturn(false);
        assertTrue(service.hasMentorAccess(admin));
    }

    @Test
    void hasMentorAccess_passesWhenNotBlockedAndHasMentorStaff()
    {
        SysUser u = activeUser(100L);
        when(staffAccessGuard.isBlocked(u)).thenReturn(false);
        lenient().when(jdbcTemplate.queryForObject(any(String.class), any(Class.class), any(Object[].class)))
            .thenReturn(1);
        assertTrue(service.hasMentorAccess(u));
    }
}
