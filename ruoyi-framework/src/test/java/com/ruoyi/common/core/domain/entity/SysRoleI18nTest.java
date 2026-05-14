package com.ruoyi.common.core.domain.entity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Guard test for Commit C: SysRole exposes the new i18n key fields (i18n_key,
 * remark_i18n_key) so the admin frontend can translate system role names and
 * descriptions. Without this, /system/role/list returns payloads with raw
 * Chinese only and the role page renders 超级管理员 / 会计 / ... even in English locale.
 */
class SysRoleI18nTest
{
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Test
    void accessorsRoundTripI18nKeys()
    {
        SysRole role = new SysRole();
        role.setRoleId(1L);
        role.setRoleKey("super_admin");
        role.setRoleName("超级管理员");
        role.setRemark("超级管理员，拥有所有权限");
        role.setI18nKey("role_super_admin");
        role.setRemarkI18nKey("role_super_admin_desc");

        assertEquals("role_super_admin", role.getI18nKey());
        assertEquals("role_super_admin_desc", role.getRemarkI18nKey());
        assertEquals("超级管理员", role.getRoleName());
    }

    @Test
    void jsonSerializationExposesI18nKeysToFrontend() throws Exception
    {
        SysRole role = new SysRole();
        role.setRoleId(2L);
        role.setRoleKey("clerk");
        role.setRoleName("文员");
        role.setRemark("文员，负责学生和合同管理");
        role.setI18nKey("role_clerk");
        role.setRemarkI18nKey("role_clerk_desc");

        String json = MAPPER.writeValueAsString(role);
        assertTrue(json.contains("\"i18nKey\":\"role_clerk\""),
                "serialized JSON must include i18nKey field, got: " + json);
        assertTrue(json.contains("\"remarkI18nKey\":\"role_clerk_desc\""),
                "serialized JSON must include remarkI18nKey field, got: " + json);
    }

    @Test
    void userDefinedRolesLeaveI18nKeysNull()
    {
        SysRole role = new SysRole();
        role.setRoleKey("看到就烦");
        role.setRoleName("看到就烦");

        // No i18n keys set — user-defined role. Frontend must fall back to roleName as-is.
        assertNull(role.getI18nKey());
        assertNull(role.getRemarkI18nKey());
    }
}
