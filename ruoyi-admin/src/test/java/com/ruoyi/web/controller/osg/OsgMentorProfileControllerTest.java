package com.ruoyi.web.controller.osg;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.service.ISysUserService;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OsgMentorProfileControllerTest {

    @InjectMocks
    private OsgMentorProfileController controller;

    @Mock
    private ISysUserService userService;

    private MockedStatic<SecurityUtils> securityMock;

    @BeforeEach
    void setUp() {
        securityMock = Mockito.mockStatic(SecurityUtils.class);
        securityMock.when(SecurityUtils::getUserId).thenReturn(100L);
        securityMock.when(SecurityUtils::getUsername).thenReturn("testmentor");
    }

    @AfterEach
    void tearDown() { securityMock.close(); }

    @Test
    void testGetProfileSuccess() {
        SysUser user = new SysUser();
        user.setUserId(100L);
        user.setNickName("Jerry Li");
        user.setEmail("jerry@example.com");
        when(userService.selectUserById(100L)).thenReturn(user);

        AjaxResult result = controller.getProfile();

        assertEquals(200, result.get("code"));
        assertNotNull(result.get("data"));
        verify(userService).selectUserById(100L);
    }

    @Test
    void testGetProfileReturnsNullWhenUserNotFound() {
        when(userService.selectUserById(100L)).thenReturn(null);

        AjaxResult result = controller.getProfile();

        assertEquals(200, result.get("code"));
        assertNull(result.get("data"));
    }

    @Test
    void testUpdateProfileSuccess() {
        SysUser user = new SysUser();
        user.setNickName("Updated Name");
        when(userService.updateUser(any())).thenReturn(1);

        AjaxResult result = controller.updateProfile(user);

        assertEquals(200, result.get("code"));
        assertEquals(100L, user.getUserId());
        assertEquals("testmentor", user.getUpdateBy());
        verify(userService).updateUser(user);
    }

    @Test
    void testUpdateProfileOverwritesUserId() {
        SysUser user = new SysUser();
        user.setUserId(999L); // should be overwritten
        when(userService.updateUser(any())).thenReturn(1);

        controller.updateProfile(user);

        assertEquals(100L, user.getUserId());
    }

    @Test
    void testUpdateProfileFailure() {
        SysUser user = new SysUser();
        when(userService.updateUser(any())).thenReturn(0);

        AjaxResult result = controller.updateProfile(user);

        assertEquals(500, result.get("code"));
    }
}
