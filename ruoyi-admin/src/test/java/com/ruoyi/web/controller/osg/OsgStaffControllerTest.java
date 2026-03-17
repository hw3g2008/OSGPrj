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
            "defaultPassword", "Osg@2025"
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
                .andExpect(jsonPath("$.data.defaultPassword").value("Osg@2025"));
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
}
