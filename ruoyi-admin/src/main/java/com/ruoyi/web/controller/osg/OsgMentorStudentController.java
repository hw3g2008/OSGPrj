package com.ruoyi.web.controller.osg;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.domain.OsgCoaching;
import com.ruoyi.system.domain.OsgJobCoaching;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.OsgCoachingMapper;
import com.ruoyi.system.mapper.OsgStudentMapper;
import com.ruoyi.system.service.IOsgJobCoachingService;
import com.ruoyi.system.service.ISysUserService;

/**
 * 导师的学员列表 — 供上报课程弹窗选择学员用
 */
@RestController
@RequestMapping("/api/mentor/students")
public class OsgMentorStudentController extends BaseController
{
    @Autowired
    private ISysUserService userService;

    @Autowired
    private IOsgJobCoachingService jobCoachingService;

    @Autowired
    private OsgCoachingMapper coachingMapper;

    @Autowired
    private OsgStudentMapper studentMapper;

    /**
     * 获取当前导师辅导的学员列表。
     * 兼容 legacy 的 osg_job_coaching 和 current 的 osg_coaching 两种导师关系来源，
     * 先从 osg_student 返回可展示字段，再必要时回退 sys_user。
     */
    @GetMapping("/list")
    public TableDataInfo list()
    {
        Long mentorId = SecurityUtils.getUserId();
        LinkedHashSet<Long> studentIds = new LinkedHashSet<>();
        studentIds.addAll(loadStudentIdsFromCurrentCoachings(mentorId));
        studentIds.addAll(loadStudentIdsFromLegacyCoachings(mentorId));

        if (studentIds.isEmpty())
        {
            return getDataTable(List.of());
        }

        List<Long> orderedStudentIds = new ArrayList<>(studentIds);
        Map<Long, OsgStudent> studentsById = defaultList(studentMapper.selectStudentByStudentIds(orderedStudentIds)).stream()
            .filter(Objects::nonNull)
            .filter(student -> student.getStudentId() != null)
            .collect(java.util.stream.Collectors.toMap(
                OsgStudent::getStudentId,
                student -> student,
                (first, second) -> first,
                LinkedHashMap::new
            ));

        List<Map<String, Object>> students = new ArrayList<>();
        for (Long studentId : orderedStudentIds)
        {
            OsgStudent student = studentsById.get(studentId);
            if (student != null)
            {
                students.add(toStudentOption(student));
                continue;
            }

            SysUser fallbackUser = userService.selectUserById(studentId);
            if (fallbackUser != null)
            {
                students.add(toUserOption(fallbackUser));
            }
        }

        return getDataTable(students);
    }

    /**
     * 获取指定学员关联的岗位列表（供上报弹窗岗位辅导选择）
     */
    @GetMapping("/{studentId}/positions")
    public AjaxResult positions(@PathVariable Long studentId)
    {
        OsgJobCoaching query = new OsgJobCoaching();
        query.setMentorId(SecurityUtils.getUserId());
        query.setStudentId(studentId);
        return success(jobCoachingService.selectList(query));
    }

    private List<Long> loadStudentIdsFromCurrentCoachings(Long mentorId)
    {
        return defaultList(coachingMapper.selectCoachingList(new OsgCoaching())).stream()
            .filter(coaching -> matchesMentorRelation(coaching, mentorId))
            .map(OsgCoaching::getStudentId)
            .filter(Objects::nonNull)
            .toList();
    }

    private List<Long> loadStudentIdsFromLegacyCoachings(Long mentorId)
    {
        OsgJobCoaching query = new OsgJobCoaching();
        query.setMentorId(mentorId);
        return defaultList(jobCoachingService.selectList(query)).stream()
            .map(OsgJobCoaching::getStudentId)
            .filter(Objects::nonNull)
            .toList();
    }

    private Map<String, Object> toStudentOption(OsgStudent student)
    {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("userId", student.getStudentId());
        payload.put("nickName", displayName(student.getStudentName(), student.getStudentId()));
        payload.put("studentId", student.getStudentId());
        payload.put("studentName", displayName(student.getStudentName(), student.getStudentId()));
        payload.put("email", student.getEmail());
        return payload;
    }

    private Map<String, Object> toUserOption(SysUser user)
    {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("userId", user.getUserId());
        payload.put("nickName", displayName(user.getNickName(), user.getUserId()));
        payload.put("studentId", user.getUserId());
        payload.put("studentName", displayName(user.getNickName(), user.getUserId()));
        payload.put("email", user.getEmail());
        return payload;
    }

    private String displayName(String name, Long id)
    {
        if (name != null && !name.isBlank())
        {
            return name;
        }
        return id == null ? "-" : String.valueOf(id);
    }

    private <T> List<T> defaultList(List<T> list)
    {
        return list == null ? List.of() : list;
    }

    private boolean matchesMentorRelation(OsgCoaching coaching, Long mentorId)
    {
        if (coaching == null || mentorId == null)
        {
            return false;
        }
        if (mentorId.equals(coaching.getMentorId()))
        {
            return true;
        }
        String mentorIds = coaching.getMentorIds();
        if (mentorIds == null || mentorIds.isBlank())
        {
            return false;
        }
        String token = String.valueOf(mentorId);
        return java.util.Arrays.stream(mentorIds.split(","))
            .map(String::trim)
            .anyMatch(token::equals);
    }
}
