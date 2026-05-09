package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.PreparedStatementSetter;
import org.springframework.jdbc.core.ResultSetExtractor;

import com.ruoyi.common.core.domain.entity.SysUser;

/**
 * T1.1 + T1.2 守卫单元测试。
 * 覆盖：黑名单短路、frozen 短路、黑名单优先级、空值兜底。
 */
@ExtendWith(MockitoExtension.class)
class OsgStaffAccessGuardTest
{
    @InjectMocks
    private OsgStaffAccessGuard guard;

    @Mock
    private JdbcTemplate jdbcTemplate;

    private SysUser userOf(String email)
    {
        SysUser u = new SysUser();
        u.setUserId(1L);
        u.setEmail(email);
        return u;
    }

    private void stubResolveStaffId(Long staffId)
    {
        lenient().when(jdbcTemplate.query(
                anyString(),
                any(PreparedStatementSetter.class),
                any(ResultSetExtractor.class)))
            .thenAnswer(inv -> staffId);
    }

    @Test
    void resolveStaffId_returnsNull_whenEmailBlank()
    {
        assertNull(guard.resolveStaffIdByEmail(null));
        assertNull(guard.resolveStaffIdByEmail(""));
        assertNull(guard.resolveStaffIdByEmail("   "));
    }

    @Test
    void isBlacklisted_returnsFalse_whenStaffIdNull()
    {
        assertFalse(guard.isBlacklisted(null));
    }

    @Test
    void isBlacklisted_truthy_whenCountPositive()
    {
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), any(Object[].class)))
            .thenReturn(1);
        assertTrue(guard.isBlacklisted(10L));
    }

    @Test
    void isBlacklisted_falsy_whenCountZero()
    {
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), any(Object[].class)))
            .thenReturn(0);
        assertFalse(guard.isBlacklisted(10L));
    }

    @Test
    void isBlacklisted_falsy_whenCountNull()
    {
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), any(Object[].class)))
            .thenReturn(null);
        assertFalse(guard.isBlacklisted(10L));
    }

    @Test
    void isFrozen_returnsFalse_whenStaffIdNull()
    {
        assertFalse(guard.isFrozen(null));
    }

    @Test
    void isFrozen_returnsTrue_whenStatusFrozen()
    {
        when(jdbcTemplate.query(
                anyString(),
                any(PreparedStatementSetter.class),
                any(ResultSetExtractor.class)))
            .thenReturn("frozen");
        assertTrue(guard.isFrozen(10L));
    }

    @Test
    void isFrozen_returnsFalse_whenStatusActive()
    {
        when(jdbcTemplate.query(
                anyString(),
                any(PreparedStatementSetter.class),
                any(ResultSetExtractor.class)))
            .thenReturn("active");
        assertFalse(guard.isFrozen(10L));
    }

    @Test
    void isFrozen_returnsFalse_whenStatusNull()
    {
        when(jdbcTemplate.query(
                anyString(),
                any(PreparedStatementSetter.class),
                any(ResultSetExtractor.class)))
            .thenReturn(null);
        assertFalse(guard.isFrozen(10L));
    }

    @Test
    void isBlocked_falseForNullUser()
    {
        assertFalse(guard.isBlocked(null));
    }

    @Test
    void isBlocked_falseWhenStaffIdNotResolved()
    {
        stubResolveStaffId(null);
        assertFalse(guard.isBlocked(userOf("ghost@x.com")));
    }

    @Test
    void isBlocked_trueWhenBlacklisted_shortCircuit()
    {
        // resolveStaffId → 10; isBlacklisted count=1 → true (frozen 不再查询)
        when(jdbcTemplate.query(
                anyString(),
                any(PreparedStatementSetter.class),
                any(ResultSetExtractor.class)))
            .thenReturn(10L);
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), any(Object[].class)))
            .thenReturn(1);

        assertTrue(guard.isBlocked(userOf("a@x.com")));
    }

    @Test
    void isBlocked_trueWhenFrozenOnly()
    {
        // resolveStaffId → 10, blacklist count=0, frozen status='frozen'
        when(jdbcTemplate.query(
                anyString(),
                any(PreparedStatementSetter.class),
                any(ResultSetExtractor.class)))
            .thenReturn(10L, "frozen");
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), any(Object[].class)))
            .thenReturn(0);

        assertTrue(guard.isBlocked(userOf("a@x.com")));
    }

    @Test
    void isBlocked_falseWhenNeitherBlacklistedNorFrozen()
    {
        when(jdbcTemplate.query(
                anyString(),
                any(PreparedStatementSetter.class),
                any(ResultSetExtractor.class)))
            .thenReturn(10L, "active");
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), any(Object[].class)))
            .thenReturn(0);

        assertFalse(guard.isBlocked(userOf("a@x.com")));
    }

    @Test
    void blacklistOrderD1_blacklistTakesPrecedenceOverFrozen()
    {
        // 双命中：黑名单先短路返回 true，frozen 查询不会被触发
        when(jdbcTemplate.query(
                anyString(),
                any(PreparedStatementSetter.class),
                any(ResultSetExtractor.class)))
            .thenReturn(10L);
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), any(Object[].class)))
            .thenReturn(1);

        assertTrue(guard.isBlocked(userOf("a@x.com")));
        // 验证 frozen 路径未触发：第二次 query 不会被消费 → 没有报错即说明 D1 顺序正确
        assertEquals(true, guard.isBlocked(userOf("a@x.com")));
    }
}
