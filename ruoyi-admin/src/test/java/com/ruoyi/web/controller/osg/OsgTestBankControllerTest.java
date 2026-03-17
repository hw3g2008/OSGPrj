package com.ruoyi.web.controller.osg;

import static org.mockito.ArgumentMatchers.any;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
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
import org.springframework.test.web.servlet.MockMvc;
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
import com.ruoyi.system.domain.OsgTestBank;
import com.ruoyi.system.mapper.OsgTestBankMapper;

@WebMvcTest(controllers = OsgTestBankController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
    SecurityConfig.class,
    PermissionService.class,
    AuthenticationEntryPointImpl.class,
    LogoutSuccessHandlerImpl.class,
    JwtAuthenticationTokenFilter.class,
    PermitAllUrlProperties.class
})
class OsgTestBankControllerTest
{
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OsgTestBankMapper testBankMapper;

    @MockBean
    private TokenService tokenService;

    @MockBean
    private RedisCache redisCache;

    private final AtomicReference<List<OsgTestBank>> bankRowsRef = new AtomicReference<>();
    private final AtomicReference<List<OsgTestBank>> applicationRowsRef = new AtomicReference<>();
    private final AtomicLong bankIdSequence = new AtomicLong(20L);

    @BeforeEach
    void setUp()
    {
        bankRowsRef.set(new ArrayList<>(buildBanks()));
        applicationRowsRef.set(new ArrayList<>(buildApplications()));
        bankIdSequence.set(30L);

        org.mockito.Mockito.when(tokenService.getLoginUser(any())).thenAnswer(invocation -> {
            HttpServletRequest request = invocation.getArgument(0);
            String authorization = request.getHeader("Authorization");
            if ("Bearer quiz-admin-token".equals(authorization))
            {
                return buildLoginUser("quiz_admin", "quiz-admin");
            }
            if ("Bearer super-admin-token".equals(authorization))
            {
                return buildLoginUser("super_admin", "super-admin");
            }
            if ("Bearer file-admin-token".equals(authorization))
            {
                return buildLoginUser("file_admin", "file-admin");
            }
            return null;
        });

        org.mockito.Mockito.when(testBankMapper.selectTestBankList(any(OsgTestBank.class)))
            .thenAnswer(invocation -> selectBanks(invocation.getArgument(0)));
        org.mockito.Mockito.when(testBankMapper.selectTestBankApplicationList(any(OsgTestBank.class)))
            .thenAnswer(invocation -> selectApplications(invocation.getArgument(0)));
        org.mockito.Mockito.when(testBankMapper.selectTestBankPendingCount())
            .thenAnswer(invocation -> (int) applicationRowsRef.get().stream()
                .filter(item -> "1".equals(item.getPendingFlag()))
                .count());
        org.mockito.Mockito.when(testBankMapper.selectTestBankByBankId(any(Long.class)))
            .thenAnswer(invocation -> selectBankById(invocation.getArgument(0)));
        org.mockito.Mockito.when(testBankMapper.insertTestBank(any(OsgTestBank.class)))
            .thenAnswer(invocation -> insertBank(invocation.getArgument(0)));
        org.mockito.Mockito.when(testBankMapper.updateTestBank(any(OsgTestBank.class)))
            .thenAnswer(invocation -> updateBank(invocation.getArgument(0)));
    }

