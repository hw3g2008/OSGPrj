package com.ruoyi.web.controller.system;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.framework.web.service.SysPermissionService;
import com.ruoyi.framework.web.service.TokenService;
import com.ruoyi.system.service.ISysConfigService;
import org.mockito.MockedStatic;

import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * SysLoginController 单元测试
 */
@ExtendWith(MockitoExtension.class)
class SysLoginControllerTest {

    @InjectMocks
    private SysLoginController sysLoginController;

    @Mock
    private SysPermissionService permissionService;

    @Mock
    private TokenService tokenService;

    @Mock
    private ISysConfigService configService;

    /**
     * 测试 getInfo 接口返回的 JSON 中包含 firstLogin 字段
     */
    @Test
    void testGetInfoContainsFirstLogin() {
        // 准备测试数据
        SysUser user = new SysUser();
        user.setUserId(1L);
        user.setUserName("admin");
        user.setFirstLogin("1");

        LoginUser loginUser = new LoginUser();
        loginUser.setUser(user);
        loginUser.setPermissions(new HashSet<>());

        Set<String> roles = new HashSet<>();
        roles.add("admin");
        Set<String> permissions = new HashSet<>();
        permissions.add("*:*:*");

        // Mock configService
        when(configService.selectConfigByKey("sys.account.initPasswordModify")).thenReturn("0");
        when(configService.selectConfigByKey("sys.account.passwordValidateDays")).thenReturn("0");

        // Mock 静态方法
        try (MockedStatic<SecurityUtils> securityUtilsMock = mockStatic(SecurityUtils.class)) {
            securityUtilsMock.when(SecurityUtils::getLoginUser).thenReturn(loginUser);
            when(permissionService.getRolePermission(user)).thenReturn(roles);
            when(permissionService.getMenuPermission(user)).thenReturn(permissions);

            // 执行测试
            AjaxResult result = sysLoginController.getInfo();

            // 验证结果
            assertNotNull(result);
            assertTrue(result.containsKey("firstLogin"));
            assertEquals(true, result.get("firstLogin"));
        }
    }

    /**
     * 测试 getInfo 接口 - firstLogin 为 '0' 时返回 false
     */
    @Test
    void testGetInfoFirstLoginFalse() {
        // 准备测试数据
        SysUser user = new SysUser();
        user.setUserId(1L);
        user.setUserName("admin");
        user.setFirstLogin("0");

        LoginUser loginUser = new LoginUser();
        loginUser.setUser(user);
        loginUser.setPermissions(new HashSet<>());

        Set<String> roles = new HashSet<>();
        Set<String> permissions = new HashSet<>();

        // Mock configService
        when(configService.selectConfigByKey("sys.account.initPasswordModify")).thenReturn("0");
        when(configService.selectConfigByKey("sys.account.passwordValidateDays")).thenReturn("0");

        // Mock 静态方法
        try (MockedStatic<SecurityUtils> securityUtilsMock = mockStatic(SecurityUtils.class)) {
            securityUtilsMock.when(SecurityUtils::getLoginUser).thenReturn(loginUser);
            when(permissionService.getRolePermission(user)).thenReturn(roles);
            when(permissionService.getMenuPermission(user)).thenReturn(permissions);

            // 执行测试
            AjaxResult result = sysLoginController.getInfo();

            // 验证结果
            assertNotNull(result);
            assertTrue(result.containsKey("firstLogin"));
            assertEquals(false, result.get("firstLogin"));
        }
    }
}
