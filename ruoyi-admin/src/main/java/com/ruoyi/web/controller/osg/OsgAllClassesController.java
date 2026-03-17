package com.ruoyi.web.controller.osg;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.system.service.impl.OsgClassRecordServiceImpl;

@RestController
@RequestMapping("/admin/all-classes")
public class OsgAllClassesController extends BaseController
{
    private static final String ALL_CLASSES_ACCESS = "@ss.hasPermi('admin:all-classes:list')";

    @Autowired
    private OsgClassRecordServiceImpl classRecordService;

    @PreAuthorize(ALL_CLASSES_ACCESS)
    @GetMapping("/list")
    public AjaxResult list(@RequestParam(required = false) String tab,
                           @RequestParam(required = false) String keyword,
                           @RequestParam(defaultValue = "1") Integer pageNum,
                           @RequestParam(defaultValue = "10") Integer pageSize)
    {
        String selectedTab = normalizeTab(tab);
        List<Map<String, Object>> allRows = decorateRows(classRecordService.selectReportList(keyword, null, null, null));
        List<Map<String, Object>> filteredRows = filterRows(allRows, selectedTab);
        List<Map<String, Object>> pagedRows = paginate(filteredRows, pageNum, pageSize);

        return AjaxResult.success()
            .put("rows", pagedRows)
            .put("summary", buildSummary(allRows, selectedTab))
            .put("total", filteredRows.size())
            .put("pageNum", safePageNum(pageNum))
            .put("pageSize", safePageSize(pageSize));
    }

    @PreAuthorize(ALL_CLASSES_ACCESS)
    @GetMapping("/{recordId}/detail")
    public AjaxResult detail(@PathVariable Long recordId)
    {
        Map<String, Object> detail = new LinkedHashMap<>(classRecordService.selectReportDetail(recordId));
        decorateRow(detail);
        return AjaxResult.success(detail);
    }

    private List<Map<String, Object>> decorateRows(List<Map<String, Object>> rows)
    {
        if (rows == null || rows.isEmpty())
        {
            return List.of();
        }

        List<Map<String, Object>> result = new ArrayList<>(rows.size());
        for (Map<String, Object> row : rows)
        {
            Map<String, Object> payload = new LinkedHashMap<>(row);
            decorateRow(payload);
            result.add(payload);
        }
        return result;
    }

    private void decorateRow(Map<String, Object> row)
    {
        String courseType = normalizeText(row.get("courseType"));
        String rawStatus = normalizeText(row.get("status"));
        String displayStatus = resolveDisplayStatus(rawStatus);
        String modalType = resolveModalType(courseType, rawStatus);

        row.put("courseTypeLabel", resolveCourseTypeLabel(courseType));
        row.put("sourceLabel", resolveSourceLabel(normalizeText(row.get("courseSource"))));
        row.put("displayStatus", displayStatus);
        row.put("displayStatusLabel", resolveDisplayStatusLabel(displayStatus));
        row.put("modalType", modalType);
        row.put("headerTone", resolveHeaderTone(modalType));
        row.put("headerTitle", resolveHeaderTitle(modalType));
        row.put("pageSection", "all-classes");
    }

    private Map<String, Object> buildSummary(List<Map<String, Object>> rows, String selectedTab)
    {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("allCount", rows.size());
        summary.put("pendingCount", countByDisplayStatus(rows, "pending"));
        summary.put("unpaidCount", countByDisplayStatus(rows, "unpaid"));
        summary.put("paidCount", countByDisplayStatus(rows, "paid"));
        summary.put("rejectedCount", countByDisplayStatus(rows, "rejected"));
        summary.put("selectedTab", selectedTab);
        summary.put("flowSteps", List.of("导师/班主任/助教提交", "待审核", "未支付", "已支付"));
        return summary;
    }

    private int countByDisplayStatus(List<Map<String, Object>> rows, String expected)
    {
        return (int) rows.stream()
            .filter(row -> Objects.equals(normalizeText(row.get("displayStatus")), expected))
            .count();
    }

    private List<Map<String, Object>> filterRows(List<Map<String, Object>> rows, String tab)
    {
        if ("all".equals(tab))
        {
            return rows;
        }

        return rows.stream()
            .filter(row -> Objects.equals(normalizeText(row.get("displayStatus")), tab))
            .toList();
    }

    private List<Map<String, Object>> paginate(List<Map<String, Object>> rows, Integer pageNum, Integer pageSize)
    {
        int safePageNum = safePageNum(pageNum);
        int safePageSize = safePageSize(pageSize);
        int fromIndex = Math.min((safePageNum - 1) * safePageSize, rows.size());
        int toIndex = Math.min(fromIndex + safePageSize, rows.size());
        if (fromIndex >= toIndex)
        {
            return List.of();
        }
        return rows.subList(fromIndex, toIndex);
    }

    private int safePageNum(Integer pageNum)
    {
        return pageNum == null || pageNum < 1 ? 1 : pageNum;
    }

    private int safePageSize(Integer pageSize)
    {
        return pageSize == null || pageSize < 1 ? 10 : pageSize;
    }

    private String normalizeTab(String tab)
    {
        String normalized = normalizeText(tab);
        return switch (normalized) {
            case "pending", "unpaid", "paid", "rejected" -> normalized;
            default -> "all";
        };
    }

    private String resolveDisplayStatus(String rawStatus)
    {
        return switch (rawStatus) {
            case "pending" -> "pending";
            case "rejected" -> "rejected";
            case "paid" -> "paid";
            default -> "unpaid";
        };
    }

    private String resolveDisplayStatusLabel(String displayStatus)
    {
        return switch (displayStatus) {
            case "pending" -> "待审核";
            case "paid" -> "已支付";
            case "rejected" -> "已驳回";
            default -> "未支付";
        };
    }

    private String resolveModalType(String courseType, String rawStatus)
    {
        if ("rejected".equals(rawStatus))
        {
            return "rejected";
        }

        return switch (courseType) {
            case "onboarding_interview" -> "entry";
            case "mock_interview" -> "mock";
            case "midterm_exam" -> "midterm";
            case "communication_midterm" -> "networking";
            case "written_test" -> "written";
            default -> "entry";
        };
    }

    private String resolveHeaderTone(String modalType)
    {
        return switch (modalType) {
            case "mock" -> "emerald";
            case "midterm" -> "amber";
            case "networking" -> "violet";
            case "written" -> "rose";
            case "rejected" -> "red";
            default -> "blue";
        };
    }

    private String resolveHeaderTitle(String modalType)
    {
        return switch (modalType) {
            case "mock" -> "模拟面试";
            case "midterm" -> "模拟期中考试";
            case "networking" -> "人际关系期中";
            case "written" -> "笔试辅导";
            case "rejected" -> "已驳回";
            default -> "入职面试";
        };
    }

    private String resolveCourseTypeLabel(String courseType)
    {
        return switch (courseType) {
            case "onboarding_interview" -> "入职面试";
            case "mock_interview" -> "模拟面试";
            case "midterm_exam" -> "模拟期中考试";
            case "communication_midterm" -> "人际关系期中";
            case "written_test" -> "笔试辅导";
            default -> "入职面试";
        };
    }

    private String resolveSourceLabel(String courseSource)
    {
        return switch (courseSource) {
            case "clerk", "clerk_submit", "assistant_submit" -> "班主任端";
            case "assistant", "assistant_report" -> "助教端";
            default -> "导师端";
        };
    }

    private String normalizeText(Object value)
    {
        return value == null ? "" : String.valueOf(value).trim().toLowerCase();
    }
}
