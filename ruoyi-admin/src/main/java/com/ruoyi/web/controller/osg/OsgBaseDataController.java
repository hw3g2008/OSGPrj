package com.ruoyi.web.controller.osg;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import com.ruoyi.common.annotation.Log;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.enums.BusinessType;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;

/**
 * OSG 基础数据接口（S-006 最小可运行实现）
 */
@RestController
@RequestMapping("/system/basedata")
public class OsgBaseDataController extends BaseController
{
    private final List<Map<String, Object>> rows = seedRows();

    @PreAuthorize("@ss.hasPermi('system:baseData:list')")
    @GetMapping("/list")
    public TableDataInfo list(String name, String category, String tab)
    {
        List<Map<String, Object>> filtered = rows.stream().filter(item -> {
            if (name != null && !name.isBlank())
            {
                String itemName = Objects.toString(item.get("name"), "");
                if (!itemName.contains(name))
                {
                    return false;
                }
            }
            if (category != null && !category.isBlank())
            {
                if (!category.equals(item.get("category")))
                {
                    return false;
                }
            }
            if (tab != null && !tab.isBlank())
            {
                if (!tab.equals(item.get("tab")))
                {
                    return false;
                }
            }
            return true;
        }).collect(Collectors.toList());
        return getDataTable(filtered);
    }

    @PreAuthorize("@ss.hasPermi('system:baseData:add')")
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
        String category = asText(body.get("category"));
        if (category == null)
        {
            category = inferCategoryFromTab(tab);
        }
        if (category == null)
        {
            return AjaxResult.error("参数缺失");
        }

        Map<String, Object> row = row(nextId(), name, category, tab, normalizeStatus(body.get("status")), asInt(body.get("sort"), 100));
        row.put("parentId", asLong(body.get("parentId")));
        rows.add(row);
        return toAjax(1);
    }

    @PreAuthorize("@ss.hasPermi('system:baseData:edit')")
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
        Map<String, Object> target = findRow(id);
        if (target == null)
        {
            return AjaxResult.error("基础数据不存在");
        }

        target.put("name", name);
        target.put("sort", asInt(body.get("sort"), asInt(target.get("sort"), 100)));
        target.put("status", normalizeStatus(body.get("status")));
        if (body.containsKey("parentId"))
        {
            target.put("parentId", asLong(body.get("parentId")));
        }
        target.put("updateTime", "2026-03-12 23:00:00");
        return toAjax(1);
    }

    @PreAuthorize("@ss.hasPermi('system:baseData:list')")
    @PutMapping("/changeStatus")
    public AjaxResult changeStatus(@RequestBody Map<String, Object> body)
    {
        if (body == null || body.get("id") == null || body.get("status") == null)
        {
            return AjaxResult.error("参数缺失");
        }
        Map<String, Object> target = findRow(asLong(body.get("id")));
        if (target == null)
        {
            return AjaxResult.error("基础数据不存在");
        }
        target.put("status", normalizeStatus(body.get("status")));
        target.put("updateTime", "2026-03-12 23:00:00");
        return toAjax(1);
    }

    private List<Map<String, Object>> seedRows()
    {
        List<Map<String, Object>> rows = new ArrayList<>();
        rows.add(row(1L, "Java开发", "job", "job_category", "0", 1));
        rows.add(row(2L, "风控分析", "job", "job_category", "0", 2));
        rows.add(row(3L, "北京", "job", "city", "0", 1));
        rows.add(row(4L, "上海", "job", "city", "0", 2));
        rows.add(row(5L, "清华大学", "student", "school", "0", 1));
        rows.add(row(6L, "计算机", "student", "major_direction", "0", 1));
        rows.add(row(7L, "实训课", "course", "course_type", "0", 1));
        rows.add(row(8L, "交通报销", "finance", "expense_type", "1", 1));
        return rows;
    }

    private Map<String, Object> row(Long id, String name, String category, String tab, String status, Integer sort)
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", id);
        row.put("name", name);
        row.put("category", category);
        row.put("tab", tab);
        row.put("status", status);
        row.put("sort", sort);
        row.put("updateTime", "2026-03-03 12:00:00");
        return row;
    }

    private Long nextId()
    {
        return rows.stream()
            .map(item -> asLong(item.get("id")))
            .filter(Objects::nonNull)
            .max(Long::compareTo)
            .orElse(0L) + 1;
    }

    private Map<String, Object> findRow(Long id)
    {
        if (id == null)
        {
            return null;
        }
        return rows.stream()
            .filter(item -> Objects.equals(asLong(item.get("id")), id))
            .findFirst()
            .orElse(null);
    }

    private String inferCategoryFromTab(String tab)
    {
        return switch (tab)
        {
            case "job_category", "city" -> "job";
            case "school", "major_direction" -> "student";
            case "course_type" -> "course";
            case "expense_type" -> "finance";
            default -> null;
        };
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

    private Integer asInt(Object value, int defaultValue)
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
}
