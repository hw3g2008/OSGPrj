package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;

public interface IOsgJobOverviewService
{
    Map<String, Object> selectJobOverviewStats(String studentName, String companyName, String currentStage, Long leadMentorId, String assignStatus);

    List<Map<String, Object>> selectJobOverviewFunnel(String studentName, String companyName, String currentStage, Long leadMentorId, String assignStatus);

    List<Map<String, Object>> selectJobOverviewList(String studentName, String companyName, String currentStage, Long leadMentorId, String assignStatus);

    List<Map<String, Object>> selectUnassignedList(String studentName, String companyName, String currentStage, Long leadMentorId);

    /** §B3: 后台 coaching 维度的待分配列表，行维度 = osg_coaching */
    List<Map<String, Object>> selectUnassignedCoachingList(String studentName, String companyName, Long leadMentorId);

    Map<String, Object> assignMentors(Map<String, Object> payload, String operator);

    /** §B3: 后台按 coachingId 精确分配导师，支持同一 application 下多条阶段级 coaching */
    Map<String, Object> assignMentorsByCoaching(Long coachingId, Map<String, Object> payload, String operator);

    Map<String, Object> updateStage(Map<String, Object> payload, String operator);
}
