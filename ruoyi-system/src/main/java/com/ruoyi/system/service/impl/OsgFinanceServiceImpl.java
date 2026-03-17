package com.ruoyi.system.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgClassRecord;
import com.ruoyi.system.domain.OsgFinanceSettlement;
import com.ruoyi.system.domain.OsgStaff;
import com.ruoyi.system.mapper.OsgClassRecordMapper;
import com.ruoyi.system.mapper.OsgFinanceSettlementMapper;
import com.ruoyi.system.mapper.OsgStaffMapper;
import com.ruoyi.system.service.IOsgFinanceService;

@Service
public class OsgFinanceServiceImpl implements IOsgFinanceService
{
    private static final String STATUS_APPROVED = "approved";
    private static final String PAYMENT_UNPAID = "unpaid";
    private static final String PAYMENT_PAID = "paid";

    @Autowired
    private OsgClassRecordMapper classRecordMapper;

    @Autowired
    private OsgFinanceSettlementMapper financeSettlementMapper;

    @Autowired
    private OsgStaffMapper staffMapper;

    @Override
    public List<Map<String, Object>> selectFinanceSettlementList(String keyword, String source, String tab, String startDate, String endDate)
    {
        List<SettlementRow> rows = selectRows(keyword, source, tab, startDate, endDate);
        if (rows.isEmpty())
        {
            return Collections.emptyList();
        }

        List<Map<String, Object>> payloads = new ArrayList<>(rows.size());
        for (SettlementRow row : rows)
        {
            payloads.add(toPayload(row));
        }
        return payloads;
    }

