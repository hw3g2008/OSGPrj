package com.ruoyi.web.controller.osg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

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
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.service.IPositionService;

@ExtendWith(MockitoExtension.class)
class OsgApplicationControllerTest
{
    private static final Long FIXED_USER_ID = 100L;

    @InjectMocks
    private OsgApplicationController controller;

    @Mock
    private IPositionService positionService;

    private MockedStatic<SecurityUtils> securityMock;

    @BeforeEach
    void setUp()
    {
        securityMock = Mockito.mockStatic(SecurityUtils.class);
        SysUser user = new SysUser();
        user.setUserId(FIXED_USER_ID);
        LoginUser loginUser = new LoginUser(FIXED_USER_ID, null, user, java.util.Collections.emptySet());
        securityMock.when(SecurityUtils::getLoginUser).thenReturn(loginUser);
    }

    @AfterEach
    void tearDown()
    {
        securityMock.close();
    }

    @Test
    void createCoaching_happyPath_invokesServiceWithApplicationId()
    {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("interviewStage", "first");
        body.put("interviewTime", "2026-04-01T10:30");
        body.put("requestedMentorCount", "2");

        AjaxResult result = controller.createCoaching(9001L, body);

        assertEquals(200, result.get("code"));
        verify(positionService).requestApplicationCoaching(eq(9001L), eq(body), eq(FIXED_USER_ID));
    }

    @Test
    void updateCoaching_happyPath_invokesServiceWithApplicationAndCoachingId()
    {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("interviewTime", "2026-04-02T11:00");
        body.put("companyInterviewer", "John VP");

        AjaxResult result = controller.updateCoaching(9001L, 7003L, body);

        assertEquals(200, result.get("code"));
        verify(positionService).updateApplicationCoaching(eq(9001L), eq(7003L), eq(body), eq(FIXED_USER_ID));
    }

    @Test
    void classRecords_happyPath_invokesServiceWithApplicationAndCoachingId()
    {
        AjaxResult result = controller.classRecords(9001L, 7003L);

        assertEquals(200, result.get("code"));
        verify(positionService).selectApplicationCoachingClassRecords(eq(9001L), eq(7003L), eq(FIXED_USER_ID));
    }
}
