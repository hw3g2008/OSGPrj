package com.ruoyi.web.controller.osg;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.domain.OsgSimPractice;
import com.ruoyi.system.service.IOsgSimPracticeService;
@RestController
@RequestMapping("/api/mentor/sim-practice")
public class OsgSimPracticeController extends BaseController {
    @Autowired private IOsgSimPracticeService service;
    @GetMapping("/list")
    public TableDataInfo list(OsgSimPractice q) {
        startPage();
        q.setCurrentMentorId(SecurityUtils.getUserId());
        return getDataTable(service.selectList(q));
    }
    @PutMapping("/{id}/confirm")
    public AjaxResult confirm(@PathVariable Long id) {
        OsgSimPractice r = new OsgSimPractice();
        r.setPracticeId(id);
        r.setStatus("confirmed");
        return toAjax(service.update(r));
    }
}
