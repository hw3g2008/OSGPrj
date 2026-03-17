package com.ruoyi.system.mapper;

import java.util.List;
import java.util.Map;
import com.ruoyi.system.domain.OsgMailJob;

public interface OsgMailJobMapper
{
    List<Map<String, Object>> selectMailJobList(OsgMailJob query);

    int insertMailJob(OsgMailJob job);
}
