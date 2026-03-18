package com.ruoyi.system.service;
import java.util.List;
import com.ruoyi.system.domain.OsgMockPractice;
public interface IOsgMockPracticeService {
    List<OsgMockPractice> selectList(OsgMockPractice q);
    OsgMockPractice selectById(Long id);
    int update(OsgMockPractice r);
}
