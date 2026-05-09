package com.ruoyi.web.controller.osg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

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
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.domain.OsgStaff;
import com.ruoyi.system.service.impl.OsgLeadMentorAccessService;
import com.ruoyi.system.service.impl.OsgStaffServiceImpl;

/**
 * Tests for {@link OsgLeadMentorMentorController}.
 *
 * <p>核心：验证「LM 端导师下拉」接口口径已扩展为 staff_type IN ('mentor', 'lead_mentor')，
 * 即班主任也可作为辅导导师候选（含登录的班主任本人）。</p>
 */
@ExtendWith(MockitoExtension.class)
class OsgLeadMentorMentorControllerTest
{
    @InjectMocks
    private OsgLeadMentorMentorController controller;

    @Mock
    private OsgStaffServiceImpl staffService;

    @Mock
    private OsgLeadMentorAccessService leadMentorAccessService;

    private MockedStatic<SecurityUtils> securityMock;

    @BeforeEach
    void setUp()
    {
        securityMock = Mockito.mockStatic(SecurityUtils.class);
        // hasLeadMentorAccess() 内部走 SecurityUtils.getLoginUser()，这里返回 null 即可 —— LoginUser 的 user 取值由 access service mock 控制
        securityMock.when(SecurityUtils::getLoginUser).thenReturn(null);
    }

    @AfterEach
    void tearDown()
    {
        securityMock.close();
    }

    @Test
    void listShouldReturnBothMentorAndLeadMentor()
    {
        OsgStaff mentor = buildStaff(1L, "Alice Mentor", "mentor");
        OsgStaff leadMentor = buildStaff(100L, "Bob LeadMentor", "lead_mentor");

        when(leadMentorAccessService.hasLeadMentorAccess(any())).thenReturn(true);
        when(staffService.selectStaffList(any(OsgStaff.class))).thenAnswer(invocation -> {
            OsgStaff query = invocation.getArgument(0);
            if ("mentor".equals(query.getStaffType()))
            {
                return List.of(mentor);
            }
            if ("lead_mentor".equals(query.getStaffType()))
            {
                return List.of(leadMentor);
            }
            return Collections.emptyList();
        });
        when(staffService.selectBlacklistedStaffIds(anyList())).thenReturn(Collections.emptyList());

        AjaxResult result = controller.list(null, null, null, null);

        assertEquals(200, result.get("code"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) result.get("rows");
        assertNotNull(rows);
        assertEquals(2, rows.size());
        Set<Object> returnedIds = rows.stream().map(row -> row.get("staffId")).collect(Collectors.toSet());
        assertTrue(returnedIds.contains(1L), "rows should contain mentor staffId=1");
        assertTrue(returnedIds.contains(100L), "rows should contain lead_mentor staffId=100");
    }

    @Test
    void listShouldDeduplicateWhenStaffIdAppearsTwice()
    {
        // 防御性测试：若同一 staffId 同时被两次查询返回（理论上 staff_type 不可能多值，但代码做了去重）
        OsgStaff dual = buildStaff(7L, "Edge Case", "mentor");

        when(leadMentorAccessService.hasLeadMentorAccess(any())).thenReturn(true);
        when(staffService.selectStaffList(any(OsgStaff.class))).thenReturn(List.of(dual));
        when(staffService.selectBlacklistedStaffIds(anyList())).thenReturn(Collections.emptyList());

        AjaxResult result = controller.list(null, null, null, null);

        assertEquals(200, result.get("code"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) result.get("rows");
        assertNotNull(rows);
        assertEquals(1, rows.size(), "duplicate staffId should be de-duplicated");
        assertEquals(7L, rows.get(0).get("staffId"));
    }

    @Test
    void listShouldReturnForbiddenWhenNoLmAccess()
    {
        when(leadMentorAccessService.hasLeadMentorAccess(any())).thenReturn(false);

        AjaxResult result = controller.list(null, null, null, null);

        assertEquals(403, result.get("code"));
        assertEquals("该账号无班主任端访问权限", result.get("msg"));
    }

    @Test
    void listShouldExcludeBlacklistedStaff()
    {
        // 兼容性测试：扩展为多 type 后，黑名单过滤仍然生效
        OsgStaff mentor = buildStaff(1L, "Alice Mentor", "mentor");
        OsgStaff blockedLeadMentor = buildStaff(100L, "Blocked LeadMentor", "lead_mentor");

        when(leadMentorAccessService.hasLeadMentorAccess(any())).thenReturn(true);
        when(staffService.selectStaffList(any(OsgStaff.class))).thenAnswer(invocation -> {
            OsgStaff query = invocation.getArgument(0);
            if ("mentor".equals(query.getStaffType()))
            {
                return List.of(mentor);
            }
            if ("lead_mentor".equals(query.getStaffType()))
            {
                return List.of(blockedLeadMentor);
            }
            return Collections.emptyList();
        });
        when(staffService.selectBlacklistedStaffIds(anyList())).thenReturn(List.of(100L));

        AjaxResult result = controller.list(null, null, null, null);

        assertEquals(200, result.get("code"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) result.get("rows");
        assertNotNull(rows);
        assertEquals(1, rows.size(), "blacklisted staff should be filtered out");
        assertEquals(1L, rows.get(0).get("staffId"));
    }

    private OsgStaff buildStaff(Long staffId, String staffName, String staffType)
    {
        OsgStaff staff = new OsgStaff();
        staff.setStaffId(staffId);
        staff.setStaffName(staffName);
        staff.setStaffType(staffType);
        staff.setAccountStatus("active");
        staff.setMajorDirection("finance");
        staff.setSubDirection("ib");
        staff.setRegion("AMER");
        staff.setCity("New York");
        staff.setHourlyRate(BigDecimal.valueOf(150));
        staff.setStudentCount(2);
        return staff;
    }

}
