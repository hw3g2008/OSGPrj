package com.ruoyi.framework.web.service;

import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * SysLoginService 基础单元测试（T-016）
 */
class SysLoginServiceTest {

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
}
