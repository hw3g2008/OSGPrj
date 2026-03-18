package com.ruoyi.system.service.impl;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.ruoyi.system.domain.OsgMockPractice;
import com.ruoyi.system.mapper.OsgMockPracticeMapper;
import com.ruoyi.system.service.IOsgMockPracticeService;
@Service
public class OsgMockPracticeServiceImpl implements IOsgMockPracticeService {
    @Autowired private OsgMockPracticeMapper mapper;
    @Override public List<OsgMockPractice> selectList(OsgMockPractice q){return mapper.selectList(q);}
    @Override public OsgMockPractice selectById(Long id){return mapper.selectById(id);}
    @Override public int update(OsgMockPractice r){return mapper.update(r);}
}
