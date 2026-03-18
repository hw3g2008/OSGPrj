package com.ruoyi.web.controller.osg;

import java.util.Map;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import com.ruoyi.common.config.RuoYiConfig;
import com.ruoyi.common.annotation.Excel;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.file.FileUploadUtils;
import com.ruoyi.common.utils.poi.ExcelUtil;
import com.ruoyi.framework.config.ServerConfig;
import com.ruoyi.system.domain.OsgContract;
import com.ruoyi.system.service.IOsgContractService;

@RestController
@RequestMapping("/admin/contract")
public class OsgContractController extends BaseController
{
    private static final long MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024L;

    private static final String[] PDF_EXTENSION = { "pdf" };

    private static final String CONTRACT_ROLE_ACCESS = "@ss.hasPermi('admin:contracts:list')";

    @Autowired
    private IOsgContractService contractService;

    @Autowired
    private ServerConfig serverConfig;

    @PreAuthorize(CONTRACT_ROLE_ACCESS)
    @GetMapping("/list")
    public TableDataInfo list(OsgContract contract)
    {
        startPage();
        List<OsgContract> rows = contractService.selectContractList(contract);
        return getDataTable(rows);
    }

    @PreAuthorize(CONTRACT_ROLE_ACCESS)
    @GetMapping("/stats")
    public AjaxResult stats(OsgContract contract)
    {
        Map<String, Object> stats = contractService.selectContractStats(contract);
        return AjaxResult.success(stats);
    }

    @PreAuthorize(CONTRACT_ROLE_ACCESS)
    @GetMapping("/export")
    public void export(jakarta.servlet.http.HttpServletResponse response, OsgContract contract)
    {
        List<OsgContract> rows = contractService.selectContractList(contract);
        List<ContractExportRow> exportRows = rows.stream()
            .map(ContractExportRow::from)
            .toList();
        ExcelUtil<ContractExportRow> util = new ExcelUtil<>(ContractExportRow.class);
        util.exportExcel(response, exportRows, "合同列表");
    }

    @PreAuthorize(CONTRACT_ROLE_ACCESS)
    @PostMapping("/renew")
    public AjaxResult renew(@RequestBody Map<String, Object> body)
    {
        try
        {
            Map<String, Object> result = contractService.renewContract(body, getUsername());
            return AjaxResult.success("续签合同成功", result);
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    @PreAuthorize(CONTRACT_ROLE_ACCESS)
    @PostMapping("/upload")
    public AjaxResult upload(@RequestParam("file") MultipartFile file,
                             @RequestParam(value = "contractId", required = false) Long contractId)
    {
        if (file == null || file.isEmpty())
        {
            return AjaxResult.error("附件不能为空");
        }
        if (file.getSize() > MAX_ATTACHMENT_SIZE)
        {
            return AjaxResult.error("合同附件不能超过10MB");
        }

        try
        {
            String attachmentPath = FileUploadUtils.upload(RuoYiConfig.getUploadPath() + "/contracts", file, PDF_EXTENSION, true);
            Map<String, Object> persisted = contractId == null
                ? Map.of("attachmentPath", attachmentPath)
                : contractService.updateContractAttachment(contractId, attachmentPath, getUsername());
            AjaxResult ajax = AjaxResult.success("合同附件上传成功");
            ajax.put("attachmentPath", attachmentPath);
            ajax.put("url", serverConfig.getUrl() + attachmentPath);
            ajax.putAll(persisted);
            return ajax;
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
        catch (Exception ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    private static class ContractExportRow
    {
        @Excel(name = "合同号")
        private final String contractNo;

        @Excel(name = "学员ID")
        private final Long studentId;

        @Excel(name = "学员姓名")
        private final String studentName;

        @Excel(name = "班主任")
        private final String leadMentorName;

        @Excel(name = "合同类型")
        private final String contractType;

        @Excel(name = "合同金额")
        private final java.math.BigDecimal contractAmount;

        @Excel(name = "总课时")
        private final Integer totalHours;

        @Excel(name = "已用课时")
        private final java.math.BigDecimal usedHours;

        @Excel(name = "剩余课时")
        private final java.math.BigDecimal remainingHours;

        @Excel(name = "开始日期", width = 20, dateFormat = "yyyy-MM-dd")
        private final java.util.Date startDate;

        @Excel(name = "结束日期", width = 20, dateFormat = "yyyy-MM-dd")
        private final java.util.Date endDate;

        @Excel(name = "续签原因")
        private final String renewalReason;

        @Excel(name = "合同状态")
        private final String contractStatus;

        private ContractExportRow(String contractNo, Long studentId, String studentName, String leadMentorName,
            String contractType, java.math.BigDecimal contractAmount, Integer totalHours, java.math.BigDecimal usedHours,
            java.math.BigDecimal remainingHours, java.util.Date startDate, java.util.Date endDate, String renewalReason,
            String contractStatus)
        {
            this.contractNo = contractNo;
            this.studentId = studentId;
            this.studentName = studentName;
            this.leadMentorName = leadMentorName;
            this.contractType = contractType;
            this.contractAmount = contractAmount;
            this.totalHours = totalHours;
            this.usedHours = usedHours;
            this.remainingHours = remainingHours;
            this.startDate = startDate;
            this.endDate = endDate;
            this.renewalReason = renewalReason;
            this.contractStatus = contractStatus;
        }

        private static ContractExportRow from(OsgContract contract)
        {
            return new ContractExportRow(
                contract.getContractNo(),
                contract.getStudentId(),
                contract.getStudentName(),
                contract.getLeadMentorName(),
                contract.getContractType(),
                contract.getContractAmount(),
                contract.getTotalHours(),
                contract.getUsedHours() != null ? new java.math.BigDecimal(contract.getUsedHours()) : null,
                contract.getRemainingHours() != null ? new java.math.BigDecimal(contract.getRemainingHours()) : null,
                contract.getStartDate(),
                contract.getEndDate(),
                contract.getRenewalReason(),
                contract.getContractStatus()
            );
        }
    }
}
