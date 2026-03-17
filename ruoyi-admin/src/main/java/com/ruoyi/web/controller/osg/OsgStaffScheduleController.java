package com.ruoyi.web.controller.osg;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.annotation.Excel;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.poi.ExcelUtil;
import com.ruoyi.framework.config.PasswordResetMailConfig;
import com.ruoyi.system.service.IOsgStaffScheduleService;

@RestController
@RequestMapping("/admin/schedule")
public class OsgStaffScheduleController extends BaseController
{
    private static final String STAFF_SCHEDULE_ROLE_ACCESS = "@ss.hasPermi('admin:mentor-schedule:list')";

    @Autowired
    private IOsgStaffScheduleService staffScheduleService;

    @Autowired
    private JavaMailSender mailSender;

    @Autowired
    private PasswordResetMailConfig mailConfig;

    @PreAuthorize(STAFF_SCHEDULE_ROLE_ACCESS)
    @GetMapping("/list")
    public TableDataInfo list(@RequestParam(value = "week", required = false) String week)
    {
        startPage();
        List<Map<String, Object>> rows = staffScheduleService.selectScheduleList(week);
        return getDataTable(rows);
    }

    @PreAuthorize(STAFF_SCHEDULE_ROLE_ACCESS)
    @PutMapping("/edit")
    public AjaxResult edit(@RequestBody Map<String, Object> body)
    {
        try
        {
            Map<String, Object> result = staffScheduleService.saveSchedule(body, getUsername(), getUserId());
            return AjaxResult.success("排期已保存", result);
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    @PreAuthorize(STAFF_SCHEDULE_ROLE_ACCESS)
    @PostMapping("/remind-all")
    public AjaxResult remindAll(@RequestBody(required = false) Map<String, Object> body)
    {
        String week = body == null ? null : asText(firstPresent(body, "week", "weekScope"));
        try
        {
            Map<String, Object> result = staffScheduleService.remindAll(week);
            int recipientCount = asInteger(result.get("recipientCount"));
            int pendingCount = asInteger(result.get("pendingCount"));
            @SuppressWarnings("unchecked")
            List<String> recipients = result.get("recipients") instanceof List<?> list
                ? (List<String>) list
                : List.of();

            if (recipientCount > 0)
            {
                sendReminderEmails(recipients, asText(result.get("weekScope")));
            }

            String message = recipientCount > 0
                ? "已提醒 " + recipientCount + " 位导师"
                : "当前无可提醒导师";
            AjaxResult ajax = AjaxResult.success(message);
            ajax.put("pendingCount", pendingCount);
            ajax.put("recipientCount", recipientCount);
            ajax.put("weekScope", result.get("weekScope"));
            ajax.put("recipients", recipients);
            return ajax;
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    @PreAuthorize(STAFF_SCHEDULE_ROLE_ACCESS)
    @GetMapping("/export")
    public void export(HttpServletResponse response,
                       @RequestParam(value = "week", required = false) String week)
    {
        List<Map<String, Object>> rows = staffScheduleService.selectScheduleList(week);
        List<StaffScheduleExportRow> exportRows = new ArrayList<>(rows.size());
        for (Map<String, Object> row : rows)
        {
            exportRows.add(new StaffScheduleExportRow(
                asLong(row.get("staffId")),
                asText(row.get("staffName")),
                asText(row.get("staffType")),
                normalizeHours(row.get("availableHours")),
                asText(row.get("availableText")),
                asBoolean(row.get("filled")) ? "已填写" : "未填写",
                asBoolean(row.get("canRemind")) ? "催促" : "调整"
            ));
        }
        ExcelUtil<StaffScheduleExportRow> util = new ExcelUtil<>(StaffScheduleExportRow.class);
        util.exportExcel(response, exportRows, "导师排期表");
    }

    private Object firstPresent(Map<String, Object> payload, String primaryKey, String fallbackKey)
    {
        Object primary = payload.get(primaryKey);
        return primary != null ? primary : payload.get(fallbackKey);
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

    private int asInteger(Object value)
    {
        if (value instanceof Number number)
        {
            return number.intValue();
        }
        if (value instanceof String text && !text.isBlank())
        {
            try
            {
                return Integer.parseInt(text.trim());
            }
            catch (NumberFormatException ex)
            {
                return 0;
            }
        }
        return 0;
    }

    private Long asLong(Object value)
    {
        if (value instanceof Number number)
        {
            return number.longValue();
        }
        if (value instanceof String text && !text.isBlank())
        {
            try
            {
                return Long.parseLong(text.trim());
            }
            catch (NumberFormatException ex)
            {
                return null;
            }
        }
        return null;
    }

    private boolean asBoolean(Object value)
    {
        if (value instanceof Boolean bool)
        {
            return bool;
        }
        if (value instanceof Number number)
        {
            return number.intValue() != 0;
        }
        if (value instanceof String text)
        {
            return "true".equalsIgnoreCase(text.trim()) || "1".equals(text.trim());
        }
        return false;
    }

    private String normalizeHours(Object value)
    {
        if (value instanceof BigDecimal decimal)
        {
            return decimal.stripTrailingZeros().toPlainString() + "h";
        }
        if (value instanceof Number number)
        {
            return BigDecimal.valueOf(number.doubleValue()).stripTrailingZeros().toPlainString() + "h";
        }
        return "0h";
    }

    private void sendReminderEmails(List<String> recipients, String weekScope)
    {
        if (recipients == null || recipients.isEmpty())
        {
            return;
        }
        if (isBlank(mailConfig.getFrom()))
        {
            throw new ServiceException("排期提醒邮件发送配置缺失: from");
        }

        for (String recipient : recipients)
        {
            if (isBlank(recipient))
            {
                continue;
            }
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailConfig.getFrom());
            message.setTo(recipient);
            if (!isBlank(mailConfig.getMailbox()) && !mailConfig.getMailbox().equalsIgnoreCase(recipient))
            {
                message.setBcc(mailConfig.getMailbox());
            }
            message.setSubject("OSG 导师排期填写提醒");
            message.setText(buildReminderBody(weekScope));
            mailSender.send(message);
        }
    }

    private String buildReminderBody(String weekScope)
    {
        String weekText = "next".equalsIgnoreCase(weekScope) ? "下周" : "本周";
        return "您好，OSG 管理后台检测到您尚未填写" + weekText + "排期。请尽快登录系统完成排期填写，以便课程安排顺利进行。";
    }

    private boolean isBlank(String value)
    {
        return value == null || value.trim().isEmpty();
    }

    private static class StaffScheduleExportRow
    {
        @Excel(name = "导师ID")
        private final Long staffId;

        @Excel(name = "导师")
        private final String staffName;

        @Excel(name = "类型")
        private final String staffType;

        @Excel(name = "可用时长")
        private final String availableHours;

        @Excel(name = "可用时间")
        private final String availableText;

        @Excel(name = "填写状态")
        private final String filledStatus;

        @Excel(name = "操作")
        private final String actionLabel;

        private StaffScheduleExportRow(Long staffId, String staffName, String staffType,
                                       String availableHours, String availableText,
                                       String filledStatus, String actionLabel)
        {
            this.staffId = staffId;
            this.staffName = staffName;
            this.staffType = staffType;
            this.availableHours = availableHours;
            this.availableText = availableText;
            this.filledStatus = filledStatus;
            this.actionLabel = actionLabel;
        }
    }
}
