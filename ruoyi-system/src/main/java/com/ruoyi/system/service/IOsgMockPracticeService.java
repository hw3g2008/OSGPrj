package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;

public interface IOsgMockPracticeService
{
    Map<String, Object> selectMockPracticeStats(String keyword, String practiceType, String status);

    List<Map<String, Object>> selectMockPracticeList(String keyword, String practiceType, String status, String tab);

    Map<String, Object> assignMockPractice(Map<String, Object> payload, String operator);
}
