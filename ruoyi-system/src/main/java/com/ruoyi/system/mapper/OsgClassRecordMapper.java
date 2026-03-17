package com.ruoyi.system.mapper;

import java.util.List;
import com.ruoyi.system.domain.OsgClassRecord;

public interface OsgClassRecordMapper
{
    OsgClassRecord selectClassRecordByRecordId(Long recordId);

    List<OsgClassRecord> selectClassRecordList(OsgClassRecord classRecord);

    int insertClassRecord(OsgClassRecord classRecord);

    int updateClassRecordReview(OsgClassRecord classRecord);
}
