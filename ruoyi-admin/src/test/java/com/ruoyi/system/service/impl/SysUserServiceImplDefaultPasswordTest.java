package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.ruoyi.common.constant.UserConstants;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.mapper.SysUserMapper;

/**
 * Bug A 修复：isUserUsingDefaultPassword 分支覆盖测试。
 *
 * 覆盖：
 * - userId null → false
 * - DB 未查到 user → false
 * - DB user.password 为 默认密码 hash → true
 * - DB user.password 为自定义密码 hash → false
 * - DB user.password 为 null → false (delegated to SecurityUtils.isUsingDefaultPassword null guard)
 */
@ExtendWith(MockitoExtension.class)
class SysUserServiceImplDefaultPasswordTest
{
    @InjectMocks
    private SysUserServiceImpl service;

    @Mock
    private SysUserMapper userMapper;

    @Test
    void returnsFalseWhenUserIdIsNull()
    {
        assertFalse(service.isUserUsingDefaultPassword(null));
    }

    @Test
    void returnsFalseWhenUserNotFound()
    {
        when(userMapper.selectUserById(99L)).thenReturn(null);
        assertFalse(service.isUserUsingDefaultPassword(99L));
    }

    @Test
    void returnsTrueWhenPasswordMatchesDefault()
    {
        SysUser user = new SysUser();
        user.setUserId(1001L);
        user.setPassword(SecurityUtils.encryptPassword(UserConstants.DEFAULT_PASSWORD));
        when(userMapper.selectUserById(1001L)).thenReturn(user);

        assertTrue(service.isUserUsingDefaultPassword(1001L));
    }

    @Test
    void returnsFalseWhenPasswordIsCustom()
    {
        SysUser user = new SysUser();
        user.setUserId(1002L);
        user.setPassword(SecurityUtils.encryptPassword("MyStrong#Pass1"));
        when(userMapper.selectUserById(1002L)).thenReturn(user);

        assertFalse(service.isUserUsingDefaultPassword(1002L));
    }

    @Test
    void returnsFalseWhenPasswordFieldIsNull()
    {
        SysUser user = new SysUser();
        user.setUserId(1003L);
        user.setPassword(null);
        when(userMapper.selectUserById(1003L)).thenReturn(user);

        assertFalse(service.isUserUsingDefaultPassword(1003L));
    }
}
