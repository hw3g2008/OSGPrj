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
import com.ruoyi.system.domain.OsgInterviewBank;
import com.ruoyi.system.mapper.OsgInterviewBankMapper;

@WebMvcTest(controllers = OsgInterviewBankController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
    SecurityConfig.class,
    PermissionService.class,
    AuthenticationEntryPointImpl.class,
    LogoutSuccessHandlerImpl.class,
    JwtAuthenticationTokenFilter.class,
    PermitAllUrlProperties.class
})
class OsgInterviewBankControllerTest
{
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OsgInterviewBankMapper interviewBankMapper;

    @MockBean
    private TokenService tokenService;

    @MockBean
    private RedisCache redisCache;

    private final AtomicReference<List<OsgInterviewBank>> bankRowsRef = new AtomicReference<>();
    private final AtomicReference<List<OsgInterviewBank>> applicationRowsRef = new AtomicReference<>();
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

        org.mockito.Mockito.when(interviewBankMapper.selectInterviewBankList(any(OsgInterviewBank.class)))
            .thenAnswer(invocation -> selectBanks(invocation.getArgument(0)));
        org.mockito.Mockito.when(interviewBankMapper.selectInterviewBankApplicationList(any(OsgInterviewBank.class)))
            .thenAnswer(invocation -> selectApplications(invocation.getArgument(0)));
        org.mockito.Mockito.when(interviewBankMapper.selectInterviewBankPendingCount())
            .thenAnswer(invocation -> (int) applicationRowsRef.get().stream()
                .filter(item -> "1".equals(item.getPendingFlag()))
                .count());
        org.mockito.Mockito.when(interviewBankMapper.selectInterviewBankByBankId(any(Long.class)))
            .thenAnswer(invocation -> selectBankById(invocation.getArgument(0)));
        org.mockito.Mockito.when(interviewBankMapper.insertInterviewBank(any(OsgInterviewBank.class)))
            .thenAnswer(invocation -> insertBank(invocation.getArgument(0)));
        org.mockito.Mockito.when(interviewBankMapper.updateInterviewBank(any(OsgInterviewBank.class)))
            .thenAnswer(invocation -> updateBank(invocation.getArgument(0)));
    }

    @Test
    void listShouldReturnInterviewBankRowsAndPendingApplicationCount() throws Exception
    {
        mockMvc.perform(get("/admin/interview-bank/list")
                .header("Authorization", "Bearer quiz-admin-token")
                .param("tab", "banks"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.pendingCount").value(2))
            .andExpect(jsonPath("$.rows[0].interviewBankName").value("GS Superday Sprint"))
            .andExpect(jsonPath("$.rows[0].interviewStage").value("Superday"))
            .andExpect(jsonPath("$.rows[1].interviewType").value("Case"));
    }

    @Test
    void listShouldReturnApplicationRowsWithClerkSource() throws Exception
    {
        mockMvc.perform(get("/admin/interview-bank/list")
                .header("Authorization", "Bearer quiz-admin-token")
                .param("tab", "applications"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.pendingCount").value(2))
            .andExpect(jsonPath("$.rows[0].applicationCode").value("IV001"))
            .andExpect(jsonPath("$.rows[0].applicationSource").value("班主任流转"))
            .andExpect(jsonPath("$.rows[1].interviewStage").value("Superday"));
    }

    @Test
    void createAndEditShouldPersistAcrossSubsequentListQuery() throws Exception
    {
        mockMvc.perform(post("/admin/interview-bank")
                .header("Authorization", "Bearer quiz-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "interviewBankName": "PE Technical Deck",
                      "interviewStage": "First Round",
                      "interviewType": "Technical",
                      "industryName": "PE",
                      "questionCount": 36,
                      "status": "enabled"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.interviewBankName").value("PE Technical Deck"));

        Long createdId = bankRowsRef.get().stream()
            .filter(item -> "PE Technical Deck".equals(item.getInterviewBankName()))
            .findFirst()
            .orElseThrow()
            .getBankId();

        mockMvc.perform(put("/admin/interview-bank")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "bankId": %d,
                      "interviewStage": "Second Round",
                      "questionCount": 40,
                      "status": "disabled"
                    }
                    """.formatted(createdId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.interviewStage").value("Second Round"))
            .andExpect(jsonPath("$.data.status").value("disabled"));

        mockMvc.perform(get("/admin/interview-bank/list")
                .header("Authorization", "Bearer quiz-admin-token")
                .param("tab", "banks"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.rows[2].interviewBankName").value("PE Technical Deck"))
            .andExpect(jsonPath("$.rows[2].interviewStage").value("Second Round"))
            .andExpect(jsonPath("$.rows[2].questionCount").value(40));
    }

    @Test
    void interviewBankApisShouldRejectUnauthorizedRole() throws Exception
    {
        mockMvc.perform(get("/admin/interview-bank/list")
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

    private List<OsgInterviewBank> buildBanks()
    {
        return List.of(
            buildBank(11L, "GS Superday Sprint", "Superday", "Behavioral", "Investment Banking", 24, "enabled"),
            buildBank(12L, "MBB Case Core", "Second Round", "Case", "Consulting", 18, "disabled")
        );
    }

    private List<OsgInterviewBank> buildApplications()
    {
        return List.of(
            buildApplication("IV001", "学员A", "Goldman Sachs - Summer Analyst", "First Round"),
            buildApplication("IV002", "学员B", "Bain - Associate Consultant", "Superday")
        );
    }

    private OsgInterviewBank buildBank(Long bankId,
                                       String bankName,
                                       String stage,
                                       String type,
                                       String industry,
                                       int questionCount,
                                       String status)
    {
        OsgInterviewBank row = new OsgInterviewBank();
        row.setBankId(bankId);
        row.setRecordType("bank");
        row.setInterviewBankName(bankName);
        row.setInterviewStage(stage);
        row.setInterviewType(type);
        row.setIndustryName(industry);
        row.setQuestionCount(questionCount);
        row.setStatus(status);
        row.setUpdatedAt(Timestamp.valueOf(LocalDateTime.of(2026, 3, 14, 15, 0).plusMinutes(bankId)));
        return row;
    }

    private OsgInterviewBank buildApplication(String applicationCode,
                                              String studentName,
                                              String appliedPosition,
                                              String stage)
    {
        OsgInterviewBank row = new OsgInterviewBank();
        row.setRecordType("application");
        row.setApplicationCode(applicationCode);
        row.setStudentName(studentName);
        row.setAppliedPosition(appliedPosition);
        row.setInterviewStage(stage);
        row.setApplicationSource("班主任流转");
        row.setApplicationTime(Timestamp.valueOf(LocalDateTime.of(2026, 3, 14, 16, 20)));
        row.setPendingFlag("1");
        return row;
    }

    private List<OsgInterviewBank> selectBanks(OsgInterviewBank query)
    {
        return bankRowsRef.get().stream()
            .filter(item -> query.getKeyword() == null || query.getKeyword().isBlank()
                || item.getInterviewBankName().contains(query.getKeyword())
                || item.getIndustryName().contains(query.getKeyword()))
            .filter(item -> query.getInterviewStage() == null || query.getInterviewStage().isBlank()
                || query.getInterviewStage().equals(item.getInterviewStage()))
            .filter(item -> query.getInterviewType() == null || query.getInterviewType().isBlank()
                || query.getInterviewType().equals(item.getInterviewType()))
            .filter(item -> query.getIndustryName() == null || query.getIndustryName().isBlank()
                || query.getIndustryName().equals(item.getIndustryName()))
            .toList();
    }

    private List<OsgInterviewBank> selectApplications(OsgInterviewBank query)
    {
        return applicationRowsRef.get().stream()
            .filter(item -> query.getKeyword() == null || query.getKeyword().isBlank()
                || item.getStudentName().contains(query.getKeyword())
                || item.getAppliedPosition().contains(query.getKeyword()))
            .toList();
    }

    private OsgInterviewBank selectBankById(Long bankId)
    {
        return bankRowsRef.get().stream()
            .filter(item -> java.util.Objects.equals(item.getBankId(), bankId))
            .findFirst()
            .orElse(null);
    }

    private int insertBank(OsgInterviewBank row)
    {
        row.setBankId(bankIdSequence.incrementAndGet());
        row.setRecordType("bank");
        row.setUpdatedAt(Timestamp.valueOf(LocalDateTime.of(2026, 3, 14, 18, 0)));
        bankRowsRef.get().add(row);
        return 1;
    }

    private int updateBank(OsgInterviewBank payload)
    {
        List<OsgInterviewBank> updated = new ArrayList<>();
        for (OsgInterviewBank row : bankRowsRef.get())
        {
            if (java.util.Objects.equals(row.getBankId(), payload.getBankId()))
            {
                if (payload.getInterviewBankName() != null) row.setInterviewBankName(payload.getInterviewBankName());
                if (payload.getInterviewStage() != null) row.setInterviewStage(payload.getInterviewStage());
                if (payload.getInterviewType() != null) row.setInterviewType(payload.getInterviewType());
                if (payload.getIndustryName() != null) row.setIndustryName(payload.getIndustryName());
                if (payload.getQuestionCount() != null) row.setQuestionCount(payload.getQuestionCount());
                if (payload.getStatus() != null) row.setStatus(payload.getStatus());
                row.setUpdatedAt(Timestamp.valueOf(LocalDateTime.of(2026, 3, 14, 19, 0)));
            }
            updated.add(row);
        }
        bankRowsRef.set(updated);
        return 1;
    }
}
