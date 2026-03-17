package com.ruoyi.system.service.impl;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgStaff;
import com.ruoyi.system.domain.OsgStaffSchedule;
import com.ruoyi.system.mapper.OsgStaffMapper;
import com.ruoyi.system.mapper.OsgStaffScheduleMapper;
import com.ruoyi.system.service.IOsgStaffScheduleService;

@Service
public class OsgStaffScheduleServiceImpl implements IOsgStaffScheduleService
{
    private static final List<String> SLOT_ORDER = Arrays.asList("morning", "afternoon", "evening");

    @Autowired
    private OsgStaffMapper staffMapper;

    @Autowired
    private OsgStaffScheduleMapper scheduleMapper;

    @Override
    public List<Map<String, Object>> selectScheduleList(String weekScope)
    {
        String normalizedWeekScope = normalizeWeekScope(weekScope);
        List<OsgStaff> staffRows = staffMapper.selectStaffList(new OsgStaff());
        List<OsgStaffSchedule> scheduleRows = scheduleMapper.selectStaffScheduleList(null, normalizedWeekScope);
        Map<Long, List<OsgStaffSchedule>> groupedSchedules = scheduleRows.stream()
            .collect(Collectors.groupingBy(OsgStaffSchedule::getStaffId, LinkedHashMap::new, Collectors.toList()));

        List<Map<String, Object>> result = new ArrayList<>(staffRows.size());
        for (OsgStaff staff : staffRows)
        {
            List<OsgStaffSchedule> staffSchedules = groupedSchedules.getOrDefault(staff.getStaffId(), Collections.emptyList());
            result.add(toScheduleRow(staff, normalizedWeekScope, staffSchedules));
        }
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> saveSchedule(Map<String, Object> payload, String operator, Long operatorId)
    {
        if (payload == null || payload.isEmpty())
        {
            throw new ServiceException("排期参数缺失");
        }

        Long staffId = asLong(payload.get("staffId"));
        if (staffId == null)
        {
            throw new ServiceException("导师不能为空");
        }

        OsgStaff staff = staffMapper.selectStaffByStaffId(staffId);
        if (staff == null)
        {
            throw new ServiceException("导师不存在");
        }

        String weekScope = normalizeWeekScope(asText(firstPresent(payload, "week", "weekScope")));
        String reason = asText(firstPresent(payload, "reason", "adjustReason"));
        if (isBlank(reason))
        {
            throw new ServiceException("调整原因不能为空");
        }

        BigDecimal availableHours = asBigDecimal(firstPresent(payload, "availableHours", "hours"));
        if (availableHours.signum() < 0)
        {
            throw new ServiceException("可用时长不能为负数");
        }

        int notifyStaff = asBoolean(firstPresent(payload, "notifyStaff", "notifyMentor"), true) ? 1 : 0;
        Set<String> selectedSlotKeys = extractSelectedSlots(payload.get("slots"), payload.get("selectedSlots"), payload.get("selectedSlotKeys"));

        scheduleMapper.deleteByStaffAndWeekScope(staffId, weekScope);
        int affectedRows = 0;
        for (int weekday = 1; weekday <= 7; weekday++)
        {
            for (String timeSlot : SLOT_ORDER)
            {
                OsgStaffSchedule schedule = new OsgStaffSchedule();
                schedule.setStaffId(staffId);
                schedule.setWeekScope(weekScope);
                schedule.setWeekday(weekday);
                schedule.setTimeSlot(timeSlot);
                schedule.setIsAvailable(selectedSlotKeys.contains(slotKey(weekday, timeSlot)) ? 1 : 0);
                schedule.setAvailableHours(availableHours);
                schedule.setAdjustReason(reason);
                schedule.setNotifyStaff(notifyStaff);
                schedule.setOperatorId(operatorId);
                schedule.setCreateBy(defaultText(operator, "system"));
                schedule.setUpdateBy(defaultText(operator, "system"));
                affectedRows += scheduleMapper.upsertSchedule(schedule);
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("staffId", staffId);
        result.put("staffName", staff.getStaffName());
        result.put("weekScope", weekScope);
        result.put("availableHours", availableHours);
        result.put("selectedSlotCount", selectedSlotKeys.size());
        result.put("notifyStaff", notifyStaff == 1);
        result.put("affectedRows", affectedRows);
        return result;
    }

    @Override
    public Map<String, Object> remindAll(String weekScope)
    {
        String normalizedWeekScope = normalizeWeekScope(weekScope);
        List<Map<String, Object>> rows = selectScheduleList(normalizedWeekScope);
        List<String> recipientEmails = new ArrayList<>();
        int pendingCount = 0;
        for (Map<String, Object> row : rows)
        {
            boolean filled = asBoolean(row.get("filled"), false);
            if (!filled)
            {
                pendingCount++;
                String email = asText(row.get("email"));
                if (!isBlank(email))
                {
                    recipientEmails.add(email);
                }
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("weekScope", normalizedWeekScope);
        result.put("pendingCount", pendingCount);
        result.put("recipientCount", recipientEmails.size());
        result.put("recipients", recipientEmails);
        return result;
    }

    private Map<String, Object> toScheduleRow(OsgStaff staff, String weekScope, List<OsgStaffSchedule> schedules)
    {
        List<Map<String, Object>> slots = new ArrayList<>();
        List<String> slotLabels = new ArrayList<>();
        Set<String> selectedSlotKeys = new LinkedHashSet<>();
        BigDecimal availableHours = BigDecimal.ZERO;
        for (OsgStaffSchedule schedule : schedules)
        {
            if (schedule.getAvailableHours() != null)
            {
                availableHours = schedule.getAvailableHours();
            }
            if (!isTruthy(schedule.getIsAvailable()))
            {
                continue;
            }
            Map<String, Object> slot = new LinkedHashMap<>();
            slot.put("weekday", schedule.getWeekday());
            slot.put("timeSlot", schedule.getTimeSlot());
            slots.add(slot);
            slotLabels.add(formatSlotLabel(schedule.getWeekday(), schedule.getTimeSlot()));
            selectedSlotKeys.add(slotKey(schedule.getWeekday(), schedule.getTimeSlot()));
        }

        boolean filled = !schedules.isEmpty();
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("staffId", staff.getStaffId());
        row.put("staffName", staff.getStaffName());
        row.put("email", staff.getEmail());
        row.put("staffType", staff.getStaffType());
        row.put("majorDirection", staff.getMajorDirection());
        row.put("weekScope", weekScope);
        row.put("filled", filled);
        row.put("availableHours", availableHours);
        row.put("availableSlots", slots);
        row.put("availableSlotLabels", slotLabels);
        row.put("selectedSlotKeys", new ArrayList<>(selectedSlotKeys));
        row.put("availableText", slotLabels.isEmpty() ? "-" : String.join(" / ", slotLabels));
        row.put("actionType", filled ? "adjust" : "fill");
        row.put("canRemind", !filled);
        row.put("reminder", filled ? "" : "未填写");
        return row;
    }

    private Set<String> extractSelectedSlots(Object slotsValue, Object selectedSlotsValue, Object selectedSlotKeysValue)
    {
        Set<String> selected = new LinkedHashSet<>();
        if (selectedSlotKeysValue instanceof Iterable<?> keyIterable)
        {
            for (Object value : keyIterable)
            {
                String key = asText(value);
                if (!isBlank(key))
                {
                    selected.add(key);
                }
            }
            return selected;
        }

        if (selectedSlotsValue instanceof Iterable<?> selectedSlots)
        {
            for (Object value : selectedSlots)
            {
                if (value instanceof Map<?, ?> slotMap)
                {
                    Integer weekday = asInteger(slotMap.get("weekday"), null);
                    String timeSlot = asText(slotMap.get("timeSlot"));
                    if (weekday != null && !isBlank(timeSlot))
                    {
                        selected.add(slotKey(weekday, timeSlot));
                    }
                }
                else
                {
                    String key = asText(value);
                    if (!isBlank(key))
                    {
                        selected.add(key);
                    }
                }
            }
            return selected;
        }

        if (!(slotsValue instanceof Iterable<?> slots))
        {
            return selected;
        }

        for (Object slotValue : slots)
        {
            if (!(slotValue instanceof Map<?, ?> slotMap))
            {
                continue;
            }
            Integer weekday = asInteger(slotMap.get("weekday"), null);
            String timeSlot = asText(slotMap.get("timeSlot"));
            boolean available = asBoolean(slotMap.get("available"), true);
            if (weekday != null && !isBlank(timeSlot) && available)
            {
                selected.add(slotKey(weekday, timeSlot));
            }
        }
        return selected;
    }

    private String normalizeWeekScope(String weekScope)
    {
        if ("next".equalsIgnoreCase(weekScope) || "next_week".equalsIgnoreCase(weekScope))
        {
            return "next";
        }
        return "current";
    }

    private String formatSlotLabel(Integer weekday, String timeSlot)
    {
        return "周" + weekdayToText(weekday) + ": " + timeSlotToText(timeSlot);
    }

    private String weekdayToText(Integer weekday)
    {
        return switch (weekday == null ? 0 : weekday)
        {
            case 1 -> "一";
            case 2 -> "二";
            case 3 -> "三";
            case 4 -> "四";
            case 5 -> "五";
            case 6 -> "六";
            case 7 -> "日";
            default -> "-";
        };
    }

    private String timeSlotToText(String timeSlot)
    {
        return switch (defaultText(timeSlot, ""))
        {
            case "morning" -> "上午";
            case "afternoon" -> "下午";
            case "evening" -> "晚上";
            default -> defaultText(timeSlot, "-");
        };
    }

    private String slotKey(Integer weekday, String timeSlot)
    {
        return weekday + "-" + timeSlot;
    }

    private Object firstPresent(Map<String, Object> payload, String primaryKey, String fallbackKey)
    {
        Object primary = payload.get(primaryKey);
        return primary != null ? primary : payload.get(fallbackKey);
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
                return Long.valueOf(text.trim());
            }
            catch (NumberFormatException ex)
            {
                return null;
            }
        }
        return null;
    }

    private Integer asInteger(Object value, Integer defaultValue)
    {
        if (value instanceof Number number)
        {
            return number.intValue();
        }
        if (value instanceof String text && !text.isBlank())
        {
            try
            {
                return Integer.valueOf(text.trim());
            }
            catch (NumberFormatException ex)
            {
                return defaultValue;
            }
        }
        return defaultValue;
    }

    private BigDecimal asBigDecimal(Object value)
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
            try
            {
                return new BigDecimal(text.trim());
            }
            catch (NumberFormatException ex)
            {
                return BigDecimal.ZERO;
            }
        }
        return BigDecimal.ZERO;
    }

    private boolean asBoolean(Object value, boolean defaultValue)
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
            String normalized = text.trim().toLowerCase();
            if ("true".equals(normalized) || "1".equals(normalized) || "yes".equals(normalized))
            {
                return true;
            }
            if ("false".equals(normalized) || "0".equals(normalized) || "no".equals(normalized))
            {
                return false;
            }
        }
        return defaultValue;
    }

    private boolean isTruthy(Integer value)
    {
        return value != null && value.intValue() == 1;
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

    private String defaultText(String value, String fallback)
    {
        return isBlank(value) ? fallback : value;
    }

    private boolean isBlank(String value)
    {
        return value == null || value.trim().isEmpty();
    }
}
