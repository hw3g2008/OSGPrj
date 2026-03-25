package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;

import com.ruoyi.system.domain.OsgJobApplication;

public interface IOsgLeadMentorJobOverviewService
{
    List<Map<String, Object>> selectOverviewList(String scope, OsgJobApplication query, Long currentUserId);

    Map<String, Object> selectOverviewDetail(Long applicationId, Long currentUserId);

    Map<String, Object> assignMentors(Long applicationId, Map<String, Object> payload, Long currentUserId, String operator);

    Map<String, Object> acknowledgeStageUpdate(Long applicationId, Long currentUserId, String operator);

    Map<String, Object> confirmCoaching(Long applicationId, Long currentUserId, String operator);
}
