package com.ruoyi.system.mapper;

import java.util.List;
import com.ruoyi.system.domain.OsgJobCoaching;

public interface OsgJobCoachingMapper
{
    List<OsgJobCoaching> selectList(OsgJobCoaching query);
    OsgJobCoaching selectById(Long id);
    int update(OsgJobCoaching record);
    List<OsgJobCoaching> selectCalendar(OsgJobCoaching query);
}
