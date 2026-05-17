package com.ruoyi.common.utils.i18n;

import com.ruoyi.common.utils.StringUtils;

/**
 * Stable i18n key derivation conventions used across all 5 frontend ends.
 *
 * <p>Keys returned here are PARTIAL keys — frontend appends them under its
 * namespace (e.g. {@code admin.dict.<key>}, {@code admin.pageCopy.<key>}).
 * Keep these conventions stable; never rename a derived key without
 * coordinated migration on the frontend locale files and DB i18n manifest.
 *
 * <p>See {@code shared/src/composables/useI18nDict.ts} for the consumer side.
 */
public final class I18nKeys
{
    private I18nKeys() {}

    /**
     * Build the stable key for a dict value.
     * Example: dict("coaching_type", "interview") -> "dict.coaching_type.interview"
     */
    public static String dict(String dictType, String value)
    {
        if (StringUtils.isEmpty(dictType) || StringUtils.isEmpty(value))
        {
            return null;
        }
        return "dict." + dictType.trim() + "." + value.trim();
    }

    /**
     * Build the stable key for an osg_page_copy entry.
     * Example: pageCopy("course.action.view") -> "pageCopy.course.action.view"
     * The argument is already the dot-separated key used in osg_page_copy.i18n_key column.
     */
    public static String pageCopy(String key)
    {
        if (StringUtils.isEmpty(key))
        {
            return null;
        }
        return "pageCopy." + key.trim();
    }
}
