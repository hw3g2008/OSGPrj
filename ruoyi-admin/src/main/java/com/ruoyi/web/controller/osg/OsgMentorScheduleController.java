package com.ruoyi.web.controller.osg;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.domain.OsgMentorSchedule;
import com.ruoyi.system.service.IOsgMentorScheduleService;
@RestController
@RequestMapping("/api/mentor/schedule")
public class OsgMentorScheduleController extends BaseController {
    @Autowired private IOsgMentorScheduleService service;

    @GetMapping
    public AjaxResult current() {
        return success(service.selectByMentorAndWeek(SecurityUtils.getUserId(), getCurrentWeekStart()));
    }
    @PutMapping
    public AjaxResult save(@RequestBody OsgMentorSchedule r) {
        r.setMentorId(SecurityUtils.getUserId());
        r.setCreateBy(SecurityUtils.getUsername());
        r.setUpdateBy(SecurityUtils.getUsername());
        return toAjax(service.saveOrUpdate(r));
    }
    @GetMapping("/last-week")
    public AjaxResult lastWeek() {
        return success(service.selectByMentorAndWeek(SecurityUtils.getUserId(), getLastWeekStart()));
    }
    private String getCurrentWeekStart() {
        Calendar c = Calendar.getInstance(); c.set(Calendar.DAY_OF_WEEK, Calendar.MONDAY);
        return new SimpleDateFormat("yyyy-MM-dd").format(c.getTime());
    }
    private String getLastWeekStart() {
        Calendar c = Calendar.getInstance(); c.set(Calendar.DAY_OF_WEEK, Calendar.MONDAY); c.add(Calendar.WEEK_OF_YEAR, -1);
        return new SimpleDateFormat("yyyy-MM-dd").format(c.getTime());
    }
}
