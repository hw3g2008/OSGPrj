package com.ruoyi.web.controller.osg;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.domain.AjaxResult;

/**
 * OSG 管理端仪表盘数据接口（S-007 最小可运行实现）
 */
@RestController
@RequestMapping("/dashboard")
public class OsgDashboardController
{
    @GetMapping("/stats")
    public AjaxResult stats()
    {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("studentCount", 128);
        data.put("mentorCount", 26);
        data.put("pendingClassHours", 14);
        data.put("pendingSettlement", 15800);
        data.put("pendingExpense", 7);
        data.put("newStudentsThisMonth", 9);
        data.put("leadMentorCount", 6);
        data.put("mentorOnlyCount", 20);
        data.put("earliestPendingDays", 3);
        data.put("settlementReport", 9800);
        data.put("settlementOther", 6000);
        data.put("expenseTotal", 4200);
        return AjaxResult.success(data);
    }

    @GetMapping("/todos")
    public AjaxResult todos()
    {
        List<Map<String, Object>> data = new ArrayList<>();
        data.add(todo("待审课时", 14, "/reports"));
        data.add(todo("待结算项目", 5, "/finance"));
        data.add(todo("待处理报销", 7, "/expense"));
        return AjaxResult.success(data);
    }

    @GetMapping("/activities")
    public AjaxResult activities()
    {
        List<Map<String, Object>> data = new ArrayList<>();
        data.add(activity("mdi-account-check", "#22C55E", "#DCFCE7", "审核通过新学员", "10分钟前", "系统管理员通过了 2 名新学员资料"));
        data.add(activity("mdi-cash", "#3B82F6", "#DBEAFE", "完成课时结算", "32分钟前", "本周课时结算批次已确认"));
        data.add(activity("mdi-file-document-edit", "#F59E0B", "#FEF3C7", "更新岗位信息", "1小时前", "新增 3 条岗位并下发到求职中心"));
        return AjaxResult.success(data);
    }

    @GetMapping("/student-status")
    public AjaxResult studentStatus()
    {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("activeNormal", 92);
        data.put("activeFrozen", 18);
        data.put("done", 18);
        data.put("total", 128);
        return AjaxResult.success(data);
    }

    @GetMapping("/monthly")
    public AjaxResult monthly()
    {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("newStudents", 9);
        data.put("newContracts", 18200);
        data.put("approvedClassHours", 63);
        data.put("classHoursConsumed", 141);
        data.put("settledAmount", 73600);
        return AjaxResult.success(data);
    }

    private Map<String, Object> todo(String label, int count, String route)
    {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("label", label);
        data.put("count", count);
        data.put("route", route);
        return data;
    }

    private Map<String, Object> activity(
            String icon,
            String iconColor,
            String iconBg,
            String title,
            String time,
            String detail)
    {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("icon", icon);
        data.put("iconColor", iconColor);
        data.put("iconBg", iconBg);
        data.put("title", title);
        data.put("time", time);
        data.put("detail", detail);
        return data;
    }
}
