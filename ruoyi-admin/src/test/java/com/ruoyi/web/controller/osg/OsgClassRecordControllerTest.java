package com.ruoyi.web.controller.osg;

import static org.mockito.ArgumentMatchers.any;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
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
import com.ruoyi.system.domain.OsgClassRecord;
import com.ruoyi.system.domain.OsgStaff;
import com.ruoyi.system.mapper.OsgClassRecordMapper;
import com.ruoyi.system.mapper.OsgStaffMapper;
import com.ruoyi.system.service.impl.OsgClassRecordServiceImpl;

@WebMvcTest(controllers = OsgClassRecordController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
    SecurityConfig.class,
    PermissionService.class,
    AuthenticationEntryPointImpl.class,
    LogoutSuccessHandlerImpl.class,
    JwtAuthenticationTokenFilter.class,
    PermitAllUrlProperties.class,
    OsgClassRecordServiceImpl.class
})
class OsgClassRecordControllerTest
{
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OsgClassRecordMapper classRecordMapper;

    @MockBean
    private OsgStaffMapper staffMapper;

    @MockBean
    private TokenService tokenService;

    @MockBean
    private RedisCache redisCache;

    @BeforeEach
    void setUp()
    {
        org.mockito.Mockito.when(tokenService.getLoginUser(any())).thenAnswer(invocation -> {
            HttpServletRequest request = invocation.getArgument(0);
            String authorization = request.getHeader("Authorization");
            if ("Bearer super-admin-token".equals(authorization))
            {
                return buildLoginUser("super_admin", "super-admin");
            }
            if ("Bearer clerk-token".equals(authorization))
            {
                return buildLoginUser("clerk", "clerk");
            }
            return null;
        });

        org.mockito.Mockito.when(classRecordMapper.selectClassRecordList(any(OsgClassRecord.class)))
            .thenReturn(buildRows());
        org.mockito.Mockito.when(staffMapper.selectStaffByStaffId(any(Long.class)))
            .thenAnswer(invocation -> buildStaff(invocation.getArgument(0)));
    }

    @Test
    void listShouldReturnClassRecordsWithReporterRoleAndRating() throws Exception
    {
        mockMvc.perform(get("/admin/class-record/list")
                .header("Authorization", "Bearer super-admin-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.rows[0].recordId").value(11))
            .andExpect(jsonPath("$.rows[0].coachingType").value("岗位辅导"))
            .andExpect(jsonPath("$.rows[0].reporterRole").value("导师"))
            .andExpect(jsonPath("$.rows[0].studentRating").value("4.8"))
            .andExpect(jsonPath("$.rows[0].courseFee").value("600.0"));
    }

    @Test
    void statsShouldReturnSummaryCardsForSuperAdmin() throws Exception
    {
        mockMvc.perform(get("/admin/class-record/stats")
                .header("Authorization", "Bearer super-admin-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.totalCount").value(4))
            .andExpect(jsonPath("$.data.pendingCount").value(2))
            .andExpect(jsonPath("$.data.approvedCount").value(1))
            .andExpect(jsonPath("$.data.rejectedCount").value(1))
            .andExpect(jsonPath("$.data.pendingSettlementAmount").value("1120.0"))
            .andExpect(jsonPath("$.data.flowSteps[0]").value("学员申请岗位/模拟应聘"));
    }

    @Test
    void listShouldRejectNonSuperAdminRole() throws Exception
    {
        mockMvc.perform(get("/admin/class-record/list")
                .header("Authorization", "Bearer clerk-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(403))
            .andExpect(jsonPath("$.msg").value("没有权限，请联系管理员授权"));
    }

    private LoginUser buildLoginUser(String roleKey, String username)
    {
        SysRole role = new SysRole();
        role.setRoleKey(roleKey);
        role.setRoleName(roleKey);

        SysUser user = new SysUser();
        user.setUserId(10L);
        user.setUserName(username);
        user.setPassword("password");
        user.setRoles(List.of(role));

        return new LoginUser(10L, 1L, user, OsgTestPermissions.permissionsForRole(roleKey));
    }

    private List<OsgClassRecord> buildRows()
    {
        return List.of(
            buildRow(11L, 201L, "导师A", "学员A", "position_coaching", "resume_revision", "mentor", "pending", "4.8", 2.0),
            buildRow(12L, 202L, "导师B", "学员B", "mock_practice", "mock_interview", "assistant", "pending", null, 1.5),
            buildRow(13L, 203L, "导师C", "学员C", "position_coaching", "case_prep", "clerk", "approved", "4.6", 1.0),
            buildRow(14L, 204L, "导师D", "学员D", "mock_practice", "behavioral", "mentor", "rejected", "3.9", 2.5)
        );
    }

    private OsgClassRecord buildRow(Long recordId,
                                    Long mentorId,
                                    String mentorName,
                                    String studentName,
                                    String courseType,
                                    String classStatus,
                                    String courseSource,
                                    String status,
                                    String rate,
                                    double durationHours)
    {
        OsgClassRecord row = new OsgClassRecord();
        row.setRecordId(recordId);
        row.setClassId("R" + recordId);
        row.setMentorId(mentorId);
        row.setMentorName(mentorName);
        row.setStudentId(1000L + recordId);
        row.setStudentName(studentName);
        row.setCourseType(courseType);
        row.setClassStatus(classStatus);
        row.setCourseSource(courseSource);
        row.setStatus(status);
        row.setRate(rate);
        row.setDurationHours(durationHours);
        row.setSubmittedAt(Timestamp.valueOf(LocalDateTime.now().minusDays(3)));
        return row;
    }

    private OsgStaff buildStaff(Long staffId)
    {
        OsgStaff staff = new OsgStaff();
        staff.setStaffId(staffId);
        if (staffId == 201L)
        {
            staff.setHourlyRate(BigDecimal.valueOf(300));
        }
        else if (staffId == 202L)
        {
            staff.setHourlyRate(BigDecimal.valueOf(346.6666667));
        }
        else if (staffId == 203L)
        {
            staff.setHourlyRate(BigDecimal.valueOf(280));
        }
        else
        {
            staff.setHourlyRate(BigDecimal.valueOf(250));
        }
        return staff;
    }
}
