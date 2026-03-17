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
import com.ruoyi.system.domain.OsgPosition;
import com.ruoyi.system.mapper.OsgPositionMapper;
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
    private TokenService tokenService;

    @MockBean
    private RedisCache redisCache;

    private final AtomicReference<List<OsgPosition>> positionRowsRef = new AtomicReference<>();

    private final AtomicLong positionIdSeed = new AtomicLong(200L);

    @BeforeEach
    void setUp()
    {
        positionRowsRef.set(new ArrayList<>(List.of(
            buildPosition(101L, "Investment Bank", "Goldman Sachs", "Summer Analyst", "New York", "2026", "visible", 12),
            buildPosition(102L, "Consulting", "McKinsey", "Business Analyst", "London", "2025", "hidden", 3)
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
            return null;
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
    void listShouldReturnForbiddenForUnauthorizedRole() throws Exception
    {
        mockMvc.perform(get("/admin/position/list")
                .header("Authorization", "Bearer clerk-token"))
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
}
