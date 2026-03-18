package com.ruoyi.web.controller.osg;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
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
        when(studentService.updateStudentBlacklist(anyLong(), anyString(), anyString(), anyLong())).thenReturn(1);
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
                .andExpect(jsonPath("$.rows[0].reminder").value("待审核"));
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

    @Test
    void blacklistShouldAddStudentToBlacklistForClerk() throws Exception
    {
        mockMvc.perform(post("/admin/student/blacklist")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"studentId\":1,\"action\":\"add\",\"reason\":\"违规操作\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.msg").value("已加入黑名单"))
                .andExpect(jsonPath("$.studentId").value(1))
                .andExpect(jsonPath("$.action").value("blacklist"));
    }

    @Test
    void blacklistShouldRemoveStudentFromBlacklistForClerk() throws Exception
    {
        mockMvc.perform(post("/admin/student/blacklist")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"studentId\":1,\"action\":\"restore\",\"reason\":\"误操作恢复\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.msg").value("已移出黑名单"))
                .andExpect(jsonPath("$.studentId").value(1))
                .andExpect(jsonPath("$.action").value("remove"));
    }

    @Test
    void blacklistShouldReturnErrorForMissingParams() throws Exception
    {
        mockMvc.perform(post("/admin/student/blacklist")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"缺少必填参数\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("参数缺失"));
    }

    // ==================== NEW TEST METHODS FOR BRANCH COVERAGE ====================

    @Test
    void changeStatusShouldResolveFreezeAction() throws Exception
    {
        when(studentService.changeStudentStatus(eq(1L), eq("1"), anyString())).thenReturn(1);

        mockMvc.perform(put("/admin/student/status")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"studentId\":1,\"action\":\"freeze\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.accountStatus").value("1"));
    }

    @Test
    void changeStatusShouldResolveRestoreAction() throws Exception
    {
        when(studentService.changeStudentStatus(eq(1L), eq("0"), anyString())).thenReturn(1);

        mockMvc.perform(put("/admin/student/status")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"studentId\":1,\"action\":\"restore\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.accountStatus").value("0"));
    }

    @Test
    void changeStatusShouldResolveDirectAccountStatusValues() throws Exception
    {
        when(studentService.changeStudentStatus(eq(1L), eq("2"), anyString())).thenReturn(1);

        mockMvc.perform(put("/admin/student/status")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"studentId\":1,\"accountStatus\":\"2\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.accountStatus").value("2"));
    }

    @Test
    void changeStatusShouldReturnErrorForInvalidAccountStatus() throws Exception
    {
        mockMvc.perform(put("/admin/student/status")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"studentId\":1,\"accountStatus\":\"invalid\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("参数缺失"));
    }

    @Test
    void changeStatusShouldReturnErrorWhenMissingStudentId() throws Exception
    {
        mockMvc.perform(put("/admin/student/status")
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
        when(studentService.changeStudentStatus(eq(1L), eq("1"), anyString())).thenReturn(0);

        mockMvc.perform(put("/admin/student/status")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"studentId\":1,\"action\":\"freeze\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("学员状态更新失败"));
    }

    @Test
    void detailShouldReturnErrorWhenStudentNotFound() throws Exception
    {
        when(studentService.selectStudentDetail(999L)).thenReturn(null);

        mockMvc.perform(get("/admin/student/999")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("学员不存在"));
    }

    @Test
    void detailShouldReturnErrorWhenDetailIsEmptyMap() throws Exception
    {
        when(studentService.selectStudentDetail(999L)).thenReturn(Collections.emptyMap());

        mockMvc.perform(get("/admin/student/999")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("学员不存在"));
    }

    @Test
    void contractsShouldReturnErrorWhenStudentNotFound() throws Exception
    {
        when(studentService.selectStudentContracts(999L)).thenReturn(null);

        mockMvc.perform(get("/admin/student/999/contracts")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("学员不存在"));
    }

    @Test
    void contractsShouldReturnErrorWhenContractsIsEmptyMap() throws Exception
    {
        when(studentService.selectStudentContracts(999L)).thenReturn(Collections.emptyMap());

        mockMvc.perform(get("/admin/student/999/contracts")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("学员不存在"));
    }

    @Test
    void createShouldReturnErrorWhenBodyIsEmpty() throws Exception
    {
        mockMvc.perform(post("/admin/student")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("参数缺失"));
    }

    @Test
    void updateShouldReturnErrorWhenBodyIsEmpty() throws Exception
    {
        mockMvc.perform(put("/admin/student")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("参数缺失"));
    }

    @Test
    void updateShouldReturnErrorWhenServiceThrows() throws Exception
    {
        when(studentService.updateStudentProfile(anyMap(), anyString()))
            .thenThrow(new ServiceException("更新失败"));

        mockMvc.perform(put("/admin/student")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"studentId\":1,\"studentName\":\"Test\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("更新失败"));
    }

    @Test
    void resetPasswordShouldReturnErrorWhenStudentIdMissing() throws Exception
    {
        mockMvc.perform(post("/admin/student/reset-password")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("studentId不能为空"));
    }

    @Test
    void resetPasswordShouldReturnErrorWhenServiceThrows() throws Exception
    {
        when(studentService.resetStudentPassword(eq(1L), anyString()))
            .thenThrow(new ServiceException("学员不存在"));

        mockMvc.perform(post("/admin/student/reset-password")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"studentId\":1}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("学员不存在"));
    }

    @Test
    void blacklistShouldNormalizeBlacklistActionValue() throws Exception
    {
        mockMvc.perform(post("/admin/student/blacklist")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"studentId\":1,\"action\":\"blacklist\",\"reason\":\"系统操作\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.msg").value("已加入黑名单"))
                .andExpect(jsonPath("$.action").value("blacklist"));
    }

    @Test
    void blacklistShouldNormalizeRemoveAction() throws Exception
    {
        mockMvc.perform(post("/admin/student/blacklist")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"studentId\":1,\"action\":\"remove\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.msg").value("已移出黑名单"))
                .andExpect(jsonPath("$.action").value("remove"));
    }

    @Test
    void blacklistShouldReturnErrorForInvalidAction() throws Exception
    {
        mockMvc.perform(post("/admin/student/blacklist")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"studentId\":1,\"action\":\"invalid\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("参数缺失"));
    }

    @Test
    void blacklistShouldReturnErrorWhenRowsNotAffected() throws Exception
    {
        when(studentService.updateStudentBlacklist(anyLong(), anyString(), anyString(), anyLong())).thenReturn(0);

        mockMvc.perform(post("/admin/student/blacklist")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"studentId\":1,\"action\":\"add\",\"reason\":\"test\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("黑名单状态未变更"));
    }

    @Test
    void blacklistShouldUseDefaultReasonWhenReasonMissing() throws Exception
    {
        mockMvc.perform(post("/admin/student/blacklist")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"studentId\":1,\"action\":\"add\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.msg").value("已加入黑名单"));
    }

    @Test
    void listShouldShowBlacklistedStudentFlag() throws Exception
    {
        when(studentService.selectBlacklistedStudentIds(anyList())).thenReturn(List.of(1L));
        when(changeRequestService.selectChangeRequestList(null, "pending")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/admin/student/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].isBlacklisted").value(true))
                .andExpect(jsonPath("$.rows[0].pendingReview").value(false))
                .andExpect(jsonPath("$.rows[0].reminder").value("-"));
    }

    @Test
    void listShouldHandleNullContractsPayload() throws Exception
    {
        when(studentService.selectStudentContracts(1L)).thenReturn(null);
        when(changeRequestService.selectChangeRequestList(null, "pending")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/admin/student/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].totalHours").value(0))
                .andExpect(jsonPath("$.rows[0].remainingHours").value(0))
                .andExpect(jsonPath("$.rows[0].contractStatus").value("normal"));
    }

    @Test
    void listShouldHandleEmptyContractsPayload() throws Exception
    {
        when(studentService.selectStudentContracts(1L)).thenReturn(Collections.emptyMap());
        when(changeRequestService.selectChangeRequestList(null, "pending")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/admin/student/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].totalHours").value(0))
                .andExpect(jsonPath("$.rows[0].contractStatus").value("normal"));
    }

    @Test
    void listShouldHandleContractsWithNonMapSummary() throws Exception
    {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("studentId", 1L);
        payload.put("summary", "not-a-map");
        payload.put("contracts", List.of());
        when(studentService.selectStudentContracts(1L)).thenReturn(payload);
        when(changeRequestService.selectChangeRequestList(null, "pending")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/admin/student/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].totalHours").value(0))
                .andExpect(jsonPath("$.rows[0].contractStatus").value("normal"));
    }

    @Test
    void listShouldHandleContractsWithNonListContracts() throws Exception
    {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalHours", 50);
        summary.put("remainingHours", new BigDecimal("45"));
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("studentId", 1L);
        payload.put("summary", summary);
        payload.put("contracts", "not-a-list");
        when(studentService.selectStudentContracts(1L)).thenReturn(payload);
        when(changeRequestService.selectChangeRequestList(null, "pending")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/admin/student/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].totalHours").value(50))
                .andExpect(jsonPath("$.rows[0].contractStatus").value("normal"));
    }

    @Test
    void listShouldDeriveContractStatusAsActiveNormal() throws Exception
    {
        when(studentService.selectStudentContracts(1L)).thenReturn(buildStudentContractsPayload(
            1L, 100, LocalDate.now().plusDays(60).toString(), "active"
        ));
        when(changeRequestService.selectChangeRequestList(null, "pending")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/admin/student/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].contractStatus").value("normal"));
    }

    @Test
    void listShouldDeriveContractStatusAsNonActiveLatestStatus() throws Exception
    {
        when(studentService.selectStudentContracts(1L)).thenReturn(buildStudentContractsPayload(
            1L, 100, LocalDate.now().plusDays(60).toString(), "completed"
        ));
        when(changeRequestService.selectChangeRequestList(null, "pending")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/admin/student/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].contractStatus").value("completed"));
    }

    @Test
    void listShouldHandleNullStudentIdInPendingReviewRequest() throws Exception
    {
        Map<String, Object> requestWithNullId = new LinkedHashMap<>();
        requestWithNullId.put("requestId", 20L);
        requestWithNullId.put("studentId", null);
        requestWithNullId.put("status", "pending");
        when(changeRequestService.selectChangeRequestList(null, "pending")).thenReturn(List.of(requestWithNullId));

        mockMvc.perform(get("/admin/student/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].pendingReview").value(false));
    }

    @Test
    void listShouldHandleStudentWithNullAccountStatus() throws Exception
    {
        studentRowsRef.set(List.of(buildStudent(1L, "Alice", "alice@example.com", null)));
        when(changeRequestService.selectChangeRequestList(null, "pending")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/admin/student/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].accountStatus").value("0"));
    }

    @Test
    void listShouldHandleStudentWithNullLeadMentorId() throws Exception
    {
        OsgStudent student = buildStudent(1L, "Alice", "alice@example.com", "0");
        student.setLeadMentorId(null);
        studentRowsRef.set(List.of(student));
        when(changeRequestService.selectChangeRequestList(null, "pending")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/admin/student/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].leadMentorName").value("-"));
    }

    @Test
    void listShouldHandleStudentWithNullSubDirection() throws Exception
    {
        OsgStudent student = buildStudent(1L, "Alice", "alice@example.com", "0");
        student.setSubDirection(null);
        studentRowsRef.set(List.of(student));
        when(changeRequestService.selectChangeRequestList(null, "pending")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/admin/student/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].targetPosition").value("-"));
    }

    @Test
    void listShouldHandleNoActivityCountsForStudent() throws Exception
    {
        when(studentService.selectStudentActivityCounts(anyList())).thenReturn(Collections.emptyMap());
        when(changeRequestService.selectChangeRequestList(null, "pending")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/admin/student/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].jobCoachingCount").value(0))
                .andExpect(jsonPath("$.rows[0].basicCourseCount").value(0))
                .andExpect(jsonPath("$.rows[0].mockInterviewCount").value(0));
    }

    @Test
    void listShouldHandleNullActivityCounts() throws Exception
    {
        when(studentService.selectStudentActivityCounts(anyList())).thenReturn(null);
        when(changeRequestService.selectChangeRequestList(null, "pending")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/admin/student/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].jobCoachingCount").value(0));
    }

    @Test
    void changeStatusShouldResolveDirectAccountStatus0() throws Exception
    {
        when(studentService.changeStudentStatus(eq(1L), eq("0"), anyString())).thenReturn(1);

        mockMvc.perform(put("/admin/student/status")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"studentId\":1,\"accountStatus\":\"0\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.accountStatus").value("0"));
    }

    @Test
    void changeStatusShouldResolveDirectAccountStatus1() throws Exception
    {
        when(studentService.changeStudentStatus(eq(1L), eq("1"), anyString())).thenReturn(1);

        mockMvc.perform(put("/admin/student/status")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"studentId\":1,\"accountStatus\":\"1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.accountStatus").value("1"));
    }

    @Test
    void exportShouldHandleBlacklistedStudent() throws Exception
    {
        when(studentService.selectBlacklistedStudentIds(anyList())).thenReturn(List.of(1L));

        MockHttpServletResponse response = mockMvc.perform(get("/admin/student/export")
                .header("Authorization", "Bearer clerk-token"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse();

        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(response.getContentAsByteArray())))
        {
            String reminder = workbook.getSheetAt(0).getRow(1).getCell(12).getStringCellValue();
            org.junit.jupiter.api.Assertions.assertEquals("黑名单", reminder);
        }
    }

    @Test
    void listShouldDeriveContractStatusWithActiveEndDateBeforeToday() throws Exception
    {
        when(studentService.selectStudentContracts(1L)).thenReturn(buildStudentContractsPayload(
            1L, 100, LocalDate.now().minusDays(5).toString(), "active"
        ));
        when(changeRequestService.selectChangeRequestList(null, "pending")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/admin/student/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].contractStatus").value("normal"));
    }

    @Test
    void listShouldDeriveContractStatusWithActiveEndDateExactlyAtThreshold() throws Exception
    {
        when(studentService.selectStudentContracts(1L)).thenReturn(buildStudentContractsPayload(
            1L, 100, LocalDate.now().plusDays(30).toString(), "active"
        ));
        when(changeRequestService.selectChangeRequestList(null, "pending")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/admin/student/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].contractStatus").value("expiring"));
    }

    @Test
    void listShouldDeriveContractStatusWithNullEndDate() throws Exception
    {
        Map<String, Object> contract = new LinkedHashMap<>();
        contract.put("contractStatus", "active");
        contract.put("endDate", null);
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalHours", 100);
        summary.put("remainingHours", BigDecimal.valueOf(100));
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("studentId", 1L);
        payload.put("summary", summary);
        payload.put("contracts", List.of(contract));
        when(studentService.selectStudentContracts(1L)).thenReturn(payload);
        when(changeRequestService.selectChangeRequestList(null, "pending")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/admin/student/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].contractStatus").value("normal"));
    }

    @Test
    void changeStatusShouldHandleStringStudentId() throws Exception
    {
        when(studentService.changeStudentStatus(eq(1L), eq("1"), anyString())).thenReturn(1);

        mockMvc.perform(put("/admin/student/status")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"studentId\":\"1\",\"action\":\"freeze\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void changeStatusShouldHandleNonParsableStudentId() throws Exception
    {
        mockMvc.perform(put("/admin/student/status")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"studentId\":\"abc\",\"action\":\"freeze\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("参数缺失"));
    }

    @Test
    void listShouldHandleContractWithDateAsJavaSqlDate() throws Exception
    {
        Map<String, Object> contract = new LinkedHashMap<>();
        contract.put("contractStatus", "active");
        contract.put("endDate", java.sql.Date.valueOf(LocalDate.now().plusDays(10)));
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalHours", 100);
        summary.put("remainingHours", BigDecimal.valueOf(100));
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("studentId", 1L);
        payload.put("summary", summary);
        payload.put("contracts", List.of(contract));
        when(studentService.selectStudentContracts(1L)).thenReturn(payload);
        when(changeRequestService.selectChangeRequestList(null, "pending")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/admin/student/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].contractStatus").value("expiring"));
    }

    @Test
    void listShouldHandleContractWithDateAsJavaUtilDate() throws Exception
    {
        java.util.Date utilDate = java.util.Date.from(
            LocalDate.now().plusDays(15).atStartOfDay(java.time.ZoneId.systemDefault()).toInstant());
        Map<String, Object> contract = new LinkedHashMap<>();
        contract.put("contractStatus", "active");
        contract.put("endDate", utilDate);
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalHours", 100);
        summary.put("remainingHours", BigDecimal.valueOf(100));
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("studentId", 1L);
        payload.put("summary", summary);
        payload.put("contracts", List.of(contract));
        when(studentService.selectStudentContracts(1L)).thenReturn(payload);
        when(changeRequestService.selectChangeRequestList(null, "pending")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/admin/student/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].contractStatus").value("expiring"));
    }

    @Test
    void listShouldHandleContractWithInvalidDateString() throws Exception
    {
        Map<String, Object> contract = new LinkedHashMap<>();
        contract.put("contractStatus", "active");
        contract.put("endDate", "not-a-date");
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalHours", 100);
        summary.put("remainingHours", BigDecimal.valueOf(100));
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("studentId", 1L);
        payload.put("summary", summary);
        payload.put("contracts", List.of(contract));
        when(studentService.selectStudentContracts(1L)).thenReturn(payload);
        when(changeRequestService.selectChangeRequestList(null, "pending")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/admin/student/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].contractStatus").value("normal"));
    }

    @Test
    void listShouldHandleSummaryWithStringTotalHours() throws Exception
    {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalHours", "50");
        summary.put("remainingHours", "45.5");
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("studentId", 1L);
        payload.put("summary", summary);
        payload.put("contracts", List.of());
        when(studentService.selectStudentContracts(1L)).thenReturn(payload);
        when(changeRequestService.selectChangeRequestList(null, "pending")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/admin/student/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].totalHours").value(50))
                .andExpect(jsonPath("$.rows[0].remainingHours").value(45.5));
    }

    @Test
    void listShouldHandleSummaryWithNonParsableValues() throws Exception
    {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalHours", "abc");
        summary.put("remainingHours", "xyz");
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("studentId", 1L);
        payload.put("summary", summary);
        payload.put("contracts", List.of());
        when(studentService.selectStudentContracts(1L)).thenReturn(payload);
        when(changeRequestService.selectChangeRequestList(null, "pending")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/admin/student/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].totalHours").value(0))
                .andExpect(jsonPath("$.rows[0].remainingHours").value(0));
    }

    @Test
    void listShouldHandleContractWithNullContractStatus() throws Exception
    {
        Map<String, Object> contract = new LinkedHashMap<>();
        contract.put("contractStatus", null);
        contract.put("endDate", LocalDate.now().plusDays(10).toString());
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalHours", 100);
        summary.put("remainingHours", BigDecimal.valueOf(100));
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("studentId", 1L);
        payload.put("summary", summary);
        payload.put("contracts", List.of(contract));
        when(studentService.selectStudentContracts(1L)).thenReturn(payload);
        when(changeRequestService.selectChangeRequestList(null, "pending")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/admin/student/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].contractStatus").value("normal"));
    }

    @Test
    void listShouldHandleContractWithLocalDateEndDate() throws Exception
    {
        Map<String, Object> contract = new LinkedHashMap<>();
        contract.put("contractStatus", "active");
        contract.put("endDate", LocalDate.now().plusDays(20));
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalHours", 100);
        summary.put("remainingHours", BigDecimal.valueOf(100));
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("studentId", 1L);
        payload.put("summary", summary);
        payload.put("contracts", List.of(contract));
        when(studentService.selectStudentContracts(1L)).thenReturn(payload);
        when(changeRequestService.selectChangeRequestList(null, "pending")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/admin/student/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].contractStatus").value("expiring"));
    }

    @Test
    void listShouldHandleSummaryWithDoubleRemainingHours() throws Exception
    {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalHours", 100.0);
        summary.put("remainingHours", 95.5);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("studentId", 1L);
        payload.put("summary", summary);
        payload.put("contracts", List.of());
        when(studentService.selectStudentContracts(1L)).thenReturn(payload);
        when(changeRequestService.selectChangeRequestList(null, "pending")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/admin/student/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].totalHours").value(100));
    }

    @Test
    void changeStatusShouldHandleEmptyStringAction() throws Exception
    {
        mockMvc.perform(put("/admin/student/status")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"studentId\":1,\"action\":\" \"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.msg").value("参数缺失"));
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

    // ==================== ADDITIONAL BRANCH COVERAGE TESTS ====================

    @Test
    void listShouldHandleContractsListWithNonMapItems() throws Exception
    {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalHours", 50);
        summary.put("remainingHours", BigDecimal.valueOf(50));
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("studentId", 1L);
        payload.put("summary", summary);
        List<Object> contracts = new java.util.ArrayList<>();
        contracts.add("not-a-map");
        contracts.add(null);
        Map<String, Object> validContract = new LinkedHashMap<>();
        validContract.put("contractStatus", "normal");
        validContract.put("endDate", LocalDate.now().plusDays(60).toString());
        contracts.add(validContract);
        payload.put("contracts", contracts);
        when(studentService.selectStudentContracts(1L)).thenReturn(payload);
        when(changeRequestService.selectChangeRequestList(null, "pending")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/admin/student/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].totalHours").value(50));
    }

    @Test
    void exportShouldFormatAllAccountStatuses() throws Exception
    {
        studentRowsRef.set(List.of(
            buildStudent(1L, "A1", "a1@e.com", "1"),
            buildStudent(2L, "A2", "a2@e.com", "2"),
            buildStudent(3L, "A3", "a3@e.com", "3"),
            buildStudent(4L, "A4", "a4@e.com", "0")
        ));
        when(studentService.selectStudentActivityCounts(anyList())).thenReturn(Collections.emptyMap());
        when(studentService.selectBlacklistedStudentIds(anyList())).thenReturn(Collections.emptyList());
        when(studentService.selectStudentContracts(anyLong())).thenReturn(Collections.emptyMap());

        MockHttpServletResponse response = mockMvc.perform(get("/admin/student/export")
                .header("Authorization", "Bearer clerk-token"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse();

        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(response.getContentAsByteArray())))
        {
            org.junit.jupiter.api.Assertions.assertEquals("冻结", workbook.getSheetAt(0).getRow(1).getCell(13).getStringCellValue());
            org.junit.jupiter.api.Assertions.assertEquals("已结束", workbook.getSheetAt(0).getRow(2).getCell(13).getStringCellValue());
            org.junit.jupiter.api.Assertions.assertEquals("退费", workbook.getSheetAt(0).getRow(3).getCell(13).getStringCellValue());
            org.junit.jupiter.api.Assertions.assertEquals("正常", workbook.getSheetAt(0).getRow(4).getCell(13).getStringCellValue());
        }
    }

    @Test
    void changeStatusShouldResolveDirectAccountStatus3() throws Exception
    {
        when(studentService.changeStudentStatus(eq(1L), eq("3"), anyString())).thenReturn(1);

        mockMvc.perform(put("/admin/student/status")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"studentId\":1,\"accountStatus\":\"3\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.accountStatus").value("3"));
    }

    @Test
    void listShouldHandleContractWithEndDateAfterThreshold() throws Exception
    {
        when(studentService.selectStudentContracts(1L)).thenReturn(buildStudentContractsPayload(
            1L, 100, LocalDate.now().plusDays(31).toString(), "active"
        ));
        when(changeRequestService.selectChangeRequestList(null, "pending")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/admin/student/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].contractStatus").value("normal"));
    }

    @Test
    void listShouldHandleSummaryWithBigDecimalTotalHours() throws Exception
    {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalHours", new BigDecimal("75"));
        summary.put("remainingHours", new BigDecimal("60.0"));
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("studentId", 1L);
        payload.put("summary", summary);
        payload.put("contracts", List.of());
        when(studentService.selectStudentContracts(1L)).thenReturn(payload);
        when(changeRequestService.selectChangeRequestList(null, "pending")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/admin/student/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].totalHours").value(75));
    }
}
