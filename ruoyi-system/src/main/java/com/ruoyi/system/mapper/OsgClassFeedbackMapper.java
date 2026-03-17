package com.ruoyi.system.mapper;

import java.util.List;
import java.util.Map;
import com.ruoyi.system.domain.OsgClassFeedback;

public interface OsgClassFeedbackMapper
{
    List<Map<String, Object>> selectFeedbackList(OsgClassFeedback query);

    Map<String, Object> selectFeedbackStats();
}
