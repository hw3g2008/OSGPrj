package com.ruoyi.web.controller.osg;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import jakarta.servlet.http.HttpServletRequest;
import com.ruoyi.common.core.domain.entity.SysRole;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.core.redis.RedisCache;
import com.ruoyi.framework.config.SecurityConfig;
import com.ruoyi.framework.config.ServerConfig;
import com.ruoyi.framework.config.properties.PermitAllUrlProperties;
import com.ruoyi.framework.security.filter.JwtAuthenticationTokenFilter;
import com.ruoyi.framework.security.handle.AuthenticationEntryPointImpl;
import com.ruoyi.framework.security.handle.LogoutSuccessHandlerImpl;
import com.ruoyi.framework.web.service.PermissionService;
import com.ruoyi.framework.web.service.TokenService;
import com.ruoyi.system.domain.OsgContract;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.OsgContractMapper;
import com.ruoyi.system.mapper.OsgStudentMapper;
import com.ruoyi.system.service.impl.OsgContractServiceImpl;

@WebMvcTest(controllers = OsgContractController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
    SecurityConfig.class,
    PermissionService.class,
    AuthenticationEntryPointImpl.class,
    LogoutSuccessHandlerImpl.class,
    JwtAuthenticationTokenFilter.class,
    PermitAllUrlProperties.class,
    OsgContractServiceImpl.class
})
class OsgContractControllerTest
{
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OsgContractMapper contractMapper;

    @MockBean
    private OsgStudentMapper studentMapper;

    @MockBean
    private JdbcTemplate jdbcTemplate;

    @MockBean
    private TokenService tokenService;

    @MockBean
    private RedisCache redisCache;

    @MockBean
    private ServerConfig serverConfig;

    private final AtomicReference<List<OsgContract>> contractRowsRef = new AtomicReference<>();

    private final AtomicReference<Map<String, Object>> statsRef = new AtomicReference<>();

    private final AtomicLong contractIdSeed = new AtomicLong(200L);

    @BeforeEach
    void setUp()
    {
        contractRowsRef.set(List.of(buildContract(101L, "CT20260313001", "initial", new BigDecimal("39800"), 120, "active", null)));
        statsRef.set(buildStatsPayload(1, 1, 0, 0, new BigDecimal("39800"), 120, 0, 120));

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

        when(serverConfig.getUrl()).thenReturn("http://127.0.0.1:28080");
        when(studentMapper.selectStudentByStudentId(1L)).thenReturn(buildStudent(1L, "Alice"));
        when(contractMapper.selectContractList(any(OsgContract.class))).thenAnswer(invocation -> contractRowsRef.get());
        when(contractMapper.selectContractStats(any(OsgContract.class))).thenAnswer(invocation -> statsRef.get());
        when(contractMapper.insertContract(any(OsgContract.class))).thenAnswer(invocation -> {
            OsgContract contract = invocation.getArgument(0);
            long contractId = contractIdSeed.incrementAndGet();
            contract.setContractId(contractId);

            List<OsgContract> updatedRows = List.of(
                buildContract(contractId, contract.getContractNo(), contract.getContractType(),
                    contract.getContractAmount(), contract.getTotalHours(), contract.getContractStatus(), contract.getRenewalReason()),
                contractRowsRef.get().get(0)
            );
            contractRowsRef.set(updatedRows);
            statsRef.set(buildStatsPayload(
                updatedRows.size(),
                2,
                0,
                0,
                contract.getContractAmount().add(new BigDecimal("39800")),
                120 + contract.getTotalHours(),
                0,
                120 + contract.getTotalHours()
            ));
            return 1;
        });
    }

