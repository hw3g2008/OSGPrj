package com.ruoyi.web.controller.osg;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.ByteArrayInputStream;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;
import jakarta.servlet.http.HttpServletRequest;
import com.ruoyi.common.core.domain.entity.SysRole;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.core.redis.RedisCache;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.framework.config.SecurityConfig;
import com.ruoyi.framework.config.properties.PermitAllUrlProperties;
import com.ruoyi.framework.security.filter.JwtAuthenticationTokenFilter;
import com.ruoyi.framework.security.handle.AuthenticationEntryPointImpl;
import com.ruoyi.framework.security.handle.LogoutSuccessHandlerImpl;
import com.ruoyi.framework.web.service.PermissionService;
import com.ruoyi.framework.web.service.TokenService;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.service.impl.OsgStudentChangeRequestServiceImpl;
import com.ruoyi.system.service.impl.OsgStudentServiceImpl;

@WebMvcTest(controllers = OsgStudentController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
    SecurityConfig.class,
    PermissionService.class,
    AuthenticationEntryPointImpl.class,
    LogoutSuccessHandlerImpl.class,
    JwtAuthenticationTokenFilter.class,
    PermitAllUrlProperties.class
})
class OsgStudentControllerTest
{
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OsgStudentServiceImpl studentService;

    @MockBean
    private OsgStudentChangeRequestServiceImpl changeRequestService;

    @MockBean
    private TokenService tokenService;

    @MockBean
    private RedisCache redisCache;

    private final AtomicReference<String> accountStatusRef = new AtomicReference<>("0");

    private final AtomicReference<List<OsgStudent>> studentRowsRef = new AtomicReference<>();

    @BeforeEach
    void setUp()
    {
        accountStatusRef.set("0");
        studentRowsRef.set(List.of(buildStudent(1L, "Alice", "alice@example.com", accountStatusRef.get())));

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

        when(studentService.selectStudentList(any(OsgStudent.class))).thenAnswer(invocation -> studentRowsRef.get());
        when(studentService.selectStudentActivityCounts(anyList())).thenReturn(Map.of(
            1L,
            buildStudentActivityCountsPayload(2, 3, 1)
        ));
        when(studentService.selectStudentDetail(1L)).thenReturn(buildStudentDetailPayload(1L, "Alice", "alice@example.com", accountStatusRef.get()));
        when(studentService.selectStudentContracts(1L)).thenReturn(buildStudentContractsPayload(1L));
        when(studentService.selectBlacklistedStudentIds(anyList())).thenReturn(Collections.emptyList());
        when(changeRequestService.selectChangeRequestList(null, "pending")).thenReturn(List.of(buildPendingChangeRequestPayload(1L)));
        when(studentService.changeStudentStatus(eq(1L), eq("3"), anyString())).thenAnswer(invocation -> {
            accountStatusRef.set("3");
            studentRowsRef.set(List.of(buildStudent(1L, "Alice", "alice@example.com", accountStatusRef.get())));
            return 1;
        });
        when(studentService.createStudentWithContract(anyMap(), anyString())).thenAnswer(invocation -> {
            Map<String, Object> payload = invocation.getArgument(0);
            String email = String.valueOf(payload.get("email"));
            String studentName = String.valueOf(payload.get("studentName"));

            studentRowsRef.set(List.of(
                buildStudent(2L, studentName, email, "0"),
                buildStudent(1L, "Alice", "alice@example.com", accountStatusRef.get())
            ));

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("studentId", 2L);
            result.put("contractId", 10L);
            result.put("contractNo", "CT21700000000000");
            result.put("loginAccount", email);
            result.put("defaultPassword", "Osg@2025");
            result.put("firstLoginRequired", true);
            return result;
        });
        when(studentService.updateStudentProfile(anyMap(), anyString())).thenAnswer(invocation -> {
            Map<String, Object> payload = invocation.getArgument(0);
            studentRowsRef.set(List.of(buildStudent(
                1L,
                String.valueOf(payload.get("studentName")),
                String.valueOf(payload.get("email")),
                accountStatusRef.get()
            )));
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("studentId", 1L);
            result.put("studentName", payload.get("studentName"));
            result.put("email", payload.get("email"));
            result.put("school", payload.get("school"));
            result.put("majorDirection", payload.get("majorDirection"));
            result.put("targetRegion", payload.get("targetRegion"));
            return result;
        });
        when(studentService.resetStudentPassword(eq(1L), anyString())).thenReturn(Map.of(
            "studentId", 1L,
            "loginAccount", "alice@example.com",
            "defaultPassword", "Osg@2025"
        ));
    }

