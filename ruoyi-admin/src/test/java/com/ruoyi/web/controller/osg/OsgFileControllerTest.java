package com.ruoyi.web.controller.osg;

import static org.mockito.ArgumentMatchers.any;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.sql.Timestamp;
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
import com.ruoyi.system.domain.OsgFile;
import com.ruoyi.system.domain.OsgFileAuth;
import com.ruoyi.system.mapper.OsgFileMapper;

@WebMvcTest(controllers = OsgFileController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
    SecurityConfig.class,
    PermissionService.class,
    AuthenticationEntryPointImpl.class,
    LogoutSuccessHandlerImpl.class,
    JwtAuthenticationTokenFilter.class,
    PermitAllUrlProperties.class
})
class OsgFileControllerTest
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
    private final AtomicLong fileIdSequence = new AtomicLong(20L);
    private final AtomicLong authIdSequence = new AtomicLong(100L);

    @BeforeEach
    void setUp()
    {
        filesRef.set(new ArrayList<>(buildFiles()));
        authRef.set(new ArrayList<>(buildAuths()));
        fileIdSequence.set(30L);
        authIdSequence.set(120L);

        org.mockito.Mockito.when(tokenService.getLoginUser(any())).thenAnswer(invocation -> {
            HttpServletRequest request = invocation.getArgument(0);
            String authorization = request.getHeader("Authorization");
            if ("Bearer file-admin-token".equals(authorization))
            {
                return buildLoginUser("file_admin", "file-admin");
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
    void listShouldReturnFileRowsWithTypeAndAuthorizedSummary() throws Exception
    {
        mockMvc.perform(get("/admin/file/list")
                .header("Authorization", "Bearer file-admin-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.rows[0].fileType").value("folder"))
            .andExpect(jsonPath("$.rows[0].authorizedTo").value("全部用户"))
            .andExpect(jsonPath("$.rows[1].fileType").value("pdf"))
            .andExpect(jsonPath("$.rows[2].fileType").value("word"));
    }

    @Test
    void createFolderShouldPersistAndAppearAfterReload() throws Exception
    {
        mockMvc.perform(post("/admin/file/folder")
                .header("Authorization", "Bearer file-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"folderName\":\"Interview Notes\",\"className\":\"2025Spring\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.fileType").value("folder"))
            .andExpect(jsonPath("$.data.className").value("2025Spring"));

        mockMvc.perform(get("/admin/file/list")
                .header("Authorization", "Bearer file-admin-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.rows[3].fileName").value("Interview Notes"))
            .andExpect(jsonPath("$.rows[3].authorizedTo").value("全部用户"));
    }

    @Test
    void updateAuthShouldPersistAuthorizedTargets() throws Exception
    {
        mockMvc.perform(put("/admin/file/auth")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"fileId\":21,\"authType\":\"user\",\"authorizedUsers\":[\"Alice Zhang\",\"Bob Li\"]}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.authType").value("user"))
            .andExpect(jsonPath("$.data.authorizedTo").value("Alice Zhang, Bob Li"));

        mockMvc.perform(get("/admin/file/list")
                .header("Authorization", "Bearer super-admin-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.rows[1].authorizedTo").value("Alice Zhang, Bob Li"));
    }

    @Test
    void fileApisShouldRejectUnauthorizedRole() throws Exception
    {
        mockMvc.perform(get("/admin/file/list")
                .header("Authorization", "Bearer accountant-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(403))
            .andExpect(jsonPath("$.msg").value("没有权限，请联系管理员授权"));
    }


    // ==================== BRANCH COVERAGE TESTS ====================

    @Test
    void createFolderShouldReturnErrorWhenFolderNameMissing() throws Exception
    {
        mockMvc.perform(post("/admin/file/folder")
                .header("Authorization", "Bearer file-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(500))
            .andExpect(jsonPath("$.msg").value("folderName 不能为空"));
    }

    @Test
    void createFolderShouldUseDefaultClassNameWhenNotProvided() throws Exception
    {
        mockMvc.perform(post("/admin/file/folder")
                .header("Authorization", "Bearer file-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"folderName\":\"Default Class Folder\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.className").value("All"));
    }

    @Test
    void updateAuthShouldReturnErrorWhenFileIdMissing() throws Exception
    {
        mockMvc.perform(put("/admin/file/auth")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(500))
            .andExpect(jsonPath("$.msg").value("fileId 不能为空"));
    }

    @Test
    void updateAuthShouldReturnErrorWhenFileNotFound() throws Exception
    {
        mockMvc.perform(put("/admin/file/auth")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"fileId\": 9999, \"authType\": \"all\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(500))
            .andExpect(jsonPath("$.msg").value("文件不存在"));
    }

    @Test
    void updateAuthShouldSetAllAuthTypeWithEmptyList() throws Exception
    {
        mockMvc.perform(put("/admin/file/auth")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"fileId\": 20, \"authType\": \"all\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.authorizedTo").value("全部用户"));
    }

    @Test
    void updateAuthShouldReturnErrorForUnsupportedAuthType() throws Exception
    {
        mockMvc.perform(put("/admin/file/auth")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"fileId\": 20, \"authType\": \"unknown\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(500))
            .andExpect(jsonPath("$.msg").value("不支持的授权类型"));
    }

    @Test
    void updateAuthShouldReturnErrorForEmptyAuthorizedTargets() throws Exception
    {
        mockMvc.perform(put("/admin/file/auth")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"fileId\": 20, \"authType\": \"class\", \"authorizedClasses\": []}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(500))
            .andExpect(jsonPath("$.msg").value("授权目标不能为空"));
    }

    @Test
    void updateAuthShouldAcceptFileIdAsString() throws Exception
    {
        mockMvc.perform(put("/admin/file/auth")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"fileId\": \"20\", \"authType\": \"all\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void updateAuthShouldAcceptClassAuthType() throws Exception
    {
        mockMvc.perform(put("/admin/file/auth")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"fileId\": 20, \"authType\": \"class\", \"authorizedClasses\": [\"2025Spring\"]}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.authorizedTo").value("2025Spring"));
    }

    @Test
    void updateAuthShouldHandleNonListAuthorizedClasses() throws Exception
    {
        mockMvc.perform(put("/admin/file/auth")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"fileId\": 20, \"authType\": \"class\", \"authorizedClasses\": \"notAList\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(500))
            .andExpect(jsonPath("$.msg").value("授权目标不能为空"));
    }

    @Test
    void listShouldShowUnauthorizedForFileWithEmptyAuthList() throws Exception
    {
        OsgFile noAuthFile = buildFile(25L, "NoAuth.pdf", "pdf", "All", "1 MB", "user", "");
        filesRef.get().add(noAuthFile);

        mockMvc.perform(get("/admin/file/list")
                .header("Authorization", "Bearer file-admin-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.rows[3].authorizedTo").value("未授权"));
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

    private List<OsgFile> buildFiles()
    {
        return List.of(
            buildFile(20L, "Interview Folder", "folder", "2025Spring", "--", "all", "全部用户"),
            buildFile(21L, "Resume Guide.pdf", "pdf", "All", "2.4 MB", "class", "2025Spring"),
            buildFile(22L, "Networking Script.docx", "word", "2024Fall", "680 KB", "user", "Alice Zhang")
        );
    }

    private List<OsgFileAuth> buildAuths()
    {
        return List.of(
            buildAuth(101L, 21L, "class", "2025Spring", "2025Spring"),
            buildAuth(102L, 22L, "user", "alice-zhang", "Alice Zhang")
        );
    }

    private OsgFile buildFile(Long fileId,
                              String fileName,
                              String fileType,
                              String className,
                              String fileSize,
                              String authType,
                              String authorizedTo)
    {
        OsgFile row = new OsgFile();
        row.setFileId(fileId);
        row.setFileName(fileName);
        row.setFileType(fileType);
        row.setClassName(className);
        row.setFileSize(fileSize);
        row.setAuthType(authType);
        row.setAuthorizedTo(authorizedTo);
        row.setCreateTime(Timestamp.valueOf("2026-03-14 09:30:00"));
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
        List<OsgFileAuth> rows = new ArrayList<>();
        for (OsgFileAuth auth : authRef.get())
        {
            if (java.util.Objects.equals(auth.getFileId(), fileId))
            {
                rows.add(auth);
            }
        }
        return rows;
    }

    private int insertFile(OsgFile file)
    {
        file.setFileId(fileIdSequence.incrementAndGet());
        filesRef.get().add(file);
        return 1;
    }

    private int updateFile(OsgFile file)
    {
        List<OsgFile> rows = filesRef.get();
        for (int i = 0; i < rows.size(); i++)
        {
            if (java.util.Objects.equals(rows.get(i).getFileId(), file.getFileId()))
            {
                rows.set(i, file);
                return 1;
            }
        }
        return 0;
    }

    private int deleteAuthByFileId(Long fileId)
    {
        authRef.get().removeIf(item -> java.util.Objects.equals(item.getFileId(), fileId));
        return 1;
    }

    private int insertAuth(List<OsgFileAuth> authList)
    {
        for (OsgFileAuth auth : authList)
        {
            auth.setAuthId(authIdSequence.incrementAndGet());
            authRef.get().add(auth);
        }
        return authList.size();
    }

    // ==================== ADDITIONAL BRANCH COVERAGE TESTS ====================

    @Test
    void updateAuthShouldHandleNullItemsInAuthorizedList() throws Exception
    {
        mockMvc.perform(put("/admin/file/auth")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"fileId\": 20, \"authType\": \"user\", \"authorizedUsers\": [\"Alice\", null, \"\", \"  \", \"Bob\"]}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.authorizedTo").value("Alice, Bob"));
    }

    @Test
    void createFolderShouldHandleBlankClassName() throws Exception
    {
        mockMvc.perform(post("/admin/file/folder")
                .header("Authorization", "Bearer file-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"folderName\":\"Test Folder\",\"className\":\"\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.className").value("All"));
    }

    @Test
    void updateAuthShouldHandleFileIdAsNumber() throws Exception
    {
        mockMvc.perform(put("/admin/file/auth")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"fileId\": 20, \"authType\": \"user\", \"authorizedUsers\": [\"Charlie\"]}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.authorizedTo").value("Charlie"));
    }

    @Test
    void updateAuthShouldReturnErrorWhenAuthTypeMissing() throws Exception
    {
        mockMvc.perform(put("/admin/file/auth")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"fileId\": 20}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(500))
            .andExpect(jsonPath("$.msg").value("authType 不能为空"));
    }
}
