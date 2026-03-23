package com.ruoyi.system.service;

import java.util.Map;

public interface IOsgLeadMentorMockPracticeService
{
    Map<String, Object> selectScopedStats(String keyword, String practiceType, String status, Long currentUserId);

    java.util.List<Map<String, Object>> selectPracticeList(String scope, String keyword, String practiceType, String status, Long currentUserId);

    Map<String, Object> selectPracticeDetail(Long practiceId, Long currentUserId);

    Map<String, Object> assignPractice(Long practiceId, Map<String, Object> payload, Long currentUserId, String operator);

    Map<String, Object> acknowledgeAssignment(Long practiceId, Long currentUserId, String operator);
}
