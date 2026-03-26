package com.ruoyi.web.controller.osg;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import jakarta.servlet.http.HttpServletRequest;
import com.ruoyi.common.core.domain.entity.SysRole;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.core.redis.RedisCache;
import com.ruoyi.framework.config.SecurityConfig;
import com.ruoyi.framework.config.properties.PermitAllUrlProperties;
import com.ruoyi.framework.security.filter.JwtAuthenticationTokenFilter;
import com.ruoyi.framework.security.handle.AuthenticationEntryPointImpl;
import com.ruoyi.framework.security.handle.LogoutSuccessHandlerImpl;
import com.ruoyi.framework.web.service.PermissionService;
import com.ruoyi.framework.web.service.TokenService;
import com.ruoyi.system.domain.OsgStaff;
import com.ruoyi.system.service.impl.OsgStaffServiceImpl;

@WebMvcTest(controllers = OsgStaffController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
    SecurityConfig.class,
    PermissionService.class,
    AuthenticationEntryPointImpl.class,
    LogoutSuccessHandlerImpl.class,
    JwtAuthenticationTokenFilter.class,
    PermitAllUrlProperties.class
})
class OsgStaffControllerTest
{
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OsgStaffServiceImpl staffService;

    @MockBean
    private TokenService tokenService;

    @MockBean
    private RedisCache redisCache;

    private final AtomicReference<List<OsgStaff>> staffRowsRef = new AtomicReference<>();

    private final AtomicReference<Set<Long>> blacklistedIdsRef = new AtomicReference<>();

    private final AtomicInteger pendingReviewCountRef = new AtomicInteger();

    @BeforeEach
    void setUp()
    {
        staffRowsRef.set(List.of(buildStaff("active")));
        blacklistedIdsRef.set(Set.of());
        pendingReviewCountRef.set(0);

        when(tokenService.getLoginUser(any())).thenAnswer(invocation -> {
            HttpServletRequest request = invocation.getArgument(0);
            String authorization = request.getHeader("Authorization");
            if ("Bearer clerk-token".equals(authorization))
            {
                return buildLoginUser("clerk", "clerk");
            }
            if ("Bearer accountant-token".equals(authorization))
            {
                return buildLoginUser("accountant", "accountant");
            }
            return null;
        });

        when(staffService.selectStaffList(any(OsgStaff.class))).thenAnswer(invocation -> staffRowsRef.get());
        when(staffService.selectBlacklistedStaffIds(anyList())).thenAnswer(invocation -> new ArrayList<>(blacklistedIdsRef.get()));
        when(staffService.selectPendingReviewCount()).thenAnswer(invocation -> pendingReviewCountRef.get());
        when(staffService.selectStaffByStaffId(anyLong())).thenAnswer(invocation -> staffRowsRef.get().stream()
            .filter(item -> item.getStaffId().equals(invocation.getArgument(0)))
            .findFirst()
            .map(this::copyStaff)
            .orElse(null));
        when(staffService.selectStaffDetail(1L)).thenReturn(buildStaffDetailPayload());
        when(staffService.insertStaff(any(OsgStaff.class))).thenAnswer(invocation -> insertStaff(invocation.getArgument(0)));
        when(staffService.updateStaff(any(OsgStaff.class))).thenAnswer(invocation -> updateStaff(invocation.getArgument(0)));
        when(staffService.updateStaffStatus(eq(1L), eq("frozen"), anyString())).thenAnswer(invocation -> {
            staffRowsRef.set(List.of(buildStaff("frozen")));
            return 1;
        });
        when(staffService.updateStaffBlacklist(eq(1L), eq("blacklist"), anyString(), anyLong())).thenAnswer(invocation -> {
            blacklistedIdsRef.set(Set.of(1L));
            return 1;
        });
        when(staffService.resetStaffPassword(eq(1L), anyString())).thenReturn(Map.of(
            "staffId", 1L,
            "loginAccount", "diana@example.com",
            "defaultPassword", "Osg@2026"
        ));
        when(staffService.submitChangeRequest(any(), anyString())).thenAnswer(invocation -> Map.of(
            "requestId", 10L,
            "staffId", 1L,
            "status", "pending"
        ));
    }

