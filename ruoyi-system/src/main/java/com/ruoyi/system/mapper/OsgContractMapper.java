package com.ruoyi.system.mapper;

import java.util.List;
import java.util.Map;
import com.ruoyi.system.domain.OsgContract;

public interface OsgContractMapper
{
    public List<OsgContract> selectContractList(OsgContract contract);

    public Map<String, Object> selectContractStats(OsgContract contract);

    public int insertContract(OsgContract contract);

    public int updateContractAttachment(OsgContract contract);
}
