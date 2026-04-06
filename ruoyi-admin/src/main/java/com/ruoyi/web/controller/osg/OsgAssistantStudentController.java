package com.ruoyi.web.controller.osg;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ruoyi.common.constant.HttpStatus;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.service.ISysUserService;
import com.ruoyi.system.service.impl.OsgAssistantAccessService;
import com.ruoyi.system.service.impl.OsgStudentServiceImpl;

@RestController
@RequestMapping("/assistant/students")
public class OsgAssistantStudentController extends BaseController
{
    private static final String ACCESS_DENIED_MESSAGE = "该账号无助教端访问权限";

    @Autowired
    private OsgStudentServiceImpl studentService;

    @Autowired
    private ISysUserService userService;

    @Autowired
    private OsgAssistantAccessService assistantAccessService;

    @GetMapping("/list")
    public TableDataInfo list(OsgStudent student)
    {
        if (!hasAssistantAccess())
        {
            TableDataInfo info = new TableDataInfo();
            info.setCode(HttpStatus.FORBIDDEN);
            info.setMsg(ACCESS_DENIED_MESSAGE);
            return info;
        }

        student.setAssistantId(getUserId());
        startPage();
        List<OsgStudent> students = studentService.selectStudentList(student);
        List<Long> studentIds = extractStudentIds(students);
        Map<Long, Map<String, Integer>> activityCounts = studentService.selectStudentActivityCounts(studentIds);
        List<Long> blacklistedIds = studentService.selectBlacklistedStudentIds(studentIds);
        return getDataTable(toTableRows(students, blacklistedIds, activityCounts));
    }

    private List<Map<String, Object>> toTableRows(List<OsgStudent> students,
        List<Long> blacklistedIds, Map<Long, Map<String, Integer>> activityCounts)
    {
        Set<Long> blackSet = new HashSet<>(blacklistedIds);
        List<Map<String, Object>> rows = new ArrayList<>(students.size());
        for (OsgStudent s : students)
        {
            Map<String, Object> contractSnapshot = resolveContractSnapshot(s.getStudentId());
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("studentId", s.getStudentId());
            row.put("studentName", s.getStudentName());
            row.put("email", s.getEmail());
            row.put("leadMentorId", s.getLeadMentorId());
            row.put("leadMentorName", formatMentorName(s.getLeadMentorId()));
            row.put("school", s.getSchool());
            row.put("majorDirection", s.getMajorDirection());
            row.put("targetPosition", s.getSubDirection() == null || s.getSubDirection().isBlank() ? "-" : s.getSubDirection());
            row.put("totalHours", contractSnapshot.get("totalHours"));
            row.put("jobCoachingCount", resolveActivityCount(activityCounts, s.getStudentId(), "jobCoachingCount"));
            row.put("basicCourseCount", resolveActivityCount(activityCounts, s.getStudentId(), "basicCourseCount"));
            row.put("mockInterviewCount", resolveActivityCount(activityCounts, s.getStudentId(), "mockInterviewCount"));
            row.put("remainingHours", contractSnapshot.get("remainingHours"));
            row.put("contractStatus", contractSnapshot.get("contractStatus"));
            row.put("accountStatus", s.getAccountStatus() == null || s.getAccountStatus().isBlank() ? "0" : s.getAccountStatus());
            row.put("isBlacklisted", blackSet.contains(s.getStudentId()));
            rows.add(row);
        }
        return rows;
    }

    private List<Long> extractStudentIds(List<OsgStudent> students)
    {
        List<Long> ids = new ArrayList<>(students.size());
        for (OsgStudent s : students)
        {
            ids.add(s.getStudentId());
        }
        return ids;
    }

    private Map<String, Object> resolveContractSnapshot(Long studentId)
    {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("totalHours", 0);
        snapshot.put("remainingHours", BigDecimal.ZERO);
        snapshot.put("contractStatus", "normal");
        if (studentId == null)
        {
            return snapshot;
        }
        Map<String, Object> payload = studentService.selectStudentContracts(studentId);
        if (payload == null || payload.isEmpty())
        {
            return snapshot;
        }
        Map<String, Object> summary = payload.get("summary") instanceof Map<?, ?> value
            ? castObjectMap(value) : Map.of();
        snapshot.put("totalHours", asInteger(summary.get("totalHours")));
        snapshot.put("remainingHours", asDecimal(summary.get("remainingHours")));
        return snapshot;
    }

    private int resolveActivityCount(Map<Long, Map<String, Integer>> activityCounts, Long studentId, String key)
    {
        if (activityCounts == null || studentId == null) return 0;
        Map<String, Integer> m = activityCounts.get(studentId);
        if (m == null) return 0;
        Integer v = m.get(key);
        return v == null ? 0 : v;
    }

    private Integer asInteger(Object value)
    {
        if (value == null) return 0;
        if (value instanceof Number n) return n.intValue();
        try { return Integer.parseInt(String.valueOf(value)); }
        catch (NumberFormatException ex) { return 0; }
    }

    private BigDecimal asDecimal(Object value)
    {
        if (value == null) return BigDecimal.ZERO;
        if (value instanceof BigDecimal d) return d.stripTrailingZeros();
        if (value instanceof Number n) return BigDecimal.valueOf(n.doubleValue()).stripTrailingZeros();
        try { return new BigDecimal(String.valueOf(value)).stripTrailingZeros(); }
        catch (NumberFormatException ex) { return BigDecimal.ZERO; }
    }

    private Map<String, Object> castObjectMap(Map<?, ?> source)
    {
        Map<String, Object> result = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : source.entrySet())
        {
            result.put(String.valueOf(entry.getKey()), entry.getValue());
        }
        return result;
    }

    private String formatMentorName(Long mentorId)
    {
        if (mentorId == null) return "-";
        com.ruoyi.common.core.domain.entity.SysUser u = userService.selectUserById(mentorId);
        if (u == null) return String.valueOf(mentorId);
        String name = u.getNickName();
        return name == null || name.isBlank() ? u.getUserName() : name;
    }

    private boolean hasAssistantAccess()
    {
        LoginUser loginUser = SecurityUtils.getLoginUser();
        SysUser user = loginUser == null ? null : loginUser.getUser();
        return assistantAccessService.hasAssistantAccess(user);
    }
}
