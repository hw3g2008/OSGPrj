package com.ruoyi.web.controller.osg;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.system.domain.SysOperLog;
import com.ruoyi.system.service.ISysOperLogService;

@RestController
@RequestMapping("/admin/log")
public class OsgLogController extends BaseController
{
    private static final String LOG_ACCESS = "@ss.hasPermi('admin:logs:list')";

    @Autowired
    private ISysOperLogService operLogService;

    @PreAuthorize(LOG_ACCESS)
    @GetMapping("/list")
    public AjaxResult list()
    {
        List<Map<String, Object>> rows = operLogService.selectOperLogList(new SysOperLog())
            .stream()
            .map(this::toRow)
            .collect(Collectors.toList());
        return AjaxResult.success().put("rows", rows);
    }

    @PreAuthorize(LOG_ACCESS)
    @GetMapping("/export")
    public AjaxResult export()
    {
        int exportCount = operLogService.selectOperLogList(new SysOperLog()).size();
        return AjaxResult.success()
            .put("fileName", "操作日志.xlsx")
            .put("exportCount", exportCount);
    }

    private Map<String, Object> toRow(SysOperLog operLog)
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("operId", operLog.getOperId());
        row.put("operateTime", operLog.getOperTime());
        row.put("operatorName", operLog.getOperName());
        row.put("roleLabel", toRoleLabel(operLog.getOperatorType()));
        row.put("operationType", toOperationType(operLog));
        row.put("content", operLog.getTitle());
        row.put("ipAddress", operLog.getOperIp());
        return row;
    }

    private String toRoleLabel(Integer operatorType)
    {
        if (operatorType == null)
        {
            return "Other";
        }
        return switch (operatorType)
        {
            case 1 -> "Admin";
            case 2 -> "Student";
            default -> "Other";
        };
    }

    private String toOperationType(SysOperLog operLog)
    {
        if ("登录".equals(operLog.getTitle()))
        {
            return "登录";
        }
        Integer businessType = operLog.getBusinessType();
        if (businessType == null)
        {
            return "其它";
        }
        return switch (businessType)
        {
            case 1 -> "新增";
            case 2 -> "修改";
            case 3 -> "删除";
            default -> "其它";
        };
    }
}
