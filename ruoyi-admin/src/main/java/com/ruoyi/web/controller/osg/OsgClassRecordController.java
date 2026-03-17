package com.ruoyi.web.controller.osg;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.system.service.impl.OsgClassRecordServiceImpl;

@RestController
@RequestMapping("/admin/class-record")
public class OsgClassRecordController extends BaseController
{
    private static final String CLASS_RECORD_ACCESS = "@ss.hasPermi('admin:class-records:list')";

    @Autowired
    private OsgClassRecordServiceImpl classRecordService;

    @PreAuthorize(CLASS_RECORD_ACCESS)
    @GetMapping("/list")
    public TableDataInfo list(@RequestParam(value = "keyword", required = false) String keyword)
    {
        startPage();
        List<Map<String, Object>> rows = classRecordService.selectClassRecordList(keyword);
        return getDataTable(rows);
    }

    @PreAuthorize(CLASS_RECORD_ACCESS)
    @GetMapping("/stats")
    public AjaxResult stats(@RequestParam(value = "keyword", required = false) String keyword)
    {
        return AjaxResult.success(classRecordService.selectClassRecordStats(keyword));
    }
}
