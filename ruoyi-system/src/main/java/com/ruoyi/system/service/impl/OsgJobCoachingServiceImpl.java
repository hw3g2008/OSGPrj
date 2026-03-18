package com.ruoyi.system.service.impl;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.ruoyi.system.domain.OsgJobCoaching;
import com.ruoyi.system.mapper.OsgJobCoachingMapper;
import com.ruoyi.system.service.IOsgJobCoachingService;
@Service
public class OsgJobCoachingServiceImpl implements IOsgJobCoachingService {
    @Autowired private OsgJobCoachingMapper mapper;
    @Override public List<OsgJobCoaching> selectList(OsgJobCoaching q) { return mapper.selectList(q); }
    @Override public OsgJobCoaching selectById(Long id) { return mapper.selectById(id); }
    @Override public int update(OsgJobCoaching r) { return mapper.update(r); }
    @Override public List<OsgJobCoaching> selectCalendar(OsgJobCoaching q) { return mapper.selectCalendar(q); }
}
