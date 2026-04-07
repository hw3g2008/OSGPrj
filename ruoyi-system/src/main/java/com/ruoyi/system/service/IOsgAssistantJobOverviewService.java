package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;

import com.ruoyi.system.domain.OsgJobApplication;

public interface IOsgAssistantJobOverviewService
{
    List<Map<String, Object>> selectOverviewList(OsgJobApplication query, Long currentUserId);

    Map<String, Object> selectOverviewDetail(Long applicationId, Long currentUserId);

    List<Map<String, Object>> selectCalendarEvents(Long currentUserId);
}
