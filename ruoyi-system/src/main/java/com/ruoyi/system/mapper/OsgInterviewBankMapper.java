package com.ruoyi.system.mapper;

import java.util.List;
import com.ruoyi.system.domain.OsgInterviewBank;

public interface OsgInterviewBankMapper
{
    List<OsgInterviewBank> selectInterviewBankList(OsgInterviewBank query);

    List<OsgInterviewBank> selectInterviewBankApplicationList(OsgInterviewBank query);

    int selectInterviewBankPendingCount();

    OsgInterviewBank selectInterviewBankByBankId(Long bankId);

    int insertInterviewBank(OsgInterviewBank row);

    int updateInterviewBank(OsgInterviewBank row);
}
