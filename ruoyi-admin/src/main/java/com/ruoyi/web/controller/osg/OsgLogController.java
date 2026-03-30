package com.ruoyi.web.controller.osg;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.annotation.Excel;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.utils.file.FileUtils;
import com.ruoyi.common.utils.poi.ExcelUtil;
import com.ruoyi.system.domain.SysOperLog;
import com.ruoyi.system.service.impl.SysOperLogServiceImpl;
import jakarta.servlet.http.HttpServletResponse;

@RestController
@RequestMapping("/admin/log")
public class OsgLogController extends BaseController
{
    private static final String LOG_ACCESS = "@ss.hasPermi('admin:logs:list')";

    @Autowired
    private SysOperLogServiceImpl operLogService;

    @PreAuthorize(LOG_ACCESS)
    @GetMapping("/list")
    public AjaxResult list(@RequestParam(value = "keyword", required = false) String keyword,
                           @RequestParam(value = "operationType", required = false) String operationType,
                           @RequestParam(value = "beginTime", required = false) String beginTime,
                           @RequestParam(value = "endTime", required = false) String endTime)
    {
        List<Map<String, Object>> rows = operLogService.selectScopedOperLogList(keyword, operationType, beginTime, endTime)
            .stream()
            .map(this::toRow)
            .collect(Collectors.toList());
        return AjaxResult.success().put("rows", rows);
    }

    @PreAuthorize(LOG_ACCESS)
    @GetMapping("/export")
    public void export(HttpServletResponse response,
                       @RequestParam(value = "keyword", required = false) String keyword,
                       @RequestParam(value = "operationType", required = false) String operationType,
                       @RequestParam(value = "beginTime", required = false) String beginTime,
                       @RequestParam(value = "endTime", required = false) String endTime)
    {
        prepareExportResponse(response, "操作日志.xlsx");
        List<LogExportRow> exportRows = operLogService.selectScopedOperLogList(keyword, operationType, beginTime, endTime)
            .stream()
            .map(LogExportRow::from)
            .toList();
        ExcelUtil<LogExportRow> util = new ExcelUtil<>(LogExportRow.class);
        util.exportExcel(response, exportRows, "操作日志");
    }

    private void prepareExportResponse(HttpServletResponse response, String fileName)
    {
        try
        {
            FileUtils.setAttachmentResponseHeader(response, fileName);
        }
        catch (java.io.UnsupportedEncodingException ex)
        {
            throw new IllegalStateException("设置导出响应头失败", ex);
        }
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

    private static String toRoleLabel(Integer operatorType)
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

    private static String toOperationType(SysOperLog operLog)
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

    private static class LogExportRow
    {
        @Excel(name = "操作序号")
        private final Long operId;

        @Excel(name = "操作时间", width = 20, dateFormat = "yyyy-MM-dd HH:mm:ss")
        private final java.util.Date operateTime;

        @Excel(name = "操作人")
        private final String operatorName;

        @Excel(name = "角色")
        private final String roleLabel;

        @Excel(name = "操作类型")
        private final String operationType;

        @Excel(name = "操作内容")
        private final String content;

        @Excel(name = "IP地址")
        private final String ipAddress;

        @Excel(name = "请求方式")
        private final String requestMethod;

        @Excel(name = "请求地址")
        private final String requestUrl;

        @Excel(name = "执行结果")
        private final String resultLabel;

        @Excel(name = "错误信息")
        private final String errorMessage;

        private LogExportRow(Long operId, java.util.Date operateTime, String operatorName, String roleLabel,
                             String operationType, String content, String ipAddress, String requestMethod,
                             String requestUrl, String resultLabel, String errorMessage)
        {
            this.operId = operId;
            this.operateTime = operateTime;
            this.operatorName = operatorName;
            this.roleLabel = roleLabel;
            this.operationType = operationType;
            this.content = content;
            this.ipAddress = ipAddress;
            this.requestMethod = requestMethod;
            this.requestUrl = requestUrl;
            this.resultLabel = resultLabel;
            this.errorMessage = errorMessage;
        }

        private static LogExportRow from(SysOperLog operLog)
        {
            return new LogExportRow(
                operLog.getOperId(),
                operLog.getOperTime(),
                operLog.getOperName(),
                toRoleLabel(operLog.getOperatorType()),
                toOperationType(operLog),
                operLog.getTitle(),
                operLog.getOperIp(),
                operLog.getRequestMethod(),
                operLog.getOperUrl(),
                Integer.valueOf(1).equals(operLog.getStatus()) ? "异常" : "正常",
                operLog.getErrorMsg()
            );
        }
    }
}
