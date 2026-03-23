package com.ruoyi.web.controller.osg;

import static org.mockito.ArgumentMatchers.any;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;
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
import com.ruoyi.system.domain.OsgClassRecord;
import com.ruoyi.system.domain.OsgStaff;
import com.ruoyi.system.mapper.OsgClassRecordMapper;
import com.ruoyi.system.mapper.OsgStaffMapper;
import com.ruoyi.system.mapper.OsgStudentMapper;
import com.ruoyi.system.service.impl.OsgClassRecordServiceImpl;

@WebMvcTest(controllers = OsgReportController.class)
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
class OsgReportControllerTest
{
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OsgClassRecordMapper classRecordMapper;

    @MockBean
    private OsgStaffMapper staffMapper;

    @MockBean
    private OsgStudentMapper studentMapper;

    @MockBean
    private TokenService tokenService;

    @MockBean
    private RedisCache redisCache;

    private final AtomicReference<List<OsgClassRecord>> rowsRef = new AtomicReference<>();

    @BeforeEach
    void setUp()
    {
        rowsRef.set(new ArrayList<>(buildRows()));

        org.mockito.Mockito.when(tokenService.getLoginUser(any())).thenAnswer(invocation -> {
            HttpServletRequest request = invocation.getArgument(0);
            String authorization = request.getHeader("Authorization");
            if ("Bearer auditor-token".equals(authorization))
            {
                return buildLoginUser("course_auditor", "auditor");
            }
            if ("Bearer accountant-token".equals(authorization))
            {
                return buildLoginUser("accountant", "accountant");
            }
            return null;
        });

        org.mockito.Mockito.when(classRecordMapper.selectClassRecordList(any(OsgClassRecord.class)))
            .thenAnswer(invocation -> selectRows(invocation.getArgument(0)));
        org.mockito.Mockito.when(classRecordMapper.selectClassRecordByRecordId(any()))
            .thenAnswer(invocation -> rowsRef.get().stream()
                .filter(item -> java.util.Objects.equals(item.getRecordId(), invocation.getArgument(0)))
                .findFirst()
                .orElse(null));
        org.mockito.Mockito.when(classRecordMapper.updateClassRecordReview(any(OsgClassRecord.class)))
            .thenAnswer(invocation -> applyReview(invocation.getArgument(0)));
        org.mockito.Mockito.when(staffMapper.selectStaffByStaffId(any()))
            .thenAnswer(invocation -> buildStaff(invocation.getArgument(0)));
    }

