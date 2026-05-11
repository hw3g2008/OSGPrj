package com.ruoyi.system.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgContract;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.OsgContractMapper;
import com.ruoyi.system.mapper.OsgStudentMapper;
import com.ruoyi.system.service.IOsgContractService;

@Service
public class OsgContractServiceImpl implements IOsgContractService
{
    @Autowired
    private OsgContractMapper contractMapper;

    @Autowired
    private OsgStudentMapper studentMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public List<OsgContract> selectContractList(OsgContract contract)
    {
        List<OsgContract> rows = contractMapper.selectContractList(defaultQuery(contract));
        applyDerivedUsageMetrics(rows);
        return rows;
    }

    @Override
    public Map<String, Object> selectContractStats(OsgContract contract)
    {
        List<OsgContract> rows = selectContractList(contract);
        Map<String, Object> normalized = new LinkedHashMap<>();
        BigDecimal totalAmount = BigDecimal.ZERO;
        int totalHours = 0;
        BigDecimal usedHours = BigDecimal.ZERO;
        BigDecimal remainingHours = BigDecimal.ZERO;
        int activeContracts = 0;
        int expiringContracts = 0;
        int endedContracts = 0;

        for (OsgContract row : rows)
        {
            totalAmount = totalAmount.add(defaultAmount(row.getContractAmount()));
            totalHours += defaultHours(row.getTotalHours(), null);
            usedHours = usedHours.add(defaultHoursDecimal(row.getUsedHours()));
            remainingHours = remainingHours.add(defaultHoursDecimal(row.getRemainingHours()));

            String resolvedStatus = resolveStatsStatus(row);
            if ("expiring".equals(resolvedStatus))
            {
                expiringContracts++;
            }
            else if ("active".equals(resolvedStatus))
            {
                activeContracts++;
            }
            else
            {
                endedContracts++;
            }
        }

        normalized.put("totalContracts", rows.size());
        normalized.put("activeContracts", activeContracts);
        normalized.put("expiringContracts", expiringContracts);
        normalized.put("endedContracts", endedContracts);
        normalized.put("totalAmount", totalAmount);
        normalized.put("totalHours", totalHours);
        normalized.put("usedHours", usedHours);
        normalized.put("remainingHours", remainingHours);
        return normalized;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> renewContract(Map<String, Object> payload, String operator)
    {
        if (payload == null || payload.isEmpty())
        {
            throw new ServiceException("续签参数缺失");
        }

        Long studentId = asLong(payload.get("studentId"));
        if (studentId == null)
        {
            throw new ServiceException("学员不能为空");
        }
        OsgStudent student = studentMapper.selectStudentByStudentId(studentId);
        if (student == null)
        {
            throw new ServiceException("学员不存在");
        }

        String renewalReason = asText(payload.get("renewalReason"));
        if (isBlank(renewalReason))
        {
            throw new ServiceException("续签原因不能为空");
        }

        LocalDate startDate = asDate(payload.get("startDate"));
        LocalDate endDate = asDate(payload.get("endDate"));
        if (startDate == null || endDate == null)
        {
            throw new ServiceException("合同起止日期不能为空");
        }
        if (endDate.isBefore(startDate))
        {
            throw new ServiceException("合同结束日期不能早于开始日期");
        }

        OsgContract contract = new OsgContract();
        contract.setStudentId(studentId);
        contract.setContractNo(generateContractNo(studentId));
        contract.setContractType("renew");
        contract.setCurrency(defaultText(asText(payload.get("currency")), "USD"));
        contract.setAmountUsd(asBigDecimalOrNull(payload.get("amountUsd")));
        contract.setAmountGbp(asBigDecimalOrNull(payload.get("amountGbp")));
        contract.setContractAmount(defaultAmount(payload.get("contractAmount")));
        contract.setTotalHours(defaultHours(payload.get("totalHours"), payload.get("studyHours")));
        contract.setUsedHours(BigDecimal.ZERO);
        contract.setRemainingHours(BigDecimal.valueOf(contract.getTotalHours()));
        contract.setStartDate(Date.valueOf(startDate));
        contract.setEndDate(Date.valueOf(endDate));
        contract.setRenewalReason(resolveRenewalReason(renewalReason, asText(payload.get("otherReason"))));
        contract.setContractStatus(resolveContractStatus(endDate, contract.getTotalHours()));
        contract.setAttachmentPath(asText(payload.get("attachmentPath")));
        contract.setRemark(asText(payload.get("remark")));
        contract.setCreateBy(defaultText(operator, "system"));
        contract.setUpdateBy(defaultText(operator, "system"));

        if (contractMapper.insertContract(contract) <= 0 || contract.getContractId() == null)
        {
            throw new ServiceException("续签合同创建失败");
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("contractId", contract.getContractId());
        result.put("contractNo", contract.getContractNo());
        result.put("studentId", studentId);
        result.put("studentName", student.getStudentName());
        result.put("contractType", contract.getContractType());
        result.put("contractStatus", contract.getContractStatus());
        result.put("renewalReason", contract.getRenewalReason());
        result.put("attachmentPath", contract.getAttachmentPath());
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> updateContractAttachment(Long contractId, String attachmentPath, String operator)
    {
        if (contractId == null)
        {
            throw new ServiceException("合同不能为空");
        }
        if (isBlank(attachmentPath))
        {
            throw new ServiceException("附件路径不能为空");
        }

        OsgContract contract = new OsgContract();
        contract.setContractId(contractId);
        contract.setAttachmentPath(attachmentPath);
        contract.setUpdateBy(defaultText(operator, "system"));
        if (contractMapper.updateContractAttachment(contract) <= 0)
        {
            throw new ServiceException("合同附件更新失败");
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("contractId", contractId);
        result.put("attachmentPath", attachmentPath);
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> updateContract(Long contractId, Map<String, Object> payload, String operator)
    {
        if (contractId == null)
        {
            throw new ServiceException("合同不能为空");
        }
        if (payload == null || payload.isEmpty())
        {
            throw new ServiceException("更新参数缺失");
        }

        OsgContract existing = contractMapper.selectContractById(contractId);
        if (existing == null)
        {
            throw new ServiceException("合同不存在");
        }
        String existingStatus = asText(existing.getContractStatus());
        if (!"active".equalsIgnoreCase(existingStatus) && !"normal".equalsIgnoreCase(existingStatus))
        {
            throw new ServiceException("仅当生效中（active）的合同允许编辑，请通过续签创建新合同");
        }

        OsgContract patch = new OsgContract();
        patch.setContractId(contractId);

        // 起止日期：允许只改其中一个，但联合校验后以"现行 + 修改"组合判定
        LocalDate startDate = payload.containsKey("startDate") ? asDate(payload.get("startDate")) : asDate(existing.getStartDate());
        LocalDate endDate = payload.containsKey("endDate") ? asDate(payload.get("endDate")) : asDate(existing.getEndDate());
        if (payload.containsKey("startDate") && startDate == null)
        {
            throw new ServiceException("合同开始日期不能为空");
        }
        if (payload.containsKey("endDate") && endDate == null)
        {
            throw new ServiceException("合同结束日期不能为空");
        }
        if (startDate != null && endDate != null && endDate.isBefore(startDate))
        {
            throw new ServiceException("合同结束日期不能早于开始日期");
        }
        if (payload.containsKey("startDate"))
        {
            patch.setStartDate(Date.valueOf(startDate));
        }
        if (payload.containsKey("endDate"))
        {
            patch.setEndDate(Date.valueOf(endDate));
        }

        // 币种 + 金额：要么只传 contractAmount（保留 currency/amountUsd/amountGbp 旧值）；
        // 要么传 currency + amountUsd/amountGbp（contractAmount 自动按 currency 取对应值）
        if (payload.containsKey("currency"))
        {
            String currency = asText(payload.get("currency"));
            if (isBlank(currency))
            {
                throw new ServiceException("币种不能为空");
            }
            patch.setCurrency(currency);
        }
        if (payload.containsKey("amountUsd"))
        {
            patch.setAmountUsd(asBigDecimalOrNull(payload.get("amountUsd")));
        }
        if (payload.containsKey("amountGbp"))
        {
            patch.setAmountGbp(asBigDecimalOrNull(payload.get("amountGbp")));
        }
        if (payload.containsKey("contractAmount"))
        {
            patch.setContractAmount(defaultAmount(payload.get("contractAmount")));
        }

        if (payload.containsKey("totalHours"))
        {
            Integer hours = defaultHours(payload.get("totalHours"), null);
            if (hours == null || hours <= 0)
            {
                throw new ServiceException("总课时必须大于 0");
            }
            patch.setTotalHours(hours);
        }

        if (payload.containsKey("attachmentPath"))
        {
            patch.setAttachmentPath(asText(payload.get("attachmentPath")));
        }
        if (payload.containsKey("remark"))
        {
            patch.setRemark(asText(payload.get("remark")));
        }
        if (payload.containsKey("contractStatus"))
        {
            String nextStatus = asText(payload.get("contractStatus"));
            if (isBlank(nextStatus))
            {
                throw new ServiceException("合同状态不能为空");
            }
            patch.setContractStatus(nextStatus);
        }

        patch.setUpdateBy(defaultText(operator, "system"));

        if (contractMapper.updateContract(patch) <= 0)
        {
            throw new ServiceException("合同更新失败");
        }

        OsgContract refreshed = contractMapper.selectContractById(contractId);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("contractId", contractId);
        result.put("contractAmount", refreshed.getContractAmount());
        result.put("totalHours", refreshed.getTotalHours());
        result.put("startDate", refreshed.getStartDate());
        result.put("endDate", refreshed.getEndDate());
        result.put("currency", refreshed.getCurrency());
        result.put("amountUsd", refreshed.getAmountUsd());
        result.put("amountGbp", refreshed.getAmountGbp());
        result.put("attachmentPath", refreshed.getAttachmentPath());
        result.put("contractStatus", refreshed.getContractStatus());
        result.put("remark", refreshed.getRemark());
        return result;
    }

    private OsgContract defaultQuery(OsgContract contract)
    {
        return contract == null ? new OsgContract() : contract;
    }

    private void applyDerivedUsageMetrics(List<OsgContract> rows)
    {
        if (rows == null || rows.isEmpty())
        {
            return;
        }

        Map<Long, BigDecimal> approvedHoursByStudent = loadApprovedHoursByStudent(rows);
        Map<Long, List<OsgContract>> grouped = new LinkedHashMap<>();
        for (OsgContract row : rows)
        {
            if (row.getStudentId() == null)
            {
                row.setUsedHours(BigDecimal.ZERO);
                row.setRemainingHours(BigDecimal.valueOf(row.getTotalHours() == null ? 0 : row.getTotalHours()));
                continue;
            }
            grouped.computeIfAbsent(row.getStudentId(), ignored -> new ArrayList<>()).add(row);
        }

        Comparator<OsgContract> order = Comparator
            .comparing(OsgContract::getStartDate, Comparator.nullsLast(Comparator.naturalOrder()))
            .thenComparing(OsgContract::getContractId, Comparator.nullsLast(Comparator.naturalOrder()));

        for (Map.Entry<Long, List<OsgContract>> entry : grouped.entrySet())
        {
            BigDecimal remainingToAllocate = approvedHoursByStudent.getOrDefault(entry.getKey(), BigDecimal.ZERO);
            List<OsgContract> contracts = entry.getValue();
            contracts.sort(order);
            for (OsgContract contract : contracts)
            {
                BigDecimal total = BigDecimal.valueOf(contract.getTotalHours() == null ? 0 : contract.getTotalHours());
                BigDecimal used = min(nonNegative(remainingToAllocate), total);
                BigDecimal remaining = nonNegative(total.subtract(used));
                contract.setUsedHours(normalizeHours(used));
                contract.setRemainingHours(normalizeHours(remaining));
                remainingToAllocate = nonNegative(remainingToAllocate.subtract(used));
            }
        }
    }

    private Map<Long, BigDecimal> loadApprovedHoursByStudent(List<OsgContract> rows)
    {
        Set<Long> studentIds = rows.stream()
            .map(OsgContract::getStudentId)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());
        if (studentIds.isEmpty())
        {
            return Map.of();
        }

        String placeholders = studentIds.stream().map(ignored -> "?").collect(Collectors.joining(","));
        List<Object> params = new ArrayList<>(studentIds.size() + 1);
        params.add("approved");
        params.addAll(studentIds);

        Map<Long, BigDecimal> usage = new HashMap<>();
        List<Map<String, Object>> usageRows = jdbcTemplate.queryForList(
            """
                select student_id, coalesce(sum(duration_hours), 0) as used_hours
                from osg_class_record
                where status = ?
                  and student_id in ("""
                + placeholders +
                ") group by student_id",
            params.toArray()
        );
        for (Map<String, Object> row : usageRows)
        {
            Long studentId = row.get("student_id") instanceof Number number ? number.longValue() : null;
            if (studentId == null)
            {
                continue;
            }
            usage.put(studentId, normalizeHours(asBigDecimal(row.get("used_hours"))));
        }
        return usage;
    }

    private String resolveStatsStatus(OsgContract contract)
    {
        String rawStatus = asText(contract.getContractStatus());
        LocalDate endDate = asDate(contract.getEndDate());
        if ("expired".equals(rawStatus) || "cancelled".equals(rawStatus))
        {
            return "ended";
        }
        if (endDate != null)
        {
            LocalDate today = LocalDate.now();
            if (endDate.isBefore(today))
            {
                return "ended";
            }
            if (!endDate.isAfter(today.plusDays(30)))
            {
                return "expiring";
            }
        }
        return "active";
    }

    private BigDecimal normalizeHours(BigDecimal value)
    {
        return nonNegative(value).setScale(1, RoundingMode.HALF_UP).stripTrailingZeros();
    }

    private BigDecimal nonNegative(BigDecimal value)
    {
        if (value == null || value.signum() <= 0)
        {
            return BigDecimal.ZERO;
        }
        return value;
    }

    private BigDecimal min(BigDecimal left, BigDecimal right)
    {
        return left.compareTo(right) <= 0 ? left : right;
    }

    private String resolveRenewalReason(String renewalReason, String otherReason)
    {
        if (!"其他".equals(renewalReason) && !"其他原因".equals(renewalReason))
        {
            return renewalReason;
        }
        if (isBlank(otherReason))
        {
            throw new ServiceException("其他原因不能为空");
        }
        return "其他原因:" + otherReason.trim();
    }

    private String resolveContractStatus(LocalDate endDate, Integer totalHours)
    {
        if (endDate.isBefore(LocalDate.now()) || totalHours == null || totalHours <= 0)
        {
            return "expired";
        }
        return "active";
    }

    private String generateContractNo(Long studentId)
    {
        long suffix = studentId == null ? System.currentTimeMillis() % 100000 : studentId % 100000;
        return "CT" + System.currentTimeMillis() + String.format("%05d", suffix);
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

    private BigDecimal asBigDecimal(Object value)
    {
        if (value == null)
        {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal decimal)
        {
            return decimal;
        }
        if (value instanceof Number number)
        {
            return BigDecimal.valueOf(number.doubleValue());
        }
        try
        {
            return new BigDecimal(String.valueOf(value));
        }
        catch (NumberFormatException ex)
        {
            return BigDecimal.ZERO;
        }
    }

    private BigDecimal asBigDecimalOrNull(Object value)
    {
        if (value == null)
        {
            return null;
        }
        if (value instanceof BigDecimal decimal)
        {
            return decimal;
        }
        if (value instanceof Number number)
        {
            return BigDecimal.valueOf(number.doubleValue());
        }
        try
        {
            return new BigDecimal(String.valueOf(value));
        }
        catch (NumberFormatException ex)
        {
            return null;
        }
    }

    private LocalDate asDate(Object value)
    {
        if (value == null)
        {
            return null;
        }
        if (value instanceof Date sqlDate)
        {
            return sqlDate.toLocalDate();
        }
        if (value instanceof java.util.Date utilDate)
        {
            return new Date(utilDate.getTime()).toLocalDate();
        }
        String text = String.valueOf(value);
        int tIdx = text.indexOf('T');
        if (tIdx > 0)
        {
            text = text.substring(0, tIdx);
        }
        try
        {
            return LocalDate.parse(text);
        }
        catch (DateTimeParseException e)
        {
            try
            {
                return LocalDate.parse(text, DateTimeFormatter.ofPattern("yyyy-M-d"));
            }
            catch (DateTimeParseException ex)
            {
                return null;
            }
        }
    }

    private BigDecimal defaultAmount(Object value)
    {
        BigDecimal amount = asBigDecimal(value);
        return amount.signum() < 0 ? BigDecimal.ZERO : amount;
    }

    private BigDecimal defaultHoursDecimal(Object value)
    {
        BigDecimal hours = asBigDecimal(value);
        return hours.signum() < 0 ? BigDecimal.ZERO : normalizeHours(hours);
    }

    private Integer defaultHours(Object primary, Object fallback)
    {
        Integer hours = asInteger(primary);
        if (hours <= 0)
        {
            hours = asInteger(fallback);
        }
        return Math.max(hours, 0);
    }

    private String asText(Object value)
    {
        return value == null ? null : String.valueOf(value).trim();
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
