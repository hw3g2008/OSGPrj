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

@RestController
@RequestMapping("/api/mentor/job-overview")
public class OsgJobOverviewController extends BaseController {
    @Autowired private IOsgJobCoachingService service;

    @GetMapping("/list")
    public TableDataInfo list(OsgJobCoaching q) {
        startPage(); q.setMentorId(SecurityUtils.getUserId());
        return getDataTable(service.selectList(q));
    }
    @PutMapping("/{id}/confirm")
    public AjaxResult confirm(@PathVariable Long id) {
        OsgJobCoaching r = new OsgJobCoaching(); r.setId(id); r.setCoachingStatus("coaching");
        return toAjax(service.update(r));
    }
    @GetMapping("/calendar")
    public AjaxResult calendar() {
        OsgJobCoaching q = new OsgJobCoaching(); q.setMentorId(SecurityUtils.getUserId());
        return success(service.selectCalendar(q));
    }
}
