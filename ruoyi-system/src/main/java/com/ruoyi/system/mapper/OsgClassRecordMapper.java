package com.ruoyi.system.mapper;

import java.util.List;
import com.ruoyi.system.domain.OsgClassRecord;

public interface OsgClassRecordMapper
{
    OsgClassRecord selectClassRecordByRecordId(Long recordId);

    List<OsgClassRecord> selectClassRecordList(OsgClassRecord classRecord);

    List<OsgClassRecord> selectMentorClassRecordList(OsgClassRecord classRecord);

    OsgClassRecord selectMentorClassRecordById(Long recordId);

    int insertClassRecord(OsgClassRecord classRecord);

    int insertMentorClassRecord(OsgClassRecord classRecord);

    int updateClassRecordReview(OsgClassRecord classRecord);

    int updateMentorClassRecord(OsgClassRecord classRecord);
}
