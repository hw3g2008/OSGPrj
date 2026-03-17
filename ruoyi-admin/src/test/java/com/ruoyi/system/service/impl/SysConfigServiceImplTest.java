package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.RedisSystemException;

import com.ruoyi.common.constant.CacheConstants;
import com.ruoyi.common.core.redis.RedisCache;
import com.ruoyi.system.domain.SysConfig;
import com.ruoyi.system.mapper.SysConfigMapper;

@ExtendWith(MockitoExtension.class)
class SysConfigServiceImplTest
{
    @InjectMocks
    private SysConfigServiceImpl service;

    @Mock
    private SysConfigMapper configMapper;

    @Mock
    private RedisCache redisCache;

    @Test
    void selectConfigByKeyFallsBackToDatabaseWhenRedisReadAndWriteFail()
    {
        SysConfig config = new SysConfig();
        config.setConfigKey("sys.login.blackIPList");
        config.setConfigValue("");

        when(redisCache.getCacheObject(CacheConstants.SYS_CONFIG_KEY + "sys.login.blackIPList"))
                .thenThrow(new RedisSystemException("Redis exception", new RuntimeException("timeout")));
        when(configMapper.selectConfig(any(SysConfig.class))).thenReturn(config);
        doThrow(new RedisSystemException("Redis exception", new RuntimeException("timeout")))
                .when(redisCache)
                .setCacheObject(eq(CacheConstants.SYS_CONFIG_KEY + "sys.login.blackIPList"), eq(""));

        String value = assertDoesNotThrow(() -> service.selectConfigByKey("sys.login.blackIPList"));

        assertEquals("", value);
        verify(configMapper).selectConfig(any(SysConfig.class));
    }
}