    @Test
    void listShouldReturnFilteredRowsForCourseAuditor() throws Exception
    {
        mockMvc.perform(get("/admin/report/list")
                .header("Authorization", "Bearer auditor-token")
                .param("tab", "pending"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.rows[0].recordId").value(1))
            .andExpect(jsonPath("$.rows[0].courseType").value("mock_interview"))
            .andExpect(jsonPath("$.rows[0].courseSource").value("student_request"))
            .andExpect(jsonPath("$.rows[0].status").value("pending"));
    }

    @Test
    void approveShouldPersistReviewedStateInSubsequentListQuery() throws Exception
    {
        mockMvc.perform(put("/admin/report/1/approve")
                .header("Authorization", "Bearer auditor-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"remark\":\"内容完整，审核通过\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.status").value("approved"));

        mockMvc.perform(get("/admin/report/list")
                .header("Authorization", "Bearer auditor-token")
                .param("tab", "approved"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.rows[0].recordId").value(1))
            .andExpect(jsonPath("$.rows[0].status").value("approved"))
            .andExpect(jsonPath("$.rows[0].reviewRemark").value("内容完整，审核通过"));
    }

    @Test
    void detailShouldReturnFullSnapshotForCourseAuditor() throws Exception
    {
        mockMvc.perform(get("/admin/report/1")
                .header("Authorization", "Bearer auditor-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.recordId").value(1))
            .andExpect(jsonPath("$.data.mentorName").value("导师A"))
            .andExpect(jsonPath("$.data.studentName").value("学员A"))
            .andExpect(jsonPath("$.data.courseType").value("mock_interview"))
            .andExpect(jsonPath("$.data.courseSource").value("student_request"))
            .andExpect(jsonPath("$.data.topics").value("重点讲解行为面试与案例拆解"))
            .andExpect(jsonPath("$.data.feedbackContent").value("建议补强 STAR 框架"));
    }

    @Test
    void batchRejectShouldReviewMultiplePendingRows() throws Exception
    {
        mockMvc.perform(put("/admin/report/batch-reject")
                .header("Authorization", "Bearer auditor-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"recordIds\":[1,2],\"remark\":\"信息不完整\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.reviewedCount").value(2))
            .andExpect(jsonPath("$.status").value("rejected"));

        mockMvc.perform(get("/admin/report/list")
                .header("Authorization", "Bearer auditor-token")
                .param("tab", "rejected"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.rows[0].status").value("rejected"));
    }

    @Test
    void batchApproveShouldReviewMultiplePendingRows() throws Exception
    {
        mockMvc.perform(put("/admin/report/batch-approve")
                .header("Authorization", "Bearer auditor-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"recordIds\":[1,2],\"remark\":\"批量审核通过\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.reviewedCount").value(2))
            .andExpect(jsonPath("$.status").value("approved"));

        mockMvc.perform(get("/admin/report/list")
                .header("Authorization", "Bearer auditor-token")
                .param("tab", "approved"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.rows[0].status").value("approved"));
    }

    @Test
    void reviewShouldRejectAlreadyReviewedRecord() throws Exception
    {
        mockMvc.perform(put("/admin/report/3/reject")
                .header("Authorization", "Bearer auditor-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"remark\":\"重复审核\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(500))
            .andExpect(jsonPath("$.msg").value("该课时记录已审核，不能重复操作"));
    }

    @Test
    void listShouldReturnForbiddenForUnauthorizedRole() throws Exception
    {
        mockMvc.perform(get("/admin/report/list")
                .header("Authorization", "Bearer accountant-token"))
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
        user.setUserId(2L);
        user.setUserName(username);
        user.setPassword("password");
        user.setRoles(List.of(role));

        return new LoginUser(2L, 1L, user, OsgTestPermissions.permissionsForRole(roleKey));
    }

    private List<OsgClassRecord> buildRows()
    {
        return List.of(
            buildRow(1L, "导师A", "学员A", "mock_interview", "student_request", "pending", 4.5, 3.5, 3, 5, null, 2),
            buildRow(2L, "导师B", "学员B", "technical_coaching", "mentor_report", "pending", 8.5, 1.5, 32, 7, null, 1),
            buildRow(3L, "导师C", "学员C", "resume_revision", "mentor_report", "approved", 2.0, 2.0, 1, 2, "历史通过", 0),
            buildRow(4L, "导师D", "学员D", "midterm_exam", "student_request", "rejected", 6.5, 1.0, 40, 4, "信息不完整", 0)
        );
    }

    private OsgClassRecord buildRow(Long recordId,
                                    String mentorName,
                                    String studentName,
                                    String courseType,
                                    String courseSource,
                                    String status,
                                    double weeklyHours,
                                    double durationHours,
                                    int pendingDays,
                                    int reviewPendingCount,
                                    String reviewRemark,
                                    int overdueFlag)
    {
        OsgClassRecord row = new OsgClassRecord();
        row.setRecordId(recordId);
        row.setMentorId(9000L + recordId);
        row.setMentorName(mentorName);
        row.setStudentId(1000L + recordId);
        row.setStudentName(studentName);
        row.setCourseType(courseType);
        row.setCourseSource(courseSource);
        row.setStatus(status);
        row.setWeeklyHours(weeklyHours);
        row.setDurationHours(durationHours);
        row.setPendingDays(pendingDays);
        row.setReviewRemark(reviewRemark);
        row.setOvertimeFlag(weeklyHours > 6 ? "1" : "0");
        row.setOverdueFlag(overdueFlag == 1 ? "1" : "0");
        row.setPendingReviewCount(reviewPendingCount);
        row.setClassDate(Timestamp.valueOf(LocalDateTime.of(2026, 3, 10, 19, 30).minusDays(recordId)));
        row.setSubmittedAt(Timestamp.valueOf(LocalDateTime.of(2026, 3, 12, 9, 0).minusDays(pendingDays)));
        row.setTopics("重点讲解行为面试与案例拆解");
        row.setComments("学员作答结构清晰");
        row.setFeedbackContent("建议补强 STAR 框架");
        return row;
    }

    private List<OsgClassRecord> selectRows(OsgClassRecord query)
    {
        return rowsRef.get().stream()
            .filter(item -> query.getTab() == null || query.getTab().isBlank() || "all".equals(query.getTab())
                || query.getTab().equals(item.getStatus()))
            .filter(item -> query.getKeyword() == null || query.getKeyword().isBlank()
                || item.getMentorName().contains(query.getKeyword())
                || item.getStudentName().contains(query.getKeyword()))
            .filter(item -> query.getCourseType() == null || query.getCourseType().isBlank()
                || query.getCourseType().equals(item.getCourseType()))
            .filter(item -> query.getCourseSource() == null || query.getCourseSource().isBlank()
                || query.getCourseSource().equals(item.getCourseSource()))
            .toList();
    }

    private OsgStaff buildStaff(Long staffId)
    {
        OsgStaff staff = new OsgStaff();
        staff.setStaffId(staffId);
        staff.setHourlyRate(java.math.BigDecimal.valueOf(200));
        return staff;
    }

    private int applyReview(OsgClassRecord update)
    {
        List<OsgClassRecord> currentRows = new ArrayList<>(rowsRef.get());
        for (int index = 0; index < currentRows.size(); index++)
        {
            OsgClassRecord current = currentRows.get(index);
            if (!java.util.Objects.equals(current.getRecordId(), update.getRecordId()))
            {
                continue;
            }
            current.setStatus(update.getStatus());
            current.setReviewRemark(update.getReviewRemark());
            currentRows.set(index, current);
            rowsRef.set(currentRows);
            return 1;
        }
        return 0;
    }
}
