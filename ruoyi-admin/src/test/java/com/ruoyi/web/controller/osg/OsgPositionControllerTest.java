package com.ruoyi.web.controller.osg;

import static org.mockito.ArgumentMatchers.any;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.ByteArrayOutputStream;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import jakarta.servlet.http.HttpServletRequest;
import com.ruoyi.common.core.domain.entity.SysRole;
import com.ruoyi.common.core.domain.entity.SysDictData;
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
import com.ruoyi.system.domain.OsgCoaching;
import com.ruoyi.system.domain.OsgJobApplication;
import com.ruoyi.system.domain.OsgPosition;
import com.ruoyi.system.mapper.OsgCoachingMapper;
import com.ruoyi.system.mapper.OsgJobApplicationMapper;
import com.ruoyi.system.mapper.OsgPositionMapper;
import com.ruoyi.system.mapper.SysDictDataMapper;
import com.ruoyi.system.service.impl.OsgAssistantAccessService;
import com.ruoyi.system.service.impl.OsgPositionServiceImpl;

@WebMvcTest(controllers = OsgPositionController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
    SecurityConfig.class,
    PermissionService.class,
    AuthenticationEntryPointImpl.class,
    LogoutSuccessHandlerImpl.class,
    JwtAuthenticationTokenFilter.class,
    PermitAllUrlProperties.class,
    OsgPositionServiceImpl.class
})
class OsgPositionControllerTest
{
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OsgPositionMapper positionMapper;

    @MockBean
    private SysDictDataMapper sysDictDataMapper;

    @MockBean
    private OsgJobApplicationMapper jobApplicationMapper;

    @MockBean
    private OsgCoachingMapper coachingMapper;

    @MockBean
    private TokenService tokenService;

    @MockBean
    private RedisCache redisCache;

    @MockBean
    private OsgAssistantAccessService assistantAccessService;

    private final AtomicReference<List<OsgPosition>> positionRowsRef = new AtomicReference<>();
    private final AtomicReference<Map<String, List<SysDictData>>> dictRowsRef = new AtomicReference<>();
    private final AtomicReference<List<OsgJobApplication>> jobApplicationRowsRef = new AtomicReference<>();
    private final AtomicReference<List<OsgCoaching>> coachingRowsRef = new AtomicReference<>();

    private final AtomicLong positionIdSeed = new AtomicLong(200L);