    @Test
    void listShouldReturnStudentRowsForClerk() throws Exception
    {
        mockMvc.perform(get("/admin/student/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.rows[0].studentId").value(1))
                .andExpect(jsonPath("$.rows[0].studentName").value("Alice"))
                .andExpect(jsonPath("$.rows[0].totalHours").value(120))
                .andExpect(jsonPath("$.rows[0].remainingHours").value(120))
                .andExpect(jsonPath("$.rows[0].jobCoachingCount").value(2))
                .andExpect(jsonPath("$.rows[0].basicCourseCount").value(3))
                .andExpect(jsonPath("$.rows[0].mockInterviewCount").value(1))
                .andExpect(jsonPath("$.rows[0].contractStatus").value("normal"))
                .andExpect(jsonPath("$.rows[0].accountStatus").value("0"))
                .andExpect(jsonPath("$.rows[0].pendingReview").value(true))
                .andExpect(jsonPath("$.rows[0].reminder").value("信息待审核"));
    }

    @Test
    void listShouldProjectContractSignalsForLowHoursAndExpiringStudents() throws Exception
    {
        when(changeRequestService.selectChangeRequestList(null, "pending")).thenReturn(Collections.emptyList());
        when(studentService.selectStudentContracts(1L)).thenReturn(buildStudentContractsPayload(
            1L,
            4,
            LocalDate.now().plusDays(7).toString(),
            "active"
        ));

        mockMvc.perform(get("/admin/student/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.rows[0].totalHours").value(4))
                .andExpect(jsonPath("$.rows[0].remainingHours").value(4))
                .andExpect(jsonPath("$.rows[0].contractStatus").value("expiring"))
                .andExpect(jsonPath("$.rows[0].reminder").value("-"));
    }

