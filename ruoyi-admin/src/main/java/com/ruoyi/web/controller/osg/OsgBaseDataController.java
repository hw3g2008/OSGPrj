package com.ruoyi.web.controller.osg;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
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
    @PreAuthorize("@ss.hasPermi('system:baseData:list')")
    @GetMapping("/list")
    public TableDataInfo list(String name, String category, String tab)
    {
        List<Map<String, Object>> rows = seedRows().stream().filter(item -> {
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
        return getDataTable(rows);
    }

    @PreAuthorize("@ss.hasPermi('system:baseData:list')")
    @PutMapping("/changeStatus")
    public AjaxResult changeStatus(@RequestBody Map<String, Object> body)
    {
        if (body == null || body.get("id") == null || body.get("status") == null)
        {
            return AjaxResult.error("参数缺失");
        }
        return AjaxResult.success();
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
}
