package com.ruoyi.web.controller.osg;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ruoyi.common.annotation.Log;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.entity.SysDictData;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.enums.BusinessType;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.service.IOsgAdminDictRegistryService;
import com.ruoyi.system.service.ISysDictDataService;
import com.ruoyi.system.service.ISysDictTypeService;

/**
 * OSG 基础数据兼容接口。
 */
@RestController
@RequestMapping("/system/basedata")
public class OsgBaseDataController extends BaseController
{
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final ISysDictDataService dictDataService;
    private final ISysDictTypeService dictTypeService;
    private final IOsgAdminDictRegistryService registryService;

    public OsgBaseDataController(
        ISysDictDataService dictDataService,
        ISysDictTypeService dictTypeService,
        IOsgAdminDictRegistryService registryService)
    {
        this.dictDataService = dictDataService;
        this.dictTypeService = dictTypeService;
        this.registryService = registryService;
    }

    @PreAuthorize("@ss.hasAnyPermi('system:dict:list,system:baseData:list')")
    @GetMapping("/list")
    public TableDataInfo list(String name, String category, String tab)
    {
        List<SysDictData> rows = new ArrayList<>();
        String dictType = resolveDictType(tab);
        if (StringUtils.isNotEmpty(dictType))
        {
            rows.addAll(queryDictRows(dictType, name));
        }
        else
        {
            for (String runtimeDictType : resolveAllRuntimeDictTypes())
            {
                rows.addAll(queryDictRows(runtimeDictType, name));
            }
        }

        List<Map<String, Object>> payload = rows.stream()
            .map(this::toLegacyRow)
            .filter(row -> category == null || category.isBlank() || category.equals(row.get("category")))
            .toList();
        return getDataTable(payload);
    }

    @PreAuthorize("@ss.hasAnyPermi('system:dict:add,system:baseData:add')")
    @Log(title = "基础数据管理", businessType = BusinessType.INSERT)
    @PostMapping
    public AjaxResult add(@RequestBody Map<String, Object> body)
    {
        String name = asText(body.get("name"));
        String tab = asText(body.get("tab"));
        if (name == null || tab == null)
        {
            return AjaxResult.error("参数缺失");
        }

        String dictType = resolveDictType(tab);
        if (dictType == null)
        {
            return AjaxResult.error("参数缺失");
        }

        SysDictData dictData = new SysDictData();
        dictData.setDictType(dictType);
        dictData.setDictLabel(name);
        dictData.setDictValue(normalizeDictValue(name));
        dictData.setDictSort((long) asInt(body.get("sort"), 100));
        dictData.setStatus(normalizeStatus(body.get("status")));
        dictData.setIsDefault("N");
        dictData.setRemark(buildRemark(body.get("parentId"), body.get("website"), body.get("country"), body.get("type")));
        dictData.setCreateBy(resolveOperator());
        return toAjax(dictDataService.insertDictData(dictData));
    }

    @PreAuthorize("@ss.hasAnyPermi('system:dict:edit,system:baseData:edit')")
    @Log(title = "基础数据管理", businessType = BusinessType.UPDATE)
    @PutMapping
    public AjaxResult edit(@RequestBody Map<String, Object> body)
    {
        Long id = asLong(body.get("id"));
        String name = asText(body.get("name"));
        if (id == null || name == null)
        {
            return AjaxResult.error("参数缺失");
        }

        SysDictData existing = dictDataService.selectDictDataById(id);
        if (existing == null)
        {
            return AjaxResult.error("基础数据不存在");
        }

        existing.setDictLabel(name);
        existing.setDictSort((long) asInt(body.get("sort"), existing.getDictSort() == null ? 100 : existing.getDictSort().intValue()));
        existing.setStatus(normalizeStatus(body.get("status")));
        existing.setRemark(buildRemark(body.get("parentId"), body.get("website"), body.get("country"), body.get("type")));
        existing.setUpdateBy(resolveOperator());
        return toAjax(dictDataService.updateDictData(existing));
    }

