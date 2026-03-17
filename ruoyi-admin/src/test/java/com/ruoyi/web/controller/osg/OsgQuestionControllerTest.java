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
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Collectors;
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
import com.ruoyi.system.domain.OsgInterviewQuestion;
import com.ruoyi.system.mapper.OsgInterviewQuestionMapper;

@WebMvcTest(controllers = OsgQuestionController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
    SecurityConfig.class,
    PermissionService.class,
    AuthenticationEntryPointImpl.class,
    LogoutSuccessHandlerImpl.class,
    JwtAuthenticationTokenFilter.class,
    PermitAllUrlProperties.class
})
class OsgQuestionControllerTest
{
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OsgInterviewQuestionMapper questionMapper;

    @MockBean
    private TokenService tokenService;

    @MockBean
    private RedisCache redisCache;

    private final AtomicReference<List<OsgInterviewQuestion>> rowsRef = new AtomicReference<>();

    @BeforeEach
    void setUp()
    {
        rowsRef.set(new ArrayList<>(buildRows()));

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
            return null;
        });

        org.mockito.Mockito.when(questionMapper.selectQuestionList(any(OsgInterviewQuestion.class)))
            .thenAnswer(invocation -> selectRows(invocation.getArgument(0)));
        org.mockito.Mockito.when(questionMapper.selectQuestionById(any(Long.class)))
            .thenAnswer(invocation -> selectQuestionById(invocation.getArgument(0)));
        org.mockito.Mockito.when(questionMapper.updateQuestionReview(any(OsgInterviewQuestion.class)))
            .thenAnswer(invocation -> updateQuestionReview(invocation.getArgument(0)));
        org.mockito.Mockito.when(questionMapper.selectPendingQuestionCount())
            .thenAnswer(invocation -> (int) rowsRef.get().stream()
                .filter(item -> "pending".equals(item.getReviewStatus()))
                .count());
    }

    @Test
    void listShouldReturnPendingQuestionRowsByTab() throws Exception
    {
        mockMvc.perform(get("/admin/question/list")
                .header("Authorization", "Bearer quiz-admin-token")
                .param("tab", "pending"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.pendingCount").value(2))
            .andExpect(jsonPath("$.rows[0].questionCode").value("#Q2025015"))
            .andExpect(jsonPath("$.rows[0].sourceType").value("入职面试申请"))
            .andExpect(jsonPath("$.rows[0].sharePreview").value("Goldman Sachs / Investment Banking / New York / 待面试"))
            .andExpect(jsonPath("$.rows[0].questionItems[0]").value("Walk me through a DCF."));
    }

    @Test
    void batchApproveShouldPersistStatusAndShareScope() throws Exception
    {
        mockMvc.perform(put("/admin/question/batch-approve")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "questionIds": [101],
                      "reviewComment": "内容完整，允许开放"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.reviewedCount").value(1))
            .andExpect(jsonPath("$.data.eligibleStudentCount").value(3))
            .andExpect(jsonPath("$.data.rows[0].reviewStatus").value("approved"));

        mockMvc.perform(get("/admin/question/list")
                .header("Authorization", "Bearer quiz-admin-token")
                .param("tab", "approved"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.rows[0].questionCode").value("#Q2025015"))
            .andExpect(jsonPath("$.rows[0].eligibleStudentCount").value(3))
            .andExpect(jsonPath("$.rows[0].reviewComment").value("内容完整，允许开放"));
    }

    @Test
    void batchRejectShouldPersistRejectedStatusImmediately() throws Exception
    {
        mockMvc.perform(put("/admin/question/batch-reject")
                .header("Authorization", "Bearer quiz-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "questionIds": [102],
                      "reviewComment": "题目描述太粗略"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.reviewedCount").value(1))
            .andExpect(jsonPath("$.data.rows[0].reviewStatus").value("rejected"));

        mockMvc.perform(get("/admin/question/list")
                .header("Authorization", "Bearer quiz-admin-token")
                .param("tab", "rejected"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.rows[0].questionCode").value("#Q2025016"))
            .andExpect(jsonPath("$.rows[0].reviewComment").value("题目描述太粗略"));
    }

    @Test
    void batchReviewShouldRejectAlreadyReviewedQuestion() throws Exception
    {
        mockMvc.perform(put("/admin/question/batch-approve")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "questionIds": [103],
                      "reviewComment": "重复审核"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(500))
            .andExpect(jsonPath("$.msg").value("已审核真题不可重复审核"));
    }

    private LoginUser buildLoginUser(String roleKey, String username)
    {
        SysRole role = new SysRole();
        role.setRoleKey(roleKey);
        role.setRoleName(roleKey);

        SysUser user = new SysUser();
        user.setUserId(19L);
        user.setUserName(username);
        user.setPassword("password");
        user.setRoles(List.of(role));

        return new LoginUser(19L, 1L, user, OsgTestPermissions.permissionsForRole(roleKey));
    }

    private List<OsgInterviewQuestion> buildRows()
    {
        return List.of(
            buildRow(101L, "#Q2025015", "学员A", "Goldman Sachs", "Investment Banking", "New York", "R1", "待面试", "pending", "入职面试申请", 3, List.of("Walk me through a DCF.", "Why GS?", "Pitch me a stock.")),
            buildRow(102L, "#Q2025016", "学员B", "Morgan Stanley", "Sales & Trading", "Hong Kong", "R2", "已面试", "pending", "自主填写", 2, List.of("What moves rates today?", "How do you price an option?")),
            buildRow(103L, "#Q2025009", "学员C", "McKinsey", "Consulting", "London", "Final", "待面试", "approved", "自主填写", 4, List.of("Why consulting?", "Tell me about a leadership challenge.")),
            buildRow(104L, "#Q2025008", "学员D", "BlackRock", "Asset Management", "Boston", "HireVue", "待面试", "rejected", "入职面试申请", 1, List.of("Why asset management?"))
        );
    }

    private OsgInterviewQuestion buildRow(Long questionId,
                                          String questionCode,
                                          String studentName,
                                          String companyName,
                                          String departmentName,
                                          String officeLocation,
                                          String interviewRound,
                                          String interviewStatus,
                                          String reviewStatus,
                                          String sourceType,
                                          int eligibleStudentCount,
                                          List<String> questionItems)
    {
        OsgInterviewQuestion row = new OsgInterviewQuestion();
        row.setQuestionId(questionId);
        row.setQuestionCode(questionCode);
        row.setStudentId("STU-" + questionId);
        row.setStudentName(studentName);
        row.setCompanyName(companyName);
        row.setDepartmentName(departmentName);
        row.setOfficeLocation(officeLocation);
        row.setInterviewRound(interviewRound);
        row.setInterviewStatus(interviewStatus);
        row.setQuestionCount(questionItems.size());
        row.setSourceType(sourceType);
        row.setReviewStatus(reviewStatus);
        row.setEligibleStudentCount(eligibleStudentCount);
        row.setSharePreview(companyName + " / " + departmentName + " / " + officeLocation + " / " + interviewStatus);
        row.setQuestionItems(questionItems);
        row.setSubmittedAt(Timestamp.valueOf(LocalDateTime.of(2026, 3, 14, 12, 0).plusMinutes(questionId)));
        if (!"pending".equals(reviewStatus))
        {
            row.setReviewedBy("system");
            row.setReviewedAt(Timestamp.valueOf(LocalDateTime.of(2026, 3, 14, 18, 0).plusMinutes(questionId)));
            row.setReviewComment("approved".equals(reviewStatus) ? "已通过" : "信息不足");
        }
        return row;
    }

    private List<OsgInterviewQuestion> selectRows(OsgInterviewQuestion query)
    {
        String tab = query.getTab();
        return rowsRef.get().stream()
            .filter(item -> matchTab(item, tab))
            .collect(Collectors.toList());
    }

    private boolean matchTab(OsgInterviewQuestion row, String tab)
    {
        if (tab == null || tab.isBlank() || "pending".equals(tab))
        {
            return "pending".equals(row.getReviewStatus());
        }
        return tab.equals(row.getReviewStatus());
    }

    private OsgInterviewQuestion selectQuestionById(Long questionId)
    {
        return rowsRef.get().stream()
            .filter(item -> item.getQuestionId().equals(questionId))
            .findFirst()
            .orElse(null);
    }

    private int updateQuestionReview(OsgInterviewQuestion updated)
    {
        List<OsgInterviewQuestion> next = new ArrayList<>(rowsRef.get());
        for (int index = 0; index < next.size(); index++)
        {
            if (next.get(index).getQuestionId().equals(updated.getQuestionId()))
            {
                next.set(index, updated);
                rowsRef.set(next);
                return 1;
            }
        }
        return 0;
    }
}
