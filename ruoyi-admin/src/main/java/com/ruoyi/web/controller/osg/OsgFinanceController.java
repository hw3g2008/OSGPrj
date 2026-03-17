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
import com.ruoyi.system.service.impl.OsgFinanceServiceImpl;

@RestController
@RequestMapping("/admin/finance")
public class OsgFinanceController extends BaseController
{
    private static final String FINANCE_ACCESS = "@ss.hasPermi('admin:finance:list')";

    @Autowired
    private OsgFinanceServiceImpl financeService;

    @PreAuthorize(FINANCE_ACCESS)
    @GetMapping("/list")
    public AjaxResult list(@RequestParam(required = false) String keyword,
                           @RequestParam(required = false) String source,
                           @RequestParam(required = false) String tab,
                           @RequestParam(required = false) String startDate,
                           @RequestParam(required = false) String endDate)
    {
        List<Map<String, Object>> rows = financeService.selectFinanceSettlementList(keyword, source, tab, startDate, endDate);
        return AjaxResult.success()
            .put("rows", rows);
    }

    @PreAuthorize(FINANCE_ACCESS)
    @GetMapping("/stats")
    public AjaxResult stats(@RequestParam(required = false) String keyword,
                            @RequestParam(required = false) String source,
                            @RequestParam(required = false) String startDate,
                            @RequestParam(required = false) String endDate)
    {
        return AjaxResult.success(financeService.selectFinanceSettlementStats(keyword, source, startDate, endDate));
    }

    @PreAuthorize(FINANCE_ACCESS)
    @PutMapping("/{settlementId}/mark-paid")
    public AjaxResult markPaid(@PathVariable Long settlementId,
                               @RequestBody(required = false) Map<String, Object> body)
    {
        try
        {
            Map<String, Object> result = financeService.markPaid(settlementId, body, resolveOperator());
            return AjaxResult.success("课时费已标记支付", result);
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    @PreAuthorize(FINANCE_ACCESS)
    @PutMapping("/batch-pay")
    public AjaxResult batchPay(@RequestBody Map<String, Object> body)
    {
        try
        {
            Map<String, Object> result = financeService.batchPay(body, resolveOperator());
            return AjaxResult.success("课时费批量标记支付", result)
                .put("reviewedCount", result.get("reviewedCount"))
                .put("totalAmount", result.get("totalAmount"));
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
