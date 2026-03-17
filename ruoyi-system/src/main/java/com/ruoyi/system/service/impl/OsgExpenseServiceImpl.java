package com.ruoyi.system.service.impl;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgExpense;
import com.ruoyi.system.mapper.OsgExpenseMapper;
import com.ruoyi.system.service.IOsgExpenseService;

@Service
public class OsgExpenseServiceImpl implements IOsgExpenseService
{
    private static final String STATUS_PROCESSING = "processing";
    private static final String STATUS_APPROVED = "approved";
    private static final String STATUS_DENIED = "denied";
    private static final Set<String> ALLOWED_TYPES = Set.of(
        "Mentor Referral",
        "Student Referral",
        "Transportation",
        "Materials",
        "Other"
    );

    @Autowired
    private OsgExpenseMapper expenseMapper;

    @Override
    public List<Map<String, Object>> selectExpenseList(String keyword, String tab)
    {
        OsgExpense query = new OsgExpense();
        query.setKeyword(text(keyword));
        query.setStatus(normalizeTab(tab));
        return expenseMapper.selectExpenseList(query).stream()
            .map(this::toPayload)
            .toList();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> createExpense(Map<String, Object> payload, String operator)
    {
        OsgExpense expense = new OsgExpense();
        expense.setMentorId(requireLong(payload, "mentorId", "mentorId不能为空"));
        expense.setMentorName(requireText(payload, "mentorName", "mentorName不能为空"));
        expense.setExpenseType(requireType(payload));
        expense.setExpenseAmount(requirePositiveAmount(payload));
        expense.setExpenseDate(requireDate(payload, "expenseDate", "expenseDate不能为空"));
        expense.setDescription(requireText(payload, "description", "description不能为空"));
        expense.setAttachmentUrl(text(payload == null ? null : payload.get("attachmentUrl")));
        expense.setStatus(STATUS_PROCESSING);
        expense.setCreateBy(defaultText(operator, "system"));
        expense.setUpdateBy(defaultText(operator, "system"));

        if (expenseMapper.insertExpense(expense) <= 0)
        {
            throw new ServiceException("报销创建失败");
        }
        return toPayload(expense);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> reviewExpense(Long expenseId, Map<String, Object> payload, String operator)
    {
        OsgExpense expense = requireExpense(expenseId);
        if (!STATUS_PROCESSING.equals(expense.getStatus()))
        {
            throw new ServiceException("该报销已处理，不能重复操作");
        }

        String targetStatus = requireReviewStatus(payload);
        expense.setStatus(targetStatus);
        expense.setReviewComment(text(payload == null ? null : payload.get("reviewComment")));
        expense.setReviewedBy(defaultText(operator, "system"));
        expense.setReviewedAt(new java.util.Date());
        expense.setUpdateBy(defaultText(operator, "system"));

        if (expenseMapper.updateExpense(expense) <= 0)
        {
            throw new ServiceException("报销审核失败");
        }
        return toPayload(expense);
    }

    private OsgExpense requireExpense(Long expenseId)
    {
        OsgExpense expense = expenseMapper.selectExpenseByExpenseId(expenseId);
        if (expense == null)
        {
            throw new ServiceException("报销记录不存在");
        }
        return expense;
    }

    private String requireType(Map<String, Object> payload)
    {
        String expenseType = requireText(payload, "expenseType", "expenseType不能为空");
        if (!ALLOWED_TYPES.contains(expenseType))
        {
            throw new ServiceException("不支持的报销类型");
        }
        return expenseType;
    }

    private BigDecimal requirePositiveAmount(Map<String, Object> payload)
    {
        String raw = requireText(payload, "expenseAmount", "expenseAmount不能为空");
        try
        {
            BigDecimal amount = new BigDecimal(raw);
            if (amount.compareTo(BigDecimal.ZERO) <= 0)
            {
                throw new ServiceException("expenseAmount必须大于0");
            }
            return amount.stripTrailingZeros();
        }
        catch (NumberFormatException ex)
        {
            throw new ServiceException("expenseAmount格式不正确");
        }
    }

    private Date requireDate(Map<String, Object> payload, String key, String message)
    {
        String raw = requireText(payload, key, message);
        try
        {
            return Date.valueOf(LocalDate.parse(raw));
        }
        catch (Exception ex)
        {
            throw new ServiceException(key + "格式不正确");
        }
    }

    private Long requireLong(Map<String, Object> payload, String key, String message)
    {
        Object value = payload == null ? null : payload.get(key);
        if (value == null)
        {
            throw new ServiceException(message);
        }
        if (value instanceof Number number)
        {
            return number.longValue();
        }
        try
        {
            return Long.valueOf(String.valueOf(value));
        }
        catch (NumberFormatException ex)
        {
            throw new ServiceException(message);
        }
    }

    private String requireReviewStatus(Map<String, Object> payload)
    {
        String status = requireText(payload, "status", "status不能为空");
        if (STATUS_APPROVED.equals(status) || STATUS_DENIED.equals(status))
        {
            return status;
        }
        throw new ServiceException("status必须为approved或denied");
    }

    private String requireText(Map<String, Object> payload, String key, String message)
    {
        String value = text(payload == null ? null : payload.get(key));
        if (value == null || value.isBlank())
        {
            throw new ServiceException(message);
        }
        return value;
    }

    private String normalizeTab(String tab)
    {
        String value = text(tab);
        if (value == null || value.isBlank())
        {
            return "all";
        }
        return value;
    }

    private String text(Object value)
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
        String text = text(value);
        return text == null ? fallback : text;
    }

    private Map<String, Object> toPayload(OsgExpense expense)
    {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("expenseId", expense.getExpenseId());
        payload.put("mentorId", expense.getMentorId());
        payload.put("mentorName", expense.getMentorName());
        payload.put("expenseType", expense.getExpenseType());
        payload.put("expenseAmount", expense.getExpenseAmount() == null ? null : expense.getExpenseAmount().toPlainString());
        payload.put("expenseDate", expense.getExpenseDate() == null ? null : expense.getExpenseDate().toString());
        payload.put("description", expense.getDescription());
        payload.put("attachmentUrl", expense.getAttachmentUrl());
        payload.put("status", expense.getStatus());
        payload.put("reviewComment", expense.getReviewComment());
        payload.put("reviewedBy", expense.getReviewedBy());
        payload.put("reviewedAt", expense.getReviewedAt());
        return payload;
    }
}
