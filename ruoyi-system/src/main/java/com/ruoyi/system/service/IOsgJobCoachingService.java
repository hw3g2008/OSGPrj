package com.ruoyi.system.service;
import java.util.List;
import com.ruoyi.system.domain.OsgJobCoaching;
public interface IOsgJobCoachingService {
    List<OsgJobCoaching> selectList(OsgJobCoaching q);
    OsgJobCoaching selectById(Long id);
    int update(OsgJobCoaching r);
    List<OsgJobCoaching> selectCalendar(OsgJobCoaching q);
}
