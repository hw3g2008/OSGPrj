package com.ruoyi.web.controller.osg;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.domain.OsgJobCoaching;
import com.ruoyi.system.service.IOsgJobCoachingService;
import com.ruoyi.common.core.domain.entity.SysUser;
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

    /**
     * 获取当前导师辅导的学员列表
     * 逻辑：从 osg_job_coaching 表查出 mentor_id = 当前用户 的所有 student_id，
     *       去重后查 sys_user 返回学员基本信息
     */
    @GetMapping("/list")
    public TableDataInfo list()
    {
        Long mentorId = SecurityUtils.getUserId();
        OsgJobCoaching query = new OsgJobCoaching();
        query.setMentorId(mentorId);
        List<OsgJobCoaching> coachings = jobCoachingService.selectList(query);

        // 提取去重的 studentId
        List<Long> studentIds = coachings.stream()
                .map(OsgJobCoaching::getStudentId)
                .distinct()
                .toList();

        if (studentIds.isEmpty())
        {
            return getDataTable(List.of());
        }

        // 批量查学员信息
        List<SysUser> students = studentIds.stream()
                .map(userService::selectUserById)
                .filter(u -> u != null)
                .toList();

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
}
