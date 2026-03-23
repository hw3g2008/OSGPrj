package com.ruoyi.system.service.impl;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.domain.OsgStaff;
import com.ruoyi.system.domain.OsgStaffSchedule;
import com.ruoyi.system.mapper.OsgStaffMapper;
import com.ruoyi.system.mapper.OsgStaffScheduleMapper;

@Service
public class OsgLeadMentorScheduleService
{
    private static final List<String> SLOT_ORDER = Arrays.asList("morning", "afternoon", "evening");
    private static final Map<String, String> SLOT_LABELS = Map.of(
        "morning", "上午 9-12",
        "afternoon", "下午 14-18",
        "evening", "晚上 19-22"
    );
    private static final List<String> WEEKDAY_LABELS = Arrays.asList("周一", "周二", "周三", "周四", "周五", "周六", "周日");
    private static final DateTimeFormatter MONTH_DAY_FORMATTER = DateTimeFormatter.ofPattern("MM/dd");
    private static final String DEFAULT_REASON = "班主任自主更新排期";

    @Autowired
    private OsgStaffMapper staffMapper;

    @Autowired
    private OsgStaffScheduleMapper staffScheduleMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    public Map<String, Object> selectScheduleView(SysUser user, String weekScope)
    {
        StaffContext context = resolveContext(user);
        return buildScheduleView(context, normalizeWeekScope(weekScope));
    }

    public Map<String, Object> selectStatusView(SysUser user)
    {
        StaffContext context = resolveContext(user);
        Map<String, Object> currentWeek = buildScheduleView(context, "current");
        Map<String, Object> nextWeek = buildScheduleView(context, "next");

        boolean nextWeekFilled = asBoolean(nextWeek.get("filled"));
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("staffId", context.staffId());
        payload.put("forceScheduleModal", !nextWeekFilled);
        payload.put("nextWeekFilled", nextWeekFilled);
        payload.put("scheduleStatus", nextWeekFilled ? "已提交" : "待填写");
        payload.put("currentWeek", currentWeek);
        payload.put("nextWeek", nextWeek);
        payload.put("bannerTitle", "请在周日前更新下周排期");
        payload.put("bannerDetail", nextWeekFilled
            ? "排期已按真实状态同步，可继续更新"
            : "未填写排期将无法被安排课程，系统将发送邮件提醒");
        return payload;
    }

    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> saveNextSchedule(SysUser user, String operator, Map<String, Object> body)
    {
        Map<String, Object> payload = body == null ? Collections.emptyMap() : body;
        StaffContext context = resolveContext(user);
        rejectCrossStaffPayload(payload, context.staffId());
        rejectInvalidWeekScope(payload);

        BigDecimal availableHours = resolveAvailableHours(payload);
        Set<String> selectedSlotKeys = resolveSelectedSlotKeys(payload);
        String note = normalizeNote(payload.get("note"));
        String reason = StringUtils.defaultIfBlank(note, DEFAULT_REASON);

        List<OsgStaffSchedule> nextWeekSchedules = new ArrayList<>(SLOT_ORDER.size() * 7);
        for (int weekday = 1; weekday <= 7; weekday++)
        {
            for (String timeSlot : SLOT_ORDER)
            {
                OsgStaffSchedule schedule = new OsgStaffSchedule();
                schedule.setStaffId(context.staffId());
                schedule.setWeekScope("next");
                schedule.setWeekday(weekday);
                schedule.setTimeSlot(timeSlot);
                schedule.setIsAvailable(selectedSlotKeys.contains(slotKey(weekday, timeSlot)) ? 1 : 0);
                schedule.setAvailableHours(availableHours);
                schedule.setAdjustReason(reason);
                schedule.setRemark(note);
                schedule.setNotifyStaff(0);
                schedule.setOperatorId(context.user().getUserId());
                schedule.setCreateBy(StringUtils.defaultIfBlank(operator, context.user().getUserName()));
                schedule.setUpdateBy(StringUtils.defaultIfBlank(operator, context.user().getUserName()));
                nextWeekSchedules.add(schedule);
            }
        }

        staffScheduleMapper.batchUpsertSchedules(nextWeekSchedules);

        Map<String, Object> refreshed = buildScheduleView(context, "next");
        refreshed.put("selectedSlotCount", selectedSlotKeys.size());
        refreshed.put("affectedRows", nextWeekSchedules.size());
        return refreshed;
    }

