package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import org.junit.jupiter.api.Test;

/**
 * Guard test for Commit B: backend derives stable i18n keys for dict group_label
 * and dict_name, and the admin frontend relies on these to translate the registry
 * cards / tabs. Without derived keys, the admin dict page renders raw Chinese.
 */
class OsgAdminDictRegistryI18nTest
{
    @Test
    void deriveGroupI18nKeyFollowsPrefixConvention()
    {
        assertEquals("dict_group_job", OsgAdminDictRegistryServiceImpl.deriveGroupI18nKey("job"));
        assertEquals("dict_group_student", OsgAdminDictRegistryServiceImpl.deriveGroupI18nKey("student"));
        assertEquals("dict_group_finance", OsgAdminDictRegistryServiceImpl.deriveGroupI18nKey("finance"));
    }

    @Test
    void deriveGroupI18nKeyTrimsWhitespace()
    {
        assertEquals("dict_group_job", OsgAdminDictRegistryServiceImpl.deriveGroupI18nKey("  job  "));
    }

    @Test
    void deriveGroupI18nKeyReturnsNullForEmpty()
    {
        assertNull(OsgAdminDictRegistryServiceImpl.deriveGroupI18nKey(null));
        assertNull(OsgAdminDictRegistryServiceImpl.deriveGroupI18nKey(""));
    }

    @Test
    void deriveDictTypeI18nKeyStripsOsgPrefix()
    {
        assertEquals("dict_type_job_category",
                OsgAdminDictRegistryServiceImpl.deriveDictTypeI18nKey("osg_job_category"));
        assertEquals("dict_type_company_name",
                OsgAdminDictRegistryServiceImpl.deriveDictTypeI18nKey("osg_company_name"));
        assertEquals("dict_type_schedule_status",
                OsgAdminDictRegistryServiceImpl.deriveDictTypeI18nKey("osg_schedule_status"));
    }

    @Test
    void deriveDictTypeI18nKeyLeavesNonOsgUnchanged()
    {
        // If an external dict_type slips through (not OSG-prefixed), we still emit a key
        // but keep the raw name so the frontend can translate or fall back deterministically.
        assertEquals("dict_type_external_thing",
                OsgAdminDictRegistryServiceImpl.deriveDictTypeI18nKey("external_thing"));
    }

    @Test
    void deriveDictTypeI18nKeyReturnsNullForEmpty()
    {
        assertNull(OsgAdminDictRegistryServiceImpl.deriveDictTypeI18nKey(null));
        assertNull(OsgAdminDictRegistryServiceImpl.deriveDictTypeI18nKey(""));
    }
}
