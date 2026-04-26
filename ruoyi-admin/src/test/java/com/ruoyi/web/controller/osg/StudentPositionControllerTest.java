package com.ruoyi.web.controller.osg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import java.util.HashMap;
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
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.service.IPositionService;

@ExtendWith(MockitoExtension.class)
class StudentPositionControllerTest
{
    private static final Long FIXED_USER_ID = 100L;

    @InjectMocks
    private StudentPositionController controller;

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

    // ===== favorite =====

    @Test
    void favorite_happyPath_invokesService()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("positionId", 285);
        body.put("favorited", true);

        AjaxResult result = controller.favorite(body);

        assertEquals(200, result.get("code"));
        verify(positionService).updateFavoriteStatus(eq(285L), eq(Boolean.TRUE), eq(FIXED_USER_ID));
    }

    @Test
    void favorite_missingPositionId_throwsFriendlyException()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("favorited", true);

        ServiceException ex = assertThrows(ServiceException.class, () -> controller.favorite(body));
        assertEquals("请选择岗位", ex.getMessage());
        verifyNoInteractions(positionService);
    }

    @Test
    void favorite_missingFavorited_throwsFriendlyException()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("positionId", 285);

        ServiceException ex = assertThrows(ServiceException.class, () -> controller.favorite(body));
        assertEquals("请提供收藏状态", ex.getMessage());
        verifyNoInteractions(positionService);
    }

    // ===== apply =====

    @Test
    void apply_happyPath_invokesService()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("positionId", 285);
        body.put("applied", true);
        body.put("date", "2026-04-26");
        body.put("method", "online");
        body.put("note", "ok");

        AjaxResult result = controller.apply(body);

        assertEquals(200, result.get("code"));
        verify(positionService).updateApplyStatus(eq(285L), eq(Boolean.TRUE), eq("2026-04-26"), eq("online"), eq("ok"), eq(FIXED_USER_ID));
    }

    @Test
    void apply_missingPositionId_throwsFriendlyException()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("applied", true);

        ServiceException ex = assertThrows(ServiceException.class, () -> controller.apply(body));
        assertEquals("请选择岗位", ex.getMessage());
        verifyNoInteractions(positionService);
    }

    @Test
    void apply_missingApplied_throwsFriendlyException()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("positionId", 285);

        ServiceException ex = assertThrows(ServiceException.class, () -> controller.apply(body));
        assertEquals("请提供投递状态", ex.getMessage());
        verifyNoInteractions(positionService);
    }

    // ===== progress =====

    @Test
    void progress_happyPath_invokesService()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("positionId", 285);
        body.put("stage", "applied");
        body.put("notes", "moved to applied");

        AjaxResult result = controller.progress(body);

        assertEquals(200, result.get("code"));
        verify(positionService).insertProgress(eq(285L), eq("applied"), eq("moved to applied"), eq(FIXED_USER_ID));
    }

    @Test
    void progress_missingPositionId_throwsFriendlyException()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("stage", "applied");
        body.put("notes", "x");

        ServiceException ex = assertThrows(ServiceException.class, () -> controller.progress(body));
        assertEquals("请选择岗位", ex.getMessage());
        verifyNoInteractions(positionService);
    }

    @Test
    void progress_missingStage_throwsFriendlyException()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("positionId", 285);
        body.put("notes", "x");

        ServiceException ex = assertThrows(ServiceException.class, () -> controller.progress(body));
        assertEquals("请选择申请阶段", ex.getMessage());
        verifyNoInteractions(positionService);
    }

    @Test
    void progress_missingNotes_isAccepted()
    {
        // notes is optional in the service layer (defaultString tolerates null)
        Map<String, Object> body = new HashMap<>();
        body.put("positionId", 285);
        body.put("stage", "applied");

        AjaxResult result = controller.progress(body);

        assertEquals(200, result.get("code"));
        verify(positionService).insertProgress(eq(285L), eq("applied"), eq(null), eq(FIXED_USER_ID));
    }

    // ===== coaching =====

    @Test
    void coaching_happyPath_invokesService()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("positionId", 285);
        body.put("stage", "interview");
        body.put("mentorCount", "1");
        body.put("note", "need help");

        AjaxResult result = controller.coaching(body);

        assertEquals(200, result.get("code"));
        verify(positionService).requestCoaching(eq(285L), eq("interview"), eq("1"), eq("need help"), eq(FIXED_USER_ID));
    }

    @Test
    void coaching_missingPositionId_throwsFriendlyException()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("stage", "interview");
        body.put("mentorCount", "1");

        ServiceException ex = assertThrows(ServiceException.class, () -> controller.coaching(body));
        assertEquals("请选择岗位", ex.getMessage());
        verifyNoInteractions(positionService);
    }

    @Test
    void coaching_extendedHirevueBody_invokesExtendedOverload()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("positionId", 285);
        body.put("stage", "hirevue");
        body.put("hirevueType", "vi");
        body.put("viLink", "https://hirevue.example.com/abc");
        body.put("hirevueDeadline", "2026-03-30T15:00");
        body.put("inviteScreenshotName", "invite.png");
        body.put("mentorHelp", "yes");
        body.put("note", "希望尽快安排");

        AjaxResult result = controller.coaching(body);

        assertEquals(200, result.get("code"));
        verify(positionService).requestCoaching(eq(285L), eq(body), eq(FIXED_USER_ID));
    }

    @Test
    void coaching_extendedRegularBody_invokesExtendedOverload()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("positionId", 285);
        body.put("stage", "first");
        body.put("interviewTime", "2026-04-01T10:30");
        body.put("mentorCount", "2");
        body.put("preferMentor", "Jerry Li");

        AjaxResult result = controller.coaching(body);

        assertEquals(200, result.get("code"));
        verify(positionService).requestCoaching(eq(285L), eq(body), eq(FIXED_USER_ID));
    }
}
