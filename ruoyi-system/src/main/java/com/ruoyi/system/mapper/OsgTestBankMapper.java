package com.ruoyi.system.mapper;

import java.util.List;
import com.ruoyi.system.domain.OsgTestBank;

public interface OsgTestBankMapper
{
    List<OsgTestBank> selectTestBankList(OsgTestBank query);

    List<OsgTestBank> selectTestBankApplicationList(OsgTestBank query);

    int selectTestBankPendingCount();

    OsgTestBank selectTestBankByBankId(Long bankId);

    int insertTestBank(OsgTestBank row);

    int updateTestBank(OsgTestBank row);
}
