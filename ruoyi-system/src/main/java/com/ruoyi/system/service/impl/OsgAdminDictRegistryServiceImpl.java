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
        return groups;
    }

    private Map<String, Object> createGroup(String groupKey, String groupLabel, Map<String, Object> metadata)
    {
        Map<String, Object> group = new LinkedHashMap<>();
        group.put("group_key", groupKey);
        group.put("group_label", groupLabel);
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
        entry.put("has_parent", Boolean.TRUE.equals(metadata.get("hasParent")));
        String parentDictType = asText(metadata.get("parentDictType"));
        if (StringUtils.isNotEmpty(parentDictType))
        {
            entry.put("parent_dict_type", parentDictType);
        }
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
