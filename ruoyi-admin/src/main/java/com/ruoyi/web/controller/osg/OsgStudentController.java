package com.ruoyi.web.controller.osg;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Date;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.annotation.Excel;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.poi.ExcelUtil;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.service.impl.OsgStudentChangeRequestServiceImpl;
import com.ruoyi.system.service.impl.OsgStudentServiceImpl;

@RestController
@RequestMapping("/admin/student")
public class OsgStudentController extends BaseController
{
    private static final String STUDENT_ROLE_ACCESS = "@ss.hasPermi('admin:students:list')";

    @Autowired
    private OsgStudentServiceImpl studentService;

    @Autowired
    private OsgStudentChangeRequestServiceImpl changeRequestService;

    @PreAuthorize(STUDENT_ROLE_ACCESS)
    @GetMapping("/list")
    public TableDataInfo list(OsgStudent student)
    {
        startPage();
        List<OsgStudent> students = studentService.selectStudentList(student);
        Map<Long, Map<String, Integer>> activityCounts = studentService.selectStudentActivityCounts(extractStudentIds(students));
        List<Long> blacklistedIds = studentService.selectBlacklistedStudentIds(extractStudentIds(students));
        Set<Long> pendingReviewIds = extractPendingReviewStudentIds();
        return getDataTable(toTableRows(students, blacklistedIds, pendingReviewIds, activityCounts));
    }

    @PreAuthorize(STUDENT_ROLE_ACCESS)
    @GetMapping("/{studentId}")
    public AjaxResult detail(@PathVariable Long studentId)
    {
        Map<String, Object> detail = studentService.selectStudentDetail(studentId);
        if (detail == null || detail.isEmpty())
        {
            return AjaxResult.error("学员不存在");
        }
        return AjaxResult.success(detail);
    }

    @PreAuthorize(STUDENT_ROLE_ACCESS)
    @GetMapping("/{studentId}/contracts")
    public AjaxResult contracts(@PathVariable Long studentId)
    {
        Map<String, Object> contracts = studentService.selectStudentContracts(studentId);
        if (contracts == null || contracts.isEmpty())
        {
            return AjaxResult.error("学员不存在");
        }
        return AjaxResult.success(contracts);
    }

