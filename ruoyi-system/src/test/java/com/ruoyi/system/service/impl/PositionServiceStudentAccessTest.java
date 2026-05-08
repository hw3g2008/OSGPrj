package com.ruoyi.system.service.impl;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.context.MessageSource;

import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.spring.SpringUtils;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.OsgStudentMapper;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * PositionServiceImpl#requireActiveStudentForPositionAccess 分支测试。
 *
 * 决策表（spec § 5.2）：
 * - userId=null              → 直接放行
 * - 非学员 (mapper 返回 null) → 直接放行
 * - account_status=0 + 无黑名单 → 通过
 * - account_status=2          → 拒绝（合同已结束）
 * - account_status=0 + 黑名单 → 拒绝（黑名单）
 *
 * （account_status=1/3 由 T2 登录层拦截，触达不到此处。）
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PositionServiceStudentAccessTest
{
    @Mock
    private OsgStudentMapper osgStudentMapper;

    @Mock
    private OsgStudentServiceImpl osgStudentService;

    private PositionServiceImpl positionService;
    private Method requireMethod;
    private Object originalBeanFactory;

    @BeforeEach
    void setUp() throws Exception
    {
        MockitoAnnotations.openMocks(this);
        positionService = new PositionServiceImpl();
        injectField("osgStudentMapper", osgStudentMapper);
        injectField("osgStudentService", osgStudentService);
        requireMethod = PositionServiceImpl.class.getDeclaredMethod(
                "requireActiveStudentForPositionAccess", Long.class);
        requireMethod.setAccessible(true);

        MessageSource messageSource = mock(MessageSource.class);
        when(messageSource.getMessage(any(String.class), any(), any(Locale.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        ConfigurableListableBeanFactory beanFactory = mock(ConfigurableListableBeanFactory.class);
        when(beanFactory.getBean(MessageSource.class)).thenReturn(messageSource);
        Field bf = SpringUtils.class.getDeclaredField("beanFactory");
        bf.setAccessible(true);
        originalBeanFactory = bf.get(null);
        bf.set(null, beanFactory);
    }

    @AfterEach
    void tearDown() throws Exception
    {
        Field bf = SpringUtils.class.getDeclaredField("beanFactory");
        bf.setAccessible(true);
        bf.set(null, originalBeanFactory);
    }

    private void injectField(String name, Object value) throws Exception
    {
        Field field = PositionServiceImpl.class.getDeclaredField(name);
        field.setAccessible(true);
        field.set(positionService, value);
    }

    private void invoke(Long userId)
    {
        try
        {
            requireMethod.invoke(positionService, userId);
        }
        catch (java.lang.reflect.InvocationTargetException ex)
        {
            if (ex.getCause() instanceof RuntimeException re)
            {
                throw re;
            }
            throw new RuntimeException(ex.getCause());
        }
        catch (IllegalAccessException ex)
        {
            throw new RuntimeException(ex);
        }
    }

    private OsgStudent stubStudent(String accountStatus)
    {
        OsgStudent student = new OsgStudent();
        student.setStudentId(46706L);
        student.setEmail("story1.test@osg.test");
        student.setAccountStatus(accountStatus);
        return student;
    }

    @Test
    void shouldPassWhenUserIdIsNull()
    {
        assertDoesNotThrow(() -> invoke(null));
    }

    @Test
    void shouldPassWhenNotStudent()
    {
        when(osgStudentMapper.selectStudentByUserId(99L)).thenReturn(null);
        assertDoesNotThrow(() -> invoke(99L));
    }

    @Test
    void shouldPassWhenStatusNormalAndNotBlacklisted()
    {
        when(osgStudentMapper.selectStudentByUserId(12823L)).thenReturn(stubStudent("0"));
        when(osgStudentService.selectBlacklistedStudentIds(List.of(46706L))).thenReturn(Collections.emptyList());
        assertDoesNotThrow(() -> invoke(12823L));
    }

    @Test
    void shouldRejectWhenContractEnded()
    {
        when(osgStudentMapper.selectStudentByUserId(12823L)).thenReturn(stubStudent("2"));

        ServiceException ex = assertThrows(ServiceException.class, () -> invoke(12823L));
        assertEquals("student.position.contract_ended", ex.getMessage());
    }

    @Test
    void shouldRejectWhenBlacklisted()
    {
        when(osgStudentMapper.selectStudentByUserId(12823L)).thenReturn(stubStudent("0"));
        when(osgStudentService.selectBlacklistedStudentIds(List.of(46706L))).thenReturn(List.of(46706L));

        ServiceException ex = assertThrows(ServiceException.class, () -> invoke(12823L));
        assertEquals("student.position.blacklisted", ex.getMessage());
    }
}
