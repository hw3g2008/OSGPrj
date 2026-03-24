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
import static org.mockito.Mockito.times;
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
class OsgAssistantAccessServiceTest
{
    @InjectMocks
    private OsgAssistantAccessService service;

    @Mock
    private ISysUserService userService;

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void findUserByLoginReturnsUserNameMatchBeforeEmailLookup()
    {
        SysUser user = new SysUser();
        user.setUserId(920L);
        when(userService.selectUserByUserName("assistant_demo")).thenReturn(user);

        SysUser result = service.findUserByLogin("assistant_demo");

        assertSame(user, result);
        verify(jdbcTemplate, never()).query(anyString(), any(PreparedStatementSetter.class), any(ResultSetExtractor.class));
    }

    @Test
    void findUserByLoginFallsBackToEmailLookup()
    {
        SysUser user = new SysUser();
        user.setUserId(921L);
        when(userService.selectUserByUserName("assistant@example.com")).thenReturn(null);
        when(jdbcTemplate.query(
                anyString(),
                any(PreparedStatementSetter.class),
                any(ResultSetExtractor.class)))
                .thenReturn(921L);
        when(userService.selectUserById(921L)).thenReturn(user);

        SysUser result = service.findUserByLogin("assistant@example.com");

        assertSame(user, result);
        verify(userService).selectUserById(921L);
    }

    @Test
    void findUserByLoginReturnsNullForBlankLogin()
    {
        assertNull(service.findUserByLogin("   "));
    }

    @Test
    void hasAssistantAccessReturnsTrueForAssistantStaff()
    {
        SysUser user = activeUser(922L);
        user.setEmail("assistant@example.com");
        when(jdbcTemplate.queryForObject(contains("from osg_staff"), eq(Integer.class), eq("assistant@example.com"))).thenReturn(1);

        assertTrue(service.hasAssistantAccess(user));
    }

    @Test
    void hasAssistantAccessReturnsTrueForAssistantOwnership()
    {
        SysUser user = activeUser(923L);
        user.setEmail("assistant@example.com");
        when(jdbcTemplate.queryForObject(contains("from osg_staff"), eq(Integer.class), eq("assistant@example.com"))).thenReturn(0);
        when(jdbcTemplate.queryForObject(contains("from osg_student"), eq(Integer.class), eq(923L))).thenReturn(1);

        assertTrue(service.hasAssistantAccess(user));
        verify(jdbcTemplate).queryForObject(contains("assistant_id = ?"), eq(Integer.class), eq(923L));
        verify(jdbcTemplate, never()).queryForObject(contains("del_flag"), eq(Integer.class), eq(923L));
    }

    @Test
    void hasAssistantAccessReturnsFalseForInactiveUser()
    {
        SysUser user = activeUser(924L);
        user.setStatus("1");

        assertFalse(service.hasAssistantAccess(user));
    }

    @Test
    void buildPortalRolesReturnsAssistantAndAdminForAdminUser()
    {
        SysUser user = activeUser(1L);

        assertEquals(Set.of("assistant", "admin"), service.buildPortalRoles(user));
    }

    @Test
    void buildPortalRolesReturnsEmptySetWhenUserHasNoAssistantAccess()
    {
        SysUser user = activeUser(925L);
        user.setEmail("assistant@example.com");
        when(jdbcTemplate.queryForObject(contains("from osg_staff"), eq(Integer.class), eq("assistant@example.com"))).thenReturn(0);
        when(jdbcTemplate.queryForObject(contains("from osg_student"), eq(Integer.class), eq(925L))).thenReturn(0);

        assertEquals(Set.of(), service.buildPortalRoles(user));
    }

    private SysUser activeUser(Long userId)
    {
        SysUser user = new SysUser();
        user.setUserId(userId);
        user.setUserName("assistant_demo");
        user.setStatus("0");
        user.setDelFlag("0");
        return user;
    }
}
