package com.ruoyi.system.mapper;

import java.util.List;
import com.ruoyi.system.domain.OsgStudentPosition;

public interface OsgStudentPositionMapper
{
    OsgStudentPosition selectStudentPositionById(Long studentPositionId);

    List<OsgStudentPosition> selectStudentPositionList(OsgStudentPosition studentPosition);

    int insertStudentPosition(OsgStudentPosition studentPosition);

    int updateStudentPositionReview(OsgStudentPosition studentPosition);
}