    @Test
    void listShouldReturnForbiddenForUnauthorizedRole() throws Exception
    {
        mockMvc.perform(get("/admin/student/list")
                .header("Authorization", "Bearer accountant-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(403))
                .andExpect(jsonPath("$.msg").value("没有权限，请联系管理员授权"));
    }

    @Test
    void changeStatusShouldAffectSubsequentListQuery() throws Exception
    {
        mockMvc.perform(put("/admin/student/status")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"studentId\":1,\"action\":\"refund\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.accountStatus").value("3"));

        mockMvc.perform(get("/admin/student/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].accountStatus").value("3"));
    }

    @Test
    void createStudentShouldReturnCreatedPayloadForClerk() throws Exception
    {
        mockMvc.perform(post("/admin/student")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(buildCreateStudentPayload("emily@example.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.msg").value("新增学员成功"))
                .andExpect(jsonPath("$.data.studentId").value(2))
                .andExpect(jsonPath("$.data.contractId").value(10))
                .andExpect(jsonPath("$.data.loginAccount").value("emily@example.com"))
                .andExpect(jsonPath("$.data.defaultPassword").value("Osg@2025"))
                .andExpect(jsonPath("$.data.firstLoginRequired").value(true));
    }

    @Test
    void createStudentShouldMakeNewStudentAppearInSubsequentListQuery() throws Exception
    {
        mockMvc.perform(post("/admin/student")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(buildCreateStudentPayload("emily@example.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        mockMvc.perform(get("/admin/student/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].studentId").value(2))
                .andExpect(jsonPath("$.rows[0].studentName").value("Emily Zhang"))
                .andExpect(jsonPath("$.rows[0].email").value("emily@example.com"));
    }

    @Test
    void createStudentShouldReturnBusinessErrorForDuplicateEmail() throws Exception
    {
        when(studentService.createStudentWithContract(anyMap(), anyString()))
            .thenThrow(new ServiceException("邮箱已存在"));

        mockMvc.perform(post("/admin/student")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(buildCreateStudentPayload("alice@example.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("邮箱已存在"));
    }

    @Test
    void updateStudentShouldPersistEditedFieldsInSubsequentListQuery() throws Exception
    {
        mockMvc.perform(put("/admin/student")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "studentId": 1,
                      "studentName": "Alice Wang",
                      "email": "alice.wang@example.com",
                      "school": "北京大学",
                      "majorDirection": "咨询",
                      "subDirection": "Strategy",
                      "targetRegion": "北京"
                    }
                    """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.msg").value("学员信息已更新"))
                .andExpect(jsonPath("$.data.studentId").value(1))
                .andExpect(jsonPath("$.data.studentName").value("Alice Wang"))
                .andExpect(jsonPath("$.data.email").value("alice.wang@example.com"));

        mockMvc.perform(get("/admin/student/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].studentName").value("Alice Wang"))
                .andExpect(jsonPath("$.rows[0].email").value("alice.wang@example.com"));
    }

    @Test
    void resetPasswordShouldReturnDefaultPasswordPayloadForClerk() throws Exception
    {
        mockMvc.perform(post("/admin/student/reset-password")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "studentId": 1
                    }
                    """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.msg").value("学员密码已重置"))
                .andExpect(jsonPath("$.data.studentId").value(1))
                .andExpect(jsonPath("$.data.loginAccount").value("alice@example.com"))
                .andExpect(jsonPath("$.data.defaultPassword").value("Osg@2025"));
    }

    @Test
    void detailShouldReturnStudentSnapshotForClerk() throws Exception
    {
        mockMvc.perform(get("/admin/student/1")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.studentId").value(1))
                .andExpect(jsonPath("$.data.studentName").value("Alice"))
                .andExpect(jsonPath("$.data.email").value("alice@example.com"))
                .andExpect(jsonPath("$.data.school").value("清华大学"))
                .andExpect(jsonPath("$.data.major").value("金融工程"))
                .andExpect(jsonPath("$.data.targetRegion").value("上海"))
                .andExpect(jsonPath("$.data.recruitmentCycles[0]").value("2026 秋招"))
                .andExpect(jsonPath("$.data.majorDirections[0]").value("量化"))
                .andExpect(jsonPath("$.data.contact.wechat").value("alice-wechat"));
    }

    @Test
    void contractsShouldReturnSummaryAndRowsForClerk() throws Exception
    {
        mockMvc.perform(get("/admin/student/1/contracts")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.summary.totalAmount").value(39800))
                .andExpect(jsonPath("$.data.summary.totalHours").value(120))
                .andExpect(jsonPath("$.data.contracts[0].contractNo").value("CT21700000000000"))
                .andExpect(jsonPath("$.data.contracts[0].contractStatus").value("normal"))
                .andExpect(jsonPath("$.data.contracts[0].renewalReason").value("合同到期续签"))
                .andExpect(jsonPath("$.data.contracts[0].attachmentPath").value("/profile/contracts/demo.pdf"));
    }

    @Test
    void exportShouldPreserveDecimalRemainingHours() throws Exception
    {
        when(studentService.selectStudentContracts(1L)).thenReturn(buildStudentContractsPayload(
            1L,
            40,
            new BigDecimal("3.5"),
            new BigDecimal("36.5"),
            "2026-12-31",
            "normal"
        ));

        MockHttpServletResponse response = mockMvc.perform(get("/admin/student/export")
                .header("Authorization", "Bearer clerk-token"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse();

        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(response.getContentAsByteArray())))
        {
            String remainingHours = workbook.getSheetAt(0).getRow(1).getCell(11).getStringCellValue();
            org.junit.jupiter.api.Assertions.assertEquals("36.5h", remainingHours);
        }
    }

    @Test
    void detailShouldReturnForbiddenForUnauthorizedRole() throws Exception
    {
        mockMvc.perform(get("/admin/student/1")
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

    private OsgStudent buildStudent(Long studentId, String studentName, String email, String accountStatus)
    {
        OsgStudent student = new OsgStudent();
        student.setStudentId(studentId);
        student.setStudentName(studentName);
        student.setEmail(email);
        student.setLeadMentorId(101L);
        student.setSchool("清华大学");
        student.setMajorDirection("量化");
        student.setSubDirection("Quant Research");
        student.setAccountStatus(accountStatus);
        return student;
    }

    private Map<String, Object> buildStudentDetailPayload(Long studentId, String studentName, String email, String accountStatus)
    {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("studentId", studentId);
        payload.put("studentName", studentName);
        payload.put("email", email);
        payload.put("school", "清华大学");
        payload.put("major", "金融工程");
        payload.put("graduationYear", 2026);
        payload.put("targetRegion", "上海");
        payload.put("recruitmentCycles", List.of("2026 秋招"));
        payload.put("majorDirections", List.of("量化"));
        payload.put("contact", Map.of("wechat", "alice-wechat", "phone", "13800000000"));
        payload.put("accountStatus", accountStatus);
        return payload;
    }

    private Map<String, Object> buildStudentContractsPayload(Long studentId)
    {
        return buildStudentContractsPayload(studentId, 120, "2026-12-31", "normal");
    }

    private Map<String, Object> buildStudentContractsPayload(Long studentId, int totalHours, String endDate, String contractStatus)
    {
        return buildStudentContractsPayload(
            studentId,
            totalHours,
            BigDecimal.ZERO,
            BigDecimal.valueOf(totalHours),
            endDate,
            contractStatus
        );
    }

    private Map<String, Object> buildStudentContractsPayload(Long studentId, int totalHours,
        BigDecimal usedHours, BigDecimal remainingHours, String endDate, String contractStatus)
    {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalAmount", 39800);
        summary.put("usedHours", usedHours);
        summary.put("remainingHours", remainingHours);
        summary.put("totalHours", totalHours);

        Map<String, Object> contract = new LinkedHashMap<>();
        contract.put("contractId", 10L);
        contract.put("contractNo", "CT21700000000000");
        contract.put("contractType", "initial");
        contract.put("contractAmount", 39800);
        contract.put("totalHours", totalHours);
        contract.put("usedHours", usedHours);
        contract.put("remainingHours", remainingHours);
        contract.put("startDate", "2026-03-13");
        contract.put("endDate", endDate);
        contract.put("contractStatus", contractStatus);
        contract.put("renewalReason", "合同到期续签");
        contract.put("attachmentPath", "/profile/contracts/demo.pdf");

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("studentId", studentId);
        payload.put("summary", summary);
        payload.put("contracts", List.of(contract));
        return payload;
    }

    private Map<String, Object> buildPendingChangeRequestPayload(Long studentId)
    {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("requestId", 10L);
        payload.put("studentId", studentId);
        payload.put("status", "pending");
        payload.put("fieldLabel", "主攻方向");
        payload.put("beforeValue", "科技 Tech");
        payload.put("afterValue", "金融 Finance");
        return payload;
    }

    private Map<String, Integer> buildStudentActivityCountsPayload(int jobCoachingCount, int basicCourseCount, int mockInterviewCount)
    {
        Map<String, Integer> payload = new LinkedHashMap<>();
        payload.put("jobCoachingCount", jobCoachingCount);
        payload.put("basicCourseCount", basicCourseCount);
        payload.put("mockInterviewCount", mockInterviewCount);
        return payload;
    }

    private String buildCreateStudentPayload(String email)
    {
        return """
            {
              "studentName": "Emily Zhang",
              "gender": "female",
              "email": "%s",
              "school": "LSE",
              "major": "Finance",
              "graduationYear": 2026,
              "studyPlan": "postgraduate",
              "targetRegion": "United Kingdom",
              "recruitmentCycle": ["2026 Autumn"],
              "majorDirections": ["Finance"],
              "subDirection": "IB",
              "leadMentorIds": [101],
              "assistantIds": [201],
              "contractAmount": 39800,
              "totalHours": 120,
              "startDate": "2026-03-13",
              "endDate": "2026-12-31"
            }
            """.formatted(email);
    }
}
