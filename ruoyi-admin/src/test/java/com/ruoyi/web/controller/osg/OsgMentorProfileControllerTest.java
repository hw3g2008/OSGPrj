package com.ruoyi.web.controller.osg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.service.ISysUserService;

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
        user.setEmail("hw3g2008@outlook.com");
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
        when(userService.updateUserProfile(any())).thenReturn(1);

        AjaxResult result = controller.updateProfile(user);

        assertEquals(200, result.get("code"));
        assertEquals(100L, user.getUserId());
        assertEquals("testmentor", user.getUpdateBy());
        verify(userService).updateUserProfile(user);
        verify(userService, never()).updateUser(any());
    }

    @Test
    void testUpdateProfileOverwritesUserId() {
        SysUser user = new SysUser();
        user.setUserId(999L); // should be overwritten

        controller.updateProfile(user);

        assertEquals(100L, user.getUserId());
    }

    @Test
    void testUpdateProfileFailure() {
        SysUser user = new SysUser();
        when(userService.updateUserProfile(any())).thenReturn(0);

        AjaxResult result = controller.updateProfile(user);

        assertEquals(500, result.get("code"));
    }

    @Test
    void testUpdateProfileRejectsNickNameLongerThanThirtyCharacters() {
        SysUser user = new SysUser();
        user.setNickName("CHAIN_20260325134448 Assistant Updated");

        AjaxResult result = controller.updateProfile(user);

        assertEquals(400, result.get("code"));
        assertEquals("用户昵称长度不能超过30个字符", result.get("msg"));
        verify(userService, never()).updateUserProfile(any());
        verify(userService, never()).updateUser(any());
    }

    @Test
    void testUpdateProfileReturnsServiceExceptionMessage() {
        SysUser user = new SysUser();
        user.setNickName("Valid Nick");
        when(userService.updateUserProfile(any())).thenThrow(new ServiceException("手机号格式不正确"));

        AjaxResult result = controller.updateProfile(user);

        assertEquals(400, result.get("code"));
        assertEquals("手机号格式不正确", result.get("msg"));
    }
}
