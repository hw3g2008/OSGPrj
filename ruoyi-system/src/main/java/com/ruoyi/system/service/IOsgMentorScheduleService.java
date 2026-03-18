package com.ruoyi.system.service;
import com.ruoyi.system.domain.OsgMentorSchedule;
public interface IOsgMentorScheduleService {
    OsgMentorSchedule selectByMentorAndWeek(Long mentorId, String weekStart);
    int saveOrUpdate(OsgMentorSchedule r);
}
