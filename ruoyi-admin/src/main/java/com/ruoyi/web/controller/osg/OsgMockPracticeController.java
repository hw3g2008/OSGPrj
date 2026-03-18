package com.ruoyi.web.controller.osg;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.domain.OsgMockPractice;
import com.ruoyi.system.service.IOsgMockPracticeService;
@RestController
@RequestMapping("/api/mentor/mock-practice")
public class OsgMockPracticeController extends BaseController {
    @Autowired private IOsgMockPracticeService service;
    @GetMapping("/list")
    public TableDataInfo list(OsgMockPractice q) {
        startPage();
        q.setCurrentMentorId(SecurityUtils.getUserId());
        return getDataTable(service.selectList(q));
    }
    @PutMapping("/{id}/confirm")
    public AjaxResult confirm(@PathVariable Long id) {
        OsgMockPractice r = new OsgMockPractice();
        r.setPracticeId(id);
        r.setStatus("confirmed");
        return toAjax(service.update(r));
    }
}
