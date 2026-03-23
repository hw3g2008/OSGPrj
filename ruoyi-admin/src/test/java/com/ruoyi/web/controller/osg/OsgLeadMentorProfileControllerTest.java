package com.ruoyi.web.controller.osg;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

import jakarta.servlet.http.HttpServletRequest;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

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
import com.ruoyi.system.domain.OsgStaffChangeRequest;
import com.ruoyi.system.mapper.OsgStaffChangeRequestMapper;
import com.ruoyi.system.mapper.OsgStaffMapper;
import com.ruoyi.system.service.impl.OsgLeadMentorAccessService;
import com.ruoyi.system.service.impl.OsgLeadMentorProfileService;

@WebMvcTest(controllers = OsgLeadMentorProfileController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
    SecurityConfig.class,
    PermissionService.class,
    AuthenticationEntryPointImpl.class,
    LogoutSuccessHandlerImpl.class,
    JwtAuthenticationTokenFilter.class,
    PermitAllUrlProperties.class,
    OsgLeadMentorProfileService.class
})
class OsgLeadMentorProfileControllerTest
{
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OsgStaffMapper staffMapper;

    @MockBean
    private OsgStaffChangeRequestMapper staffChangeRequestMapper;

    @MockBean
    private OsgLeadMentorAccessService leadMentorAccessService;

    @MockBean
    private JdbcTemplate jdbcTemplate;

    @MockBean
    private TokenService tokenService;

    @MockBean
    private RedisCache redisCache;

    private final AtomicReference<List<OsgStaffChangeRequest>> persistedRequestsRef = new AtomicReference<>();
    private final AtomicLong requestIdSequence = new AtomicLong(9200L);

    @BeforeEach
    void setUp()
    {
        persistedRequestsRef.set(new ArrayList<>());
        requestIdSequence.set(9200L);

        org.mockito.Mockito.when(tokenService.getLoginUser(any())).thenAnswer(invocation -> {
            HttpServletRequest request = invocation.getArgument(0);
            String authorization = request.getHeader("Authorization");
            if ("Bearer lead-mentor-token".equals(authorization))
            {
                return buildLoginUser(810L, "lead_mentor_user", "lead@example.com", "+86 138-0013-8000", "0", "Test Lead Mentor");
            }
            if ("Bearer outsider-token".equals(authorization))
            {
                return buildLoginUser(812L, "outsider_user", "outsider@example.com", "+86 138-0013-8111", "1", "Outsider");
            }
            return null;
        });

        org.mockito.Mockito.when(leadMentorAccessService.hasLeadMentorAccess(any())).thenAnswer(invocation -> {
            SysUser user = invocation.getArgument(0);
            return user != null && Long.valueOf(810L).equals(user.getUserId());
        });

        org.mockito.Mockito.when(jdbcTemplate.queryForObject(any(String.class), org.mockito.ArgumentMatchers.eq(Long.class), any()))
            .thenAnswer(invocation -> {
                Object email = invocation.getArgument(2);
                if ("lead@example.com".equals(email))
                {
                    return 810L;
                }
                return null;
            });

        org.mockito.Mockito.when(staffMapper.selectStaffByStaffId(810L)).thenReturn(buildStaff());

        org.mockito.Mockito.when(jdbcTemplate.queryForList(any(String.class), org.mockito.ArgumentMatchers.eq(810L)))
            .thenAnswer(invocation -> toPendingRows(persistedRequestsRef.get()));

        org.mockito.Mockito.when(staffChangeRequestMapper.insertChangeRequest(any(OsgStaffChangeRequest.class)))
            .thenAnswer(invocation -> {
                OsgStaffChangeRequest request = invocation.getArgument(0);
                request.setRequestId(requestIdSequence.incrementAndGet());
                request.setCreateTime(Timestamp.valueOf(LocalDateTime.of(2026, 3, 23, 21, 0).plusMinutes(requestIdSequence.get() - 9201)));
                persistedRequestsRef.get().add(cloneRequest(request));
                return 1;
            });
    }