    @PreAuthorize("@ss.hasAnyPermi('system:dict:edit,system:baseData:list')")
    @PutMapping("/changeStatus")
    public AjaxResult changeStatus(@RequestBody Map<String, Object> body)
    {
        if (body == null || body.get("id") == null || body.get("status") == null)
        {
            return AjaxResult.error("参数缺失");
        }

        SysDictData existing = dictDataService.selectDictDataById(asLong(body.get("id")));
        if (existing == null)
        {
            return AjaxResult.error("基础数据不存在");
        }

        existing.setStatus(normalizeStatus(body.get("status")));
        existing.setUpdateBy(resolveOperator());
        return toAjax(dictDataService.updateDictData(existing));
    }

    @PreAuthorize("@ss.hasAnyPermi('system:dict:list,system:baseData:list')")
    @GetMapping("/categories")
    public AjaxResult categories()
    {
        List<Map<String, Object>> categories = registryService.loadRegistryGroups().stream()
            .map(this::toLegacyCategory)
            .toList();
        return AjaxResult.success(Map.of("categories", categories));
    }

    private List<SysDictData> queryDictRows(String dictType, String name)
    {
        SysDictData query = new SysDictData();
        query.setDictType(dictType);
        query.setDictLabel(name);
        return dictDataService.selectDictDataList(query);
    }

    private List<String> resolveAllRuntimeDictTypes()
    {
        return registryService.loadRegistryGroups().stream()
            .flatMap(group -> {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> dictTypes = (List<Map<String, Object>>) group.getOrDefault("dict_types", List.of());
                return dictTypes.stream();
            })
            .map(entry -> asText(entry.get("dict_type")))
            .filter(StringUtils::isNotEmpty)
            .toList();
    }

    private String resolveDictType(String tab)
    {
        if (StringUtils.isEmpty(tab))
        {
            return null;
        }
        if (tab.startsWith("osg_"))
        {
            return tab;
        }
        return switch (tab)
        {
            case "job_category" -> "osg_job_category";
            case "company_type" -> "osg_company_type";
            case "company_name" -> "osg_company_name";
            case "region" -> "osg_region";
            case "city" -> "osg_city";
            case "recruit_cycle" -> "osg_recruit_cycle";
            case "school" -> "osg_school";
            case "major_direction" -> "osg_major_direction";
            case "sub_direction" -> "osg_sub_direction";
            case "course_type" -> "osg_course_type";
            case "expense_type" -> "osg_expense_type";
            default -> null;
        };
    }

    private String resolveLegacyTab(String dictType)
    {
        return switch (dictType)
        {
            case "osg_job_category" -> "job_category";
            case "osg_company_type" -> "company_type";
            case "osg_company_name" -> "company_name";
            case "osg_region" -> "region";
            case "osg_city" -> "city";
            case "osg_recruit_cycle" -> "recruit_cycle";
            case "osg_school" -> "school";
            case "osg_major_direction" -> "major_direction";
            case "osg_sub_direction" -> "sub_direction";
            case "osg_course_type" -> "course_type";
            case "osg_expense_type" -> "expense_type";
            default -> dictType;
        };
    }

    private String resolveLegacyCategory(String dictType)
    {
        return switch (dictType)
        {
            case "osg_job_category", "osg_company_type", "osg_company_name", "osg_region", "osg_city", "osg_recruit_cycle" -> "job";
            case "osg_school", "osg_major_direction", "osg_sub_direction" -> "student";
            case "osg_course_type" -> "course";
            case "osg_expense_type" -> "finance";
            default -> "";
        };
    }

