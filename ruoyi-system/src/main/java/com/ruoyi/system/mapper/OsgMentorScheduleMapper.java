package com.ruoyi.system.mapper;
import com.ruoyi.system.domain.OsgMentorSchedule;
public interface OsgMentorScheduleMapper {
    OsgMentorSchedule selectByMentorAndWeek(OsgMentorSchedule q);
    int insert(OsgMentorSchedule r);
    int update(OsgMentorSchedule r);
}
