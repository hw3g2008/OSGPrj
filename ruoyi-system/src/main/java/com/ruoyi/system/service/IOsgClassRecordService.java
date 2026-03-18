package com.ruoyi.system.service;

import java.util.List;
import com.ruoyi.system.domain.OsgClassRecord;

public interface IOsgClassRecordService
{
    List<OsgClassRecord> selectList(OsgClassRecord record);
    OsgClassRecord selectById(Long id);
    int insert(OsgClassRecord record);
    int update(OsgClassRecord record);
}