    private Map<String, Object> buildScheduleView(StaffContext context, String weekScope)
    {
        List<OsgStaffSchedule> rows = staffScheduleMapper.selectStaffScheduleList(context.staffId(), weekScope);
        List<String> selectedSlotKeys = new ArrayList<>();
        Map<Integer, List<String>> daySelections = new LinkedHashMap<>();
        Map<Integer, List<String>> daySlotLabels = new LinkedHashMap<>();
        BigDecimal availableHours = BigDecimal.ZERO;
        String note = "";

        for (int weekday = 1; weekday <= 7; weekday++)
        {
            daySelections.put(weekday, new ArrayList<>());
            daySlotLabels.put(weekday, new ArrayList<>());
        }

        for (OsgStaffSchedule row : rows)
        {
            if (row.getAvailableHours() != null)
            {
                availableHours = row.getAvailableHours();
            }
            if (StringUtils.isBlank(note))
            {
                note = normalizeStoredNote(row);
            }
            if (!isTruthy(row.getIsAvailable()))
            {
                continue;
            }

            String selectedKey = slotKey(row.getWeekday(), row.getTimeSlot());
            selectedSlotKeys.add(selectedKey);
            daySelections.get(row.getWeekday()).add(row.getTimeSlot());
            daySlotLabels.get(row.getWeekday()).add(slotLabel(row.getTimeSlot()));
        }

        List<Map<String, Object>> days = buildDayPayloads(weekScope, daySelections, daySlotLabels);
        boolean filled = !rows.isEmpty();

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("staffId", context.staffId());
        payload.put("staffName", context.staff().getStaffName());
        payload.put("weekScope", weekScope);
        payload.put("readonly", "current".equals(weekScope));
        payload.put("filled", filled);
        payload.put("availableHours", availableHours);
        payload.put("availableDayCount", countFilledDays(daySelections));
        payload.put("selectedSlotKeys", selectedSlotKeys);
        payload.put("note", note);
        payload.put("weekRange", buildWeekRange(weekScope));
        payload.put("days", days);
        return payload;
    }

    private List<Map<String, Object>> buildDayPayloads(String weekScope,
                                                       Map<Integer, List<String>> daySelections,
                                                       Map<Integer, List<String>> daySlotLabels)
    {
        LocalDate monday = resolveWeekMonday(weekScope);
        List<Map<String, Object>> days = new ArrayList<>(7);
        for (int weekday = 1; weekday <= 7; weekday++)
        {
            LocalDate date = monday.plusDays(weekday - 1L);
            Map<String, Object> day = new LinkedHashMap<>();
            day.put("weekday", weekday);
            day.put("label", WEEKDAY_LABELS.get(weekday - 1));
            day.put("date", date.format(MONTH_DAY_FORMATTER));
            day.put("selectedSlots", new ArrayList<>(daySelections.get(weekday)));
            day.put("selectedSlotLabels", new ArrayList<>(daySlotLabels.get(weekday)));
            days.add(day);
        }
        return days;
    }

    private int countFilledDays(Map<Integer, List<String>> daySelections)
    {
        int count = 0;
        for (List<String> selections : daySelections.values())
        {
            if (!selections.isEmpty())
            {
                count++;
            }
        }
        return count;
    }

    private String buildWeekRange(String weekScope)
    {
        LocalDate monday = resolveWeekMonday(weekScope);
        LocalDate sunday = monday.plusDays(6);
        return monday.format(MONTH_DAY_FORMATTER) + " - " + sunday.format(MONTH_DAY_FORMATTER);
    }

    private LocalDate resolveWeekMonday(String weekScope)
    {
        LocalDate today = LocalDate.now();
        int delta = today.getDayOfWeek().getValue() - DayOfWeek.MONDAY.getValue();
        LocalDate monday = today.minusDays(delta);
        return "next".equals(weekScope) ? monday.plusWeeks(1) : monday;
    }

    private StaffContext resolveContext(SysUser user)
    {
        if (user == null)
        {
            throw new ServiceException("班主任排期不存在");
        }

        String email = StringUtils.trimToNull(user.getEmail());
        if (email == null)
        {
            throw new ServiceException("班主任排期不存在");
        }

        Long staffId;
        try
        {
            staffId = jdbcTemplate.queryForObject(
                """
                    select staff_id
                    from osg_staff
                    where email = ?
                      and staff_type = 'lead_mentor'
                      and (account_status is null or account_status <> 'frozen')
                    order by staff_id asc
                    limit 1
                    """,
                Long.class,
                email
            );
        }
        catch (EmptyResultDataAccessException ex)
        {
            staffId = null;
        }

        if (staffId == null)
        {
            throw new ServiceException("班主任排期不存在");
        }

        OsgStaff staff = staffMapper.selectStaffByStaffId(staffId);
        if (staff == null)
        {
            throw new ServiceException("班主任排期不存在");
        }

        return new StaffContext(staffId, staff, user);
    }

