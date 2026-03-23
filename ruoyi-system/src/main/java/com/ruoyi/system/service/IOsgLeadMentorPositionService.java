package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;
import com.ruoyi.system.domain.OsgPosition;

public interface IOsgLeadMentorPositionService
{
    List<Map<String, Object>> selectPositionList(OsgPosition query, Long leadMentorId);

    Map<String, Object> selectPositionMeta();

    List<Map<String, Object>> selectPositionStudents(Long positionId, Long leadMentorId);
}
