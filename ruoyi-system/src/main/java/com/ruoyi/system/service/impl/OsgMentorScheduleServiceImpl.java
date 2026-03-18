package com.ruoyi.system.service.impl;
import java.text.SimpleDateFormat;
import java.util.Date;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.ruoyi.system.domain.OsgMentorSchedule;
import com.ruoyi.system.mapper.OsgMentorScheduleMapper;
import com.ruoyi.system.service.IOsgMentorScheduleService;
@Service
public class OsgMentorScheduleServiceImpl implements IOsgMentorScheduleService {
    @Autowired private OsgMentorScheduleMapper mapper;
    @Override
    public OsgMentorSchedule selectByMentorAndWeek(Long mentorId, String weekStart) {
        try {
            OsgMentorSchedule q = new OsgMentorSchedule();
            q.setMentorId(mentorId);
            q.setWeekStartDate(new SimpleDateFormat("yyyy-MM-dd").parse(weekStart));
            return mapper.selectByMentorAndWeek(q);
        } catch (Exception e) { return null; }
    }
    @Override
    public int saveOrUpdate(OsgMentorSchedule r) {
        OsgMentorSchedule existing = mapper.selectByMentorAndWeek(r);
        if (existing != null) { r.setId(existing.getId()); return mapper.update(r); }
        return mapper.insert(r);
    }
}