    @BeforeEach
    void setUp()
    {
        positionRowsRef.set(new ArrayList<>(List.of(
            buildPosition(101L, "Investment Bank", "Goldman Sachs", "Summer Analyst", "New York", "2026", "visible", 12),
            buildPosition(102L, "Consulting", "McKinsey", "Business Analyst", "London", "2025", "hidden", 3)
        )));
        dictRowsRef.set(buildDictRows());
        jobApplicationRowsRef.set(new ArrayList<>(List.of(
            buildJobApplication(1001L, 301L, 101L, "Alice", "Goldman Sachs", "Summer Analyst", "Offer"),
            buildJobApplication(1002L, 302L, 102L, "Bob", "McKinsey", "Business Analyst", "面试中")
        )));
        coachingRowsRef.set(new ArrayList<>(List.of(
            buildCoaching(1001L, "导师A", 6)
        )));

        org.mockito.Mockito.when(tokenService.getLoginUser(any())).thenAnswer(invocation -> {
            HttpServletRequest request = invocation.getArgument(0);
            String authorization = request.getHeader("Authorization");
            if ("Bearer position-admin-token".equals(authorization))
            {
                return buildLoginUser("position_admin", "position_admin");
            }
            if ("Bearer clerk-token".equals(authorization))
            {
                return buildLoginUser("clerk", "clerk");
            }
            if ("Bearer assistant-token".equals(authorization))
            {
                return buildLoginUser("assistant", "assistant");
            }
            return null;
        });

        org.mockito.Mockito.when(assistantAccessService.hasAssistantAccess(any())).thenAnswer(invocation -> {
            SysUser user = invocation.getArgument(0);
            return user != null && "assistant".equals(user.getUserName());
        });

        org.mockito.Mockito.when(positionMapper.selectPositionList(any(OsgPosition.class))).thenAnswer(invocation -> {
            List<OsgPosition> rows = new ArrayList<>(positionRowsRef.get());
            rows.sort(Comparator.comparing(OsgPosition::getPublishTime).reversed());
            return rows;
        });

        org.mockito.Mockito.when(positionMapper.selectPositionByPositionId(any())).thenAnswer(invocation -> {
            Long positionId = invocation.getArgument(0);
            return positionRowsRef.get().stream()
                .filter(item -> positionId.equals(item.getPositionId()))
                .findFirst()
                .orElse(null);
        });

        org.mockito.Mockito.when(positionMapper.insertPosition(any(OsgPosition.class))).thenAnswer(invocation -> {
            OsgPosition position = invocation.getArgument(0);
            position.setPositionId(positionIdSeed.incrementAndGet());
            positionRowsRef.get().add(0, clonePosition(position));
            return 1;
        });

        org.mockito.Mockito.when(positionMapper.updatePosition(any(OsgPosition.class))).thenAnswer(invocation -> {
            OsgPosition payload = invocation.getArgument(0);
            List<OsgPosition> updated = new ArrayList<>();
            for (OsgPosition row : positionRowsRef.get())
            {
                if (payload.getPositionId().equals(row.getPositionId()))
                {
                    updated.add(merge(row, payload));
                }
                else
                {
                    updated.add(row);
                }
            }
            positionRowsRef.set(updated);
            return 1;
        });

        org.mockito.Mockito.when(sysDictDataMapper.selectDictDataByType(any())).thenAnswer(invocation -> {
            String dictType = invocation.getArgument(0);
            return new ArrayList<>(dictRowsRef.get().getOrDefault(dictType, List.of()));
        });

        org.mockito.Mockito.when(jobApplicationMapper.selectJobApplicationList(any(OsgJobApplication.class))).thenAnswer(invocation -> {
            OsgJobApplication query = invocation.getArgument(0);
            return jobApplicationRowsRef.get().stream()
                .filter(row -> query.getPositionId() == null || query.getPositionId().equals(row.getPositionId()))
                .filter(row -> query.getCompanyName() == null || query.getCompanyName().equals(row.getCompanyName()))
                .toList();
        });

        org.mockito.Mockito.when(coachingMapper.selectCoachingByApplicationId(any())).thenAnswer(invocation -> {
            Long applicationId = invocation.getArgument(0);
            return coachingRowsRef.get().stream()
                .filter(row -> applicationId.equals(row.getApplicationId()))
                .findFirst()
                .orElse(null);
        });
    }

    @Test
    void listShouldReturnPositionRowsForPositionAdmin() throws Exception
    {
        mockMvc.perform(get("/admin/position/list")
                .header("Authorization", "Bearer position-admin-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.rows[0].positionId").value(101))
                .andExpect(jsonPath("$.rows[0].industry").value("Investment Bank"))
                .andExpect(jsonPath("$.rows[0].companyName").value("Goldman Sachs"))
                .andExpect(jsonPath("$.rows[0].positionName").value("Summer Analyst"))
                .andExpect(jsonPath("$.rows[0].studentCount").value(12))
                .andExpect(jsonPath("$.rows[0].displayStatus").value("visible"));
    }

    @Test
    void statsShouldReturnComputedSummaryForPositionAdmin() throws Exception
    {
        mockMvc.perform(get("/admin/position/stats")
                .header("Authorization", "Bearer position-admin-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.totalPositions").value(2))
                .andExpect(jsonPath("$.data.openPositions").value(1))
                .andExpect(jsonPath("$.data.closedPositions").value(1))
                .andExpect(jsonPath("$.data.studentApplications").value(15));
    }

