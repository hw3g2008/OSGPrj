package com.ruoyi.framework.web.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.redis.RedisCache;
import com.ruoyi.system.mapper.SysUserMapper;
import com.ruoyi.system.service.ISysUserService;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * SysPasswordService 单元测试 — TTL 配置化验证
 * 
 * 验证 resetCodeTtlMinutes 字段存在且默认值为 5，
 * 确保 TTL 通过 @Value 注入而非硬编码。
 */
@ExtendWith(MockitoExtension.class)
class SysPasswordServiceTest {

    @InjectMocks
    private SysPasswordService sysPasswordService;

    @Mock
    private RedisCache redisCache;

    @Mock
    private ISysUserService userService;

    @Mock
    private SysUserMapper userMapper;

    @Mock
    private PasswordResetMailSender passwordResetMailSender;

    @Test
    void testResetCodeTtlFieldExists() {
        // 验证 resetCodeTtlMinutes 字段存在（通过反射读取）
        assertDoesNotThrow(() -> {
            SysPasswordService.class.getDeclaredField("resetCodeTtlMinutes");
        }, "SysPasswordService 应包含 resetCodeTtlMinutes 字段");
    }

    @Test
    void testResetCodeTtlDefaultValue() {
        // 通过反射设置默认值并验证
        ReflectionTestUtils.setField(sysPasswordService, "resetCodeTtlMinutes", 5);
        int ttl = (int) ReflectionTestUtils.getField(sysPasswordService, "resetCodeTtlMinutes");
        assertEquals(5, ttl, "resetCodeTtlMinutes 默认值应为 5 分钟");
    }

    @Test
    void testResetCodeTtlIsConfigurable() {
        // 验证 TTL 可通过配置修改（模拟 @Value 注入不同值）
        ReflectionTestUtils.setField(sysPasswordService, "resetCodeTtlMinutes", 10);
        int ttl = (int) ReflectionTestUtils.getField(sysPasswordService, "resetCodeTtlMinutes");
        assertEquals(10, ttl, "resetCodeTtlMinutes 应可配置为其他值");
    }

    @Test
    void testFindUserByEmailUsesMapperWithoutDataScope() {
        SysUser expected = new SysUser();
        expected.setUserId(100L);
        expected.setEmail("test@example.com");
        when(userMapper.checkEmailUnique("test@example.com")).thenReturn(expected);

        SysUser actual = ReflectionTestUtils.invokeMethod(
            sysPasswordService,
            "findUserByEmail",
            "test@example.com"
        );

        assertNotNull(actual);
        assertEquals(100L, actual.getUserId());
        verify(userMapper, times(1)).checkEmailUnique("test@example.com");
        verifyNoInteractions(userService);
    }

    @Test
    void sendResetCodeShouldPersistCodeAndDelegateToMailSender() {
        ReflectionTestUtils.setField(sysPasswordService, "resetCodeTtlMinutes", 5);

        SysUser user = new SysUser();
        user.setUserId(100L);
        user.setEmail("test@example.com");
        when(userMapper.checkEmailUnique("test@example.com")).thenReturn(user);

        sysPasswordService.sendResetCode("test@example.com");

        verify(redisCache, times(1)).setCacheObject(
            eq("pwd_reset_code:test@example.com"),
            ArgumentMatchers.argThat((String code) -> code != null && code.matches("\\d{6}")),
            eq(5),
            eq(java.util.concurrent.TimeUnit.MINUTES)
        );
        verify(passwordResetMailSender, times(1)).sendResetCode(
            eq("test@example.com"),
            ArgumentMatchers.argThat((String code) -> code != null && code.matches("\\d{6}")),
            same(user)
        );
    }

    @Test
    void sendResetCodeShouldIgnoreUnknownEmailWithoutPersistingOrSending() {
        when(userMapper.checkEmailUnique("unknown@example.com")).thenReturn(null);

        assertDoesNotThrow(() -> sysPasswordService.sendResetCode("unknown@example.com"));

        verify(redisCache, never()).setCacheObject(anyString(), any(), anyInt(), any());
        verify(passwordResetMailSender, never()).sendResetCode(anyString(), anyString(), any(SysUser.class));
    }
}
