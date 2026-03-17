package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;

public interface IOsgExpenseService
{
    List<Map<String, Object>> selectExpenseList(String keyword, String tab);

    Map<String, Object> createExpense(Map<String, Object> payload, String operator);

    Map<String, Object> reviewExpense(Long expenseId, Map<String, Object> payload, String operator);
}
