package com.ruoyi.web.controller.osg;

import static org.mockito.ArgumentMatchers.any;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
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
import com.ruoyi.system.domain.OsgExpense;
import com.ruoyi.system.mapper.OsgExpenseMapper;
import com.ruoyi.system.service.impl.OsgExpenseServiceImpl;

@WebMvcTest(controllers = OsgExpenseController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
    SecurityConfig.class,
    PermissionService.class,
    AuthenticationEntryPointImpl.class,
    LogoutSuccessHandlerImpl.class,
    JwtAuthenticationTokenFilter.class,
    PermitAllUrlProperties.class,
    OsgExpenseServiceImpl.class
})
class OsgExpenseControllerTest
{
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OsgExpenseMapper expenseMapper;

    @MockBean
    private TokenService tokenService;

    @MockBean
    private RedisCache redisCache;

    private final AtomicReference<List<OsgExpense>> expensesRef = new AtomicReference<>();
    private final AtomicLong expenseIdSequence = new AtomicLong(20L);

    @BeforeEach
    void setUp()
    {
        expensesRef.set(new ArrayList<>(buildExpenses()));
        expenseIdSequence.set(30L);

        org.mockito.Mockito.when(tokenService.getLoginUser(any())).thenAnswer(invocation -> {
            HttpServletRequest request = invocation.getArgument(0);
            String authorization = request.getHeader("Authorization");
            if ("Bearer expense-auditor-token".equals(authorization))
            {
                return buildLoginUser("expense_auditor", "expense-auditor");
            }
            if ("Bearer super-admin-token".equals(authorization))
            {
                return buildLoginUser("super_admin", "super-admin");
            }
            if ("Bearer accountant-token".equals(authorization))
            {
                return buildLoginUser("accountant", "accountant");
            }
            return null;
        });

        org.mockito.Mockito.when(expenseMapper.selectExpenseList(any(OsgExpense.class)))
            .thenAnswer(invocation -> selectExpenses(invocation.getArgument(0)));
        org.mockito.Mockito.when(expenseMapper.selectExpenseByExpenseId(any(Long.class)))
            .thenAnswer(invocation -> expensesRef.get().stream()
                .filter(item -> java.util.Objects.equals(item.getExpenseId(), invocation.getArgument(0)))
                .findFirst()
                .orElse(null));
        org.mockito.Mockito.when(expenseMapper.insertExpense(any(OsgExpense.class)))
            .thenAnswer(invocation -> insertExpense(invocation.getArgument(0)));
        org.mockito.Mockito.when(expenseMapper.updateExpense(any(OsgExpense.class)))
            .thenAnswer(invocation -> updateExpense(invocation.getArgument(0)));
    }

    @Test
    void listShouldReturnExpenseRowsByTabForExpenseAuditor() throws Exception
    {
        mockMvc.perform(get("/admin/expense/list")
                .header("Authorization", "Bearer expense-auditor-token")
                .param("tab", "processing"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.rows[0].expenseId").value(11))
            .andExpect(jsonPath("$.rows[0].expenseType").value("Mentor Referral"))
            .andExpect(jsonPath("$.rows[0].status").value("processing"));
    }

    @Test
    void createExpenseShouldPersistAndAppearInProcessingTab() throws Exception
    {
        mockMvc.perform(post("/admin/expense")
                .header("Authorization", "Bearer expense-auditor-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"mentorId\":301,\"mentorName\":\"导师D\",\"expenseType\":\"Transportation\",\"expenseAmount\":\"86.5\",\"expenseDate\":\"2026-03-14\",\"description\":\"机场交通\",\"attachmentUrl\":\"https://oss.example.com/receipt-1.png\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.status").value("processing"))
            .andExpect(jsonPath("$.data.expenseType").value("Transportation"));

        mockMvc.perform(get("/admin/expense/list")
                .header("Authorization", "Bearer expense-auditor-token")
                .param("tab", "processing"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.rows[1].mentorName").value("导师D"))
            .andExpect(jsonPath("$.rows[1].expenseAmount").value("86.5"));
    }

    @Test
    void reviewExpenseShouldPersistAndRejectRepeatedProcessing() throws Exception
    {
        mockMvc.perform(put("/admin/expense/11/review")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"approved\",\"reviewComment\":\"票据齐全\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.status").value("approved"))
            .andExpect(jsonPath("$.data.reviewComment").value("票据齐全"));

        mockMvc.perform(put("/admin/expense/12/review")
                .header("Authorization", "Bearer expense-auditor-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"approved\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(500))
            .andExpect(jsonPath("$.msg").value("该报销已处理，不能重复操作"));
    }

    @Test
    void expenseApisShouldRejectUnauthorizedRole() throws Exception
    {
        mockMvc.perform(get("/admin/expense/list")
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
        user.setUserId(9L);
        user.setUserName(username);
        user.setPassword("password");
        user.setRoles(List.of(role));

        return new LoginUser(9L, 1L, user, OsgTestPermissions.permissionsForRole(roleKey));
    }

    private List<OsgExpense> buildExpenses()
    {
        return List.of(
            buildExpense(11L, 201L, "导师A", "Mentor Referral", "120.0", "processing", "导师推荐奖", null),
            buildExpense(12L, 202L, "导师B", "Materials", "75.0", "approved", "教材采购", "已审批"),
            buildExpense(13L, 203L, "导师C", "Other", "30.0", "denied", "其他费用", "凭证不全")
        );
    }

    private OsgExpense buildExpense(Long expenseId,
                                    Long mentorId,
                                    String mentorName,
                                    String expenseType,
                                    String expenseAmount,
                                    String status,
                                    String description,
                                    String reviewComment)
    {
        OsgExpense row = new OsgExpense();
        row.setExpenseId(expenseId);
        row.setMentorId(mentorId);
        row.setMentorName(mentorName);
        row.setExpenseType(expenseType);
        row.setExpenseAmount(new BigDecimal(expenseAmount));
        row.setExpenseDate(Date.valueOf(LocalDate.of(2026, 3, 14)));
        row.setDescription(description);
        row.setAttachmentUrl("https://oss.example.com/" + expenseId + ".png");
        row.setStatus(status);
        row.setReviewComment(reviewComment);
        return row;
    }

    private List<OsgExpense> selectExpenses(OsgExpense query)
    {
        String tab = query == null ? null : query.getStatus();
        List<OsgExpense> rows = new ArrayList<>();
        for (OsgExpense item : expensesRef.get())
        {
            if (tab == null || tab.isBlank() || "all".equalsIgnoreCase(tab) || tab.equalsIgnoreCase(item.getStatus()))
            {
                rows.add(item);
            }
        }
        return rows;
    }

    private int insertExpense(OsgExpense expense)
    {
        expense.setExpenseId(expenseIdSequence.incrementAndGet());
        expensesRef.get().add(expense);
        return 1;
    }

    private int updateExpense(OsgExpense expense)
    {
        List<OsgExpense> rows = expensesRef.get();
        for (int i = 0; i < rows.size(); i++)
        {
            if (java.util.Objects.equals(rows.get(i).getExpenseId(), expense.getExpenseId()))
            {
                rows.set(i, expense);
                return 1;
            }
        }
        return 0;
    }
}
