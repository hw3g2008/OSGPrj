package com.ruoyi.system.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Param;
import com.ruoyi.system.domain.OsgStaffSchedule;

public interface OsgStaffScheduleMapper
{
    public List<OsgStaffSchedule> selectStaffScheduleList(@Param("staffId") Long staffId, @Param("weekScope") String weekScope);

    public int deleteByStaffAndWeekScope(@Param("staffId") Long staffId, @Param("weekScope") String weekScope);

    public int upsertSchedule(OsgStaffSchedule schedule);
}
