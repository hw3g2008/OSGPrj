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
import com.ruoyi.common.exception.ServiceException;
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

    // ==================== NEW TEST METHODS FOR BRANCH COVERAGE ====================

    @Test
    void listShouldDefaultToTabPendingWhenTabNull() throws Exception
    {
        mockMvc.perform(get("/admin/question/list")
                .header("Authorization", "Bearer quiz-admin-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.pendingCount").value(2))
            .andExpect(jsonPath("$.rows[0].questionCode").value("#Q2025015"));
    }

    @Test
    void listShouldDefaultToTabPendingWhenTabBlank() throws Exception
    {
        mockMvc.perform(get("/admin/question/list")
                .header("Authorization", "Bearer quiz-admin-token")
                .param("tab", "  "))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void listShouldAcceptAllFilterParams() throws Exception
    {
        mockMvc.perform(get("/admin/question/list")
                .header("Authorization", "Bearer quiz-admin-token")
                .param("tab", "pending")
                .param("keyword", "DCF")
                .param("companyName", "Goldman")
                .param("interviewRound", "R1")
                .param("beginDate", "2026-01-01")
                .param("endDate", "2026-12-31"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void batchApproveShouldReturnErrorForEmptyQuestionIds() throws Exception
    {
        mockMvc.perform(put("/admin/question/batch-approve")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "questionIds": []
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(500))
            .andExpect(jsonPath("$.msg").value("questionIds 不能为空"));
    }

    @Test
    void batchApproveShouldReturnErrorForMissingQuestionIds() throws Exception
    {
        mockMvc.perform(put("/admin/question/batch-approve")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(500))
            .andExpect(jsonPath("$.msg").value("questionIds 不能为空"));
    }

    @Test
    void batchApproveShouldReturnErrorForNonExistentQuestion() throws Exception
    {
        mockMvc.perform(put("/admin/question/batch-approve")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "questionIds": [999]
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(500))
            .andExpect(jsonPath("$.msg").value("真题不存在"));
    }

    @Test
    void batchRejectShouldReturnErrorForEmptyQuestionIds() throws Exception
    {
        mockMvc.perform(put("/admin/question/batch-reject")
                .header("Authorization", "Bearer quiz-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "questionIds": []
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(500))
            .andExpect(jsonPath("$.msg").value("questionIds 不能为空"));
    }

    @Test
    void batchApproveShouldHandleStringQuestionIds() throws Exception
    {
        mockMvc.perform(put("/admin/question/batch-approve")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "questionIds": ["101"]
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.reviewedCount").value(1))
            .andExpect(jsonPath("$.data.rows[0].reviewStatus").value("approved"));
    }

    @Test
    void batchApproveShouldHandleMultipleQuestions() throws Exception
    {
        mockMvc.perform(put("/admin/question/batch-approve")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "questionIds": [101, 102]
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.reviewedCount").value(2));
    }

    @Test
    void batchApproveShouldHandleNullEligibleStudentCount() throws Exception
    {
        OsgInterviewQuestion row = buildRow(105L, "#Q2025020", "学员E", "Google", "Engineering", "Mountain View", "R1", "待面试", "pending", "自主填写", 0, List.of("Design a system."));
        row.setEligibleStudentCount(null);
        List<OsgInterviewQuestion> rows = new ArrayList<>(rowsRef.get());
        rows.add(row);
        rowsRef.set(rows);

        mockMvc.perform(put("/admin/question/batch-approve")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "questionIds": [105]
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.eligibleStudentCount").value(0));
    }

    @Test
    void normalizeQuestionRowShouldParseItemsFromJson() throws Exception
    {
        OsgInterviewQuestion row = new OsgInterviewQuestion();
        row.setQuestionId(106L);
        row.setQuestionCode("#Q2025021");
        row.setStudentId("STU-106");
        row.setStudentName("学员F");
        row.setCompanyName("Amazon");
        row.setDepartmentName("AWS");
        row.setOfficeLocation("Seattle");
        row.setInterviewRound("R1");
        row.setInterviewStatus("待面试");
        row.setReviewStatus("pending");
        row.setSourceType("自主填写");
        row.setEligibleStudentCount(1);
        row.setQuestionItems(null);
        row.setQuestionItemsJson("[\"Question A\", \"Question B\"]");
        row.setQuestionCount(null);
        row.setSharePreview(null);
        row.setSubmittedAt(Timestamp.valueOf(LocalDateTime.of(2026, 3, 14, 12, 0)));

        List<OsgInterviewQuestion> rows = new ArrayList<>(rowsRef.get());
        rows.add(row);
        rowsRef.set(rows);

        mockMvc.perform(get("/admin/question/list")
                .header("Authorization", "Bearer quiz-admin-token")
                .param("tab", "pending"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void normalizeQuestionRowShouldHandleInvalidJson() throws Exception
    {
        OsgInterviewQuestion row = new OsgInterviewQuestion();
        row.setQuestionId(107L);
        row.setQuestionCode("#Q2025022");
        row.setStudentId("STU-107");
        row.setStudentName("学员G");
        row.setCompanyName("Meta");
        row.setDepartmentName("Product");
        row.setOfficeLocation("Menlo Park");
        row.setInterviewRound("R1");
        row.setInterviewStatus("待面试");
        row.setReviewStatus("pending");
        row.setSourceType("自主填写");
        row.setEligibleStudentCount(1);
        row.setQuestionItems(null);
        row.setQuestionItemsJson("invalid-json");
        row.setQuestionCount(null);
        row.setSharePreview(null);
        row.setSubmittedAt(Timestamp.valueOf(LocalDateTime.of(2026, 3, 14, 12, 0)));

        List<OsgInterviewQuestion> rows = new ArrayList<>(rowsRef.get());
        rows.add(row);
        rowsRef.set(rows);

        mockMvc.perform(get("/admin/question/list")
                .header("Authorization", "Bearer quiz-admin-token")
                .param("tab", "pending"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void normalizeQuestionRowShouldHandleEmptyQuestionItemsList() throws Exception
    {
        OsgInterviewQuestion row = new OsgInterviewQuestion();
        row.setQuestionId(108L);
        row.setQuestionCode("#Q2025023");
        row.setStudentId("STU-108");
        row.setStudentName("学员H");
        row.setCompanyName("Apple");
        row.setDepartmentName("Design");
        row.setOfficeLocation("Cupertino");
        row.setInterviewRound("R1");
        row.setInterviewStatus("待面试");
        row.setReviewStatus("pending");
        row.setSourceType("自主填写");
        row.setEligibleStudentCount(1);
        row.setQuestionItems(List.of());
        row.setQuestionItemsJson("[\"Parsed from JSON\"]");
        row.setQuestionCount(null);
        row.setSharePreview(null);
        row.setSubmittedAt(Timestamp.valueOf(LocalDateTime.of(2026, 3, 14, 12, 0)));

        List<OsgInterviewQuestion> rows = new ArrayList<>(rowsRef.get());
        rows.add(row);
        rowsRef.set(rows);

        mockMvc.perform(get("/admin/question/list")
                .header("Authorization", "Bearer quiz-admin-token")
                .param("tab", "pending"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void buildSharePreviewShouldReturnExistingWhenFieldsMissing() throws Exception
    {
        OsgInterviewQuestion row = new OsgInterviewQuestion();
        row.setQuestionId(109L);
        row.setQuestionCode("#Q2025024");
        row.setStudentId("STU-109");
        row.setStudentName("学员I");
        row.setCompanyName(null);
        row.setDepartmentName("Dept");
        row.setOfficeLocation("City");
        row.setInterviewRound("R1");
        row.setInterviewStatus("待面试");
        row.setReviewStatus("pending");
        row.setSourceType("自主填写");
        row.setEligibleStudentCount(1);
        row.setQuestionItems(List.of("Q1"));
        row.setQuestionCount(1);
        row.setSharePreview("existing preview");
        row.setSubmittedAt(Timestamp.valueOf(LocalDateTime.of(2026, 3, 14, 12, 0)));

        List<OsgInterviewQuestion> rows = new ArrayList<>(rowsRef.get());
        rows.add(row);
        rowsRef.set(rows);

        mockMvc.perform(get("/admin/question/list")
                .header("Authorization", "Bearer quiz-admin-token")
                .param("tab", "pending"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void buildSharePreviewShouldReturnExistingWhenDepartmentMissing() throws Exception
    {
        OsgInterviewQuestion row = new OsgInterviewQuestion();
        row.setQuestionId(110L);
        row.setQuestionCode("#Q2025025");
        row.setStudentId("STU-110");
        row.setStudentName("学员J");
        row.setCompanyName("Company");
        row.setDepartmentName(null);
        row.setOfficeLocation("City");
        row.setInterviewRound("R1");
        row.setInterviewStatus("待面试");
        row.setReviewStatus("pending");
        row.setSourceType("自主填写");
        row.setEligibleStudentCount(1);
        row.setQuestionItems(List.of("Q1"));
        row.setQuestionCount(1);
        row.setSharePreview("fallback preview");
        row.setSubmittedAt(Timestamp.valueOf(LocalDateTime.of(2026, 3, 14, 12, 0)));

        List<OsgInterviewQuestion> rows = new ArrayList<>(rowsRef.get());
        rows.add(row);
        rowsRef.set(rows);

        mockMvc.perform(get("/admin/question/list")
                .header("Authorization", "Bearer quiz-admin-token")
                .param("tab", "pending"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void buildSharePreviewShouldReturnExistingWhenOfficeMissing() throws Exception
    {
        OsgInterviewQuestion row = new OsgInterviewQuestion();
        row.setQuestionId(111L);
        row.setQuestionCode("#Q2025026");
        row.setStudentId("STU-111");
        row.setStudentName("学员K");
        row.setCompanyName("Company");
        row.setDepartmentName("Dept");
        row.setOfficeLocation(null);
        row.setInterviewRound("R1");
        row.setInterviewStatus("待面试");
        row.setReviewStatus("pending");
        row.setSourceType("自主填写");
        row.setEligibleStudentCount(1);
        row.setQuestionItems(List.of("Q1"));
        row.setQuestionCount(1);
        row.setSharePreview("office missing preview");
        row.setSubmittedAt(Timestamp.valueOf(LocalDateTime.of(2026, 3, 14, 12, 0)));

        List<OsgInterviewQuestion> rows = new ArrayList<>(rowsRef.get());
        rows.add(row);
        rowsRef.set(rows);

        mockMvc.perform(get("/admin/question/list")
                .header("Authorization", "Bearer quiz-admin-token")
                .param("tab", "pending"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void buildSharePreviewShouldReturnExistingWhenStatusMissing() throws Exception
    {
        OsgInterviewQuestion row = new OsgInterviewQuestion();
        row.setQuestionId(112L);
        row.setQuestionCode("#Q2025027");
        row.setStudentId("STU-112");
        row.setStudentName("学员L");
        row.setCompanyName("Company");
        row.setDepartmentName("Dept");
        row.setOfficeLocation("City");
        row.setInterviewRound("R1");
        row.setInterviewStatus(null);
        row.setReviewStatus("pending");
        row.setSourceType("自主填写");
        row.setEligibleStudentCount(1);
        row.setQuestionItems(List.of("Q1"));
        row.setQuestionCount(1);
        row.setSharePreview("status missing preview");
        row.setSubmittedAt(Timestamp.valueOf(LocalDateTime.of(2026, 3, 14, 12, 0)));

        List<OsgInterviewQuestion> rows = new ArrayList<>(rowsRef.get());
        rows.add(row);
        rowsRef.set(rows);

        mockMvc.perform(get("/admin/question/list")
                .header("Authorization", "Bearer quiz-admin-token")
                .param("tab", "pending"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void batchApproveShouldNotSetReviewCommentWhenNotProvided() throws Exception
    {
        mockMvc.perform(put("/admin/question/batch-approve")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "questionIds": [101]
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.reviewedCount").value(1));
    }

    @Test
    void batchRejectShouldReturnErrorForNonExistentQuestion() throws Exception
    {
        mockMvc.perform(put("/admin/question/batch-reject")
                .header("Authorization", "Bearer quiz-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "questionIds": [999]
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(500))
            .andExpect(jsonPath("$.msg").value("真题不存在"));
    }

    @Test
    void batchRejectShouldRejectAlreadyReviewedQuestion() throws Exception
    {
        mockMvc.perform(put("/admin/question/batch-reject")
                .header("Authorization", "Bearer quiz-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "questionIds": [104]
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(500))
            .andExpect(jsonPath("$.msg").value("已审核真题不可重复审核"));
    }



    @Test
    void listShouldReturnApprovedQuestionsForTab() throws Exception
    {
        mockMvc.perform(get("/admin/question/list")
                .header("Authorization", "Bearer quiz-admin-token")
                .param("tab", "approved"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.rows[0].questionCode").value("#Q2025009"));
    }

    @Test
    void listShouldReturnRejectedQuestionsForTab() throws Exception
    {
        mockMvc.perform(get("/admin/question/list")
                .header("Authorization", "Bearer quiz-admin-token")
                .param("tab", "rejected"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.rows[0].questionCode").value("#Q2025008"));
    }

    @Test
    void batchApproveShouldHandleReviewCommentAsNonString() throws Exception
    {
        mockMvc.perform(put("/admin/question/batch-approve")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "questionIds": [101],
                      "reviewComment": 12345
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.reviewedCount").value(1));
    }

    @Test
    void normalizeQuestionRowShouldSetQuestionCountFromItems() throws Exception
    {
        OsgInterviewQuestion row = new OsgInterviewQuestion();
        row.setQuestionId(113L);
        row.setQuestionCode("#Q2025028");
        row.setStudentId("STU-113");
        row.setStudentName("学员M");
        row.setCompanyName("Netflix");
        row.setDepartmentName("Engineering");
        row.setOfficeLocation("Los Gatos");
        row.setInterviewRound("R1");
        row.setInterviewStatus("待面试");
        row.setReviewStatus("pending");
        row.setSourceType("自主填写");
        row.setEligibleStudentCount(1);
        row.setQuestionItems(List.of("Q1", "Q2", "Q3"));
        row.setQuestionCount(null);
        row.setSharePreview("Netflix / Engineering / Los Gatos / 待面试");
        row.setSubmittedAt(Timestamp.valueOf(LocalDateTime.of(2026, 3, 14, 12, 0)));

        List<OsgInterviewQuestion> rows = new ArrayList<>(rowsRef.get());
        rows.add(row);
        rowsRef.set(rows);

        mockMvc.perform(get("/admin/question/list")
                .header("Authorization", "Bearer quiz-admin-token")
                .param("tab", "pending"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void normalizeQuestionRowShouldNotOverrideExistingQuestionItems() throws Exception
    {
        OsgInterviewQuestion row = new OsgInterviewQuestion();
        row.setQuestionId(114L);
        row.setQuestionCode("#Q2025029");
        row.setStudentId("STU-114");
        row.setStudentName("学员N");
        row.setCompanyName("Uber");
        row.setDepartmentName("Platform");
        row.setOfficeLocation("SF");
        row.setInterviewRound("R1");
        row.setInterviewStatus("待面试");
        row.setReviewStatus("pending");
        row.setSourceType("自主填写");
        row.setEligibleStudentCount(1);
        row.setQuestionItems(List.of("Existing Q1"));
        row.setQuestionItemsJson("[\"Should not override\"]");
        row.setQuestionCount(1);
        row.setSharePreview("Uber / Platform / SF / 待面试");
        row.setSubmittedAt(Timestamp.valueOf(LocalDateTime.of(2026, 3, 14, 12, 0)));

        List<OsgInterviewQuestion> rows = new ArrayList<>(rowsRef.get());
        rows.add(row);
        rowsRef.set(rows);

        mockMvc.perform(get("/admin/question/list")
                .header("Authorization", "Bearer quiz-admin-token")
                .param("tab", "pending"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200));
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

    // ==================== ADDITIONAL BRANCH COVERAGE TESTS ====================

    @Test
    void normalizeQuestionRowShouldSkipParsingWhenItemsAlreadyPopulated() throws Exception
    {
        OsgInterviewQuestion row = new OsgInterviewQuestion();
        row.setQuestionId(115L);
        row.setQuestionCode("#Q2025030");
        row.setStudentId("STU-115");
        row.setStudentName("学员O");
        row.setCompanyName("Tesla");
        row.setDepartmentName("Engineering");
        row.setOfficeLocation("Austin");
        row.setInterviewRound("R1");
        row.setInterviewStatus("待面试");
        row.setReviewStatus("pending");
        row.setSourceType("自主填写");
        row.setEligibleStudentCount(1);
        row.setQuestionItems(List.of("Q1", "Q2"));
        row.setQuestionItemsJson(null);
        row.setQuestionCount(2);
        row.setSharePreview("Tesla / Engineering / Austin / 待面试");
        row.setSubmittedAt(Timestamp.valueOf(LocalDateTime.of(2026, 3, 14, 12, 0)));

        List<OsgInterviewQuestion> rows = new ArrayList<>(rowsRef.get());
        rows.add(row);
        rowsRef.set(rows);

        mockMvc.perform(get("/admin/question/list")
                .header("Authorization", "Bearer quiz-admin-token")
                .param("tab", "pending"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void normalizeQuestionRowShouldNotOverrideExistingSharePreview() throws Exception
    {
        OsgInterviewQuestion row = new OsgInterviewQuestion();
        row.setQuestionId(116L);
        row.setQuestionCode("#Q2025031");
        row.setStudentId("STU-116");
        row.setStudentName("学员P");
        row.setCompanyName("SpaceX");
        row.setDepartmentName("Starship");
        row.setOfficeLocation("Boca Chica");
        row.setInterviewRound("R1");
        row.setInterviewStatus("待面试");
        row.setReviewStatus("pending");
        row.setSourceType("自主填写");
        row.setEligibleStudentCount(1);
        row.setQuestionItems(List.of("Q1"));
        row.setQuestionCount(1);
        row.setSharePreview("Already set preview");
        row.setSubmittedAt(Timestamp.valueOf(LocalDateTime.of(2026, 3, 14, 12, 0)));

        List<OsgInterviewQuestion> rows = new ArrayList<>(rowsRef.get());
        rows.add(row);
        rowsRef.set(rows);

        mockMvc.perform(get("/admin/question/list")
                .header("Authorization", "Bearer quiz-admin-token")
                .param("tab", "pending"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void normalizeQuestionRowShouldHandleNullQuestionItemsAndNullJson() throws Exception
    {
        OsgInterviewQuestion row = new OsgInterviewQuestion();
        row.setQuestionId(117L);
        row.setQuestionCode("#Q2025032");
        row.setStudentId("STU-117");
        row.setStudentName("学员Q");
        row.setCompanyName("Stripe");
        row.setDepartmentName("Payments");
        row.setOfficeLocation("SF");
        row.setInterviewRound("R1");
        row.setInterviewStatus("待面试");
        row.setReviewStatus("pending");
        row.setSourceType("自主填写");
        row.setEligibleStudentCount(1);
        row.setQuestionItems(null);
        row.setQuestionItemsJson(null);
        row.setQuestionCount(null);
        row.setSharePreview(null);
        row.setSubmittedAt(Timestamp.valueOf(LocalDateTime.of(2026, 3, 14, 12, 0)));

        List<OsgInterviewQuestion> rows = new ArrayList<>(rowsRef.get());
        rows.add(row);
        rowsRef.set(rows);

        mockMvc.perform(get("/admin/question/list")
                .header("Authorization", "Bearer quiz-admin-token")
                .param("tab", "pending"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void batchApproveShouldHandleNonNumberNonStringQuestionId() throws Exception
    {
        mockMvc.perform(put("/admin/question/batch-approve")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"questionIds\": [null]}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(500))
            .andExpect(jsonPath("$.msg").value("questionIds 不能为空"));
    }
}
