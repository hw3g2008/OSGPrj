package com.ruoyi.system.mapper;

import java.util.List;
import com.ruoyi.system.domain.OsgClassRecord;

public interface OsgClassRecordMapper
{
    List<OsgClassRecord> selectList(OsgClassRecord record);
    OsgClassRecord selectById(Long id);
    int insert(OsgClassRecord record);
    int update(OsgClassRecord record);
}
