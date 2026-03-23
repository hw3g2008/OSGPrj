package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Set;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.PreparedStatementSetter;
import org.springframework.jdbc.core.ResultSetExtractor;

import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.system.service.ISysUserService;

@ExtendWith(MockitoExtension.class)
class OsgLeadMentorAccessServiceTest
{
    @InjectMocks
    private OsgLeadMentorAccessService service;

    @Mock
    private ISysUserService userService;

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void findUserByLoginReturnsUserNameMatchBeforeEmailLookup()
    {
        SysUser user = new SysUser();
        user.setUserId(820L);
        when(userService.selectUserByUserName("leadmentor_demo")).thenReturn(user);

        SysUser result = service.findUserByLogin("leadmentor_demo");

        assertSame(user, result);
        verify(jdbcTemplate, never()).query(anyString(), any(PreparedStatementSetter.class), any(ResultSetExtractor.class));
    }

    @Test
    void findUserByLoginFallsBackToEmailLookup()
    {
        SysUser user = new SysUser();
        user.setUserId(821L);
        when(userService.selectUserByUserName("leadmentor@example.com")).thenReturn(null);
        when(jdbcTemplate.query(
                anyString(),
                any(PreparedStatementSetter.class),
                any(ResultSetExtractor.class)))
                .thenReturn(821L);
        when(userService.selectUserById(821L)).thenReturn(user);

        SysUser result = service.findUserByLogin("leadmentor@example.com");

        assertSame(user, result);
        verify(userService).selectUserById(821L);
    }

    @Test
    void findUserByLoginReturnsNullForBlankLogin()
    {
        assertNull(service.findUserByLogin("   "));
    }

    @Test
    void hasLeadMentorAccessReturnsTrueForClerkRole()
    {
        SysUser user = activeUser(822L);
        when(jdbcTemplate.queryForObject(contains("from sys_user_role"), eq(Integer.class), eq(822L))).thenReturn(1);

        assertTrue(service.hasLeadMentorAccess(user));
    }

    @Test
    void hasLeadMentorAccessReturnsTrueForLeadMentorStaff()
    {
        SysUser user = activeUser(823L);
        user.setEmail("leadmentor@example.com");
        when(jdbcTemplate.queryForObject(contains("from sys_user_role"), eq(Integer.class), eq(823L))).thenReturn(0);
        when(jdbcTemplate.queryForObject(contains("from osg_staff"), eq(Integer.class), eq("leadmentor@example.com"))).thenReturn(1);

        assertTrue(service.hasLeadMentorAccess(user));
    }

    @Test
    void hasLeadMentorAccessReturnsTrueForLeadMentorOwnership()
    {
        SysUser user = activeUser(824L);
        user.setEmail("leadmentor@example.com");
        when(jdbcTemplate.queryForObject(contains("from sys_user_role"), eq(Integer.class), eq(824L))).thenReturn(0);
        when(jdbcTemplate.queryForObject(contains("from osg_staff"), eq(Integer.class), eq("leadmentor@example.com"))).thenReturn(0);
        when(jdbcTemplate.queryForObject(contains("from osg_student"), eq(Integer.class), eq(824L))).thenReturn(1);

        assertTrue(service.hasLeadMentorAccess(user));
    }

    @Test
    void hasLeadMentorAccessUsesCurrentBusinessOwnershipSchemaQueries()
    {
        SysUser user = activeUser(826L);
        when(jdbcTemplate.queryForObject(contains("from sys_user_role"), eq(Integer.class), eq(826L))).thenReturn(0);
        when(jdbcTemplate.queryForObject(contains("from osg_student where lead_mentor_id = ?"), eq(Integer.class), eq(826L)))
                .thenReturn(0);
        when(jdbcTemplate.queryForObject(contains("from osg_job_application where lead_mentor_id = ?"), eq(Integer.class), eq(826L)))
                .thenReturn(0);

        assertFalse(service.hasLeadMentorAccess(user));

        verify(jdbcTemplate).queryForObject(contains("from osg_student where lead_mentor_id = ?"), eq(Integer.class), eq(826L));
        verify(jdbcTemplate).queryForObject(contains("from osg_job_application where lead_mentor_id = ?"), eq(Integer.class), eq(826L));
    }

    @Test
    void hasLeadMentorAccessReturnsFalseForInactiveUser()
    {
        SysUser user = activeUser(825L);
        user.setStatus("1");

        assertFalse(service.hasLeadMentorAccess(user));
    }

    @Test
    void buildPortalRolesReturnsLeadMentorAndAdminForAdminUser()
    {
        SysUser user = activeUser(1L);

        assertEquals(Set.of("lead-mentor", "admin"), service.buildPortalRoles(user));
    }

    private SysUser activeUser(Long userId)
    {
        SysUser user = new SysUser();
        user.setUserId(userId);
        user.setUserName("leadmentor_demo");
        user.setStatus("0");
        user.setDelFlag("0");
        return user;
    }
}
