package com.ruoyi.system.service.impl;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import com.ruoyi.common.core.domain.entity.SysDictType;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.service.IOsgAdminDictRegistryService;
import com.ruoyi.system.service.ISysDictTypeService;

/**
 * Admin dict registry service implementation.
 */
@Service
public class OsgAdminDictRegistryServiceImpl implements IOsgAdminDictRegistryService
{
    private static final String OSG_DICT_PREFIX = "osg_";
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    /**
     * Derive stable i18n key for dict group label.
     * Convention: "dict_group_<group>"
     * Spec ref: OsgAdminDictRegistryI18nTest#deriveGroupI18nKey*
     */
    public static String deriveGroupI18nKey(String group)
    {
        if (group == null) return null;
        String trimmed = group.trim();
        if (trimmed.isEmpty()) return null;
        return "dict_group_" + trimmed;
    }

    /**
     * Derive stable i18n key for dict_type.
     * Convention:
     *   - Strip leading "osg_" prefix, prepend "dict_type_"
     *   - Non-osg-prefixed dict_types also get "dict_type_<raw>"
     * Spec ref: OsgAdminDictRegistryI18nTest#deriveDictTypeI18nKey*
     */
    public static String deriveDictTypeI18nKey(String dictType)
    {
        if (dictType == null) return null;
        String trimmed = dictType.trim();
        if (trimmed.isEmpty()) return null;
        String stripped = trimmed.startsWith(OSG_DICT_PREFIX)
                ? trimmed.substring(OSG_DICT_PREFIX.length())
                : trimmed;
        return "dict_type_" + stripped;
    }

    private final ISysDictTypeService dictTypeService;

    public OsgAdminDictRegistryServiceImpl(ISysDictTypeService dictTypeService)
    {
        this.dictTypeService = dictTypeService;
    }

    @Override
    public List<Map<String, Object>> loadRegistryGroups()
    {
        SysDictType query = new SysDictType();
        query.setStatus("0");
        query.setDictType(OSG_DICT_PREFIX);

        List<SysDictType> dictTypes = dictTypeService.selectDictTypeList(query);
        Map<String, Map<String, Object>> grouped = new LinkedHashMap<>();

        for (SysDictType dictType : dictTypes)
        {
            if (dictType == null || StringUtils.isEmpty(dictType.getDictType()) || !dictType.getDictType().startsWith(OSG_DICT_PREFIX))
            {
                continue;
            }

            Map<String, Object> metadata = parseRemark(dictType.getRemark());
            String groupKey = asText(metadata.get("groupKey"));
            String groupLabel = asText(metadata.get("groupLabel"));
            if (StringUtils.isEmpty(groupKey) || StringUtils.isEmpty(groupLabel))
            {
                continue;
            }

            Map<String, Object> group = grouped.computeIfAbsent(groupKey, key -> createGroup(groupKey, groupLabel, metadata));
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> tabs = (List<Map<String, Object>>) group.get("dict_types");
            tabs.add(createDictTypeEntry(dictType, metadata));
        }

        List<Map<String, Object>> groups = new ArrayList<>(grouped.values());
        groups.sort(Comparator.comparingInt(this::extractGroupOrder));
        for (Map<String, Object> group : groups)
        {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> tabs = (List<Map<String, Object>>) group.get("dict_types");
            tabs.sort(Comparator.comparingInt(this::extractTabOrder));
        }
        return groups;
    }

    private Map<String, Object> createGroup(String groupKey, String groupLabel, Map<String, Object> metadata)
    {
        Map<String, Object> group = new LinkedHashMap<>();
        group.put("group_key", groupKey);
        group.put("group_label", groupLabel);
        group.put("group_i18n_key", deriveGroupI18nKey(groupKey));
        group.put("icon", asText(metadata.get("icon")));
        group.put("icon_color", asText(metadata.get("iconColor")));
        group.put("icon_bg", asText(metadata.get("iconBg")));
        group.put("order", extractMetadataOrder(metadata));
        group.put("dict_types", new ArrayList<Map<String, Object>>());
        return group;
    }

    private Map<String, Object> createDictTypeEntry(SysDictType dictType, Map<String, Object> metadata)
    {
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("dict_type", dictType.getDictType());
        entry.put("dict_name", dictType.getDictName());
        entry.put("dict_type_i18n_key", deriveDictTypeI18nKey(dictType.getDictType()));
        entry.put("has_parent", Boolean.TRUE.equals(metadata.get("hasParent")));
        String parentDictType = asText(metadata.get("parentDictType"));
        if (StringUtils.isNotEmpty(parentDictType))
        {
            entry.put("parent_dict_type", parentDictType);
        }
        entry.put("tab_order", extractTabOrderFromMetadata(metadata));
        return entry;
    }

    private Map<String, Object> parseRemark(String remark)
    {
        if (StringUtils.isEmpty(remark))
        {
            return Map.of();
        }
        try
        {
            return OBJECT_MAPPER.readValue(remark, new TypeReference<Map<String, Object>>() {});
        }
        catch (Exception ex)
        {
            return Map.of();
        }
    }

    private int extractMetadataOrder(Map<String, Object> metadata)
    {
        Object value = metadata.get("order");
        return value instanceof Number number ? number.intValue() : Integer.MAX_VALUE;
    }

    private int extractGroupOrder(Map<String, Object> group)
    {
        Object value = group.get("order");
        return value instanceof Number number ? number.intValue() : Integer.MAX_VALUE;
    }

    private int extractTabOrder(Map<String, Object> tab)
    {
        Object value = tab.get("tab_order");
        return value instanceof Number number ? number.intValue() : Integer.MAX_VALUE;
    }

    private int extractTabOrderFromMetadata(Map<String, Object> metadata)
    {
        Object value = metadata.get("tabOrder");
        return value instanceof Number number ? number.intValue() : Integer.MAX_VALUE;
    }

    private String asText(Object value)
    {
        if (value == null)
        {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
    }
}
