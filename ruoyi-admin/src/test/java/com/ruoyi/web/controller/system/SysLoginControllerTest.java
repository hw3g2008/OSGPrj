package com.ruoyi.web.controller.system;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginBody;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.framework.web.service.SysLoginService;
import com.ruoyi.framework.web.service.SysPermissionService;
import com.ruoyi.framework.web.service.TokenService;
import com.ruoyi.system.service.ISysConfigService;

import java.util.HashSet;
import java.util.Set;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.junit.jupiter.api.AfterEach;

/**
 * SysLoginController 单元测试 (T-016)
 */
@ExtendWith(MockitoExtension.class)
class SysLoginControllerTest {

    @InjectMocks
    private SysLoginController sysLoginController;

    @Mock
    private SysLoginService loginService;

    @Mock
    private SysPermissionService permissionService;

    @Mock
    private TokenService tokenService;

    @Mock
    private ISysConfigService configService;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    /**
     * 测试登录成功返回 token
     */
    @Test
    void testLoginSuccess() {
        when(loginService.login("admin", "admin123", "ABCD", "uuid-1", false))
                .thenReturn("jwt-token-123");

        LoginBody loginBody = new LoginBody();
        loginBody.setUsername("admin");
        loginBody.setPassword("admin123");
        loginBody.setCode("ABCD");
        loginBody.setUuid("uuid-1");
        loginBody.setRememberMe(false);

        AjaxResult result = sysLoginController.login(loginBody);

        assertEquals(200, result.get("code"));
        assertEquals("jwt-token-123", result.get("token"));
    }

    /**
     * 测试登录带 rememberMe=true
     */
    @Test
    void testLoginWithRememberMe() {
        when(loginService.login("admin", "admin123", "ABCD", "uuid-1", true))
                .thenReturn("jwt-token-remember");

        LoginBody loginBody = new LoginBody();
        loginBody.setUsername("admin");
        loginBody.setPassword("admin123");
        loginBody.setCode("ABCD");
        loginBody.setUuid("uuid-1");
        loginBody.setRememberMe(true);

        AjaxResult result = sysLoginController.login(loginBody);

        assertEquals(200, result.get("code"));
        verify(loginService).login("admin", "admin123", "ABCD", "uuid-1", true);
    }

    /**
     * 测试 getInfo 返回 firstLogin=true
     */
    @Test
    void testGetInfoFirstLoginTrue() {
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

        when(configService.selectConfigByKey("sys.account.initPasswordModify")).thenReturn("0");
        when(configService.selectConfigByKey("sys.account.passwordValidateDays")).thenReturn("0");

        setLoginUser(loginUser);
        when(permissionService.getRolePermission(user)).thenReturn(roles);
        when(permissionService.getMenuPermission(user)).thenReturn(permissions);

        AjaxResult result = sysLoginController.getInfo();

        assertNotNull(result);
        assertTrue(result.containsKey("firstLogin"));
        assertEquals(true, result.get("firstLogin"));
    }

    /**
     * 测试 getInfo 返回 firstLogin=false
     */
    @Test
    void testGetInfoFirstLoginFalse() {
        SysUser user = new SysUser();
        user.setUserId(1L);
        user.setFirstLogin("0");

        LoginUser loginUser = new LoginUser();
        loginUser.setUser(user);
        loginUser.setPermissions(new HashSet<>());

        Set<String> roles = new HashSet<>();
        Set<String> permissions = new HashSet<>();

        when(configService.selectConfigByKey("sys.account.initPasswordModify")).thenReturn("0");
        when(configService.selectConfigByKey("sys.account.passwordValidateDays")).thenReturn("0");

        setLoginUser(loginUser);
        when(permissionService.getRolePermission(user)).thenReturn(roles);
        when(permissionService.getMenuPermission(user)).thenReturn(permissions);

        AjaxResult result = sysLoginController.getInfo();

        assertEquals(false, result.get("firstLogin"));
    }

    /**
     * 测试 getInfo 返回 firstLogin=false 当字段为 null
     */
    @Test
    void testGetInfoFirstLoginNull() {
        SysUser user = new SysUser();
        user.setUserId(1L);
        user.setFirstLogin(null);

        LoginUser loginUser = new LoginUser();
        loginUser.setUser(user);
        loginUser.setPermissions(new HashSet<>());

        when(configService.selectConfigByKey("sys.account.initPasswordModify")).thenReturn("0");
        when(configService.selectConfigByKey("sys.account.passwordValidateDays")).thenReturn("0");

        setLoginUser(loginUser);
        when(permissionService.getRolePermission(user)).thenReturn(new HashSet<>());
        when(permissionService.getMenuPermission(user)).thenReturn(new HashSet<>());

        AjaxResult result = sysLoginController.getInfo();

        assertEquals(false, result.get("firstLogin"));
    }

    private void setLoginUser(LoginUser loginUser) {
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                loginUser,
                null,
                Collections.emptyList()
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
