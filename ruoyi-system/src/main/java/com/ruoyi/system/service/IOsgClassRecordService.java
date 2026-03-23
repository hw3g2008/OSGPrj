package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;
import com.ruoyi.system.domain.OsgClassRecord;

public interface IOsgClassRecordService
{
    Map<String, Object> selectReportSummary(String keyword, String courseType, String courseSource, String tab);

    List<Map<String, Object>> selectReportList(String keyword, String courseType, String courseSource, String tab);

    Map<String, Object> selectReportDetail(Long recordId);

    Map<String, Object> approveRecord(Long recordId, Map<String, Object> payload, String operator);

    Map<String, Object> rejectRecord(Long recordId, Map<String, Object> payload, String operator);

    Map<String, Object> batchApprove(Map<String, Object> payload, String operator);

    Map<String, Object> batchReject(Map<String, Object> payload, String operator);

    List<OsgClassRecord> selectMentorClassRecordList(OsgClassRecord record);

    OsgClassRecord selectMentorClassRecordById(Long id);

    Map<String, Object> createLeadMentorClassRecord(OsgClassRecord record);

    int createMentorClassRecord(OsgClassRecord record);

    int updateMentorClassRecord(OsgClassRecord record);
}
