package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;

public interface IOsgFinanceService
{
    List<Map<String, Object>> selectFinanceSettlementList(String keyword, String source, String tab, String startDate, String endDate);

    Map<String, Object> selectFinanceSettlementStats(String keyword, String source, String startDate, String endDate);

    Map<String, Object> markPaid(Long settlementId, Map<String, Object> payload, String operator);

    Map<String, Object> batchPay(Map<String, Object> payload, String operator);
}
