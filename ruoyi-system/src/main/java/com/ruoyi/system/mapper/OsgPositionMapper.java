package com.ruoyi.system.mapper;

import java.util.List;
import com.ruoyi.system.domain.OsgPosition;

public interface OsgPositionMapper
{
    OsgPosition selectPositionByPositionId(Long positionId);

    List<OsgPosition> selectPositionList(OsgPosition position);

    int insertPosition(OsgPosition position);

    int updatePosition(OsgPosition position);
}
