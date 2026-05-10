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

    /** 按 reference_type='application' AND reference_id=applicationId 过滤的全部课消记录（含旷课、含 NULL rate） */
    List<OsgClassRecord> selectByApplicationReference(@Param("applicationId") Long applicationId);

    List<OsgClassRecord> selectByJobCoachingReference(@Param("coachingId") Long coachingId);

    OsgClassRecord selectMentorClassRecordById(Long recordId);

    int insertClassRecord(OsgClassRecord classRecord);

    int insertMentorClassRecord(OsgClassRecord classRecord);

    int updateClassRecordReview(OsgClassRecord classRecord);

    int updateMentorClassRecord(OsgClassRecord classRecord);

    int updateStudentClassRecordRating(OsgClassRecord classRecord);
}