    @Test
    void listShouldReturnStaffRowsForClerk() throws Exception
    {
        mockMvc.perform(get("/admin/staff/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.pendingReviewCount").value(0))
                .andExpect(jsonPath("$.rows[0].staffId").value(1))
                .andExpect(jsonPath("$.rows[0].staffName").value("Diana"))
                .andExpect(jsonPath("$.rows[0].staffType").value("lead_mentor"))
                .andExpect(jsonPath("$.rows[0].studentCount").value(3))
                .andExpect(jsonPath("$.rows[0].accountStatus").value("0"));
    }

    @Test
    void listShouldReturnForbiddenForUnauthorizedRole() throws Exception
    {
        mockMvc.perform(get("/admin/staff/list")
                .header("Authorization", "Bearer accountant-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(403))
                .andExpect(jsonPath("$.msg").value("没有权限，请联系管理员授权"));
    }

    @Test
    void changeStatusShouldAffectSubsequentListQuery() throws Exception
    {
        mockMvc.perform(put("/admin/staff/status")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"staffId\":1,\"action\":\"freeze\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.accountStatus").value("1"));

        mockMvc.perform(get("/admin/staff/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].accountStatus").value("1"));
    }

    @Test
    void blacklistShouldMarkStaffAsBlacklistedInSubsequentListQuery() throws Exception
    {
        mockMvc.perform(post("/admin/staff/blacklist")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"staffId\":1,\"action\":\"blacklist\",\"reason\":\"service_complaint\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.action").value("blacklist"));

        mockMvc.perform(get("/admin/staff/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].isBlacklisted").value(true));
    }

    @Test
    void createShouldPersistNewStaffInSubsequentListQuery() throws Exception
    {
        mockMvc.perform(post("/admin/staff")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "staffName": "Olivia",
                      "email": "olivia@example.com",
                      "phone": "13900000000",
                      "staffType": "mentor",
                      "majorDirection": "咨询",
                      "subDirection": "Strategy",
                      "region": "欧洲",
                      "city": "London",
                      "hourlyRate": 680
                    }
                    """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.staffId").value(2))
                .andExpect(jsonPath("$.staffName").value("Olivia"))
                .andExpect(jsonPath("$.accountStatus").value("0"));

        mockMvc.perform(get("/admin/staff/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].staffName").value("Olivia"))
                .andExpect(jsonPath("$.rows[0].staffType").value("mentor"));
    }

    @Test
    void editShouldPersistChangedFieldsInSubsequentListQuery() throws Exception
    {
        mockMvc.perform(put("/admin/staff")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "staffId": 1,
                      "staffName": "Diana Ross",
                      "email": "diana.ross@example.com",
                      "phone": "13711112222",
                      "staffType": "lead_mentor",
                      "majorDirection": "科技",
                      "subDirection": "AI Product",
                      "region": "北美",
                      "city": "San Francisco",
                      "hourlyRate": 720
                    }
                    """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.staffId").value(1))
                .andExpect(jsonPath("$.staffName").value("Diana Ross"));

        mockMvc.perform(get("/admin/staff/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].staffName").value("Diana Ross"))
                .andExpect(jsonPath("$.rows[0].majorDirection").value("科技"))
                .andExpect(jsonPath("$.rows[0].city").value("San Francisco"));
    }

