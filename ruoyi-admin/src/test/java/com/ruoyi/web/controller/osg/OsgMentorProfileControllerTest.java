package com.ruoyi.web.controller.osg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.LinkedHashMap;
import java.util.Map;

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
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.service.ISysUserService;
import com.ruoyi.system.service.impl.OsgMentorProfileChangeRequestServiceImpl;

@ExtendWith(MockitoExtension.class)
class OsgMentorProfileControllerTest
{
    @InjectMocks
    private OsgMentorProfileController controller;

    @Mock
    private ISysUserService userService;

    @Mock
    private OsgMentorProfileChangeRequestServiceImpl mentorProfileChangeRequestService;

    private MockedStatic<SecurityUtils> securityMock;

    @BeforeEach
    void setUp()
    {
        securityMock = Mockito.mockStatic(SecurityUtils.class);
        securityMock.when(SecurityUtils::getUserId).thenReturn(100L);
        securityMock.when(SecurityUtils::getUsername).thenReturn("testmentor");
    }

    @AfterEach
    void tearDown()
    {
        securityMock.close();
    }

    @Test
    void testGetProfileSuccess()
    {
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
    void testGetProfileReturnsNullWhenUserNotFound()
    {
        when(userService.selectUserById(100L)).thenReturn(null);

        AjaxResult result = controller.getProfile();

        assertEquals(200, result.get("code"));
        assertNull(result.get("data"));
    }

    @Test
    void testUpdateProfileSuccess()
    {
        SysUser currentUser = new SysUser();
        currentUser.setUserId(100L);
        currentUser.setNickName("Jerry Li");
        when(userService.selectUserById(100L)).thenReturn(currentUser);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("nickName", "Updated Name");
        payload.put("city", "Shanghai");

        Map<String, Object> changeRequest = new LinkedHashMap<>();
        changeRequest.put("requestId", 9001L);
        changeRequest.put("status", "pending");

        when(mentorProfileChangeRequestService.submitChangeRequest(eq(currentUser), eq("testmentor"), eq(payload)))
            .thenReturn(changeRequest);

        AjaxResult result = controller.updateProfile(payload);

        assertEquals(200, result.get("code"));
        assertEquals("保存成功！后台文员已收到您的信息变更通知。", result.get("msg"));
        assertEquals(changeRequest, result.get("data"));
        verify(mentorProfileChangeRequestService).submitChangeRequest(currentUser, "testmentor", payload);
    }

    @Test
    void testUpdateProfileRejectsNickNameLongerThanThirtyCharacters()
    {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("nickName", "CHAIN_20260325134448 Assistant Updated");

        AjaxResult result = controller.updateProfile(payload);

        assertEquals(400, result.get("code"));
        assertEquals("用户昵称长度不能超过30个字符", result.get("msg"));
        verify(userService, never()).selectUserById(any());
        verify(mentorProfileChangeRequestService, never()).submitChangeRequest(any(), any(), any());
    }

    @Test
    void testUpdateProfileReturnsServiceExceptionMessage()
    {
        SysUser currentUser = new SysUser();
        currentUser.setUserId(100L);
        when(userService.selectUserById(100L)).thenReturn(currentUser);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("nickName", "Valid Nick");

        when(mentorProfileChangeRequestService.submitChangeRequest(eq(currentUser), eq("testmentor"), eq(payload)))
            .thenThrow(new ServiceException("手机号格式不正确"));

        AjaxResult result = controller.updateProfile(payload);

        assertEquals(400, result.get("code"));
        assertEquals("手机号格式不正确", result.get("msg"));
    }
}
