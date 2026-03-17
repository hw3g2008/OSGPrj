package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;

public interface IOsgStudentPositionService
{
    List<Map<String, Object>> selectStudentPositionList(String status, String positionCategory, String hasCoachingRequest, String keyword);

    Map<String, Object> approveStudentPosition(Long studentPositionId, Map<String, Object> payload, String reviewer);

    Map<String, Object> rejectStudentPosition(Long studentPositionId, Map<String, Object> payload, String reviewer);
}
