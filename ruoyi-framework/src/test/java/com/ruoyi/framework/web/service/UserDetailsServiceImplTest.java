package com.ruoyi.framework.web.service;

import java.lang.reflect.Field;
import java.util.Locale;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.context.MessageSource;

import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.spring.SpringUtils;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.OsgStudentMapper;
import com.ruoyi.system.service.ISysUserService;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * UserDetailsServiceImpl 学员账号状态分支测试
 *
 * 覆盖：account_status ∈ {0, 1, 2, 3} 共 4 用例（spec § 5.2）。
 * 非学员（mapper 返回 null）走原 sys_user 校验路径，沿用既有覆盖。
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class UserDetailsServiceImplTest
{
    @InjectMocks
    private UserDetailsServiceImpl userDetailsService;

    @Mock
    private ISysUserService userService;

    @Mock
    private SysPasswordService passwordService;

    @Mock
    private SysPermissionService permissionService;

    @Mock
    private OsgStudentMapper osgStudentMapper;

    private SysUser sysUser;
    private Object originalBeanFactory;

    @BeforeEach
    void setUp() throws Exception
    {
        sysUser = new SysUser();
        sysUser.setUserId(46706L);
        sysUser.setUserName("story1.test@osg.test");
        sysUser.setStatus("0");
        sysUser.setDelFlag("0");
        when(userService.selectUserByUserName(sysUser.getUserName())).thenReturn(sysUser);

        // MessageUtils.message(key) → SpringUtils.getBean(MessageSource).getMessage(key,…)。
        // 单测无 Spring 上下文，按 key 原样回传，保证抛出的 ServiceException 文案 = i18n key。
        MessageSource messageSource = mock(MessageSource.class);
        when(messageSource.getMessage(any(String.class), any(), any(Locale.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        ConfigurableListableBeanFactory beanFactory = mock(ConfigurableListableBeanFactory.class);
        when(beanFactory.getBean(MessageSource.class)).thenReturn(messageSource);
        Field field = SpringUtils.class.getDeclaredField("beanFactory");
        field.setAccessible(true);
        originalBeanFactory = field.get(null);
        field.set(null, beanFactory);
    }

    @AfterEach
    void tearDown() throws Exception
    {
        Field field = SpringUtils.class.getDeclaredField("beanFactory");
        field.setAccessible(true);
        field.set(null, originalBeanFactory);
    }

    private OsgStudent stubStudent(String accountStatus)
    {
        return stubStudent(accountStatus, 0);
    }

    /**
     * 批次 7 + 7.5：拆 accountStatus 与 frozen 后扩展 stub 支持双维度。
     * 见 docs/plans/stage-coaching-request/09-rule-a-alignment-fix-plan.md §13.2
     */
    private OsgStudent stubStudent(String accountStatus, Integer frozen)
    {
        OsgStudent student = new OsgStudent();
        student.setStudentId(46706L);
        student.setEmail(sysUser.getUserName());
        student.setAccountStatus(accountStatus);
        student.setFrozen(frozen);
        return student;
    }

    @Test
    void shouldLoadLoginUserWhenStudentStatusNormal()
    {
        when(osgStudentMapper.selectStudentByEmail(sysUser.getUserName())).thenReturn(stubStudent("0"));

        Object loginUser = userDetailsService.loadUserByUsername(sysUser.getUserName());

        assertNotNull(loginUser);
        assertTrue(loginUser instanceof LoginUser);
        verify(passwordService).validate(sysUser);
    }

    @Test
    void shouldRejectFrozenStudent()
    {
        // 批次 7 + 7.5：frozen=1 拦截登录，与 accountStatus 维度正交
        when(osgStudentMapper.selectStudentByEmail(sysUser.getUserName())).thenReturn(stubStudent("0", 1));

        ServiceException ex = assertThrows(ServiceException.class,
                () -> userDetailsService.loadUserByUsername(sysUser.getUserName()));
        assertEquals("student.account.frozen", ex.getMessage());
        verify(passwordService, org.mockito.Mockito.never()).validate(any());
    }

    @Test
    void shouldRejectContractEndedFrozenStudent()
    {
        // 矩阵 2/1：合同结束 + 冻结叠加 → 登录被拒（§13.3）
        when(osgStudentMapper.selectStudentByEmail(sysUser.getUserName())).thenReturn(stubStudent("2", 1));

        ServiceException ex = assertThrows(ServiceException.class,
                () -> userDetailsService.loadUserByUsername(sysUser.getUserName()));
        assertEquals("student.account.frozen", ex.getMessage());
    }

    @Test
    void shouldLoadLoginUserWhenContractEnded()
    {
        when(osgStudentMapper.selectStudentByEmail(sysUser.getUserName())).thenReturn(stubStudent("2"));

        Object loginUser = userDetailsService.loadUserByUsername(sysUser.getUserName());

        assertNotNull(loginUser);
        assertTrue(loginUser instanceof LoginUser);
        verify(passwordService).validate(sysUser);
    }

    @Test
    void shouldRejectRefundedStudent()
    {
        when(osgStudentMapper.selectStudentByEmail(sysUser.getUserName())).thenReturn(stubStudent("3"));

        ServiceException ex = assertThrows(ServiceException.class,
                () -> userDetailsService.loadUserByUsername(sysUser.getUserName()));
        assertEquals("student.account.refunded", ex.getMessage());
        verify(passwordService, org.mockito.Mockito.never()).validate(any());
    }
}
