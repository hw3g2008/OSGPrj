package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.ruoyi.common.core.domain.entity.SysRole;
import com.ruoyi.system.mapper.SysRoleDeptMapper;
import com.ruoyi.system.mapper.SysRoleMapper;
import com.ruoyi.system.mapper.SysRoleMenuMapper;
import com.ruoyi.system.mapper.SysUserRoleMapper;

@ExtendWith(MockitoExtension.class)
class SysRoleServiceImplTest
{
    @InjectMocks
    private SysRoleServiceImpl service;

    @Mock
    private SysRoleMapper roleMapper;

    @Mock
    private SysRoleMenuMapper roleMenuMapper;

    @Mock
    private SysUserRoleMapper userRoleMapper;

    @Mock
    private SysRoleDeptMapper roleDeptMapper;

    @Test
    void insertRoleShouldDefaultStatusToActiveWhenMissing()
    {
        SysRole role = new SysRole();
        role.setRoleId(101L);
        role.setRoleName("运营专员");
        role.setRoleKey("ops_specialist");
        role.setRoleSort(1);
        role.setMenuIds(new Long[] { 100L });

        when(roleMapper.insertRole(any(SysRole.class))).thenReturn(1);
        when(roleMenuMapper.batchRoleMenu(any())).thenReturn(1);

        int rows = service.insertRole(role);

        assertEquals(1, rows);
        assertEquals("0", role.getStatus());
        verify(roleMapper).insertRole(role);
    }
}
