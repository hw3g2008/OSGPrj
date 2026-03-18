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
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import com.ruoyi.RuoYiApplication;
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
import com.ruoyi.system.domain.OsgFile;
import com.ruoyi.system.domain.OsgFileAuth;
import com.ruoyi.system.mapper.OsgFileMapper;
import com.ruoyi.system.service.impl.OsgFileServiceImpl;

@WebMvcTest(controllers = OsgQbankController.class)
@AutoConfigureMockMvc(addFilters = true)
@ContextConfiguration(classes = RuoYiApplication.class)
@Import({
    SecurityConfig.class,
    PermissionService.class,
    AuthenticationEntryPointImpl.class,
    LogoutSuccessHandlerImpl.class,
    JwtAuthenticationTokenFilter.class,
    PermitAllUrlProperties.class,
    OsgFileServiceImpl.class
})
class OsgQbankControllerTest
{
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OsgFileMapper fileMapper;

    @MockBean
    private TokenService tokenService;

    @MockBean
    private RedisCache redisCache;

    private final AtomicReference<List<OsgFile>> filesRef = new AtomicReference<>();
    private final AtomicReference<List<OsgFileAuth>> authRef = new AtomicReference<>();
    private final AtomicLong fileIdSequence = new AtomicLong(40L);
    private final AtomicLong authIdSequence = new AtomicLong(200L);

