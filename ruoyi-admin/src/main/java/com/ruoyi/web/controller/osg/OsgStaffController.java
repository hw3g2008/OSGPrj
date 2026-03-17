package com.ruoyi.web.controller.osg;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.system.domain.OsgStaff;
import com.ruoyi.system.service.impl.OsgStaffServiceImpl;

@RestController
@RequestMapping("/admin/staff")
public class OsgStaffController extends BaseController
{
    private static final String STAFF_ROLE_ACCESS = "@ss.hasPermi('admin:staff:list')";

    @Autowired
    private OsgStaffServiceImpl staffService;

    @PreAuthorize(STAFF_ROLE_ACCESS)
    @GetMapping("/list")
    public TableDataInfo list(OsgStaff staff)
    {
        normalizeFilter(staff);
        startPage();
        List<OsgStaff> rows = staffService.selectStaffList(staff);
        List<Long> blacklistedIds = staffService.selectBlacklistedStaffIds(extractStaffIds(rows));
        TableDataInfo table = getDataTable(toTableRows(rows, blacklistedIds));
        table.setPendingReviewCount(staffService.selectPendingReviewCount());
        return table;
    }

    @PreAuthorize(STAFF_ROLE_ACCESS)
    @GetMapping("/{staffId}")
    public AjaxResult detail(@org.springframework.web.bind.annotation.PathVariable Long staffId)
    {
        Map<String, Object> detail = staffService.selectStaffDetail(staffId);
        if (detail == null || detail.isEmpty())
        {
            return AjaxResult.error("导师不存在");
        }
        return AjaxResult.success(detail);
    }

    @PreAuthorize(STAFF_ROLE_ACCESS)
    @PostMapping
    public AjaxResult create(@RequestBody Map<String, Object> body)
    {
        OsgStaff staff = parseStaff(body);
        String validationError = validateStaffPayload(staff);
        if (validationError != null)
        {
            return AjaxResult.error(validationError);
        }

        String operator = getUsername();
        staff.setAccountStatus(defaultText(resolveStoredAccountStatus(asText(body.get("accountStatus"))), "active"));
        staff.setCreateBy(operator);
        staff.setUpdateBy(operator);
        if (staffService.insertStaff(staff) <= 0)
        {
            return AjaxResult.error("导师新增失败");
        }

        OsgStaff created = staffService.selectStaffByStaffId(staff.getStaffId());
        AjaxResult ajax = AjaxResult.success("导师已新增");
        ajax.putAll(toTableRow(created == null ? staff : created, false));
        return ajax;
    }

    @PreAuthorize(STAFF_ROLE_ACCESS)
    @PutMapping
    public AjaxResult update(@RequestBody Map<String, Object> body)
    {
        Long staffId = asLong(body.get("staffId"));
        if (staffId == null)
        {
            return AjaxResult.error("staffId不能为空");
        }

        OsgStaff existing = staffService.selectStaffByStaffId(staffId);
        if (existing == null)
        {
            return AjaxResult.error("导师不存在");
        }

        OsgStaff staff = parseStaff(body);
        String validationError = validateStaffPayload(staff);
        if (validationError != null)
        {
            return AjaxResult.error(validationError);
        }

        staff.setStaffId(staffId);
        staff.setAccountStatus(defaultText(resolveStoredAccountStatus(asText(body.get("accountStatus"))), existing.getAccountStatus()));
        staff.setUpdateBy(getUsername());
        if (staffService.updateStaff(staff) <= 0)
        {
            return AjaxResult.error("导师更新失败");
        }

        OsgStaff updated = staffService.selectStaffByStaffId(staffId);
        AjaxResult ajax = AjaxResult.success("导师已更新");
        ajax.putAll(toTableRow(updated == null ? mergeExisting(existing, staff) : updated, false));
        return ajax;
    }

    @PreAuthorize(STAFF_ROLE_ACCESS)
    @PutMapping("/status")
    public AjaxResult changeStatus(@RequestBody Map<String, Object> body)
    {
        Long staffId = asLong(body.get("staffId"));
        String action = asText(body.get("action"));
        String accountStatus = resolveAccountStatus(action, asText(body.get("accountStatus")));
        if (staffId == null || accountStatus == null)
        {
            return AjaxResult.error("参数缺失");
        }

        int rows = staffService.updateStaffStatus(staffId, accountStatus, getUsername());
        if (rows <= 0)
        {
            return AjaxResult.error("导师状态更新失败");
        }

        return AjaxResult.success("导师状态已更新")
            .put("staffId", staffId)
            .put("accountStatus", normalizeAccountStatus(accountStatus));
    }

    @PreAuthorize(STAFF_ROLE_ACCESS)
    @PostMapping("/blacklist")
    public AjaxResult changeBlacklist(@RequestBody Map<String, Object> body)
    {
        Long staffId = asLong(body.get("staffId"));
        String action = normalizeBlacklistAction(asText(body.get("action")));
        String reason = defaultText(asText(body.get("reason")), "系统操作");
        if (staffId == null || action == null)
        {
            return AjaxResult.error("参数缺失");
        }

        int rows = staffService.updateStaffBlacklist(staffId, action, reason, getUserId());
        if (rows <= 0)
        {
            return AjaxResult.error("黑名单状态未变更");
        }

        return AjaxResult.success("blacklist".equals(action) ? "已加入黑名单" : "已移出黑名单")
            .put("staffId", staffId)
            .put("action", action);
    }

