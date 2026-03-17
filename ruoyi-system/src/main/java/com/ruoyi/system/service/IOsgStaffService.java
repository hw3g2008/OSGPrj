package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;
import com.ruoyi.system.domain.OsgStaff;

public interface IOsgStaffService
{
    public OsgStaff selectStaffByStaffId(Long staffId);

    public List<OsgStaff> selectStaffList(OsgStaff staff);

    public int insertStaff(OsgStaff staff);

    public int updateStaff(OsgStaff staff);

    public int updateStaffStatus(OsgStaff staff);

    public int deleteStaffByStaffId(Long staffId);

    public Map<Long, Integer> selectStudentCounts(List<Long> staffIds);
}