    @Test
    void profileShouldReturnCurrentLeadMentorOnly() throws Exception
    {
        persistedRequestsRef.get().add(existingRequest(9101L, "phone", "手机号", "+86 138-0013-8000", "+86 139-0000-0000"));

        mockMvc.perform(get("/lead-mentor/profile")
                .header("Authorization", "Bearer lead-mentor-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.profile.staffId").value(810))
            .andExpect(jsonPath("$.data.profile.englishName").value("Test Lead Mentor"))
            .andExpect(jsonPath("$.data.profile.genderLabel").value("Male"))
            .andExpect(jsonPath("$.data.profile.typeLabel").value("班主任"))
            .andExpect(jsonPath("$.data.profile.email").value("lead@example.com"))
            .andExpect(jsonPath("$.data.profile.phone").value("+86 138-0013-8000"))
            .andExpect(jsonPath("$.data.profile.regionArea").value("中国大陆"))
            .andExpect(jsonPath("$.data.profile.regionCity").value("Shanghai 上海"))
            .andExpect(jsonPath("$.data.profile.majorDirection").value("金融 Finance"))
            .andExpect(jsonPath("$.data.profile.subDirection").value("Investment Banking / Capital Markets"))
            .andExpect(jsonPath("$.data.profile.hourlyRate").value(500))
            .andExpect(jsonPath("$.data.pendingCount").value(1))
            .andExpect(jsonPath("$.data.pendingChanges[0].changeRequestId").value(9101))
            .andExpect(jsonPath("$.data.pendingChanges[0].fieldKey").value("phone"))
            .andExpect(jsonPath("$.data.pendingChanges[0].status").value("pending"));
    }

