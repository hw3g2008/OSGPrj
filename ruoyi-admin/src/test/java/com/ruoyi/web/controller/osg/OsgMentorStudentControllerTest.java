package com.ruoyi.web.controller.osg;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyList;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Set;

import jakarta.servlet.http.HttpServletRequest;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
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
import com.ruoyi.system.domain.OsgCoaching;
import com.ruoyi.system.domain.OsgJobCoaching;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.OsgCoachingMapper;
import com.ruoyi.system.mapper.OsgStudentMapper;
import com.ruoyi.system.service.IOsgJobCoachingService;
@WebMvcTest(controllers = OsgMentorStudentController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({
    SecurityConfig.class,
    PermissionService.class,
    AuthenticationEntryPointImpl.class,
    LogoutSuccessHandlerImpl.class,
    JwtAuthenticationTokenFilter.class,
    PermitAllUrlProperties.class
})
class OsgMentorStudentControllerTest
{
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private IOsgJobCoachingService jobCoachingService;

    @MockBean
    private OsgCoachingMapper coachingMapper;

    @MockBean
    private OsgStudentMapper studentMapper;

    @MockBean
    private com.ruoyi.system.service.ISysUserService userService;

    @MockBean
    private TokenService tokenService;

    @MockBean
    private RedisCache redisCache;

    @BeforeEach
    void setUp()
    {
        org.mockito.Mockito.when(tokenService.getLoginUser(any())).thenAnswer(invocation -> {
            HttpServletRequest request = invocation.getArgument(0);
            String authorization = request.getHeader("Authorization");
            if ("Bearer mentor-token".equals(authorization))
            {
                return buildLoginUser();
            }
            return null;
        });
    }

    @Test
    void listShouldMergeLegacyAndCurrentCoachingsAndPreferOsgStudentRows() throws Exception
    {
        org.mockito.Mockito.when(jobCoachingService.selectList(any(OsgJobCoaching.class))).thenReturn(List.of(
            buildLegacyCoaching(998000000003L)
        ));
        org.mockito.Mockito.when(coachingMapper.selectCoachingList(any(OsgCoaching.class))).thenReturn(List.of(
            buildCurrentCoaching(998000000001L),
            buildCurrentSharedCoaching(998000000002L),
            buildForeignCurrentCoaching(998000000099L)
        ));
        org.mockito.Mockito.when(studentMapper.selectStudentByStudentIds(anyList())).thenReturn(List.of(
            buildStudent(998000000001L, "张三"),
            buildStudent(998000000002L, "李四"),
            buildStudent(998000000099L, "不应出现")
        ));
        org.mockito.Mockito.when(userService.selectUserById(anyLong())).thenReturn(buildFallbackUser(998000000003L, "王五"));

        mockMvc.perform(get("/api/mentor/students/list")
                .header("Authorization", "Bearer mentor-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.total").value(3))
            .andExpect(jsonPath("$.rows.length()").value(3))
            .andExpect(jsonPath("$.rows[0].userId").value(998000000001L))
            .andExpect(jsonPath("$.rows[0].nickName").value("张三"))
            .andExpect(jsonPath("$.rows[1].userId").value(998000000002L))
            .andExpect(jsonPath("$.rows[1].nickName").value("李四"))
            .andExpect(jsonPath("$.rows[2].userId").value(998000000003L))
            .andExpect(jsonPath("$.rows[2].nickName").value("王五"));

        org.mockito.Mockito.verify(studentMapper).selectStudentByStudentIds(List.of(
            998000000001L,
            998000000002L,
            998000000003L
        ));
        org.mockito.Mockito.verify(userService).selectUserById(998000000003L);
    }

    @Test
    void listShouldUseFallbackSysUserWhenStudentRowMissing() throws Exception
    {
        org.mockito.Mockito.when(jobCoachingService.selectList(any(OsgJobCoaching.class))).thenReturn(List.of(
            buildLegacyCoaching(998000000004L)
        ));
        org.mockito.Mockito.when(coachingMapper.selectCoachingList(any(OsgCoaching.class))).thenReturn(List.of());
        org.mockito.Mockito.when(studentMapper.selectStudentByStudentIds(anyList())).thenReturn(List.of());
        org.mockito.Mockito.when(userService.selectUserById(998000000004L)).thenReturn(buildFallbackUser(998000000004L, "赵六"));

        mockMvc.perform(get("/api/mentor/students/list")
                .header("Authorization", "Bearer mentor-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.rows[0].userId").value(998000000004L))
            .andExpect(jsonPath("$.rows[0].nickName").value("赵六"));
    }

    private LoginUser buildLoginUser()
    {
        SysRole role = new SysRole();
        role.setRoleKey("mentor");
        role.setRoleName("mentor");

        SysUser user = new SysUser();
        user.setUserId(837L);
        user.setUserName("mentor");
        user.setNickName("mentor");
        user.setRoles(List.of(role));

        return new LoginUser(837L, 1L, user, OsgTestPermissions.permissionsForRole("mentor"));
    }

    private OsgJobCoaching buildLegacyCoaching(Long studentId)
    {
        OsgJobCoaching coaching = new OsgJobCoaching();
        coaching.setMentorId(837L);
        coaching.setStudentId(studentId);
        return coaching;
    }

    private OsgCoaching buildCurrentCoaching(Long studentId)
    {
        OsgCoaching coaching = new OsgCoaching();
        coaching.setMentorId(837L);
        coaching.setStudentId(studentId);
        return coaching;
    }

    private OsgCoaching buildCurrentSharedCoaching(Long studentId)
    {
        OsgCoaching coaching = new OsgCoaching();
        coaching.setMentorId(null);
        coaching.setMentorIds("836, 837");
        coaching.setStudentId(studentId);
        return coaching;
    }

    private OsgCoaching buildForeignCurrentCoaching(Long studentId)
    {
        OsgCoaching coaching = new OsgCoaching();
        coaching.setMentorId(999L);
        coaching.setMentorIds("999");
        coaching.setStudentId(studentId);
        return coaching;
    }

    private OsgStudent buildStudent(Long studentId, String studentName)
    {
        OsgStudent student = new OsgStudent();
        student.setStudentId(studentId);
        student.setStudentName(studentName);
        return student;
    }

    private SysUser buildFallbackUser(Long userId, String nickName)
    {
        SysUser user = new SysUser();
        user.setUserId(userId);
        user.setUserName(nickName);
        user.setNickName(nickName);
        return user;
    }
}
