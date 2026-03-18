package com.ruoyi.system.mapper;
import java.util.List;
import com.ruoyi.system.domain.OsgMockPractice;
public interface OsgMockPracticeMapper {
    List<OsgMockPractice> selectList(OsgMockPractice q);
    OsgMockPractice selectById(Long id);
    int update(OsgMockPractice r);
}