    private void rejectCrossStaffPayload(Map<String, Object> body, Long ownStaffId)
    {
        Long requestedStaffId = asLong(body.get("staffId"));
        if (requestedStaffId != null && !Objects.equals(requestedStaffId, ownStaffId))
        {
            throw new ServiceException("仅允许提交本人下周排期");
        }
    }

    private void rejectInvalidWeekScope(Map<String, Object> body)
    {
        String requestedWeekScope = StringUtils.trimToNull(asText(firstPresent(body, "weekScope", "week")));
        if (requestedWeekScope != null && !"next".equalsIgnoreCase(requestedWeekScope))
        {
            throw new ServiceException("仅允许提交下周排期");
        }
    }

    private BigDecimal resolveAvailableHours(Map<String, Object> body)
    {
        BigDecimal availableHours = asBigDecimal(firstPresent(body, "availableHours", "hours"));
        if (availableHours == null || availableHours.compareTo(BigDecimal.ZERO) <= 0)
        {
            throw new ServiceException("下周可上课时长必须大于0");
        }
        return availableHours;
    }

    private Set<String> resolveSelectedSlotKeys(Map<String, Object> body)
    {
        Set<String> selectedSlotKeys = new LinkedHashSet<>();
        Object payload = firstPresent(body, "selectedSlotKeys", "selectedSlots");
        if (payload instanceof Iterable<?> iterable)
        {
            for (Object item : iterable)
            {
                String key = StringUtils.trimToNull(asText(item));
                if (key != null)
                {
                    validateSlotKey(key);
                    selectedSlotKeys.add(key);
                }
            }
        }

        if (selectedSlotKeys.isEmpty())
        {
            throw new ServiceException("请至少选择一个可用时段");
        }
        return selectedSlotKeys;
    }

    private void validateSlotKey(String slotKey)
    {
        String[] parts = slotKey.split("-", 2);
        if (parts.length != 2)
        {
            throw new ServiceException("排期时段不合法");
        }
        try
        {
            int weekday = Integer.parseInt(parts[0]);
            if (weekday < 1 || weekday > 7 || !SLOT_ORDER.contains(parts[1]))
            {
                throw new ServiceException("排期时段不合法");
            }
        }
        catch (NumberFormatException ex)
        {
            throw new ServiceException("排期时段不合法");
        }
    }

    private String normalizeStoredNote(OsgStaffSchedule row)
    {
        String note = StringUtils.trimToEmpty(row.getRemark());
        if (StringUtils.isNotBlank(note))
        {
            return note;
        }

        String reason = StringUtils.trimToEmpty(row.getAdjustReason());
        return DEFAULT_REASON.equals(reason) ? "" : reason;
    }

    private String normalizeNote(Object value)
    {
        String note = StringUtils.trimToNull(asText(value));
        return note == null ? "" : note;
    }

    private Object firstPresent(Map<String, Object> payload, String primaryKey, String fallbackKey)
    {
        Object primary = payload.get(primaryKey);
        return primary != null ? primary : payload.get(fallbackKey);
    }

    private String normalizeWeekScope(String weekScope)
    {
        return "next".equalsIgnoreCase(weekScope) ? "next" : "current";
    }

    private String slotKey(Integer weekday, String timeSlot)
    {
        return weekday + "-" + timeSlot;
    }

    private String slotLabel(String timeSlot)
    {
        return SLOT_LABELS.getOrDefault(timeSlot, timeSlot);
    }

    private boolean isTruthy(Integer value)
    {
        return value != null && value != 0;
    }

    private String asText(Object value)
    {
        if (value == null)
        {
            return null;
        }
        return String.valueOf(value);
    }

    private Long asLong(Object value)
    {
        if (value instanceof Number number)
        {
            return number.longValue();
        }
        if (value instanceof String text && StringUtils.isNotBlank(text))
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
        if (value instanceof String text && StringUtils.isNotBlank(text))
        {
            try
            {
                return new BigDecimal(text.trim());
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

    private record StaffContext(Long staffId, OsgStaff staff, SysUser user)
    {
    }
}
