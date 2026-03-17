package com.ruoyi.system.mapper;

import java.util.List;
import com.ruoyi.system.domain.OsgCoaching;

public interface OsgCoachingMapper
{
    OsgCoaching selectCoachingByApplicationId(Long applicationId);

    List<OsgCoaching> selectCoachingList(OsgCoaching coaching);

    int insertCoaching(OsgCoaching coaching);

    int updateCoaching(OsgCoaching coaching);
}
