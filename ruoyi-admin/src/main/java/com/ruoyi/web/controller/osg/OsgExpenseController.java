package com.ruoyi.web.controller.osg;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.service.IOsgExpenseService;

@RestController
@RequestMapping("/admin/expense")
public class OsgExpenseController extends BaseController
{
    private static final String EXPENSE_ACCESS = "@ss.hasPermi('admin:expense:list')";

    @Autowired
    private IOsgExpenseService expenseService;

    @PreAuthorize(EXPENSE_ACCESS)
    @GetMapping("/list")
    public AjaxResult list(@RequestParam(required = false) String keyword,
                           @RequestParam(required = false) String tab)
    {
        List<Map<String, Object>> rows = expenseService.selectExpenseList(keyword, tab);
        return AjaxResult.success().put("rows", rows);
    }

    @PreAuthorize(EXPENSE_ACCESS)
    @PostMapping
    public AjaxResult create(@RequestBody Map<String, Object> body)
    {
        try
        {
            return AjaxResult.success("报销创建成功", expenseService.createExpense(body, resolveOperator()));
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    @PreAuthorize(EXPENSE_ACCESS)
    @PutMapping("/{expenseId}/review")
    public AjaxResult review(@PathVariable Long expenseId,
                             @RequestBody Map<String, Object> body)
    {
        try
        {
            return AjaxResult.success("报销审核完成", expenseService.reviewExpense(expenseId, body, resolveOperator()));
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