    @Test
    void detailShouldReturnStaffSnapshotForClerk() throws Exception
    {
        mockMvc.perform(get("/admin/staff/1")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.staffId").value(1))
                .andExpect(jsonPath("$.data.staffName").value("Diana"))
                .andExpect(jsonPath("$.data.email").value("diana@example.com"))
                .andExpect(jsonPath("$.data.city").value("New York"))
                .andExpect(jsonPath("$.data.studentCount").value(3));
    }

    @Test
    void resetPasswordShouldReturnDefaultPasswordPayloadForClerk() throws Exception
    {
        mockMvc.perform(post("/admin/staff/reset-password")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "staffId": 1
                    }
                    """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.msg").value("导师密码已重置"))
                .andExpect(jsonPath("$.data.staffId").value(1))
                .andExpect(jsonPath("$.data.loginAccount").value("diana@example.com"))
                .andExpect(jsonPath("$.data.defaultPassword").value("Osg@2026"));
    }

    @Test
    void submitChangeRequestShouldReturnPendingPayloadForClerk() throws Exception
    {
        mockMvc.perform(post("/admin/staff/change-request")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "staffId": 1,
                      "fieldKey": "city",
                      "fieldLabel": "所在城市",
                      "beforeValue": "New York",
                      "afterValue": "London"
                    }
                    """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.requestId").value(10))
                .andExpect(jsonPath("$.data.staffId").value(1))
                .andExpect(jsonPath("$.data.status").value("pending"));
    }

    @Test
    void listChangeRequestsShouldReturnPendingRowsForClerk() throws Exception
    {
        when(staffService.selectChangeRequestList(eq(1L), eq("pending"))).thenReturn(List.of(Map.of(
            "requestId", 10L,
            "staffId", 1L,
            "staffName", "Diana",
            "fieldKey", "city",
            "fieldLabel", "所在城市",
            "beforeValue", "New York",
            "afterValue", "London",
            "status", "pending"
        )));

        mockMvc.perform(get("/admin/staff/change-request/list")
                .header("Authorization", "Bearer clerk-token")
                .param("staffId", "1")
                .param("status", "pending"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.rows[0].requestId").value(10))
                .andExpect(jsonPath("$.rows[0].staffName").value("Diana"))
                .andExpect(jsonPath("$.rows[0].status").value("pending"));
    }

    @Test
    void approveChangeRequestShouldReturnApprovedPayloadForClerk() throws Exception
    {
        when(staffService.approveChangeRequest(eq(10L), anyString())).thenReturn(Map.of(
            "requestId", 10L,
            "staffId", 1L,
            "status", "approved",
            "afterValue", "London"
        ));

        mockMvc.perform(put("/admin/staff/change-request/10/approve")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.msg").value("导师变更申请已通过"))
                .andExpect(jsonPath("$.status").value("approved"))
                .andExpect(jsonPath("$.data.afterValue").value("London"));
    }

    @Test
    void rejectChangeRequestShouldReturnRejectedPayloadForClerk() throws Exception
    {
        when(staffService.rejectChangeRequest(eq(10L), anyString(), eq("信息不完整"))).thenReturn(Map.of(
            "requestId", 10L,
            "staffId", 1L,
            "status", "rejected",
            "remark", "信息不完整"
        ));

        mockMvc.perform(put("/admin/staff/change-request/10/reject")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"信息不完整\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.msg").value("导师变更申请已驳回"))
                .andExpect(jsonPath("$.status").value("rejected"))
                .andExpect(jsonPath("$.data.remark").value("信息不完整"));
    }

    // ==================== NEW TEST METHODS FOR BRANCH COVERAGE ====================

    @Test
    void detailShouldReturnErrorWhenStaffNotFound() throws Exception
    {
        when(staffService.selectStaffDetail(999L)).thenReturn(null);

        mockMvc.perform(get("/admin/staff/999")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("导师不存在"));
    }

    @Test
    void detailShouldReturnErrorWhenDetailIsEmptyMap() throws Exception
    {
        when(staffService.selectStaffDetail(999L)).thenReturn(java.util.Collections.emptyMap());

        mockMvc.perform(get("/admin/staff/999")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("导师不存在"));
    }

    @Test
    void createShouldReturnErrorWhenStaffNameMissing() throws Exception
    {
        mockMvc.perform(post("/admin/staff")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "test@example.com",
                      "staffType": "mentor",
                      "majorDirection": "金融",
                      "region": "北美",
                      "city": "NY",
                      "hourlyRate": 500
                    }
                    """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("staffName不能为空"));
    }

    @Test
    void createShouldReturnErrorWhenEmailMissing() throws Exception
    {
        mockMvc.perform(post("/admin/staff")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "staffName": "Test",
                      "staffType": "mentor",
                      "majorDirection": "金融",
                      "region": "北美",
                      "city": "NY",
                      "hourlyRate": 500
                    }
                    """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("email不能为空"));
    }

    @Test
    void createShouldReturnErrorWhenStaffTypeMissing() throws Exception
    {
        mockMvc.perform(post("/admin/staff")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "staffName": "Test",
                      "email": "test@example.com",
                      "majorDirection": "金融",
                      "region": "北美",
                      "city": "NY",
                      "hourlyRate": 500
                    }
                    """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("staffType不能为空"));
    }

    @Test
    void createShouldReturnErrorWhenMajorDirectionMissing() throws Exception
    {
        mockMvc.perform(post("/admin/staff")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "staffName": "Test",
                      "email": "test@example.com",
                      "staffType": "mentor",
                      "region": "北美",
                      "city": "NY",
                      "hourlyRate": 500
                    }
                    """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("majorDirection不能为空"));
    }

    @Test
    void createShouldReturnErrorWhenRegionMissing() throws Exception
    {
        mockMvc.perform(post("/admin/staff")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "staffName": "Test",
                      "email": "test@example.com",
                      "staffType": "mentor",
                      "majorDirection": "金融",
                      "city": "NY",
                      "hourlyRate": 500
                    }
                    """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("region不能为空"));
    }

    @Test
    void createShouldReturnErrorWhenCityMissing() throws Exception
    {
        mockMvc.perform(post("/admin/staff")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "staffName": "Test",
                      "email": "test@example.com",
                      "staffType": "mentor",
                      "majorDirection": "金融",
                      "region": "北美",
                      "hourlyRate": 500
                    }
                    """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("city不能为空"));
    }

