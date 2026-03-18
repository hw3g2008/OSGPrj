package com.ruoyi.web.controller.osg;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.domain.OsgClassRecord;
import com.ruoyi.system.service.IOsgClassRecordService;

@RestController
@RequestMapping("/api/mentor/class-records")
public class OsgClassRecordController extends BaseController
{
    @Autowired
    private IOsgClassRecordService service;

    @GetMapping("/list")
    public TableDataInfo list(OsgClassRecord query)
    {
        startPage();
        query.setMentorId(SecurityUtils.getUserId());
        List<OsgClassRecord> list = service.selectList(query);
        return getDataTable(list);
    }

    @GetMapping("/{id}")
    public AjaxResult getInfo(@PathVariable Long id) { return success(service.selectById(id)); }

    @PostMapping
    public AjaxResult add(@RequestBody OsgClassRecord record)
    {
        record.setMentorId(SecurityUtils.getUserId());
        record.setMentorName(SecurityUtils.getUsername());
        record.setCreateBy(SecurityUtils.getUsername());
        return toAjax(service.insert(record));
    }
}
