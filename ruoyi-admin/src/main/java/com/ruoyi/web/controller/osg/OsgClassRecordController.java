package com.ruoyi.web.controller.osg;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.domain.OsgClassRecord;
import com.ruoyi.system.service.impl.OsgClassRecordServiceImpl;

@RestController
public class OsgClassRecordController extends BaseController
{
    private static final String CLASS_RECORD_ACCESS = "@ss.hasPermi('admin:class-records:list')";

    @Autowired
    private OsgClassRecordServiceImpl classRecordService;

    @PreAuthorize(CLASS_RECORD_ACCESS)
    @GetMapping("/admin/class-record/list")
    public TableDataInfo list(@RequestParam(value = "keyword", required = false) String keyword)
    {
        startPage();
        List<Map<String, Object>> rows = classRecordService.selectClassRecordList(keyword);
        return getDataTable(rows);
    }

    @PreAuthorize(CLASS_RECORD_ACCESS)
    @GetMapping("/admin/class-record/stats")
    public AjaxResult stats(@RequestParam(value = "keyword", required = false) String keyword)
    {
        return AjaxResult.success(classRecordService.selectClassRecordStats(keyword));
    }

    @GetMapping("/api/mentor/class-records/list")
    public TableDataInfo mentorList(OsgClassRecord query)
    {
        startPage();
        query.setMentorId(SecurityUtils.getUserId());
        return getDataTable(classRecordService.selectMentorClassRecordList(query));
    }

    @GetMapping("/api/mentor/class-records/{id}")
    public AjaxResult getInfo(@PathVariable Long id)
    {
        return success(classRecordService.selectMentorClassRecordById(id));
    }

    @PostMapping("/api/mentor/class-records")
    public AjaxResult add(@RequestBody OsgClassRecord record)
    {
        record.setMentorId(SecurityUtils.getUserId());
        record.setMentorName(SecurityUtils.getUsername());
        record.setCreateBy(SecurityUtils.getUsername());
        return toAjax(classRecordService.createMentorClassRecord(record));
    }
}