    @Test
    void drillDownShouldReturnIndustryCompanyHierarchy() throws Exception
    {
        mockMvc.perform(get("/admin/position/drill-down")
                .header("Authorization", "Bearer position-admin-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data[0].industry").value("Investment Bank"))
                .andExpect(jsonPath("$.data[0].companyCount").value(1))
                .andExpect(jsonPath("$.data[0].companies[0].companyName").value("Goldman Sachs"))
                .andExpect(jsonPath("$.data[0].companies[0].positions[0].positionName").value("Summer Analyst"));
    }

    @Test
    void assistantShouldReadStatsWithoutAdminPermission() throws Exception
    {
        mockMvc.perform(get("/admin/position/stats")
                .header("Authorization", "Bearer assistant-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.totalPositions").value(2))
                .andExpect(jsonPath("$.data.studentApplications").value(15));
    }

    @Test
    void assistantShouldReadDrillDownWithoutAdminPermission() throws Exception
    {
        mockMvc.perform(get("/admin/position/drill-down")
                .header("Authorization", "Bearer assistant-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data[0].industry").value("Investment Bank"))
                .andExpect(jsonPath("$.data[0].companies[0].companyName").value("Goldman Sachs"));
    }

    @Test
    void metaShouldReturnDbBackedOptionsForPositionAdmin() throws Exception
    {
        mockMvc.perform(get("/admin/position/meta")
                .header("Authorization", "Bearer position-admin-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.categories[0].value").value("summer"))
                .andExpect(jsonPath("$.data.categories[0].label").value("暑期实习"))
                .andExpect(jsonPath("$.data.industries[0].value").value("Investment Bank"))
                .andExpect(jsonPath("$.data.industries[0].tone").value("gold"))
                .andExpect(jsonPath("$.data.regions[0].value").value("na"))
                .andExpect(jsonPath("$.data.citiesByRegion.na[0].label").value("New York"))
                .andExpect(jsonPath("$.data.processGlossary[0].value").value("OA"));
    }

