package com.ruoyi.web.controller.osg;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ruoyi.common.constant.HttpStatus;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.domain.OsgStaff;
import com.ruoyi.system.service.impl.OsgLeadMentorAccessService;
import com.ruoyi.system.service.impl.OsgStaffServiceImpl;

/**
 * LM 端导师下拉列表：用于"分配/更换导师"弹层的导师选择来源。
 *
 * <p>口径：osg_staff 中 staff_type='mentor' 且 account_status='active' 且未被加入黑名单的活跃导师。
 * 字段返回 staffId / staffName / majorDirection / subDirection / region / city / hourlyRate /
 * studentCount / scheduleStatus（基于 studentCount 派生，对接前端 osg_schedule_status 字典）。</p>
 */
@RestController
@RequestMapping("/lead-mentor/mentor")
public class OsgLeadMentorMentorController extends BaseController
{
    private static final String ACCESS_DENIED_MESSAGE = "该账号无班主任端访问权限";
    private static final String STAFF_TYPE_MENTOR = "mentor";
    private static final String ACCOUNT_STATUS_ACTIVE = "active";

    private static final String SCHEDULE_AVAILABLE = "available";
    private static final String SCHEDULE_NORMAL = "normal";
    private static final String SCHEDULE_BUSY = "busy";

    @Autowired
    private OsgStaffServiceImpl staffService;

    @Autowired
    private OsgLeadMentorAccessService leadMentorAccessService;

    @GetMapping("/list")
    public AjaxResult list(@RequestParam(required = false) String keyword,
                           @RequestParam(required = false) String majorDirection,
                           @RequestParam(required = false) String subDirection,
                           @RequestParam(required = false) String scheduleStatus)
    {
        if (!hasLeadMentorAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }

        OsgStaff query = new OsgStaff();
        query.setStaffType(STAFF_TYPE_MENTOR);
        query.setAccountStatus(ACCOUNT_STATUS_ACTIVE);
        if (keyword != null && !keyword.isBlank())
        {
            query.setStaffName(keyword.trim());
        }
        if (majorDirection != null && !majorDirection.isBlank())
        {
            query.setMajorDirection(majorDirection.trim());
        }

        List<OsgStaff> staffRows = staffService.selectStaffList(query);
        Set<Long> blacklistedIds = new HashSet<>(
            staffService.selectBlacklistedStaffIds(extractStaffIds(staffRows)));

        String normalizedSubDirection = normalize(subDirection);
        String normalizedScheduleStatus = normalize(scheduleStatus);

        List<Map<String, Object>> rows = new ArrayList<>();
        for (OsgStaff staff : staffRows)
        {
            if (blacklistedIds.contains(staff.getStaffId()))
            {
                continue;
            }
            if (normalizedSubDirection != null
                    && !normalizedSubDirection.equalsIgnoreCase(safe(staff.getSubDirection())))
            {
                continue;
            }
            String derivedSchedule = deriveScheduleStatus(staff.getStudentCount());
            if (normalizedScheduleStatus != null
                    && !normalizedScheduleStatus.equalsIgnoreCase(derivedSchedule))
            {
                continue;
            }
            rows.add(toRow(staff, derivedSchedule));
        }

        return AjaxResult.success().put("rows", rows);
    }

    private boolean hasLeadMentorAccess()
    {
        LoginUser loginUser = SecurityUtils.getLoginUser();
        SysUser user = loginUser == null ? null : loginUser.getUser();
        return leadMentorAccessService.hasLeadMentorAccess(user);
    }

    private Map<String, Object> toRow(OsgStaff staff, String scheduleStatus)
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("staffId", staff.getStaffId());
        row.put("staffName", staff.getStaffName());
        row.put("majorDirection", staff.getMajorDirection());
        row.put("subDirection", staff.getSubDirection());
        row.put("region", staff.getRegion());
        row.put("city", staff.getCity());
        row.put("hourlyRate", staff.getHourlyRate());
        row.put("studentCount", staff.getStudentCount() == null ? 0 : staff.getStudentCount());
        row.put("scheduleStatus", scheduleStatus);
        return row;
    }

    private List<Long> extractStaffIds(List<OsgStaff> staffRows)
    {
        List<Long> ids = new ArrayList<>(staffRows.size());
        for (OsgStaff staff : staffRows)
        {
            if (staff.getStaffId() != null)
            {
                ids.add(staff.getStaffId());
            }
        }
        return ids;
    }

    /**
     * studentCount 缺省视为 0；&lt;3 视为有空闲，3-5 视为正常，&gt;5 视为排期紧张。
     */
    private String deriveScheduleStatus(Integer studentCount)
    {
        int count = studentCount == null ? 0 : studentCount;
        if (count < 3)
        {
            return SCHEDULE_AVAILABLE;
        }
        if (count <= 5)
        {
            return SCHEDULE_NORMAL;
        }
        return SCHEDULE_BUSY;
    }

    private String normalize(String value)
    {
        if (value == null)
        {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String safe(String value)
    {
        return value == null ? "" : value;
    }
}