    @Test
    void renewShouldMakeNewContractAppearInSubsequentListQuery() throws Exception
    {
        mockMvc.perform(post("/admin/contract/renew")
                .header("Authorization", "Bearer clerk-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "studentId": 1,
                      "contractAmount": 5000,
                      "totalHours": 20,
                      "startDate": "2026-03-13",
                      "endDate": "2026-06-13",
                      "renewalReason": "合同到期续签",
                      "remark": "自动化测试续签"
                    }
                    """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.msg").value("续签合同成功"))
                .andExpect(jsonPath("$.data.studentId").value(1))
                .andExpect(jsonPath("$.data.contractType").value("renew"))
                .andExpect(jsonPath("$.data.renewalReason").value("合同到期续签"));

        mockMvc.perform(get("/admin/contract/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].studentId").value(1))
                .andExpect(jsonPath("$.rows[0].contractType").value("renew"))
                .andExpect(jsonPath("$.rows[0].renewalReason").value("合同到期续签"))
                .andExpect(jsonPath("$.rows[1].contractNo").value("CT20260313001"));
    }

    @Test
    void statsShouldReturnComputedSummaryForClerk() throws Exception
    {
        mockMvc.perform(get("/admin/contract/stats")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.totalContracts").value(1))
                .andExpect(jsonPath("$.data.activeContracts").value(1))
                .andExpect(jsonPath("$.data.expiringContracts").value(0))
                .andExpect(jsonPath("$.data.endedContracts").value(0))
                .andExpect(jsonPath("$.data.totalAmount").value(39800))
                .andExpect(jsonPath("$.data.totalHours").value(120))
                .andExpect(jsonPath("$.data.remainingHours").value(120));
    }

    @Test
    void uploadShouldRejectNonPdfAttachment() throws Exception
    {
        MockMultipartFile file = new MockMultipartFile(
            "file",
            "contract.txt",
            MediaType.TEXT_PLAIN_VALUE,
            "not pdf".getBytes()
        );

        var request = multipart("/admin/contract/upload")
            .file(file)
            .param("contractId", "101");
        request.with(req -> {
            req.setMethod("POST");
            return req;
        });

        mockMvc.perform(request.header("Authorization", "Bearer clerk-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(500))
            .andExpect(jsonPath("$.msg").value("文件[contract.txt]后缀[txt]不正确，请上传[pdf]格式"));
    }

    @Test
    void exportShouldReturnExcelForClerk() throws Exception
    {
        mockMvc.perform(get("/admin/contract/export")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk());
    }

    private LoginUser buildLoginUser(String userName, String roleKey)
    {
        SysUser user = new SysUser();
        user.setUserId("clerk".equals(roleKey) ? 1L : 2L);
        user.setUserName(userName);
        user.setNickName(userName);

        SysRole role = new SysRole();
        role.setRoleId("clerk".equals(roleKey) ? 10L : 20L);
        role.setRoleKey(roleKey);
        user.setRoles(List.of(role));

        return new LoginUser(user.getUserId(), 1L, user, OsgTestPermissions.permissionsForRole(roleKey));
    }

    private OsgStudent buildStudent(Long studentId, String studentName)
    {
        OsgStudent student = new OsgStudent();
        student.setStudentId(studentId);
        student.setStudentName(studentName);
        student.setLeadMentorId(7L);
        return student;
    }

    private OsgContract buildContract(Long contractId, String contractNo, String contractType,
                                      BigDecimal amount, Integer totalHours, String contractStatus,
                                      String renewalReason)
    {
        OsgContract contract = new OsgContract();
        contract.setContractId(contractId);
        contract.setContractNo(contractNo);
        contract.setStudentId(1L);
        contract.setStudentName("Alice");
        contract.setLeadMentorId(7L);
        contract.setLeadMentorName("Lead Mentor");
        contract.setContractType(contractType);
        contract.setContractAmount(amount);
        contract.setTotalHours(totalHours);
        contract.setUsedHours(BigDecimal.ZERO);
        contract.setRemainingHours(BigDecimal.valueOf(totalHours));
        contract.setStartDate(Date.valueOf(LocalDate.of(2026, 3, 13)));
        contract.setEndDate(Date.valueOf(LocalDate.of(2026, 6, 13)));
        contract.setRenewalReason(renewalReason);
        contract.setContractStatus(contractStatus);
        return contract;
    }

    private Map<String, Object> buildStatsPayload(int totalContracts, int activeContracts, int expiringContracts,
                                                  int endedContracts, BigDecimal totalAmount, int totalHours,
                                                  int usedHours, int remainingHours)
    {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("totalContracts", totalContracts);
        payload.put("activeContracts", activeContracts);
        payload.put("expiringContracts", expiringContracts);
        payload.put("endedContracts", endedContracts);
        payload.put("totalAmount", totalAmount);
        payload.put("totalHours", totalHours);
        payload.put("usedHours", usedHours);
        payload.put("remainingHours", remainingHours);
        return payload;
    }
}
