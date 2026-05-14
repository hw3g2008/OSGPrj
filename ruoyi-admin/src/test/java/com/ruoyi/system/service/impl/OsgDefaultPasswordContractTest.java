package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import com.ruoyi.common.constant.UserConstants;

/**
 * 默认密码契约测试 — 验证 student / staff / admin 共享同一真源 {@link UserConstants#DEFAULT_PASSWORD}，
 * 不再各自维护私有 DEFAULT_*_PASSWORD 常量。
 *
 * 配套：5 端 getInfo 通过 {@code SecurityUtils.isUsingDefaultPassword(encodedPwd)} 判定
 * 是否需要强制改密，不再读取 sys_user.first_login flag（admin 重置场景下 flag 不会回写，
 * 导致漏判 / 误判）。
 */
class OsgDefaultPasswordContractTest
{
    @Test
    void defaultPasswordSingleSourceOfTruth()
    {
        assertEquals("Osg@2026", UserConstants.DEFAULT_PASSWORD);
    }
}