    @BeforeEach
    void setUp()
    {
        filesRef.set(new ArrayList<>(buildFiles()));
        authRef.set(new ArrayList<>(buildAuths()));
        fileIdSequence.set(50L);
        authIdSequence.set(240L);

        org.mockito.Mockito.when(tokenService.getLoginUser(any())).thenAnswer(invocation -> {
            HttpServletRequest request = invocation.getArgument(0);
            String authorization = request.getHeader("Authorization");
            if ("Bearer qbank-admin-token".equals(authorization))
            {
                return buildLoginUser("qbank_admin", "qbank-admin");
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

        org.mockito.Mockito.when(fileMapper.selectFileList(any(OsgFile.class)))
            .thenAnswer(invocation -> selectFiles(invocation.getArgument(0)));
        org.mockito.Mockito.when(fileMapper.selectFileByFileId(any(Long.class)))
            .thenAnswer(invocation -> selectFileById(invocation.getArgument(0)));
        org.mockito.Mockito.when(fileMapper.selectFileAuthListByFileId(any(Long.class)))
            .thenAnswer(invocation -> selectAuthByFileId(invocation.getArgument(0)));
        org.mockito.Mockito.when(fileMapper.insertFile(any(OsgFile.class)))
            .thenAnswer(invocation -> insertFile(invocation.getArgument(0)));
        org.mockito.Mockito.when(fileMapper.updateFile(any(OsgFile.class)))
            .thenAnswer(invocation -> updateFile(invocation.getArgument(0)));
        org.mockito.Mockito.when(fileMapper.deleteFileAuthByFileId(any(Long.class)))
            .thenAnswer(invocation -> deleteAuthByFileId(invocation.getArgument(0)));
        org.mockito.Mockito.when(fileMapper.batchInsertFileAuth(any(List.class)))
            .thenAnswer(invocation -> insertAuth(invocation.getArgument(0)));
    }

    @Test
    void listShouldReturnQbankFoldersWithExpiryAndAuthorizedSummary() throws Exception
    {
        mockMvc.perform(get("/admin/qbank/list")
                .header("Authorization", "Bearer qbank-admin-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.rows[0].fileName").value("GS Superday Folder"))
            .andExpect(jsonPath("$.rows[0].authorizedTo").value("全部用户"))
            .andExpect(jsonPath("$.rows[0].expiryAt").value("2026-12-31 23:59"))
            .andExpect(jsonPath("$.rows[1].authorizedTo").value("2025Spring"));
    }

    @Test
    void createFolderShouldPersistAndAppearAfterReload() throws Exception
    {
        mockMvc.perform(post("/admin/qbank/folder")
                .header("Authorization", "Bearer qbank-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "folderName": "Tech Question Pack"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.fileType").value("qbank-folder"))
            .andExpect(jsonPath("$.data.authorizedTo").value("全部用户"));

        mockMvc.perform(get("/admin/qbank/list")
                .header("Authorization", "Bearer qbank-admin-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.rows[2].fileName").value("Tech Question Pack"));
    }

    @Test
    void updateAuthAndExpiryShouldPersistAcrossSubsequentListQuery() throws Exception
    {
        mockMvc.perform(put("/admin/qbank/auth")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "fileId": 41,
                      "authType": "user",
                      "authorizedUsers": ["Alice Zhang", "Bob Li"]
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.authorizedTo").value("Alice Zhang, Bob Li"));

        mockMvc.perform(put("/admin/qbank/expiry")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "fileId": 41,
                      "expiryAt": "2027-01-31T23:59:00"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.expiryAt").value("2027-01-31 23:59"));

        mockMvc.perform(get("/admin/qbank/list")
                .header("Authorization", "Bearer qbank-admin-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.rows[1].authorizedTo").value("Alice Zhang, Bob Li"))
            .andExpect(jsonPath("$.rows[1].expiryAt").value("2027-01-31 23:59"));
    }

    @Test
    void qbankApisShouldRejectUnauthorizedRole() throws Exception
    {
        mockMvc.perform(get("/admin/qbank/list")
                .header("Authorization", "Bearer file-admin-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(403))
            .andExpect(jsonPath("$.msg").value("没有权限，请联系管理员授权"));
    }


    // ==================== BRANCH COVERAGE TESTS ====================

    @Test
    void createFolderShouldReturnErrorWhenFolderNameMissing() throws Exception
    {
        mockMvc.perform(post("/admin/qbank/folder")
                .header("Authorization", "Bearer qbank-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(500))
            .andExpect(jsonPath("$.msg").value("folderName 不能为空"));
    }

    @Test
    void updateAuthShouldReturnErrorWhenFileIdMissing() throws Exception
    {
        mockMvc.perform(put("/admin/qbank/auth")
                .header("Authorization", "Bearer qbank-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"authType\": \"all\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(500))
            .andExpect(jsonPath("$.msg").value("fileId 不能为空"));
    }

    @Test
    void updateAuthShouldReturnErrorWhenAuthTypeMissing() throws Exception
    {
        mockMvc.perform(put("/admin/qbank/auth")
                .header("Authorization", "Bearer qbank-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"fileId\": 40}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(500))
            .andExpect(jsonPath("$.msg").value("authType 不能为空"));
    }

    @Test
    void updateAuthShouldReturnErrorForUnsupportedAuthType() throws Exception
    {
        mockMvc.perform(put("/admin/qbank/auth")
                .header("Authorization", "Bearer qbank-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"fileId\": 40, \"authType\": \"unknown\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(500))
            .andExpect(jsonPath("$.msg").value("不支持的授权类型"));
    }

    @Test
    void updateAuthShouldAcceptAllAuthType() throws Exception
    {
        mockMvc.perform(put("/admin/qbank/auth")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"fileId\": 40, \"authType\": \"all\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void updateAuthShouldAcceptClassAuthType() throws Exception
    {
        mockMvc.perform(put("/admin/qbank/auth")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "fileId": 40,
                      "authType": "class",
                      "authorizedClasses": ["2025Fall"]
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void updateAuthShouldAcceptFileIdAsString() throws Exception
    {
        mockMvc.perform(put("/admin/qbank/auth")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"fileId\": \"40\", \"authType\": \"all\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void updateExpiryShouldReturnErrorWhenFileIdMissing() throws Exception
    {
        mockMvc.perform(put("/admin/qbank/expiry")
                .header("Authorization", "Bearer qbank-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expiryAt\": \"2027-12-31T23:59:00\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(500))
            .andExpect(jsonPath("$.msg").value("fileId 不能为空"));
    }

    @Test
    void updateExpiryShouldReturnErrorWhenExpiryAtMissing() throws Exception
    {
        mockMvc.perform(put("/admin/qbank/expiry")
                .header("Authorization", "Bearer qbank-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"fileId\": 40}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(500))
            .andExpect(jsonPath("$.msg").value("expiryAt 不能为空"));
    }

    private LoginUser buildLoginUser(String roleKey, String username)
    {
        SysRole role = new SysRole();
        role.setRoleKey(roleKey);
        role.setRoleName(roleKey);

        SysUser user = new SysUser();
        user.setUserId(29L);
        user.setUserName(username);
        user.setPassword("password");
        user.setRoles(List.of(role));

        return new LoginUser(29L, 1L, user, OsgTestPermissions.permissionsForRole(roleKey));
    }

    private List<OsgFile> buildFiles()
    {
        return List.of(
            buildFile(40L, "GS Superday Folder", "qbank-folder", "--", "all", "expiryAt=2026-12-31 23:59"),
            buildFile(41L, "Consulting Core Folder", "qbank-folder", "--", "class", "expiryAt=2026-09-30 23:59"),
            buildFile(42L, "Resume Guide.pdf", "pdf", "2.4 MB", "all", "expiryAt=2026-08-31 23:59")
        );
    }

    private List<OsgFileAuth> buildAuths()
    {
        return List.of(
            buildAuth(201L, 41L, "class", "2025Spring", "2025Spring")
        );
    }

    private OsgFile buildFile(Long fileId,
                              String fileName,
                              String fileType,
                              String fileSize,
                              String authType,
                              String remark)
    {
        OsgFile row = new OsgFile();
        row.setFileId(fileId);
        row.setFileName(fileName);
        row.setFileType(fileType);
        row.setFileSize(fileSize);
        row.setAuthType(authType);
        row.setRemark(remark);
        row.setCreateTime(Timestamp.valueOf(LocalDateTime.of(2026, 3, 14, 11, 0).plusMinutes(fileId)));
        return row;
    }

    private OsgFileAuth buildAuth(Long authId,
                                  Long fileId,
                                  String authType,
                                  String targetValue,
                                  String targetLabel)
    {
        OsgFileAuth auth = new OsgFileAuth();
        auth.setAuthId(authId);
        auth.setFileId(fileId);
        auth.setAuthType(authType);
        auth.setTargetValue(targetValue);
        auth.setTargetLabel(targetLabel);
        return auth;
    }

    private List<OsgFile> selectFiles(OsgFile query)
    {
        String keyword = query == null ? null : query.getKeyword();
        List<OsgFile> rows = new ArrayList<>();
        for (OsgFile item : filesRef.get())
        {
            if (keyword == null || keyword.isBlank() || item.getFileName().toLowerCase().contains(keyword.toLowerCase()))
            {
                rows.add(item);
            }
        }
        return rows;
    }

    private OsgFile selectFileById(Long fileId)
    {
        return filesRef.get().stream()
            .filter(item -> java.util.Objects.equals(item.getFileId(), fileId))
            .findFirst()
            .orElse(null);
    }

    private List<OsgFileAuth> selectAuthByFileId(Long fileId)
    {
        return authRef.get().stream()
            .filter(item -> java.util.Objects.equals(item.getFileId(), fileId))
            .toList();
    }

    private int insertFile(OsgFile file)
    {
        file.setFileId(fileIdSequence.incrementAndGet());
        List<OsgFile> next = new ArrayList<>(filesRef.get());
        next.add(file);
        filesRef.set(next);
        return 1;
    }

    private int updateFile(OsgFile file)
    {
        List<OsgFile> next = new ArrayList<>(filesRef.get());
        for (int index = 0; index < next.size(); index++)
        {
            if (java.util.Objects.equals(next.get(index).getFileId(), file.getFileId()))
            {
                next.set(index, file);
                filesRef.set(next);
                return 1;
            }
        }
        return 0;
    }

    private int deleteAuthByFileId(Long fileId)
    {
        authRef.set(authRef.get().stream()
            .filter(item -> !java.util.Objects.equals(item.getFileId(), fileId))
            .collect(java.util.stream.Collectors.toCollection(ArrayList::new)));
        return 1;
    }

    @SuppressWarnings("unchecked")
    private int insertAuth(List<OsgFileAuth> authList)
    {
        List<OsgFileAuth> next = new ArrayList<>(authRef.get());
        for (OsgFileAuth auth : authList)
        {
            auth.setAuthId(authIdSequence.incrementAndGet());
            next.add(auth);
        }
        authRef.set(next);
        return authList.size();
    }

    // ==================== ADDITIONAL BRANCH COVERAGE TESTS ====================

    @Test
    void updateAuthShouldHandleNullItemsInAuthorizedList() throws Exception
    {
        mockMvc.perform(put("/admin/qbank/auth")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"fileId\": 40, \"authType\": \"class\", \"authorizedClasses\": [\"2025Spring\", null, \"\", \"2025Fall\"]}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void updateAuthShouldReturnErrorForNonListAuthorizedUsers() throws Exception
    {
        mockMvc.perform(put("/admin/qbank/auth")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"fileId\": 40, \"authType\": \"user\", \"authorizedUsers\": \"notAList\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(500));
    }

    @Test
    void updateExpiryShouldAcceptFileIdAsString() throws Exception
    {
        mockMvc.perform(put("/admin/qbank/expiry")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"fileId\": \"40\", \"expiryAt\": \"2027-12-31T23:59:00\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200));
    }
}