    @Test
    void companyOptionsShouldReturnDistinctCompanies() throws Exception
    {
        mockMvc.perform(get("/admin/position/company-options")
                .header("Authorization", "Bearer position-admin-token")
                .param("keyword", "gold"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data[0].value").value("Goldman Sachs"))
                .andExpect(jsonPath("$.data[0].label").value("Goldman Sachs"));
    }

    @Test
    void studentsShouldReturnRowsByPositionIdInsteadOfClientSideNameMatch() throws Exception
    {
        mockMvc.perform(get("/admin/position/101/students")
                .header("Authorization", "Bearer position-admin-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data[0].studentId").value(301))
                .andExpect(jsonPath("$.data[0].studentName").value("Alice"))
                .andExpect(jsonPath("$.data[0].status").value("Offer"))
                .andExpect(jsonPath("$.data[0].usedHours").value(6));
    }

    @Test
    void createAndEditShouldPersistAcrossSubsequentListQuery() throws Exception
    {
        mockMvc.perform(post("/admin/position")
                .header("Authorization", "Bearer position-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "positionCategory": "fulltime",
                      "industry": "Tech",
                      "companyName": "ByteDance",
                      "companyType": "Tech",
                      "companyWebsite": "https://careers.bytedance.com",
                      "positionName": "Backend Engineer",
                      "department": "Infrastructure",
                      "region": "ap",
                      "city": "Singapore",
                      "recruitmentCycle": "2026",
                      "projectYear": "2026",
                      "displayStatus": "visible",
                      "displayStartTime": "2026-03-14T09:00:00",
                      "displayEndTime": "2026-06-30T23:59:59",
                      "positionUrl": "https://careers.bytedance.com/backend-engineer"
                    }
                    """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.companyName").value("ByteDance"))
                .andExpect(jsonPath("$.data.positionName").value("Backend Engineer"));

        Long createdId = positionRowsRef.get().stream()
            .filter(item -> "ByteDance".equals(item.getCompanyName()))
            .findFirst()
            .orElseThrow()
            .getPositionId();

        mockMvc.perform(put("/admin/position")
                .header("Authorization", "Bearer position-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "positionId": %d,
                      "displayStatus": "hidden",
                      "applicationNote": "优先考虑有金融项目经验的候选人"
                    }
                    """.formatted(createdId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.displayStatus").value("hidden"));

        mockMvc.perform(get("/admin/position/list")
                .header("Authorization", "Bearer position-admin-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].companyName").value("ByteDance"))
                .andExpect(jsonPath("$.rows[0].displayStatus").value("hidden"))
                .andExpect(jsonPath("$.rows[0].applicationNote").value("优先考虑有金融项目经验的候选人"));
    }

    @Test
    void batchUploadShouldSkipDuplicatesAndReportCounts() throws Exception
    {
        MockMultipartFile file = new MockMultipartFile(
            "file",
            "positions.xlsx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            buildUploadWorkbook()
        );

        var request = multipart("/admin/position/batch-upload").file(file);
        request.with(req -> {
            req.setMethod("POST");
            return req;
        });

        mockMvc.perform(request.header("Authorization", "Bearer position-admin-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.totalCount").value(2))
            .andExpect(jsonPath("$.data.successCount").value(1))
            .andExpect(jsonPath("$.data.duplicateCount").value(1))
            .andExpect(jsonPath("$.data.duplicates[0]").value("Goldman Sachs / Summer Analyst / New York / 2026"));
    }

    @Test
    void batchUploadShouldRejectNonExcelFile() throws Exception
    {
        MockMultipartFile file = new MockMultipartFile(
            "file",
            "positions.txt",
            "text/plain",
            "this is not an excel file".getBytes()
        );

        var request = multipart("/admin/position/batch-upload").file(file);
        request.with(req -> {
            req.setMethod("POST");
            return req;
        });

        mockMvc.perform(request.header("Authorization", "Bearer position-admin-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(500));
    }

    @Test
    void exportShouldReturnExcelForPositionAdmin() throws Exception
    {
        mockMvc.perform(get("/admin/position/export")
                .header("Authorization", "Bearer position-admin-token"))
                .andExpect(status().isOk());
    }

    @Test
    void listShouldReturnForbiddenForUnauthorizedRole() throws Exception
    {
        mockMvc.perform(get("/admin/position/list")
                .header("Authorization", "Bearer clerk-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(403))
                .andExpect(jsonPath("$.msg").value("没有权限，请联系管理员授权"));
    }

    @Test
    void assistantShouldStillBeForbiddenFromPositionList() throws Exception
    {
        mockMvc.perform(get("/admin/position/list")
                .header("Authorization", "Bearer assistant-token"))
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
        user.setUserId("position_admin".equals(roleKey) ? 5L : 2L);
        user.setUserName(username);
        user.setPassword("password");
        user.setRoles(List.of(role));

        return new LoginUser(user.getUserId(), 1L, user, OsgTestPermissions.permissionsForRole(roleKey));
    }

    private OsgPosition buildPosition(Long positionId, String industry, String companyName, String positionName,
                                      String city, String projectYear, String displayStatus, int studentCount)
    {
        OsgPosition position = new OsgPosition();
        position.setPositionId(positionId);
        position.setPositionCategory("summer");
        position.setIndustry(industry);
        position.setCompanyName(companyName);
        position.setCompanyType(industry);
        position.setCompanyWebsite("https://example.com/" + companyName.replace(" ", "").toLowerCase());
        position.setPositionName(positionName);
        position.setDepartment("Core Team");
        position.setRegion("na");
        position.setCity(city);
        position.setRecruitmentCycle(projectYear);
        position.setProjectYear(projectYear);
        position.setPublishTime(Timestamp.valueOf(LocalDateTime.of(2026, 3, 5, 10, 0).minusDays(positionId % 10)));
        position.setDisplayStatus(displayStatus);
        position.setDisplayStartTime(Timestamp.valueOf(LocalDateTime.of(2026, 3, 1, 9, 0)));
        position.setDisplayEndTime(Timestamp.valueOf(LocalDateTime.of(2026, 6, 30, 23, 59)));
        position.setPositionUrl("https://example.com/jobs/" + positionId);
        position.setStudentCount(studentCount);
        return position;
    }

    private OsgPosition clonePosition(OsgPosition source)
    {
        OsgPosition clone = new OsgPosition();
        clone.setPositionId(source.getPositionId());
        clone.setPositionCategory(source.getPositionCategory());
        clone.setIndustry(source.getIndustry());
        clone.setCompanyName(source.getCompanyName());
        clone.setCompanyType(source.getCompanyType());
        clone.setCompanyWebsite(source.getCompanyWebsite());
        clone.setPositionName(source.getPositionName());
        clone.setDepartment(source.getDepartment());
        clone.setRegion(source.getRegion());
        clone.setCity(source.getCity());
        clone.setRecruitmentCycle(source.getRecruitmentCycle());
        clone.setProjectYear(source.getProjectYear());
        clone.setPublishTime(source.getPublishTime());
        clone.setDeadline(source.getDeadline());
        clone.setDisplayStatus(source.getDisplayStatus());
        clone.setDisplayStartTime(source.getDisplayStartTime());
        clone.setDisplayEndTime(source.getDisplayEndTime());
        clone.setPositionUrl(source.getPositionUrl());
        clone.setApplicationNote(source.getApplicationNote());
        clone.setStudentCount(source.getStudentCount());
        return clone;
    }

    private OsgPosition merge(OsgPosition current, OsgPosition payload)
    {
        OsgPosition merged = clonePosition(current);
        if (payload.getDisplayStatus() != null)
        {
            merged.setDisplayStatus(payload.getDisplayStatus());
        }
        if (payload.getApplicationNote() != null)
        {
            merged.setApplicationNote(payload.getApplicationNote());
        }
        return merged;
    }

    private byte[] buildUploadWorkbook() throws Exception
    {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream())
        {
            XSSFSheet sheet = workbook.createSheet("positions");
            sheet.createRow(0).createCell(0).setCellValue("company_name");
            sheet.getRow(0).createCell(1).setCellValue("position_name");
            sheet.getRow(0).createCell(2).setCellValue("region");
            sheet.getRow(0).createCell(3).setCellValue("city");
            sheet.getRow(0).createCell(4).setCellValue("project_year");
            sheet.getRow(0).createCell(5).setCellValue("industry");
            sheet.getRow(0).createCell(6).setCellValue("position_category");

            sheet.createRow(1).createCell(0).setCellValue("Goldman Sachs");
            sheet.getRow(1).createCell(1).setCellValue("Summer Analyst");
            sheet.getRow(1).createCell(2).setCellValue("na");
            sheet.getRow(1).createCell(3).setCellValue("New York");
            sheet.getRow(1).createCell(4).setCellValue("2026");
            sheet.getRow(1).createCell(5).setCellValue("Investment Bank");
            sheet.getRow(1).createCell(6).setCellValue("summer");

            sheet.createRow(2).createCell(0).setCellValue("JP Morgan");
            sheet.getRow(2).createCell(1).setCellValue("Markets Analyst");
            sheet.getRow(2).createCell(2).setCellValue("na");
            sheet.getRow(2).createCell(3).setCellValue("New York");
            sheet.getRow(2).createCell(4).setCellValue("2026");
            sheet.getRow(2).createCell(5).setCellValue("Investment Bank");
            sheet.getRow(2).createCell(6).setCellValue("summer");

            workbook.write(out);
            return out.toByteArray();
        }
    }

    private Map<String, List<SysDictData>> buildDictRows()
    {
        return Map.of(
            "osg_position_category", List.of(
                buildDict("osg_position_category", "summer", "暑期实习", 1, null, null),
                buildDict("osg_position_category", "fulltime", "全职招聘", 2, null, null)
            ),
            "osg_position_display_status", List.of(
                buildDict("osg_position_display_status", "visible", "展示中", 1, "success", null),
                buildDict("osg_position_display_status", "hidden", "已隐藏", 2, "muted", null)
            ),
            "osg_position_industry", List.of(
                buildDict("osg_position_industry", "Investment Bank", "Investment Bank", 1, "gold", "mdi-star"),
                buildDict("osg_position_industry", "Consulting", "Consulting", 2, "violet", "mdi-lightbulb")
            ),
            "osg_company_type", List.of(
                buildDict("osg_company_type", "Investment Bank", "Investment Bank", 1, null, null),
                buildDict("osg_company_type", "Consulting", "Consulting", 2, null, null)
            ),
            "osg_recruitment_cycle", List.of(
                buildDict("osg_recruitment_cycle", "2025", "2025", 1, null, null),
                buildDict("osg_recruitment_cycle", "2026", "2026", 2, null, null)
            ),
            "osg_project_year", List.of(
                buildDict("osg_project_year", "2025", "2025", 1, null, null),
                buildDict("osg_project_year", "2026", "2026", 2, null, null)
            ),
            "osg_position_region", List.of(
                buildDict("osg_position_region", "na", "北美", 1, null, null),
                buildDict("osg_position_region", "eu", "欧洲", 2, null, null)
            ),
            "osg_position_city", List.of(
                buildDict("osg_position_city", "New York", "New York", 1, null, "na"),
                buildDict("osg_position_city", "London", "London", 2, null, "eu")
            ),
            "osg_position_process_glossary", List.of(
                buildDict("osg_position_process_glossary", "OA", "Online Assessment", 1, null, null)
            )
        );
    }

    private SysDictData buildDict(String dictType, String value, String label, long sort, String cssClass, String listClass)
    {
        SysDictData dict = new SysDictData();
        dict.setDictType(dictType);
        dict.setDictValue(value);
        dict.setDictLabel(label);
        dict.setDictSort(sort);
        dict.setCssClass(cssClass);
        dict.setListClass(listClass);
        dict.setStatus("0");
        return dict;
    }

    private OsgJobApplication buildJobApplication(Long applicationId, Long studentId, Long positionId,
                                                  String studentName, String companyName, String positionName,
                                                  String currentStage)
    {
        OsgJobApplication application = new OsgJobApplication();
        application.setApplicationId(applicationId);
        application.setStudentId(studentId);
        application.setPositionId(positionId);
        application.setStudentName(studentName);
        application.setCompanyName(companyName);
        application.setPositionName(positionName);
        application.setCurrentStage(currentStage);
        application.setSubmittedAt(Timestamp.valueOf(LocalDateTime.of(2026, 3, 16, 10, 0)));
        return application;
    }

    private OsgCoaching buildCoaching(Long applicationId, String mentorName, int totalHours)
    {
        OsgCoaching coaching = new OsgCoaching();
        coaching.setApplicationId(applicationId);
        coaching.setMentorName(mentorName);
        coaching.setTotalHours(totalHours);
        coaching.setStatus("辅导中");
        return coaching;
    }

    // ==================== ADDITIONAL BRANCH COVERAGE TESTS ====================

    @Test
    void exportShouldReturnEmptyTemplateWhenTemplateTrue() throws Exception
    {
        mockMvc.perform(get("/admin/position/export")
                .header("Authorization", "Bearer position-admin-token")
                .param("template", "true"))
                .andExpect(status().isOk());
}
}
