package com.ruoyi.system.service.impl;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.ruoyi.system.domain.OsgSimPractice;
import com.ruoyi.system.mapper.OsgSimPracticeMapper;
import com.ruoyi.system.service.IOsgSimPracticeService;
@Service
public class OsgSimPracticeServiceImpl implements IOsgSimPracticeService {
    @Autowired private OsgSimPracticeMapper mapper;
    @Override public List<OsgSimPractice> selectList(OsgSimPractice q){return mapper.selectList(q);}
    @Override public OsgSimPractice selectById(Long id){return mapper.selectById(id);}
    @Override public int update(OsgSimPractice r){return mapper.update(r);}
}
