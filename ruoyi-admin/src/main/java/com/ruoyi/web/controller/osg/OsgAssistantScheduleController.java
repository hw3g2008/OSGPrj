package com.ruoyi.web.controller.osg;

import java.text.SimpleDateFormat;
import java.util.Calendar;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ruoyi.common.constant.HttpStatus;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.domain.OsgMentorSchedule;
import com.ruoyi.system.service.IOsgMentorScheduleService;
import com.ruoyi.system.service.impl.OsgAssistantAccessService;

@RestController
@RequestMapping("/assistant/schedule")
public class OsgAssistantScheduleController extends BaseController
{
    private static final String ACCESS_DENIED_MESSAGE = "该账号无助教端访问权限";

    @Autowired
    private IOsgMentorScheduleService scheduleService;

    @Autowired
    private OsgAssistantAccessService assistantAccessService;

    @GetMapping
    public AjaxResult current()
    {
        if (!hasAssistantAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }
        return success(scheduleService.selectByMentorAndWeek(SecurityUtils.getUserId(), getCurrentWeekStart()));
    }

    @PutMapping
    public AjaxResult save(@RequestBody OsgMentorSchedule schedule)
    {
        if (!hasAssistantAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }
        schedule.setMentorId(SecurityUtils.getUserId());
        schedule.setCreateBy(SecurityUtils.getUsername());
        schedule.setUpdateBy(SecurityUtils.getUsername());
        return toAjax(scheduleService.saveOrUpdate(schedule));
    }

    @GetMapping("/last-week")
    public AjaxResult lastWeek()
    {
        if (!hasAssistantAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }
        return success(scheduleService.selectByMentorAndWeek(SecurityUtils.getUserId(), getLastWeekStart()));
    }

    private boolean hasAssistantAccess()
    {
        LoginUser loginUser = SecurityUtils.getLoginUser();
        SysUser user = loginUser == null ? null : loginUser.getUser();
        return assistantAccessService.hasAssistantAccess(user);
    }

    private String getCurrentWeekStart()
    {
        Calendar c = Calendar.getInstance();
        c.set(Calendar.DAY_OF_WEEK, Calendar.MONDAY);
        return new SimpleDateFormat("yyyy-MM-dd").format(c.getTime());
    }

    private String getLastWeekStart()
    {
        Calendar c = Calendar.getInstance();
        c.set(Calendar.DAY_OF_WEEK, Calendar.MONDAY);
        c.add(Calendar.WEEK_OF_YEAR, -1);
        return new SimpleDateFormat("yyyy-MM-dd").format(c.getTime());
    }
}
