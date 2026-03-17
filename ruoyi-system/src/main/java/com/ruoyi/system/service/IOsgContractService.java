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
}
