package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import com.ruoyi.system.domain.OsgStaff;
import com.ruoyi.system.mapper.OsgStaffChangeRequestMapper;
import com.ruoyi.system.mapper.OsgStaffMapper;
import com.ruoyi.system.service.ISysUserService;

@ExtendWith(MockitoExtension.class)
class OsgStaffServiceImplExportTest
{
    @InjectMocks
    private OsgStaffServiceImpl service;

    @Mock
    private OsgStaffMapper staffMapper;

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private OsgStaffChangeRequestMapper staffChangeRequestMapper;

    @Mock
    private ISysUserService sysUserService;

    @Test
    void selectStaffExportListShouldHonorBlacklistTab() throws Exception
    {
        OsgStaff query = new OsgStaff();
        query.setStaffType("lead_mentor");

        when(staffMapper.selectStaffList(any(OsgStaff.class))).thenReturn(List.of(
            buildStaff(1L, "Diana", "active"),
            buildStaff(2L, "Judy", "frozen")));
        when(jdbcTemplate.queryForList(anyString(), eq(Long.class), any(Object[].class))).thenReturn(List.of(2L));

        List<Map<String, Object>> rows = service.selectStaffExportList(query, "blacklist");

        assertEquals(1, rows.size());
        assertEquals("Judy", rows.get(0).get("staffName"));
        assertEquals("1", rows.get(0).get("accountStatus"));
        assertEquals("黑名单", rows.get(0).get("blacklistStatus"));
    }

    private OsgStaff buildStaff(Long staffId, String staffName, String accountStatus)
    {
        OsgStaff staff = new OsgStaff();
        staff.setStaffId(staffId);
        staff.setStaffName(staffName);
        staff.setEmail(staffName.toLowerCase() + "@example.com");
        staff.setPhone("13800000000");
        staff.setStaffType("lead_mentor");
        staff.setMajorDirection("科技");
        staff.setSubDirection("AI");
        staff.setRegion("北美");
        staff.setCity("Seattle");
        staff.setHourlyRate(new BigDecimal("780"));
        staff.setStudentCount(5);
        staff.setAccountStatus(accountStatus);
        return staff;
    }
}