    @PreAuthorize(STUDENT_ROLE_ACCESS)
    @PostMapping
    public AjaxResult create(@RequestBody Map<String, Object> body)
    {
        if (body == null || body.isEmpty())
        {
            return AjaxResult.error("参数缺失");
        }
        try
        {
            Map<String, Object> result = studentService.createStudentWithContract(body, getUsername());
            return AjaxResult.success("新增学员成功", result);
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    @PreAuthorize(STUDENT_ROLE_ACCESS)
    @PutMapping
    public AjaxResult update(@RequestBody Map<String, Object> body)
    {
        if (body == null || body.isEmpty())
        {
            return AjaxResult.error("参数缺失");
        }
        try
        {
            Map<String, Object> result = studentService.updateStudentProfile(body, getUsername());
            return AjaxResult.success("学员信息已更新", result);
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    @PreAuthorize(STUDENT_ROLE_ACCESS)
    @PutMapping("/status")
    public AjaxResult changeStatus(@RequestBody Map<String, Object> body)
    {
        Long studentId = asLong(body.get("studentId"));
        String action = asText(body.get("action"));
        String accountStatus = resolveAccountStatus(action, asText(body.get("accountStatus")));
        if (studentId == null || accountStatus == null)
        {
            return AjaxResult.error("参数缺失");
        }

        int rows = studentService.changeStudentStatus(studentId, accountStatus, getUsername());
        if (rows <= 0)
        {
            return AjaxResult.error("学员状态更新失败");
        }

        return AjaxResult.success("学员状态已更新")
            .put("studentId", studentId)
            .put("accountStatus", accountStatus);
    }

    @PreAuthorize(STUDENT_ROLE_ACCESS)
    @PostMapping("/blacklist")
    public AjaxResult changeBlacklist(@RequestBody Map<String, Object> body)
    {
        Long studentId = asLong(body.get("studentId"));
        String action = normalizeBlacklistAction(asText(body.get("action")));
        String reason = defaultText(asText(body.get("reason")), "系统操作");
        if (studentId == null || action == null)
        {
            return AjaxResult.error("参数缺失");
        }

        int rows = studentService.updateStudentBlacklist(studentId, action, reason, getUserId());
        if (rows <= 0)
        {
            return AjaxResult.error("黑名单状态未变更");
        }

        return AjaxResult.success("blacklist".equals(action) ? "已加入黑名单" : "已移出黑名单")
            .put("studentId", studentId)
            .put("action", action);
    }

    @PreAuthorize(STUDENT_ROLE_ACCESS)
    @PostMapping("/reset-password")
    public AjaxResult resetPassword(@RequestBody Map<String, Object> body)
    {
        Long studentId = asLong(body.get("studentId"));
        if (studentId == null)
        {
            return AjaxResult.error("studentId不能为空");
        }
        try
        {
            Map<String, Object> result = studentService.resetStudentPassword(studentId, getUsername());
            return AjaxResult.success("学员密码已重置", result);
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    @PreAuthorize(STUDENT_ROLE_ACCESS)
    @GetMapping("/export")
    public void export(HttpServletResponse response, OsgStudent student)
    {
        List<OsgStudent> students = studentService.selectStudentList(student);
        Map<Long, Map<String, Integer>> activityCounts = studentService.selectStudentActivityCounts(extractStudentIds(students));
        List<Long> blacklistedIds = studentService.selectBlacklistedStudentIds(extractStudentIds(students));
        List<StudentExportRow> exportRows = toExportRows(students, blacklistedIds, activityCounts);
        ExcelUtil<StudentExportRow> util = new ExcelUtil<>(StudentExportRow.class);
        util.exportExcel(response, exportRows, "学员列表");
    }

    private List<Map<String, Object>> toTableRows(List<OsgStudent> students, List<Long> blacklistedIds,
        Set<Long> pendingReviewIds, Map<Long, Map<String, Integer>> activityCounts)
    {
        Set<Long> blacklistSet = new HashSet<>(blacklistedIds);
        List<Map<String, Object>> rows = new ArrayList<>(students.size());
        for (OsgStudent student : students)
        {
            boolean isBlacklisted = blacklistSet.contains(student.getStudentId());
            boolean pendingReview = pendingReviewIds.contains(student.getStudentId());
            Map<String, Object> contractSnapshot = resolveContractSnapshot(student.getStudentId());
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("studentId", student.getStudentId());
            row.put("studentName", student.getStudentName());
            row.put("email", student.getEmail());
            row.put("leadMentorId", student.getLeadMentorId());
            row.put("leadMentorName", formatMentorName(student.getLeadMentorId()));
            row.put("school", student.getSchool());
            row.put("majorDirection", student.getMajorDirection());
            row.put("targetPosition", defaultText(student.getSubDirection(), "-"));
            row.put("totalHours", contractSnapshot.get("totalHours"));
            row.put("jobCoachingCount", resolveActivityCount(activityCounts, student.getStudentId(), "jobCoachingCount"));
            row.put("basicCourseCount", resolveActivityCount(activityCounts, student.getStudentId(), "basicCourseCount"));
            row.put("mockInterviewCount", resolveActivityCount(activityCounts, student.getStudentId(), "mockInterviewCount"));
            row.put("remainingHours", contractSnapshot.get("remainingHours"));
            row.put("reminder", pendingReview ? "待审核" : "-");
            row.put("pendingReview", pendingReview);
            row.put("reviewStatus", pendingReview ? "pending" : null);
            row.put("contractStatus", contractSnapshot.get("contractStatus"));
            row.put("contractDaysLeft", contractSnapshot.get("contractDaysLeft"));
            row.put("accountStatus", defaultText(student.getAccountStatus(), "0"));
            row.put("isBlacklisted", isBlacklisted);
            rows.add(row);
        }
        return rows;
    }

    private Set<Long> extractPendingReviewStudentIds()
    {
        List<Map<String, Object>> pendingRequests = changeRequestService.selectChangeRequestList(null, "pending");
        Set<Long> pendingReviewIds = new HashSet<>();
        for (Map<String, Object> request : pendingRequests)
        {
            Long studentId = asLong(request.get("studentId"));
            if (studentId != null)
            {
                pendingReviewIds.add(studentId);
            }
        }
        return pendingReviewIds;
    }

    private Map<String, Object> resolveContractSnapshot(Long studentId)
    {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("totalHours", 0);
        snapshot.put("remainingHours", BigDecimal.ZERO);
        snapshot.put("contractStatus", "normal");
        if (studentId == null)
        {
            return snapshot;
        }

        Map<String, Object> payload = studentService.selectStudentContracts(studentId);
        if (payload == null || payload.isEmpty())
        {
            return snapshot;
        }

        Map<String, Object> summary = payload.get("summary") instanceof Map<?, ?> value
            ? castObjectMap(value)
            : Map.of();
        List<Map<String, Object>> contracts = payload.get("contracts") instanceof List<?> list
            ? castObjectMapList(list)
            : List.of();

        snapshot.put("totalHours", asInteger(summary.get("totalHours")));
        snapshot.put("remainingHours", asDecimal(summary.get("remainingHours")));
        snapshot.put("contractStatus", deriveContractStatus(contracts));
        snapshot.put("contractDaysLeft", deriveContractDaysLeft(contracts));
        return snapshot;
    }

    private String deriveContractStatus(List<Map<String, Object>> contracts)
    {
        if (contracts == null || contracts.isEmpty())
        {
            return "normal";
        }

        LocalDate today = LocalDate.now();
        LocalDate threshold = today.plusDays(30);
        String latestStatus = "normal";
        for (Map<String, Object> contract : contracts)
        {
            String status = defaultText(asText(contract.get("contractStatus")), "normal");
            LocalDate endDate = asLocalDate(contract.get("endDate"));
            if ("active".equals(status) && endDate != null && !endDate.isBefore(today) && !endDate.isAfter(threshold))
            {
                return "expiring";
            }
            if ("normal".equals(latestStatus))
            {
                latestStatus = status;
            }
        }

        if ("active".equals(latestStatus))
        {
            return "normal";
        }
        return latestStatus;
    }

    private Long deriveContractDaysLeft(List<Map<String, Object>> contracts)
    {
        if (contracts == null || contracts.isEmpty())
        {
            return null;
        }
        LocalDate today = LocalDate.now();
        LocalDate threshold = today.plusDays(30);
        for (Map<String, Object> contract : contracts)
        {
            String status = defaultText(asText(contract.get("contractStatus")), "normal");
            LocalDate endDate = asLocalDate(contract.get("endDate"));
            if ("active".equals(status) && endDate != null && !endDate.isBefore(today) && !endDate.isAfter(threshold))
            {
                return java.time.temporal.ChronoUnit.DAYS.between(today, endDate);
            }
        }
        return null;
    }

    private List<Long> extractStudentIds(List<OsgStudent> students)
    {
        List<Long> studentIds = new ArrayList<>(students.size());
        for (OsgStudent student : students)
        {
            studentIds.add(student.getStudentId());
        }
        return studentIds;
    }

    private List<StudentExportRow> toExportRows(List<OsgStudent> students, List<Long> blacklistedIds,
        Map<Long, Map<String, Integer>> activityCounts)
    {
        Set<Long> blacklistSet = new HashSet<>(blacklistedIds);
        List<StudentExportRow> rows = new ArrayList<>(students.size());
        for (OsgStudent student : students)
        {
            boolean isBlacklisted = blacklistSet.contains(student.getStudentId());
            Map<String, Object> contractSnapshot = resolveContractSnapshot(student.getStudentId());
            String reminder = isBlacklisted ? "黑名单" : "-";
            rows.add(new StudentExportRow(
                student.getStudentId(),
                defaultText(student.getStudentName(), "-"),
                defaultText(student.getEmail(), "-"),
                formatMentorName(student.getLeadMentorId()),
                defaultText(student.getSchool(), "-"),
                defaultText(student.getMajorDirection(), "-"),
                defaultText(student.getSubDirection(), "-"),
                formatHours(asInteger(contractSnapshot.get("totalHours"))),
                formatCount(resolveActivityCount(activityCounts, student.getStudentId(), "jobCoachingCount")),
                formatCount(resolveActivityCount(activityCounts, student.getStudentId(), "basicCourseCount")),
                formatCount(resolveActivityCount(activityCounts, student.getStudentId(), "mockInterviewCount")),
                formatHours(contractSnapshot.get("remainingHours")),
                reminder,
                formatAccountStatus(defaultText(student.getAccountStatus(), "0")),
                "详情/编辑/重置密码/冻结/恢复/加入黑名单/退费"
            ));
        }
        return rows;
    }

    private String resolveAccountStatus(String action, String accountStatus)
    {
        if ("freeze".equals(action))
        {
            return "1";
        }
        if ("restore".equals(action))
        {
            return "0";
        }
        if ("refund".equals(action))
        {
            return "3";
        }
        if ("0".equals(accountStatus) || "1".equals(accountStatus) || "2".equals(accountStatus) || "3".equals(accountStatus))
        {
            return accountStatus;
        }
        return null;
    }

    private String normalizeBlacklistAction(String action)
    {
        if ("add".equals(action) || "blacklist".equals(action))
        {
            return "blacklist";
        }
        if ("remove".equals(action) || "restore".equals(action))
        {
            return "remove";
        }
        return null;
    }

    private String formatAccountStatus(String accountStatus)
    {
        return switch (accountStatus)
        {
            case "1" -> "冻结";
            case "2" -> "已结束";
            case "3" -> "退费";
            default -> "正常";
        };
    }

    private int resolveActivityCount(Map<Long, Map<String, Integer>> activityCounts, Long studentId, String metricKey)
    {
        if (activityCounts == null || studentId == null)
        {
            return 0;
        }
        Map<String, Integer> metrics = activityCounts.get(studentId);
        if (metrics == null)
        {
            return 0;
        }
        Integer value = metrics.get(metricKey);
        return value == null ? 0 : value;
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

    private Integer asInteger(Object value)
    {
        if (value == null)
        {
            return 0;
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
            return 0;
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

    private LocalDate asLocalDate(Object value)
    {
        if (value == null)
        {
            return null;
        }
        if (value instanceof LocalDate localDate)
        {
            return localDate;
        }
        if (value instanceof java.sql.Date sqlDate)
        {
            return sqlDate.toLocalDate();
        }
        if (value instanceof Date utilDate)
        {
            return utilDate.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
        }
        try
        {
            return LocalDate.parse(String.valueOf(value));
        }
        catch (Exception ex)
        {
            return null;
        }
    }

    private Map<String, Object> castObjectMap(Map<?, ?> source)
    {
        Map<String, Object> result = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : source.entrySet())
        {
            result.put(String.valueOf(entry.getKey()), entry.getValue());
        }
        return result;
    }

    private List<Map<String, Object>> castObjectMapList(List<?> source)
    {
        List<Map<String, Object>> result = new ArrayList<>(source.size());
        for (Object item : source)
        {
            if (item instanceof Map<?, ?> map)
            {
                result.add(castObjectMap(map));
            }
        }
        return result;
    }

    private String formatMentorName(Long leadMentorId)
    {
        return leadMentorId == null ? "-" : String.valueOf(leadMentorId);
    }

    private String defaultText(String value, String fallback)
    {
        if (value == null || value.isBlank())
        {
            return fallback;
        }
        return value;
    }

    private BigDecimal asDecimal(Object value)
    {
        if (value == null)
        {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal decimal)
        {
            return decimal.stripTrailingZeros();
        }
        if (value instanceof Number number)
        {
            return BigDecimal.valueOf(number.doubleValue()).stripTrailingZeros();
        }
        try
        {
            return new BigDecimal(String.valueOf(value)).stripTrailingZeros();
        }
        catch (NumberFormatException ex)
        {
            return BigDecimal.ZERO;
        }
    }

    private String formatHours(Object value)
    {
        return asDecimal(value).toPlainString() + "h";
    }

    private String formatCount(int value)
    {
        return value + "次";
    }

    private static class StudentExportRow
    {
        @Excel(name = "ID")
        private final Long studentId;

        @Excel(name = "姓名")
        private final String studentName;

        @Excel(name = "邮箱")
        private final String email;

        @Excel(name = "班主任")
        private final String leadMentorName;

        @Excel(name = "学校")
        private final String school;

        @Excel(name = "主攻方向")
        private final String majorDirection;

        @Excel(name = "投递岗位")
        private final String targetPosition;

        @Excel(name = "总课时")
        private final String totalHours;

        @Excel(name = "岗位辅导")
        private final String jobCoachingCount;

        @Excel(name = "基础课")
        private final String basicCourseCount;

        @Excel(name = "模拟应聘")
        private final String mockInterviewCount;

        @Excel(name = "剩余课时")
        private final String remainingHours;

        @Excel(name = "提醒")
        private final String reminder;

        @Excel(name = "账号状态")
        private final String accountStatus;

        @Excel(name = "操作")
        private final String actions;

        private StudentExportRow(Long studentId, String studentName, String email, String leadMentorName,
            String school, String majorDirection, String targetPosition, String totalHours,
            String jobCoachingCount, String basicCourseCount, String mockInterviewCount,
            String remainingHours, String reminder, String accountStatus, String actions)
        {
            this.studentId = studentId;
            this.studentName = studentName;
            this.email = email;
            this.leadMentorName = leadMentorName;
            this.school = school;
            this.majorDirection = majorDirection;
            this.targetPosition = targetPosition;
            this.totalHours = totalHours;
            this.jobCoachingCount = jobCoachingCount;
            this.basicCourseCount = basicCourseCount;
            this.mockInterviewCount = mockInterviewCount;
            this.remainingHours = remainingHours;
            this.reminder = reminder;
            this.accountStatus = accountStatus;
            this.actions = actions;
        }
    }
}
