package com.ruoyi.web.controller.system;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.framework.web.service.TokenService;
import com.ruoyi.system.service.ISysUserService;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * SysProfileController 单元测试
 */
@ExtendWith(MockitoExtension.class)
class SysProfileControllerTest {

    @InjectMocks
    private SysProfileController sysProfileController;

    @Mock
    private ISysUserService userService;

    @Mock
    private TokenService tokenService;

    private SysUser testUser;
    private LoginUser loginUser;

    @BeforeEach
    void setUp() {
        testUser = new SysUser();
        testUser.setUserId(1L);
        testUser.setUserName("admin");
        testUser.setPassword("$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2"); // admin123
        testUser.setFirstLogin("1");

        loginUser = new LoginUser();
        loginUser.setUserId(1L);
        loginUser.setUser(testUser);
    }

    /**
     * 测试 updateFirstLoginPwd 接口：正确旧密码 + 合法新密码 → 成功
     */
    @Test
    void testUpdateFirstLoginPwdSuccess() {
        Map<String, String> params = new HashMap<>();
        params.put("oldPassword", "admin123");
        params.put("newPassword", "NewPass123");

        try (MockedStatic<SecurityUtils> securityUtilsMock = mockStatic(SecurityUtils.class)) {
            securityUtilsMock.when(SecurityUtils::getLoginUser).thenReturn(loginUser);
            securityUtilsMock.when(() -> SecurityUtils.matchesPassword("admin123", testUser.getPassword())).thenReturn(true);
            securityUtilsMock.when(() -> SecurityUtils.matchesPassword("NewPass123", testUser.getPassword())).thenReturn(false);
            securityUtilsMock.when(() -> SecurityUtils.encryptPassword("NewPass123")).thenReturn("$2a$10$encrypted");

            when(userService.selectUserById(1L)).thenReturn(testUser);
            when(userService.updateFirstLoginPwd(eq(1L), anyString())).thenReturn(1);

            AjaxResult result = sysProfileController.updateFirstLoginPwd(params);

            assertEquals(200, result.get("code"));
            verify(userService).updateFirstLoginPwd(eq(1L), anyString());
            verify(tokenService).setLoginUser(loginUser);
        }
    }

    /**
     * 测试 updateFirstLoginPwd 接口：错误旧密码 → 失败
     */
    @Test
    void testUpdateFirstLoginPwdWrongOldPassword() {
        Map<String, String> params = new HashMap<>();
        params.put("oldPassword", "wrongPassword");
        params.put("newPassword", "NewPass123");

        try (MockedStatic<SecurityUtils> securityUtilsMock = mockStatic(SecurityUtils.class)) {
            securityUtilsMock.when(SecurityUtils::getLoginUser).thenReturn(loginUser);
            securityUtilsMock.when(() -> SecurityUtils.matchesPassword("wrongPassword", testUser.getPassword())).thenReturn(false);

            when(userService.selectUserById(1L)).thenReturn(testUser);

            AjaxResult result = sysProfileController.updateFirstLoginPwd(params);

            assertEquals(500, result.get("code"));
            assertEquals("修改密码失败，旧密码错误", result.get("msg"));
            verify(userService, never()).updateFirstLoginPwd(anyLong(), anyString());
        }
    }

    /**
     * 测试 updateFirstLoginPwd 接口：新密码太短（< 8 位）→ 失败
     */
    @Test
    void testUpdateFirstLoginPwdPasswordTooShort() {
        Map<String, String> params = new HashMap<>();
        params.put("oldPassword", "admin123");
        params.put("newPassword", "Pass1");

        AjaxResult result = sysProfileController.updateFirstLoginPwd(params);

        assertEquals(500, result.get("code"));
        assertEquals("新密码长度必须在8-20位之间", result.get("msg"));
        verify(userService, never()).updateFirstLoginPwd(anyLong(), anyString());
    }

    /**
     * 测试 updateFirstLoginPwd 接口：新密码纯数字 → 失败
     */
    @Test
    void testUpdateFirstLoginPwdPasswordOnlyDigits() {
        Map<String, String> params = new HashMap<>();
        params.put("oldPassword", "admin123");
        params.put("newPassword", "12345678");

        AjaxResult result = sysProfileController.updateFirstLoginPwd(params);

        assertEquals(500, result.get("code"));
        assertEquals("新密码必须包含字母和数字", result.get("msg"));
        verify(userService, never()).updateFirstLoginPwd(anyLong(), anyString());
    }

    /**
     * 测试 updateFirstLoginPwd 接口：新密码纯字母 → 失败
     */
    @Test
    void testUpdateFirstLoginPwdPasswordOnlyLetters() {
        Map<String, String> params = new HashMap<>();
        params.put("oldPassword", "admin123");
        params.put("newPassword", "abcdefgh");

        AjaxResult result = sysProfileController.updateFirstLoginPwd(params);

        assertEquals(500, result.get("code"));
        assertEquals("新密码必须包含字母和数字", result.get("msg"));
        verify(userService, never()).updateFirstLoginPwd(anyLong(), anyString());
    }

    /**
     * 测试成功修改后 first_login 变为 '0'
     */
    @Test
    void testUpdateFirstLoginPwdUpdatesFirstLoginFlag() {
        Map<String, String> params = new HashMap<>();
        params.put("oldPassword", "admin123");
        params.put("newPassword", "NewPass123");

        try (MockedStatic<SecurityUtils> securityUtilsMock = mockStatic(SecurityUtils.class)) {
            securityUtilsMock.when(SecurityUtils::getLoginUser).thenReturn(loginUser);
            securityUtilsMock.when(() -> SecurityUtils.matchesPassword("admin123", testUser.getPassword())).thenReturn(true);
            securityUtilsMock.when(() -> SecurityUtils.matchesPassword("NewPass123", testUser.getPassword())).thenReturn(false);
            securityUtilsMock.when(() -> SecurityUtils.encryptPassword("NewPass123")).thenReturn("$2a$10$encrypted");

            when(userService.selectUserById(1L)).thenReturn(testUser);
            when(userService.updateFirstLoginPwd(eq(1L), anyString())).thenReturn(1);

            AjaxResult result = sysProfileController.updateFirstLoginPwd(params);

            assertEquals(200, result.get("code"));
            // 验证缓存中的 firstLogin 已更新为 '0'
            assertEquals("0", loginUser.getUser().getFirstLogin());
        }
    }
}
