package com.ruoyi.web.controller.osg;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.service.impl.OsgClassRecordServiceImpl;

@RestController
@RequestMapping("/admin/report")
public class OsgReportController extends BaseController
{
    private static final String REPORT_ACCESS = "@ss.hasPermi('admin:class-records:list')";

    @Autowired
    private OsgClassRecordServiceImpl classRecordService;

    @PreAuthorize(REPORT_ACCESS)
    @GetMapping("/list")
    public AjaxResult list(@RequestParam(required = false) String keyword,
                           @RequestParam(required = false) String courseType,
                           @RequestParam(required = false) String courseSource,
                           @RequestParam(required = false) String tab)
    {
        List<Map<String, Object>> rows = classRecordService.selectReportList(keyword, courseType, courseSource, tab);
        return AjaxResult.success()
            .put("rows", rows)
            .put("summary", classRecordService.selectReportSummary(keyword, courseType, courseSource, tab));
    }

    @PreAuthorize(REPORT_ACCESS)
    @GetMapping("/{recordId}")
    public AjaxResult detail(@PathVariable Long recordId)
    {
        return AjaxResult.success(classRecordService.selectReportDetail(recordId));
    }

    @PreAuthorize(REPORT_ACCESS)
    @PutMapping("/{recordId}/approve")
    public AjaxResult approve(@PathVariable Long recordId,
                              @RequestBody(required = false) Map<String, Object> body)
    {
        try
        {
            Map<String, Object> result = classRecordService.approveRecord(recordId, body, resolveOperator());
            return AjaxResult.success("课时审核已通过", result)
                .put("status", result.get("status"));
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    @PreAuthorize(REPORT_ACCESS)
    @PutMapping("/{recordId}/reject")
    public AjaxResult reject(@PathVariable Long recordId,
                             @RequestBody(required = false) Map<String, Object> body)
    {
        try
        {
            Map<String, Object> result = classRecordService.rejectRecord(recordId, body, resolveOperator());
            return AjaxResult.success("课时审核已驳回", result)
                .put("status", result.get("status"));
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    @PreAuthorize(REPORT_ACCESS)
    @PutMapping("/batch-approve")
    public AjaxResult batchApprove(@RequestBody Map<String, Object> body)
    {
        try
        {
            Map<String, Object> result = classRecordService.batchApprove(body, resolveOperator());
            return AjaxResult.success("课时批量审核通过", result)
                .put("status", result.get("status"))
                .put("reviewedCount", result.get("reviewedCount"));
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    @PreAuthorize(REPORT_ACCESS)
    @PutMapping("/batch-reject")
    public AjaxResult batchReject(@RequestBody Map<String, Object> body)
    {
        try
        {
            Map<String, Object> result = classRecordService.batchReject(body, resolveOperator());
            return AjaxResult.success("课时批量驳回完成", result)
                .put("status", result.get("status"))
                .put("reviewedCount", result.get("reviewedCount"));
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    private String resolveOperator()
    {
        try
        {
            return getUsername();
        }
        catch (ServiceException ex)
        {
            return "system";
        }
    }
}