    private Map<String, Object> toLegacyRow(SysDictData data)
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", data.getDictCode());
        row.put("name", data.getDictLabel());
        row.put("value", data.getDictValue());
        row.put("category", resolveLegacyCategory(data.getDictType()));
        row.put("tab", resolveLegacyTab(data.getDictType()));
        row.put("status", data.getStatus());
        row.put("sort", data.getDictSort());
        row.put("updateTime", data.getUpdateTime());
        row.put("remark", data.getRemark());
        return row;
    }

    private Map<String, Object> toLegacyCategory(Map<String, Object> group)
    {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("key", group.get("group_key"));
        payload.put("label", group.get("group_label"));
        payload.put("icon", group.get("icon"));
        payload.put("iconColor", group.get("icon_color"));
        payload.put("iconBg", group.get("icon_bg"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> dictTypes = (List<Map<String, Object>>) group.getOrDefault("dict_types", List.of());
        List<Map<String, Object>> tabs = dictTypes.stream().map(item -> {
            Map<String, Object> tab = new LinkedHashMap<>();
            String dictType = asText(item.get("dict_type"));
            tab.put("key", resolveLegacyTab(dictType));
            tab.put("label", item.get("dict_name"));
            tab.put("hasParent", Boolean.TRUE.equals(item.get("has_parent")));
            if (item.get("parent_dict_type") != null)
            {
                tab.put("parentTab", resolveLegacyTab(asText(item.get("parent_dict_type"))));
            }
            return tab;
        }).toList();
        payload.put("tabs", tabs);
        return payload;
    }

    private String buildRemark(Object parentId, Object website, Object country, Object type)
    {
        Map<String, Object> remark = new LinkedHashMap<>();
        String parentValue = resolveParentValue(parentId);
        if (StringUtils.isNotEmpty(parentValue))
        {
            remark.put("parentValue", parentValue);
        }

        Map<String, Object> extra = new LinkedHashMap<>();
        putIfNotBlank(extra, "website", website);
        putIfNotBlank(extra, "country", country);
        putIfNotBlank(extra, "type", type);
        if (!extra.isEmpty())
        {
            remark.put("extra", extra);
        }

        try
        {
            return OBJECT_MAPPER.writeValueAsString(remark);
        }
        catch (Exception ex)
        {
            return "{}";
        }
    }

    private String resolveParentValue(Object parentId)
    {
        Long dictCode = asLong(parentId);
        if (dictCode == null)
        {
            return null;
        }
        SysDictData parent = dictDataService.selectDictDataById(dictCode);
        return parent == null ? null : parent.getDictValue();
    }

    private void putIfNotBlank(Map<String, Object> target, String key, Object value)
    {
        String text = asText(value);
        if (text != null)
        {
            target.put(key, text);
        }
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

    private Long asLong(Object value)
    {
        if (value == null)
        {
            return null;
        }
        if (value instanceof Number number)
        {
            return number.longValue();
        }
        try
        {
            return Long.parseLong(String.valueOf(value));
        }
        catch (NumberFormatException ex)
        {
            return null;
        }
    }

    private int asInt(Object value, int defaultValue)
    {
        if (value == null)
        {
            return defaultValue;
        }
        if (value instanceof Number number)
        {
            return number.intValue();
        }
        try
        {
            return Integer.parseInt(String.valueOf(value));
        }
        catch (NumberFormatException ex)
        {
            return defaultValue;
        }
    }

    private String normalizeStatus(Object value)
    {
        String status = asText(value);
        return "1".equals(status) ? "1" : "0";
    }

    private String normalizeDictValue(String label)
    {
        if (label == null)
        {
            return "";
        }
        String normalized = label.trim().toLowerCase()
            .replaceAll("[^a-z0-9\\u4e00-\\u9fa5]+", "_")
            .replaceAll("^_+|_+$", "");
        return normalized.isEmpty() ? "dict_value" : normalized;
    }

    private String resolveOperator()
    {
        try
        {
            return getUsername();
        }
        catch (Exception ex)
        {
            return "system";
        }
    }
}
