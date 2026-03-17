package com.ruoyi.system.mapper;

import com.ruoyi.system.domain.OsgFinanceSettlement;

public interface OsgFinanceSettlementMapper
{
    OsgFinanceSettlement selectFinanceSettlementBySettlementId(Long settlementId);

    OsgFinanceSettlement selectFinanceSettlementByRecordId(Long recordId);

    int insertFinanceSettlement(OsgFinanceSettlement settlement);

    int updateFinanceSettlement(OsgFinanceSettlement settlement);
}
