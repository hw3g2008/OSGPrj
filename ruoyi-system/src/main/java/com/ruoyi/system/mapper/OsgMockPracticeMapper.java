package com.ruoyi.system.mapper;

import java.util.List;
import com.ruoyi.system.domain.OsgMockPractice;

public interface OsgMockPracticeMapper
{
    OsgMockPractice selectMockPracticeByPracticeId(Long practiceId);

    List<OsgMockPractice> selectMockPracticeList(OsgMockPractice mockPractice);

    List<OsgMockPractice> selectMentorMockPracticeList(OsgMockPractice mockPractice);

    OsgMockPractice selectMentorMockPracticeById(Long practiceId);

    int insertMockPractice(OsgMockPractice mockPractice);

    int updateMockPracticeAssignment(OsgMockPractice mockPractice);

    int updateMentorMockPracticeStatus(OsgMockPractice mockPractice);
}