    @Override
    public Map<String, Object> selectFinanceSettlementStats(String keyword, String source, String startDate, String endDate)
    {
        List<SettlementRow> rows = selectRows(keyword, source, "all", startDate, endDate);
        BigDecimal unpaidAmount = rows.stream()
            .filter(row -> Objects.equals(row.settlement().getPaymentStatus(), PAYMENT_UNPAID))
            .map(row -> normalizeAmount(row.settlement().getDueAmount()))
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(1, RoundingMode.HALF_UP);

        LocalDate today = LocalDate.now();
        BigDecimal monthPaidAmount = rows.stream()
            .filter(row -> Objects.equals(row.settlement().getPaymentStatus(), PAYMENT_PAID))
            .filter(row -> {
                LocalDate paymentDate = toLocalDate(row.settlement().getPaymentDate());
                return paymentDate != null
                    && paymentDate.getYear() == today.getYear()
                    && paymentDate.getMonthValue() == today.getMonthValue();
            })
            .map(row -> normalizeAmount(row.settlement().getPaidAmount()))
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(1, RoundingMode.HALF_UP);

        LocalDate weekStart = today.with(DayOfWeek.MONDAY);
        LocalDate weekEnd = today.with(DayOfWeek.SUNDAY);
        long weekClassCount = rows.stream()
            .map(row -> toLocalDate(row.record().getClassDate()))
            .filter(Objects::nonNull)
            .filter(date -> !date.isBefore(weekStart) && !date.isAfter(weekEnd))
            .count();

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("unpaidAmount", unpaidAmount.toPlainString());
        stats.put("monthPaidAmount", monthPaidAmount.toPlainString());
        stats.put("weekClassCount", weekClassCount);
        stats.put("flowSteps", List.of("审核通过", "未支付", "已支付"));
        return stats;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> markPaid(Long settlementId, Map<String, Object> payload, String operator)
    {
        OsgFinanceSettlement settlement = requireSettlement(settlementId);
        if (Objects.equals(normalize(settlement.getPaymentStatus()), PAYMENT_PAID))
        {
            throw new ServiceException("该结算记录已支付，不能重复操作");
        }

        Date paymentDate = requirePaymentDate(payload);
        settlement.setPaymentStatus(PAYMENT_PAID);
        settlement.setPaymentDate(paymentDate);
        settlement.setBankReferenceNo(firstText(payload == null ? null : payload.get("bankReferenceNo")));
        settlement.setPaymentRemark(firstText(payload == null ? null : payload.get("remark")));
        settlement.setPaidAmount(normalizeAmount(settlement.getDueAmount()));
        settlement.setUpdateBy(defaultText(operator, "system"));

        if (financeSettlementMapper.updateFinanceSettlement(settlement) <= 0)
        {
            throw new ServiceException("结算状态更新失败");
        }

        SettlementRow row = buildSettlementRow(requireRecord(settlement.getRecordId()), settlement);
        return toPayload(row);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> batchPay(Map<String, Object> payload, String operator)
    {
        List<Long> settlementIds = toLongList(payload == null ? null : payload.get("settlementIds"));
        if (settlementIds.isEmpty())
        {
            throw new ServiceException("settlementIds不能为空");
        }

        BigDecimal totalAmount = BigDecimal.ZERO;
        int reviewedCount = 0;
        for (Long settlementId : settlementIds)
        {
            Map<String, Object> result = markPaid(settlementId, payload, operator);
            totalAmount = totalAmount.add(new BigDecimal(String.valueOf(result.get("courseFee"))));
            reviewedCount++;
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("status", PAYMENT_PAID);
        summary.put("reviewedCount", reviewedCount);
        summary.put("totalAmount", totalAmount.setScale(1, RoundingMode.HALF_UP).toPlainString());
        summary.put("paymentDate", payload == null ? null : payload.get("paymentDate"));
        return summary;
    }

    private List<SettlementRow> selectRows(String keyword, String source, String tab, String startDate, String endDate)
    {
        ensureSettlementRows();

        OsgClassRecord query = new OsgClassRecord();
        query.setStatus(STATUS_APPROVED);
        List<OsgClassRecord> records = classRecordMapper.selectClassRecordList(query);
        if (records == null || records.isEmpty())
        {
            return Collections.emptyList();
        }

        LocalDate start = parseDate(startDate);
        LocalDate end = parseDate(endDate);
        String normalizedTab = normalizeTab(tab);
        String normalizedKeyword = normalize(keyword);
        String normalizedSource = normalizeSource(source);

        List<SettlementRow> rows = new ArrayList<>();
        for (OsgClassRecord record : records)
        {
            OsgFinanceSettlement settlement = financeSettlementMapper.selectFinanceSettlementByRecordId(record.getRecordId());
            if (settlement == null)
            {
                continue;
            }
            SettlementRow row = buildSettlementRow(record, settlement);
            if (!matchesKeyword(row, normalizedKeyword))
            {
                continue;
            }
            if (!matchesSource(row, normalizedSource))
            {
                continue;
            }
            if (!matchesTab(row, normalizedTab))
            {
                continue;
            }
            if (!matchesDateRange(row, start, end))
            {
                continue;
            }
            rows.add(row);
        }

        rows.sort((left, right) -> {
            LocalDate leftDate = toLocalDate(left.record().getClassDate());
            LocalDate rightDate = toLocalDate(right.record().getClassDate());
            if (leftDate == null && rightDate == null)
            {
                return 0;
            }
            if (leftDate == null)
            {
                return 1;
            }
            if (rightDate == null)
            {
                return -1;
            }
            return rightDate.compareTo(leftDate);
        });
        return rows;
    }

    private void ensureSettlementRows()
    {
        OsgClassRecord query = new OsgClassRecord();
        query.setStatus(STATUS_APPROVED);
        List<OsgClassRecord> approvedRecords = classRecordMapper.selectClassRecordList(query);
        if (approvedRecords == null || approvedRecords.isEmpty())
        {
            return;
        }

        for (OsgClassRecord record : approvedRecords)
        {
            if (financeSettlementMapper.selectFinanceSettlementByRecordId(record.getRecordId()) != null)
            {
                continue;
            }
            OsgFinanceSettlement settlement = new OsgFinanceSettlement();
            settlement.setRecordId(record.getRecordId());
            settlement.setPaymentStatus(PAYMENT_UNPAID);
            settlement.setDueAmount(resolveCourseFee(record));
            settlement.setPaidAmount(BigDecimal.ZERO.setScale(1, RoundingMode.HALF_UP));
            settlement.setCreateBy("system");
            settlement.setUpdateBy("system");
            financeSettlementMapper.insertFinanceSettlement(settlement);
        }
    }

    private SettlementRow buildSettlementRow(OsgClassRecord record, OsgFinanceSettlement settlement)
    {
        return new SettlementRow(record, settlement, resolveCourseFee(record));
    }

    private Map<String, Object> toPayload(SettlementRow row)
    {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("settlementId", row.settlement().getSettlementId());
        payload.put("recordId", row.record().getRecordId());
        payload.put("recordCode", row.record().getClassId());
        payload.put("mentorId", row.record().getMentorId());
        payload.put("mentorName", row.record().getMentorName());
        payload.put("studentId", row.record().getStudentId());
        payload.put("studentName", row.record().getStudentName());
        payload.put("courseType", row.record().getCourseType());
        payload.put("courseTypeLabel", toCourseTypeLabel(row.record().getCourseType()));
        payload.put("source", normalizeSource(row.record().getCourseSource()));
        payload.put("sourceLabel", toSourceLabel(row.record().getCourseSource()));
        payload.put("classDate", row.record().getClassDate());
        payload.put("durationHours", row.record().getDurationHours());
        payload.put("courseFee", row.courseFee().setScale(1, RoundingMode.HALF_UP).toPlainString());
        payload.put("paymentStatus", normalize(row.settlement().getPaymentStatus()));
        payload.put("paymentStatusLabel", Objects.equals(normalize(row.settlement().getPaymentStatus()), PAYMENT_PAID) ? "已支付" : "未支付");
        payload.put("paymentDate", toDateString(row.settlement().getPaymentDate()));
        payload.put("bankReferenceNo", row.settlement().getBankReferenceNo());
        payload.put("remark", row.settlement().getPaymentRemark());
        return payload;
    }

    private boolean matchesKeyword(SettlementRow row, String keyword)
    {
        if (keyword == null || keyword.isBlank())
        {
            return true;
        }
        return defaultText(row.record().getMentorName(), "").contains(keyword)
            || defaultText(row.record().getStudentName(), "").contains(keyword);
    }

    private boolean matchesSource(SettlementRow row, String source)
    {
        if (source == null || source.isBlank() || "all".equals(source))
        {
            return true;
        }
        return Objects.equals(source, normalizeSource(row.record().getCourseSource()));
    }

    private boolean matchesTab(SettlementRow row, String tab)
    {
        if (tab == null || tab.isBlank() || "all".equals(tab))
        {
            return true;
        }
        return Objects.equals(tab, normalize(row.settlement().getPaymentStatus()));
    }

    private boolean matchesDateRange(SettlementRow row, LocalDate start, LocalDate end)
    {
        if (start == null && end == null)
        {
            return true;
        }
        LocalDate classDate = toLocalDate(row.record().getClassDate());
        if (classDate == null)
        {
            return false;
        }
        if (start != null && classDate.isBefore(start))
        {
            return false;
        }
        if (end != null && classDate.isAfter(end))
        {
            return false;
        }
        return true;
    }

    private OsgFinanceSettlement requireSettlement(Long settlementId)
    {
        if (settlementId == null)
        {
            throw new ServiceException("settlementId不能为空");
        }
        OsgFinanceSettlement settlement = financeSettlementMapper.selectFinanceSettlementBySettlementId(settlementId);
        if (settlement == null)
        {
            throw new ServiceException("结算记录不存在");
        }
        return settlement;
    }

    private OsgClassRecord requireRecord(Long recordId)
    {
        OsgClassRecord record = classRecordMapper.selectClassRecordByRecordId(recordId);
        if (record == null)
        {
            throw new ServiceException("课时记录不存在");
        }
        return record;
    }

    private Date requirePaymentDate(Map<String, Object> payload)
    {
        LocalDate localDate = parseDate(firstText(payload == null ? null : payload.get("paymentDate")));
        if (localDate == null)
        {
            throw new ServiceException("paymentDate不能为空");
        }
        return Date.valueOf(localDate);
    }

    private BigDecimal resolveCourseFee(OsgClassRecord record)
    {
        OsgStaff staff = record.getMentorId() == null ? null : staffMapper.selectStaffByStaffId(record.getMentorId());
        BigDecimal hourlyRate = staff == null || staff.getHourlyRate() == null
            ? BigDecimal.ZERO
            : staff.getHourlyRate();
        BigDecimal duration = record.getDurationHours() == null
            ? BigDecimal.ZERO
            : BigDecimal.valueOf(record.getDurationHours());
        return hourlyRate.multiply(duration).setScale(1, RoundingMode.HALF_UP);
    }

    private String toCourseTypeLabel(String courseType)
    {
        return switch (normalize(courseType)) {
            case "mock_interview" -> "模拟面试";
            case "midterm_exam", "mock_midterm" -> "模拟期中考试";
            case "networking_midterm", "communication_midterm" -> "人际关系期中";
            case "written_test" -> "笔试辅导";
            default -> "岗位辅导";
        };
    }

    private String toSourceLabel(String source)
    {
        return switch (normalizeSource(source)) {
            case "clerk" -> "班主任端";
            case "assistant" -> "助教端";
            default -> "导师端";
        };
    }

    private String normalizeTab(String tab)
    {
        String normalized = normalize(tab);
        if (normalized == null || normalized.isBlank())
        {
            return "all";
        }
        return switch (normalized) {
            case PAYMENT_UNPAID, PAYMENT_PAID -> normalized;
            default -> "all";
        };
    }

    private String normalizeSource(String source)
    {
        String normalized = normalize(source);
        if (normalized == null || normalized.isBlank())
        {
            return "all";
        }
        return switch (normalized) {
            case "mentor", "mentor_report" -> "mentor";
            case "clerk", "class_teacher" -> "clerk";
            case "assistant" -> "assistant";
            default -> normalized;
        };
    }

    private BigDecimal normalizeAmount(BigDecimal amount)
    {
        if (amount == null)
        {
            return BigDecimal.ZERO.setScale(1, RoundingMode.HALF_UP);
        }
        return amount.setScale(1, RoundingMode.HALF_UP);
    }

    private String normalize(String value)
    {
        return value == null ? null : value.trim().toLowerCase();
    }

    private String defaultText(String value, String fallback)
    {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String firstText(Object value)
    {
        return value == null ? null : String.valueOf(value).trim();
    }

    private LocalDate parseDate(String value)
    {
        if (value == null || value.isBlank())
        {
            return null;
        }
        return LocalDate.parse(value);
    }

    private LocalDate toLocalDate(java.util.Date value)
    {
        if (value == null)
        {
            return null;
        }
        if (value instanceof java.sql.Date sqlDate)
        {
            return sqlDate.toLocalDate();
        }
        return value.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
    }

    private String toDateString(java.util.Date value)
    {
        LocalDate date = toLocalDate(value);
        return date == null ? null : date.toString();
    }

    private List<Long> toLongList(Object value)
    {
        if (!(value instanceof List<?> rawList))
        {
            return Collections.emptyList();
        }
        List<Long> ids = new ArrayList<>(rawList.size());
        for (Object item : rawList)
        {
            if (item == null)
            {
                continue;
            }
            ids.add(Long.valueOf(String.valueOf(item)));
        }
        return ids;
    }

    private record SettlementRow(OsgClassRecord record, OsgFinanceSettlement settlement, BigDecimal courseFee)
    {
    }
}