    @Test
    void submitChangeRequestShouldCreateTraceablePendingRequests() throws Exception
    {
        mockMvc.perform(post("/lead-mentor/profile/change-request")
                .header("Authorization", "Bearer lead-mentor-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "englishName": "Updated Lead Mentor",
                      "phone": "+86 139-0000-0000",
                      "email": "updated.lead@example.com",
                      "wechatId": "lead_new_wechat",
                      "regionArea": "北美",
                      "regionCity": "New York 纽约"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.staffId").value(810))
            .andExpect(jsonPath("$.data.changeRequestId").value(9201))
            .andExpect(jsonPath("$.data.createdCount").value(6))
            .andExpect(jsonPath("$.data.requests[0].fieldKey").value("englishName"))
            .andExpect(jsonPath("$.data.requests[0].status").value("pending"))
            .andExpect(jsonPath("$.data.pendingCount").value(6))
            .andExpect(jsonPath("$.data.pendingChanges[0].changeRequestId").value(9206));

        mockMvc.perform(get("/lead-mentor/profile")
                .header("Authorization", "Bearer lead-mentor-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.pendingCount").value(6))
            .andExpect(jsonPath("$.data.pendingChanges[0].fieldKey").value("regionCity"))
            .andExpect(jsonPath("$.data.pendingChanges[5].fieldKey").value("englishName"));

        verify(staffMapper, never()).updateStaff(any(OsgStaff.class));
    }

    @Test
    void submitChangeRequestShouldRejectLockedFields() throws Exception
    {
        mockMvc.perform(post("/lead-mentor/profile/change-request")
                .header("Authorization", "Bearer lead-mentor-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "majorDirection": "咨询 Consulting"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(400))
            .andExpect(jsonPath("$.msg").value("锁定字段不允许修改"));

        verifyNoInteractions(staffChangeRequestMapper);
    }

    @Test
    void submitChangeRequestShouldRejectCrossStaffPayload() throws Exception
    {
        mockMvc.perform(post("/lead-mentor/profile/change-request")
                .header("Authorization", "Bearer lead-mentor-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "staffId": 999,
                      "phone": "+86 139-0000-0000"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(403))
            .andExpect(jsonPath("$.msg").value("仅允许提交本人资料变更申请"));

        verifyNoInteractions(staffChangeRequestMapper);
    }

    @Test
    void profileShouldRejectUsersWithoutLeadMentorAccess() throws Exception
    {
        mockMvc.perform(get("/lead-mentor/profile")
                .header("Authorization", "Bearer outsider-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(403))
            .andExpect(jsonPath("$.msg").value("该账号无班主任端访问权限"));

        verifyNoInteractions(staffMapper, staffChangeRequestMapper);
    }

    private LoginUser buildLoginUser(Long userId, String username, String email, String phone, String sex, String nickName)
    {
        SysUser user = new SysUser();
        user.setUserId(userId);
        user.setUserName(username);
        user.setNickName(nickName);
        user.setEmail(email);
        user.setPhonenumber(phone);
        user.setSex(sex);
        user.setPassword("password");
        return new LoginUser(userId, 1L, user, Set.of());
    }

    private OsgStaff buildStaff()
    {
        OsgStaff staff = new OsgStaff();
        staff.setStaffId(810L);
        staff.setStaffName("Test Lead Mentor");
        staff.setEmail("lead@example.com");
        staff.setPhone("+86 138-0013-8000");
        staff.setStaffType("lead_mentor");
        staff.setMajorDirection("金融 Finance");
        staff.setSubDirection("Investment Banking / Capital Markets");
        staff.setRegion("中国大陆");
        staff.setCity("Shanghai 上海");
        staff.setHourlyRate(new BigDecimal("500"));
        staff.setAccountStatus("active");
        return staff;
    }

    private OsgStaffChangeRequest existingRequest(Long requestId, String fieldKey, String fieldLabel, String beforeValue, String afterValue)
    {
        OsgStaffChangeRequest request = new OsgStaffChangeRequest();
        request.setRequestId(requestId);
        request.setStaffId(810L);
        request.setFieldKey(fieldKey);
        request.setFieldLabel(fieldLabel);
        request.setBeforeValue(beforeValue);
        request.setAfterValue(afterValue);
        request.setStatus("pending");
        request.setRequestedBy("lead_mentor_user");
        request.setCreateTime(Timestamp.valueOf(LocalDateTime.of(2026, 3, 23, 20, 30)));
        return request;
    }

    private OsgStaffChangeRequest cloneRequest(OsgStaffChangeRequest source)
    {
        OsgStaffChangeRequest request = new OsgStaffChangeRequest();
        request.setRequestId(source.getRequestId());
        request.setStaffId(source.getStaffId());
        request.setFieldKey(source.getFieldKey());
        request.setFieldLabel(source.getFieldLabel());
        request.setBeforeValue(source.getBeforeValue());
        request.setAfterValue(source.getAfterValue());
        request.setStatus(source.getStatus());
        request.setRequestedBy(source.getRequestedBy());
        request.setReviewer(source.getReviewer());
        request.setReviewedAt(source.getReviewedAt());
        request.setRemark(source.getRemark());
        request.setCreateTime(source.getCreateTime());
        request.setUpdateTime(source.getUpdateTime());
        request.setCreateBy(source.getCreateBy());
        request.setUpdateBy(source.getUpdateBy());
        return request;
    }

    private List<Map<String, Object>> toPendingRows(List<OsgStaffChangeRequest> requests)
    {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (int index = requests.size() - 1; index >= 0; index--)
        {
            OsgStaffChangeRequest request = requests.get(index);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("changeRequestId", request.getRequestId());
            row.put("fieldKey", request.getFieldKey());
            row.put("fieldLabel", request.getFieldLabel());
            row.put("beforeValue", request.getBeforeValue());
            row.put("afterValue", request.getAfterValue());
            row.put("status", request.getStatus());
            row.put("submittedAt", request.getCreateTime());
            row.put("requestedBy", request.getRequestedBy());
            row.put("remark", request.getRemark());
            rows.add(row);
        }
        return rows;
    }
}
