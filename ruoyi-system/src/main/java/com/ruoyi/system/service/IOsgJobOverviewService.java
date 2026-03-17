package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;

public interface IOsgJobOverviewService
{
    Map<String, Object> selectJobOverviewStats(String studentName, String companyName, String currentStage, Long leadMentorId, String assignStatus);

    List<Map<String, Object>> selectJobOverviewFunnel(String studentName, String companyName, String currentStage, Long leadMentorId, String assignStatus);

    List<Map<String, Object>> selectHotCompanies(String studentName, String companyName, String currentStage, Long leadMentorId, String assignStatus);

    List<Map<String, Object>> selectJobOverviewList(String studentName, String companyName, String currentStage, Long leadMentorId, String assignStatus);

    List<Map<String, Object>> selectUnassignedList(String studentName, String companyName, String currentStage, Long leadMentorId);

    Map<String, Object> assignMentors(Map<String, Object> payload, String operator);

    Map<String, Object> updateStage(Map<String, Object> payload, String operator);
}
