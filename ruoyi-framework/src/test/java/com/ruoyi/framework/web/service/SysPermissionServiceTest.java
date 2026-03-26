package com.ruoyi.framework.web.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.ruoyi.common.constant.Constants;
import com.ruoyi.common.core.domain.entity.SysRole;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.system.service.ISysMenuService;
import com.ruoyi.system.service.ISysRoleService;

@ExtendWith(MockitoExtension.class)
class SysPermissionServiceTest
{
    @InjectMocks
    private SysPermissionService permissionService;

    @Mock
    private ISysRoleService roleService;

    @Mock
    private ISysMenuService menuService;

    @Test
    void getMenuPermissionTreatsSuperAdminRoleAsAllPermissions()
    {
        SysRole role = new SysRole();
        role.setRoleId(1L);
        role.setRoleKey("super_admin");
        role.setStatus("0");

        SysUser user = new SysUser();
        user.setUserId(1005L);
        user.setRoles(List.of(role));

        Set<String> permissions = permissionService.getMenuPermission(user);

        assertEquals(Set.of(Constants.ALL_PERMISSION), permissions);
        verifyNoInteractions(menuService);
    }

    @Test
    void getRolePermissionKeepsExplicitSuperAdminRoleKey()
    {
        SysRole role = new SysRole();
        role.setRoleId(1L);
        role.setRoleKey("super_admin");
        role.setStatus("0");

        SysUser user = new SysUser();
        user.setUserId(1005L);
        user.setRoles(List.of(role));

        when(roleService.selectRolePermissionByUserId(1005L)).thenReturn(Set.of("super_admin"));

        Set<String> roles = permissionService.getRolePermission(user);

        assertTrue(roles.contains("super_admin"));
    }
}