    @PreAuthorize(STAFF_ROLE_ACCESS)
    @PostMapping("/reset-password")
    public AjaxResult resetPassword(@RequestBody Map<String, Object> body)
    {
        Long staffId = asLong(body.get("staffId"));
        if (staffId == null)
        {
            return AjaxResult.error("staffId不能为空");
        }
        try
        {
            Map<String, Object> result = staffService.resetStaffPassword(staffId, getUsername());
            return AjaxResult.success("导师密码已重置", result);
        }
        catch (Exception ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    @PreAuthorize(STAFF_ROLE_ACCESS)
    @PostMapping("/change-request")
    public AjaxResult submitChangeRequest(@RequestBody Map<String, Object> body)
    {
        try
        {
            Map<String, Object> result = staffService.submitChangeRequest(body, getUsername());
            return AjaxResult.success("导师信息变更申请已提交", result);
        }
        catch (Exception ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    private void normalizeFilter(OsgStaff staff)
    {
        staff.setAccountStatus(resolveStoredAccountStatus(staff.getAccountStatus()));
    }

    private List<Map<String, Object>> toTableRows(List<OsgStaff> rows, List<Long> blacklistedIds)
    {
        Set<Long> blacklistSet = new HashSet<>(blacklistedIds);
        List<Map<String, Object>> tableRows = new ArrayList<>(rows.size());
        for (OsgStaff staff : rows)
        {
            tableRows.add(toTableRow(staff, blacklistSet.contains(staff.getStaffId())));
        }
        return tableRows;
    }

    private Map<String, Object> toTableRow(OsgStaff staff, boolean isBlacklisted)
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("staffId", staff.getStaffId());
        row.put("staffName", staff.getStaffName());
        row.put("email", staff.getEmail());
        row.put("phone", staff.getPhone());
        row.put("staffType", staff.getStaffType());
        row.put("majorDirection", staff.getMajorDirection());
        row.put("subDirection", staff.getSubDirection());
        row.put("region", staff.getRegion());
        row.put("city", staff.getCity());
        row.put("hourlyRate", staff.getHourlyRate());
        row.put("studentCount", staff.getStudentCount());
        row.put("accountStatus", normalizeAccountStatus(staff.getAccountStatus()));
        row.put("isBlacklisted", isBlacklisted);
        return row;
    }

    private List<Long> extractStaffIds(List<OsgStaff> rows)
    {
        List<Long> staffIds = new ArrayList<>(rows.size());
        for (OsgStaff staff : rows)
        {
            staffIds.add(staff.getStaffId());
        }
        return staffIds;
    }

    private String resolveAccountStatus(String action, String accountStatus)
    {
        if ("freeze".equals(action))
        {
            return "frozen";
        }
        if ("restore".equals(action))
        {
            return "active";
        }
        return resolveStoredAccountStatus(accountStatus);
    }

    private String resolveStoredAccountStatus(String accountStatus)
    {
        if ("0".equals(accountStatus))
        {
            return "active";
        }
        if ("1".equals(accountStatus))
        {
            return "frozen";
        }
        if ("active".equals(accountStatus) || "frozen".equals(accountStatus))
        {
            return accountStatus;
        }
        return null;
    }

    private String normalizeAccountStatus(String accountStatus)
    {
        return "frozen".equals(accountStatus) ? "1" : "0";
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

    private OsgStaff parseStaff(Map<String, Object> body)
    {
        OsgStaff staff = new OsgStaff();
        staff.setStaffName(asText(body.get("staffName")));
        staff.setEmail(asText(body.get("email")));
        staff.setPhone(asText(body.get("phone")));
        staff.setStaffType(asText(body.get("staffType")));
        staff.setMajorDirection(asText(body.get("majorDirection")));
        staff.setSubDirection(asText(body.get("subDirection")));
        staff.setRegion(asText(body.get("region")));
        staff.setCity(asText(body.get("city")));
        staff.setHourlyRate(asDecimal(body.get("hourlyRate")));
        return staff;
    }

    private String validateStaffPayload(OsgStaff staff)
    {
        if (staff.getStaffName() == null)
        {
            return "staffName不能为空";
        }
        if (staff.getEmail() == null)
        {
            return "email不能为空";
        }
        if (staff.getStaffType() == null)
        {
            return "staffType不能为空";
        }
        if (staff.getMajorDirection() == null)
        {
            return "majorDirection不能为空";
        }
        if (staff.getRegion() == null)
        {
            return "region不能为空";
        }
        if (staff.getCity() == null)
        {
            return "city不能为空";
        }
        if (staff.getHourlyRate() == null)
        {
            return "hourlyRate不能为空";
        }
        return null;
    }

    private OsgStaff mergeExisting(OsgStaff existing, OsgStaff update)
    {
        existing.setStaffName(defaultText(update.getStaffName(), existing.getStaffName()));
        existing.setEmail(defaultText(update.getEmail(), existing.getEmail()));
        existing.setPhone(update.getPhone());
        existing.setStaffType(defaultText(update.getStaffType(), existing.getStaffType()));
        existing.setMajorDirection(update.getMajorDirection());
        existing.setSubDirection(update.getSubDirection());
        existing.setRegion(update.getRegion());
        existing.setCity(update.getCity());
        existing.setHourlyRate(update.getHourlyRate());
        return existing;
    }

    private Long asLong(Object value)
    {
        if (value instanceof Number number)
        {
            return number.longValue();
        }
        if (value instanceof String text && !text.isBlank())
        {
            return Long.valueOf(text.trim());
        }
        return null;
    }

    private BigDecimal asDecimal(Object value)
    {
        if (value instanceof BigDecimal decimal)
        {
            return decimal;
        }
        if (value instanceof Number number)
        {
            return BigDecimal.valueOf(number.doubleValue());
        }
        if (value instanceof String text && !text.isBlank())
        {
            return new BigDecimal(text.trim());
        }
        return null;
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

    private String defaultText(String value, String defaultValue)
    {
        return value == null || value.isBlank() ? defaultValue : value.trim();
    }
}
