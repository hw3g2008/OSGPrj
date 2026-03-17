package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;

public interface IOsgStaffScheduleService
{
    public List<Map<String, Object>> selectScheduleList(String weekScope);

    public Map<String, Object> saveSchedule(Map<String, Object> payload, String operator, Long operatorId);

    public Map<String, Object> remindAll(String weekScope);
}
