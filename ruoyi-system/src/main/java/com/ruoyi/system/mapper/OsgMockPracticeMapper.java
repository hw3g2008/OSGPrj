package com.ruoyi.system.mapper;

import java.util.List;
import com.ruoyi.system.domain.OsgMockPractice;

public interface OsgMockPracticeMapper
{
    OsgMockPractice selectMockPracticeByPracticeId(Long practiceId);

    List<OsgMockPractice> selectMockPracticeList(OsgMockPractice mockPractice);

    int insertMockPractice(OsgMockPractice mockPractice);

    int updateMockPracticeAssignment(OsgMockPractice mockPractice);
}