    @Test
    void listShouldReturnBankRowsAndPendingApplicationCount() throws Exception
    {
        mockMvc.perform(get("/admin/test-bank/list")
                .header("Authorization", "Bearer quiz-admin-token")
                .param("tab", "banks"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.pendingCount").value(2))
            .andExpect(jsonPath("$.rows[0].testBankName").value("HireVue 2026"))
            .andExpect(jsonPath("$.rows[0].testType").value("HireVue"))
            .andExpect(jsonPath("$.rows[1].testType").value("SHL"));
    }

    @Test
    void listShouldReturnApplicationRowsWithClerkSource() throws Exception
    {
        mockMvc.perform(get("/admin/test-bank/list")
                .header("Authorization", "Bearer quiz-admin-token")
                .param("tab", "applications"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.pendingCount").value(2))
            .andExpect(jsonPath("$.rows[0].applicationCode").value("OT001"))
            .andExpect(jsonPath("$.rows[0].applicationSource").value("班主任流转"))
            .andExpect(jsonPath("$.rows[1].testType").value("Pymetrics"));
    }

    @Test
    void createAndEditShouldPersistAcrossSubsequentListQuery() throws Exception
    {
        mockMvc.perform(post("/admin/test-bank")
                .header("Authorization", "Bearer quiz-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "testBankName": "Pymetrics Sprint",
                      "companyName": "JPMorgan",
                      "testType": "Pymetrics",
                      "questionCount": 42,
                      "status": "enabled"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.testBankName").value("Pymetrics Sprint"));

        Long createdId = bankRowsRef.get().stream()
            .filter(item -> "Pymetrics Sprint".equals(item.getTestBankName()))
            .findFirst()
            .orElseThrow()
            .getBankId();

        mockMvc.perform(put("/admin/test-bank")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "bankId": %d,
                      "status": "disabled",
                      "questionCount": 48
                    }
                    """.formatted(createdId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.status").value("disabled"))
            .andExpect(jsonPath("$.data.questionCount").value(48));

        mockMvc.perform(get("/admin/test-bank/list")
                .header("Authorization", "Bearer quiz-admin-token")
                .param("tab", "banks"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.rows[2].testBankName").value("Pymetrics Sprint"))
            .andExpect(jsonPath("$.rows[2].status").value("disabled"))
            .andExpect(jsonPath("$.rows[2].questionCount").value(48));
    }

    @Test
    void testBankApisShouldRejectUnauthorizedRole() throws Exception
    {
        mockMvc.perform(get("/admin/test-bank/list")
                .header("Authorization", "Bearer file-admin-token"))
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
        user.setUserId(9L);
        user.setUserName(username);
        user.setPassword("password");
        user.setRoles(List.of(role));

        return new LoginUser(9L, 1L, user, OsgTestPermissions.permissionsForRole(roleKey));
    }

    private List<OsgTestBank> buildBanks()
    {
        return List.of(
            buildBank(11L, "HireVue 2026", "Goldman Sachs", "HireVue", 28, "enabled"),
            buildBank(12L, "SHL Core", "Morgan Stanley", "SHL", 18, "disabled")
        );
    }

    private List<OsgTestBank> buildApplications()
    {
        return List.of(
            buildApplication("OT001", "学员A", "Goldman Sachs - Summer Analyst", "HireVue", "班主任流转"),
            buildApplication("OT002", "学员B", "JPMorgan - Markets", "Pymetrics", "班主任流转")
        );
    }

    private OsgTestBank buildBank(Long bankId,
                                  String bankName,
                                  String companyName,
                                  String testType,
                                  int questionCount,
                                  String status)
    {
        OsgTestBank row = new OsgTestBank();
        row.setBankId(bankId);
        row.setRecordType("bank");
        row.setTestBankName(bankName);
        row.setCompanyName(companyName);
        row.setTestType(testType);
        row.setQuestionCount(questionCount);
        row.setStatus(status);
        row.setUpdatedAt(Timestamp.valueOf(LocalDateTime.of(2026, 3, 14, 9, 30).plusMinutes(bankId)));
        return row;
    }

    private OsgTestBank buildApplication(String applicationCode,
                                         String studentName,
                                         String appliedPosition,
                                         String testType,
                                         String source)
    {
        OsgTestBank row = new OsgTestBank();
        row.setRecordType("application");
        row.setApplicationCode(applicationCode);
        row.setStudentName(studentName);
        row.setAppliedPosition(appliedPosition);
        row.setTestType(testType);
        row.setApplicationSource(source);
        row.setApplicationTime(Timestamp.valueOf(LocalDateTime.of(2026, 3, 14, 10, 30)));
        row.setPendingFlag("1");
        return row;
    }

    private List<OsgTestBank> selectBanks(OsgTestBank query)
    {
        return bankRowsRef.get().stream()
            .filter(item -> query.getKeyword() == null || query.getKeyword().isBlank()
                || item.getTestBankName().contains(query.getKeyword())
                || item.getCompanyName().contains(query.getKeyword()))
            .filter(item -> query.getCompanyName() == null || query.getCompanyName().isBlank()
                || query.getCompanyName().equals(item.getCompanyName()))
            .filter(item -> query.getTestType() == null || query.getTestType().isBlank()
                || query.getTestType().equals(item.getTestType()))
            .toList();
    }

    private List<OsgTestBank> selectApplications(OsgTestBank query)
    {
        return applicationRowsRef.get().stream()
            .filter(item -> query.getKeyword() == null || query.getKeyword().isBlank()
                || item.getStudentName().contains(query.getKeyword())
                || item.getAppliedPosition().contains(query.getKeyword()))
            .toList();
    }

    private OsgTestBank selectBankById(Long bankId)
    {
        return bankRowsRef.get().stream()
            .filter(item -> java.util.Objects.equals(item.getBankId(), bankId))
            .findFirst()
            .orElse(null);
    }

    private int insertBank(OsgTestBank row)
    {
        row.setBankId(bankIdSequence.incrementAndGet());
        row.setRecordType("bank");
        row.setUpdatedAt(Timestamp.valueOf(LocalDateTime.of(2026, 3, 14, 12, 0)));
        bankRowsRef.get().add(row);
        return 1;
    }

    private int updateBank(OsgTestBank payload)
    {
        List<OsgTestBank> updated = new ArrayList<>();
        for (OsgTestBank row : bankRowsRef.get())
        {
            if (java.util.Objects.equals(row.getBankId(), payload.getBankId()))
            {
                if (payload.getTestBankName() != null) row.setTestBankName(payload.getTestBankName());
                if (payload.getCompanyName() != null) row.setCompanyName(payload.getCompanyName());
                if (payload.getTestType() != null) row.setTestType(payload.getTestType());
                if (payload.getQuestionCount() != null) row.setQuestionCount(payload.getQuestionCount());
                if (payload.getStatus() != null) row.setStatus(payload.getStatus());
                row.setUpdatedAt(Timestamp.valueOf(LocalDateTime.of(2026, 3, 14, 14, 0)));
            }
            updated.add(row);
        }
        bankRowsRef.set(updated);
        return 1;
    }
}
