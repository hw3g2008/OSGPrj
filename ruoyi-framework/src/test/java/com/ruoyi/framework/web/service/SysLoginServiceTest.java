package com.ruoyi.framework.web.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import java.lang.reflect.Method;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Answers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.context.MessageSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.ruoyi.common.exception.user.UserPasswordNotMatchException;
import com.ruoyi.common.utils.spring.SpringUtils;
import com.ruoyi.system.service.ISysConfigService;

/**
 * SysLoginService 基础单元测试（T-016）
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SysLoginServiceTest {

    @InjectMocks
    private SysLoginService loginService;

    @Mock
    private ISysConfigService configService;

    @Mock
    private ScheduledExecutorService scheduledExecutorService;

    @Mock(answer = Answers.RETURNS_DEEP_STUBS)
    private ConfigurableListableBeanFactory beanFactory;

    @Mock
    private ScheduledFuture<?> scheduledFuture;

    @Mock
    private MessageSource messageSource;

    @Test
    void serviceClassShouldBeLoadable() {
        assertNotNull(SysLoginService.class);
    }

    @Test
    void loginMethodSignatureShouldExist() throws NoSuchMethodException {
        Method method = SysLoginService.class.getMethod(
                "login",
                String.class,
                String.class,
                String.class,
                String.class,
                boolean.class
        );
        assertNotNull(method);
    }

    @Test
    void loginPreCheckAllowsThirtyCharacterEmailUsername() {
        prepareLoginPreCheckDependencies();
        when(configService.selectConfigByKey("sys.login.blackIPList")).thenReturn("");

        assertDoesNotThrow(() -> loginService.loginPreCheck(
                "hw3g2008+l03251325@outlook.com",
                "Osg@2026"
        ));
    }

    @Test
    void loginPreCheckRejectsUsernameLongerThanThirtyCharacters() {
        prepareLoginPreCheckDependencies();
        when(configService.selectConfigByKey("sys.login.blackIPList")).thenReturn("");

        assertThrows(UserPasswordNotMatchException.class, () -> loginService.loginPreCheck(
                "hw3g2008+lead03251325@outlook.com",
                "Osg@2026"
        ));
    }

    @AfterEach
    void tearDown()
    {
        RequestContextHolder.resetRequestAttributes();
    }

    @AfterAll
    static void cleanUpSpringUtils()
    {
        ReflectionTestUtils.setField(SpringUtils.class, "beanFactory", null);
    }

    private void prepareLoginPreCheckDependencies()
    {
        ReflectionTestUtils.setField(SpringUtils.class, "beanFactory", beanFactory);
        lenient().when(beanFactory.getBean("scheduledExecutorService")).thenReturn(scheduledExecutorService);
        lenient().when(beanFactory.getBean(MessageSource.class)).thenReturn(messageSource);
        lenient().when(messageSource.getMessage(eq("user.password.not.match"), any(), any()))
                .thenReturn("用户不存在/密码错误");
        lenient().when(scheduledExecutorService.schedule(any(Runnable.class), anyLong(), any(TimeUnit.class)))
                .thenAnswer(invocation -> scheduledFuture);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("User-Agent", "JUnit");
        request.setRemoteAddr("127.0.0.1");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
    }

}
