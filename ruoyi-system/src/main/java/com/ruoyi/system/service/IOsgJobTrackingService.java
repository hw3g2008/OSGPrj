package com.ruoyi.system.service;

import java.util.Map;

public interface IOsgJobTrackingService
{
    Map<String, Object> selectJobTrackingList(String studentName, String leadMentorName, String trackingStatus, String companyName, String location);

    Map<String, Object> updateJobTracking(Long applicationId, Map<String, Object> payload, String operator);
}