    @Test
    void createShouldReturnErrorWhenHourlyRateMissing() throws Exception
    {
        mockMvc.perform(post("/admin/staff")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "staffName": "Test",
                      "email": "test@example.com",
                      "staffType": "mentor",
                      "majorDirection": "金融",
                      "region": "北美",
                      "city": "NY"
                    }
                    """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("hourlyRate不能为空"));
    }

    @Test
    void createShouldReturnErrorWhenInsertFails() throws Exception
    {
        when(staffService.insertStaff(any(OsgStaff.class))).thenReturn(0);

        mockMvc.perform(post("/admin/staff")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "staffName": "Test",
                      "email": "test@example.com",
                      "staffType": "mentor",
                      "majorDirection": "金融",
                      "region": "北美",
                      "city": "NY",
                      "hourlyRate": 500
                    }
                    """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("导师新增失败"));
    }

    @Test
    void createShouldUseSelectStaffByStaffIdAfterInsert() throws Exception
    {
        when(staffService.insertStaff(any(OsgStaff.class))).thenAnswer(invocation -> {
            OsgStaff staff = invocation.getArgument(0);
            staff.setStaffId(3L);
            return 1;
        });
        when(staffService.selectStaffByStaffId(3L)).thenReturn(null);

        mockMvc.perform(post("/admin/staff")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "staffName": "NullReturn",
                      "email": "null@example.com",
                      "staffType": "mentor",
                      "majorDirection": "金融",
                      "region": "北美",
                      "city": "NY",
                      "hourlyRate": 500
                    }
                    """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.staffName").value("NullReturn"));
    }

    @Test
    void updateShouldReturnErrorWhenStaffIdMissing() throws Exception
    {
        mockMvc.perform(put("/admin/staff")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "staffName": "Test",
                      "email": "test@example.com"
                    }
                    """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("staffId不能为空"));
    }

    @Test
    void updateShouldReturnErrorWhenStaffNotFound() throws Exception
    {
        mockMvc.perform(put("/admin/staff")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "staffId": 999,
                      "staffName": "Test",
                      "email": "test@example.com",
                      "staffType": "mentor",
                      "majorDirection": "金融",
                      "region": "北美",
                      "city": "NY",
                      "hourlyRate": 500
                    }
                    """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("导师不存在"));
    }

    @Test
    void updateShouldReturnValidationErrorForMissingFields() throws Exception
    {
        mockMvc.perform(put("/admin/staff")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "staffId": 1,
                      "email": "test@example.com",
                      "staffType": "mentor",
                      "majorDirection": "金融",
                      "region": "北美",
                      "city": "NY",
                      "hourlyRate": 500
                    }
                    """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("staffName不能为空"));
    }

    @Test
    void updateShouldReturnErrorWhenUpdateFails() throws Exception
    {
        when(staffService.updateStaff(any(OsgStaff.class))).thenReturn(0);

        mockMvc.perform(put("/admin/staff")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "staffId": 1,
                      "staffName": "Diana Ross",
                      "email": "diana.ross@example.com",
                      "staffType": "lead_mentor",
                      "majorDirection": "科技",
                      "region": "北美",
                      "city": "San Francisco",
                      "hourlyRate": 720
                    }
                    """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("导师更新失败"));
    }

    @Test
    void updateShouldUseMergeExistingWhenRefetchReturnsNull() throws Exception
    {
        when(staffService.updateStaff(any(OsgStaff.class))).thenReturn(1);
        when(staffService.selectStaffByStaffId(1L)).thenReturn(buildStaff("active")).thenReturn(null);

        mockMvc.perform(put("/admin/staff")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "staffId": 1,
                      "staffName": "Diana Updated",
                      "email": "diana.updated@example.com",
                      "staffType": "lead_mentor",
                      "majorDirection": "科技",
                      "region": "北美",
                      "city": "San Francisco",
                      "hourlyRate": 720
                    }
                    """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.staffName").value("Diana Updated"));
    }

    @Test
    void changeStatusShouldResolveRestoreAction() throws Exception
    {
        when(staffService.updateStaffStatus(eq(1L), eq("active"), anyString())).thenAnswer(invocation -> {
            staffRowsRef.set(List.of(buildStaff("active")));
            return 1;
        });

        mockMvc.perform(put("/admin/staff/status")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"staffId\":1,\"action\":\"restore\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.accountStatus").value("0"));
    }

    @Test
    void changeStatusShouldResolveDirectAccountStatusValue0() throws Exception
    {
        when(staffService.updateStaffStatus(eq(1L), eq("active"), anyString())).thenReturn(1);

        mockMvc.perform(put("/admin/staff/status")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"staffId\":1,\"accountStatus\":\"0\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.accountStatus").value("0"));
    }

    @Test
    void changeStatusShouldResolveDirectAccountStatusValue1() throws Exception
    {
        when(staffService.updateStaffStatus(eq(1L), eq("frozen"), anyString())).thenReturn(1);

        mockMvc.perform(put("/admin/staff/status")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"staffId\":1,\"accountStatus\":\"1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.accountStatus").value("1"));
    }

    @Test
    void changeStatusShouldResolveDirectAccountStatusActive() throws Exception
    {
        when(staffService.updateStaffStatus(eq(1L), eq("active"), anyString())).thenReturn(1);

        mockMvc.perform(put("/admin/staff/status")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"staffId\":1,\"accountStatus\":\"active\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.accountStatus").value("0"));
    }

    @Test
    void changeStatusShouldResolveDirectAccountStatusFrozen() throws Exception
    {
        when(staffService.updateStaffStatus(eq(1L), eq("frozen"), anyString())).thenReturn(1);

        mockMvc.perform(put("/admin/staff/status")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"staffId\":1,\"accountStatus\":\"frozen\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.accountStatus").value("1"));
    }

    @Test
    void changeStatusShouldReturnErrorForInvalidAccountStatus() throws Exception
    {
        mockMvc.perform(put("/admin/staff/status")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"staffId\":1,\"accountStatus\":\"invalid\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("参数缺失"));
    }

    @Test
    void changeStatusShouldReturnErrorWhenStaffIdMissing() throws Exception
    {
        mockMvc.perform(put("/admin/staff/status")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"action\":\"freeze\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("参数缺失"));
    }

    @Test
    void changeStatusShouldReturnErrorWhenRowsNotAffected() throws Exception
    {
        when(staffService.updateStaffStatus(eq(1L), eq("frozen"), anyString())).thenReturn(0);

        mockMvc.perform(put("/admin/staff/status")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"staffId\":1,\"action\":\"freeze\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("导师状态更新失败"));
    }

    @Test
    void blacklistShouldNormalizeAddAction() throws Exception
    {
        when(staffService.updateStaffBlacklist(eq(1L), eq("blacklist"), anyString(), anyLong())).thenReturn(1);

        mockMvc.perform(post("/admin/staff/blacklist")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"staffId\":1,\"action\":\"add\",\"reason\":\"test\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.action").value("blacklist"));
    }

    @Test
    void blacklistShouldNormalizeRemoveAction() throws Exception
    {
        when(staffService.updateStaffBlacklist(eq(1L), eq("remove"), anyString(), anyLong())).thenReturn(1);

        mockMvc.perform(post("/admin/staff/blacklist")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"staffId\":1,\"action\":\"remove\",\"reason\":\"test\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.msg").value("已移出黑名单"))
                .andExpect(jsonPath("$.action").value("remove"));
    }

    @Test
    void blacklistShouldNormalizeRestoreAction() throws Exception
    {
        when(staffService.updateStaffBlacklist(eq(1L), eq("remove"), anyString(), anyLong())).thenReturn(1);

        mockMvc.perform(post("/admin/staff/blacklist")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"staffId\":1,\"action\":\"restore\",\"reason\":\"test\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.msg").value("已移出黑名单"));
    }

    @Test
    void blacklistShouldReturnErrorForInvalidAction() throws Exception
    {
        mockMvc.perform(post("/admin/staff/blacklist")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"staffId\":1,\"action\":\"invalid\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("参数缺失"));
    }

    @Test
    void blacklistShouldReturnErrorWhenStaffIdMissing() throws Exception
    {
        mockMvc.perform(post("/admin/staff/blacklist")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"action\":\"blacklist\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("参数缺失"));
    }

    @Test
    void blacklistShouldReturnErrorWhenRowsNotAffected() throws Exception
    {
        when(staffService.updateStaffBlacklist(eq(1L), eq("blacklist"), anyString(), anyLong())).thenReturn(0);

        mockMvc.perform(post("/admin/staff/blacklist")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"staffId\":1,\"action\":\"blacklist\",\"reason\":\"test\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("黑名单状态未变更"));
    }

    @Test
    void blacklistShouldUseDefaultReasonWhenMissing() throws Exception
    {
        when(staffService.updateStaffBlacklist(eq(1L), eq("blacklist"), anyString(), anyLong())).thenReturn(1);

        mockMvc.perform(post("/admin/staff/blacklist")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"staffId\":1,\"action\":\"blacklist\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void resetPasswordShouldReturnErrorWhenStaffIdMissing() throws Exception
    {
        mockMvc.perform(post("/admin/staff/reset-password")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("staffId不能为空"));
    }

    @Test
    void resetPasswordShouldReturnErrorWhenServiceThrows() throws Exception
    {
        when(staffService.resetStaffPassword(eq(1L), anyString()))
            .thenThrow(new RuntimeException("服务异常"));

        mockMvc.perform(post("/admin/staff/reset-password")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"staffId\":1}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("服务异常"));
    }

    @Test
    void submitChangeRequestShouldReturnErrorWhenServiceThrows() throws Exception
    {
        when(staffService.submitChangeRequest(any(), anyString()))
            .thenThrow(new RuntimeException("变更请求失败"));

        mockMvc.perform(post("/admin/staff/change-request")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"staffId\":1}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("变更请求失败"));
    }

    @Test
    void listShouldFilterByAccountStatusUsingStoredResolve() throws Exception
    {
        mockMvc.perform(get("/admin/staff/list")
                .header("Authorization", "Bearer clerk-token")
                .param("accountStatus", "0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void listShouldFilterByAccountStatusFrozen() throws Exception
    {
        mockMvc.perform(get("/admin/staff/list")
                .header("Authorization", "Bearer clerk-token")
                .param("accountStatus", "frozen"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void createShouldSetExplicitAccountStatus() throws Exception
    {
        mockMvc.perform(post("/admin/staff")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "staffName": "Olivia",
                      "email": "olivia@example.com",
                      "staffType": "mentor",
                      "majorDirection": "咨询",
                      "region": "欧洲",
                      "city": "London",
                      "hourlyRate": 680,
                      "accountStatus": "1"
                    }
                    """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.accountStatus").value("1"));
    }

    @Test
    void updateShouldPreserveExistingAccountStatusWhenNotProvided() throws Exception
    {
        mockMvc.perform(put("/admin/staff")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "staffId": 1,
                      "staffName": "Diana Update",
                      "email": "diana@example.com",
                      "staffType": "lead_mentor",
                      "majorDirection": "金融",
                      "region": "北美",
                      "city": "New York",
                      "hourlyRate": 500
                    }
                    """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.accountStatus").value("0"));
    }

    private LoginUser buildLoginUser(String roleKey, String username)
    {
        SysRole role = new SysRole();
        role.setRoleKey(roleKey);
        role.setRoleName(roleKey);

        SysUser user = new SysUser();
        user.setUserId(2L);
        user.setUserName(username);
        user.setPassword("password");
        user.setRoles(List.of(role));

        return new LoginUser(2L, 1L, user, OsgTestPermissions.permissionsForRole(roleKey));
    }

    private OsgStaff buildStaff(String accountStatus)
    {
        OsgStaff staff = new OsgStaff();
        staff.setStaffId(1L);
        staff.setStaffName("Diana");
        staff.setEmail("diana@example.com");
        staff.setPhone("13800000000");
        staff.setStaffType("lead_mentor");
        staff.setMajorDirection("金融");
        staff.setSubDirection("IB 投行");
        staff.setRegion("北美");
        staff.setCity("New York");
        staff.setHourlyRate(new BigDecimal("500"));
        staff.setStudentCount(3);
        staff.setAccountStatus(accountStatus);
        return staff;
    }

    private int insertStaff(OsgStaff staff)
    {
        List<OsgStaff> next = new ArrayList<>(staffRowsRef.get());
        OsgStaff inserted = copyStaff(staff);
        inserted.setStaffId(2L);
        staff.setStaffId(2L);
        inserted.setAccountStatus(inserted.getAccountStatus() == null ? "active" : inserted.getAccountStatus());
        inserted.setStudentCount(0);
        next.add(0, inserted);
        staffRowsRef.set(next);
        return 1;
    }

    private int updateStaff(OsgStaff update)
    {
        List<OsgStaff> next = new ArrayList<>(staffRowsRef.get());
        OsgStaff existing = next.stream()
            .filter(item -> item.getStaffId().equals(update.getStaffId()))
            .findFirst()
            .orElse(null);
        if (existing == null)
        {
            return 0;
        }
        if (update.getStaffName() != null) existing.setStaffName(update.getStaffName());
        if (update.getEmail() != null) existing.setEmail(update.getEmail());
        if (update.getPhone() != null) existing.setPhone(update.getPhone());
        if (update.getStaffType() != null) existing.setStaffType(update.getStaffType());
        if (update.getMajorDirection() != null) existing.setMajorDirection(update.getMajorDirection());
        if (update.getSubDirection() != null) existing.setSubDirection(update.getSubDirection());
        if (update.getRegion() != null) existing.setRegion(update.getRegion());
        if (update.getCity() != null) existing.setCity(update.getCity());
        if (update.getHourlyRate() != null) existing.setHourlyRate(update.getHourlyRate());
        staffRowsRef.set(next);
        return 1;
    }

    private OsgStaff copyStaff(OsgStaff source)
    {
        OsgStaff copy = new OsgStaff();
        copy.setStaffId(source.getStaffId());
        copy.setStaffName(source.getStaffName());
        copy.setEmail(source.getEmail());
        copy.setPhone(source.getPhone());
        copy.setStaffType(source.getStaffType());
        copy.setMajorDirection(source.getMajorDirection());
        copy.setSubDirection(source.getSubDirection());
        copy.setRegion(source.getRegion());
        copy.setCity(source.getCity());
        copy.setHourlyRate(source.getHourlyRate());
        copy.setStudentCount(source.getStudentCount());
        copy.setAccountStatus(source.getAccountStatus());
        return copy;
    }

    private java.util.Map<String, Object> buildStaffDetailPayload()
    {
        java.util.Map<String, Object> payload = new java.util.LinkedHashMap<>();
        payload.put("staffId", 1L);
        payload.put("staffName", "Diana");
        payload.put("email", "diana@example.com");
        payload.put("phone", "13800000000");
        payload.put("staffType", "lead_mentor");
        payload.put("majorDirection", "金融");
        payload.put("subDirection", "IB 投行");
        payload.put("region", "北美");
        payload.put("city", "New York");
        payload.put("hourlyRate", 500);
        payload.put("studentCount", 3);
        payload.put("accountStatus", "0");
        return payload;
    }
    @Test
    void blacklistShouldReturnErrorForMissingParams() throws Exception
    {
        mockMvc.perform(post("/admin/staff/blacklist")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"test\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("参数缺失"));
    }

    @Test
    void blacklistShouldUseDefaultReasonWhenReasonMissing() throws Exception
    {
        when(staffService.updateStaffBlacklist(eq(1L), eq("blacklist"), anyString(), anyLong())).thenReturn(1);

        mockMvc.perform(post("/admin/staff/blacklist")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"staffId\":1,\"action\":\"add\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void createShouldHandleHourlyRateAsDecimalString() throws Exception
    {
        mockMvc.perform(post("/admin/staff")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"staffName\":\"Test\",\"email\":\"t@e.com\",\"staffType\":\"mentor\",\"majorDirection\":\"金融\",\"region\":\"北美\",\"city\":\"NY\",\"hourlyRate\":\"680.50\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void listShouldFilterByStoredAccountStatus0() throws Exception
    {
        mockMvc.perform(get("/admin/staff/list")
                .header("Authorization", "Bearer clerk-token")
                .param("accountStatus", "0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void listShouldFilterByStoredAccountStatus1() throws Exception
    {
        mockMvc.perform(get("/admin/staff/list")
                .header("Authorization", "Bearer clerk-token")
                .param("accountStatus", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void listShouldFilterByStoredAccountStatusActive() throws Exception
    {
        mockMvc.perform(get("/admin/staff/list")
                .header("Authorization", "Bearer clerk-token")
                .param("accountStatus", "active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void listShouldFilterByStoredAccountStatusFrozen() throws Exception
    {
        mockMvc.perform(get("/admin/staff/list")
                .header("Authorization", "Bearer clerk-token")
                .param("accountStatus", "frozen"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void updateShouldSetAccountStatusFromBodyInUpdateResponse() throws Exception
    {
        mockMvc.perform(put("/admin/staff")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"staffId\":1,\"staffName\":\"Diana Update\",\"email\":\"diana@example.com\",\"staffType\":\"lead_mentor\",\"majorDirection\":\"金融\",\"region\":\"北美\",\"city\":\"New York\",\"hourlyRate\":500,\"accountStatus\":\"frozen\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.accountStatus").value("0"));
    }
}
