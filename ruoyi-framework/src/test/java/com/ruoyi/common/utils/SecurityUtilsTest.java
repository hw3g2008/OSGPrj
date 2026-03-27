package com.ruoyi.common.utils;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import com.ruoyi.common.constant.Constants;
import com.ruoyi.common.core.domain.entity.SysRole;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;

class SecurityUtilsTest
{
    @AfterEach
    void clearContext()
    {
        SecurityContextHolder.clearContext();
    }

    @Test
    void isAdminShouldTreatSuperAdminRoleAsAdministratorEvenWhenUserIdIsNotOne()
    {
        SysRole role = new SysRole();
        role.setRoleId(1L);
        role.setRoleKey("super_admin");
        role.setStatus("0");

        SysUser user = new SysUser();
        user.setUserId(1005L);
        user.setUserName("osg_admin");
        user.setRoles(List.of(role));

        LoginUser loginUser = new LoginUser(1005L, 1L, user, Set.of(Constants.ALL_PERMISSION));
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(loginUser, null, List.of()));

        assertTrue(SecurityUtils.isAdmin());
        assertTrue(SecurityUtils.isAdmin(1005L));
    }

    @Test
    void isAdminShouldRemainFalseForNonAdminRoleWhenUserIdIsNotOne()
    {
        SysRole role = new SysRole();
        role.setRoleId(2L);
        role.setRoleKey("clerk");
        role.setStatus("0");

        SysUser user = new SysUser();
        user.setUserId(1005L);
        user.setUserName("clerk_user");
        user.setRoles(List.of(role));

        LoginUser loginUser = new LoginUser(1005L, 1L, user, Set.of("system:role:list"));
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(loginUser, null, List.of()));

        assertFalse(SecurityUtils.isAdmin());
        assertFalse(SecurityUtils.isAdmin(1005L));
    }
}
