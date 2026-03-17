package com.ruoyi.system.mapper;

import java.util.List;
import com.ruoyi.system.domain.OsgStaff;

public interface OsgStaffMapper
{
    public OsgStaff selectStaffByStaffId(Long staffId);

    public List<OsgStaff> selectStaffList(OsgStaff staff);

    public int insertStaff(OsgStaff staff);

    public int updateStaff(OsgStaff staff);

    public int updateStaffStatus(OsgStaff staff);

    public int deleteStaffByStaffId(Long staffId);
}
