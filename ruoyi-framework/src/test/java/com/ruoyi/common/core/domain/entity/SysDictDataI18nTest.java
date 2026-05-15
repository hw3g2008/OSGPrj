package com.ruoyi.common.core.domain.entity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Guard test for Commit D: SysDictData exposes the new i18n_key field so the
 * admin frontend can translate ENUM-style dict labels (schedule_status / visa /
 * rating / region / specialty / etc.). Without this, /system/dict/data/list
 * returns Chinese-only payloads even in English locale.
 */
class SysDictDataI18nTest
{
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Test
    void accessorsRoundTripI18nKey()
    {
        SysDictData data = new SysDictData();
        data.setDictCode(1825L);
        data.setDictType("osg_schedule_status");
        data.setDictValue("available");
        data.setDictLabel("有空闲");
        data.setI18nKey("dict_data_schedule_status_available");

        assertEquals("dict_data_schedule_status_available", data.getI18nKey());
        assertEquals("有空闲", data.getDictLabel());
        assertEquals("available", data.getDictValue());
    }

    @Test
    void jsonSerializationExposesI18nKeyToFrontend() throws Exception
    {
        SysDictData data = new SysDictData();
        data.setDictCode(1845L);
        data.setDictType("osg_visa_status");
        data.setDictValue("pending");
        data.setDictLabel("待确认");
        data.setI18nKey("dict_data_visa_status_pending");

        String json = MAPPER.writeValueAsString(data);
        assertTrue(json.contains("\"i18nKey\":\"dict_data_visa_status_pending\""),
                "serialized JSON must include i18nKey field, got: " + json);
    }

    @Test
    void userDefinedDictDataLeavesI18nKeyNull()
    {
        // E.g. osg_company_name: '高盛' / '摩根士丹利' — user-typed business data, no i18n key.
        SysDictData data = new SysDictData();
        data.setDictType("osg_company_name");
        data.setDictValue("goldman_sachs");
        data.setDictLabel("高盛");

        assertNull(data.getI18nKey());
    }
}
