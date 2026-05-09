package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;
import com.ruoyi.system.domain.OsgContract;

public interface IOsgContractService
{
    public List<OsgContract> selectContractList(OsgContract contract);

    public Map<String, Object> selectContractStats(OsgContract contract);

    public Map<String, Object> renewContract(Map<String, Object> payload, String operator);

    public Map<String, Object> updateContractAttachment(Long contractId, String attachmentPath, String operator);

    /**
     * 原地更新现有合同字段（金额/课时/起止日期/币种/附件/备注）。
     * 与 renewContract 不同：不产生新合同，仅更新当前合同。
     * 校验：合同必须存在且 contractStatus='active'。
     */
    public Map<String, Object> updateContract(Long contractId, Map<String, Object> payload, String operator);
}
