package com.ruoyi.system.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Param;
import com.ruoyi.system.domain.OsgClassRecord;

public interface OsgClassRecordMapper
{
    OsgClassRecord selectClassRecordByRecordId(Long recordId);

    OsgClassRecord selectStudentClassRecordByClassId(@Param("classId") String classId, @Param("studentId") Long studentId);

    List<OsgClassRecord> selectStudentApprovedClassRecordList(@Param("studentId") Long studentId);

    List<OsgClassRecord> selectClassRecordList(OsgClassRecord classRecord);

    List<OsgClassRecord> selectMentorClassRecordList(OsgClassRecord classRecord);

    OsgClassRecord selectMentorClassRecordById(Long recordId);

    int insertClassRecord(OsgClassRecord classRecord);

    int insertMentorClassRecord(OsgClassRecord classRecord);

    int updateClassRecordReview(OsgClassRecord classRecord);

    int updateMentorClassRecord(OsgClassRecord classRecord);

    int updateStudentClassRecordRating(OsgClassRecord classRecord);
}
