package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.system.domain.OsgStaff;
import com.ruoyi.system.mapper.OsgStaffChangeRequestMapper;
import com.ruoyi.system.mapper.OsgStaffMapper;
import com.ruoyi.system.service.ISysUserService;

@ExtendWith(MockitoExtension.class)
class OsgStaffServiceImplChangeRequestTest
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
    void selectChangeRequestListShouldReturnPendingRowsWithStaffSnapshot() throws Exception
    {
        when(jdbcTemplate.queryForList(any(String.class), any(Object[].class))).thenReturn(List.of(
            changeRequestRow(10L, 1L, "city", "所在城市", "New York", "London", "pending", "mentor.user")));
        when(staffMapper.selectStaffByStaffId(1L)).thenReturn(buildStaff());

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) invoke(
            "selectChangeRequestList",
            new Class<?>[] { Long.class, String.class },
            1L,
            "pending");

        assertEquals(1, rows.size());
        assertEquals(10L, rows.get(0).get("requestId"));
        assertEquals("Diana", rows.get(0).get("staffName"));
        assertEquals("London", rows.get(0).get("afterValue"));
        assertEquals("pending", rows.get(0).get("status"));
    }

    @Test
    void approveChangeRequestShouldApplyCityChangeAndMarkRequestApproved() throws Exception
    {
        when(jdbcTemplate.queryForList(any(String.class), any(Object[].class))).thenReturn(List.of(
            changeRequestRow(10L, 1L, "city", "所在城市", "New York", "London", "pending", "mentor.user")));
        when(staffMapper.selectStaffByStaffId(1L)).thenReturn(buildStaff());
        when(staffMapper.updateStaff(any(OsgStaff.class))).thenReturn(1);
        when(sysUserService.selectUserByUserName("diana@example.com")).thenReturn(buildAccount());
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(1);

        @SuppressWarnings("unchecked")
        Map<String, Object> result = (Map<String, Object>) invoke(
            "approveChangeRequest",
            new Class<?>[] { Long.class, String.class },
            10L,
            "clerk");

        assertEquals("approved", result.get("status"));
        assertEquals("London", result.get("afterValue"));
        verify(staffMapper).updateStaff(any(OsgStaff.class));
        verify(jdbcTemplate, atLeastOnce()).update(anyString(), any(Object[].class));
    }

    @Test
    void rejectChangeRequestShouldMarkPendingRequestRejected() throws Exception
    {
        when(jdbcTemplate.queryForList(any(String.class), any(Object[].class))).thenReturn(List.of(
            changeRequestRow(10L, 1L, "city", "所在城市", "New York", "London", "pending", "mentor.user")));
        when(staffMapper.selectStaffByStaffId(1L)).thenReturn(buildStaff());
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(1);

        @SuppressWarnings("unchecked")
        Map<String, Object> result = (Map<String, Object>) invoke(
            "rejectChangeRequest",
            new Class<?>[] { Long.class, String.class, String.class },
            10L,
            "clerk",
            "信息不完整");

        assertEquals("rejected", result.get("status"));
        assertEquals("信息不完整", result.get("remark"));
        verify(jdbcTemplate, atLeastOnce()).update(anyString(), any(Object[].class));
    }

    private Object invoke(String methodName, Class<?>[] parameterTypes, Object... args) throws Exception
    {
        Method method = OsgStaffServiceImpl.class.getMethod(methodName, parameterTypes);
        return method.invoke(service, args);
    }

    private Map<String, Object> changeRequestRow(
        Long requestId,
        Long staffId,
        String fieldKey,
        String fieldLabel,
        String beforeValue,
        String afterValue,
        String status,
        String requestedBy)
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("request_id", requestId);
        row.put("staff_id", staffId);
        row.put("field_key", fieldKey);
        row.put("field_label", fieldLabel);
        row.put("before_value", beforeValue);
        row.put("after_value", afterValue);
        row.put("status", status);
        row.put("requested_by", requestedBy);
        row.put("create_by", requestedBy);
        row.put("create_time", new Date());
        row.put("update_by", requestedBy);
        row.put("update_time", new Date());
        return row;
    }

    private OsgStaff buildStaff()
    {
        OsgStaff staff = new OsgStaff();
        staff.setStaffId(1L);
        staff.setStaffName("Diana");
        staff.setEmail("diana@example.com");
        staff.setPhone("13800000000");
        staff.setStaffType("lead_mentor");
        staff.setMajorDirection("金融");
        staff.setSubDirection("IB");
        staff.setRegion("北美");
        staff.setCity("New York");
        staff.setHourlyRate(new BigDecimal("600"));
        staff.setAccountStatus("active");
        return staff;
    }

    private SysUser buildAccount()
    {
        SysUser account = new SysUser();
        account.setUserId(1010L);
        account.setUserName("diana@example.com");
        account.setEmail("diana@example.com");
        return account;
    }
}
