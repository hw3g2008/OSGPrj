package com.ruoyi.web.controller.osg;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import jakarta.servlet.http.HttpServletResponse;
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
import org.springframework.web.multipart.MultipartFile;
import com.ruoyi.common.annotation.Excel;
import com.ruoyi.common.constant.HttpStatus;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.common.utils.poi.ExcelUtil;
import com.ruoyi.system.domain.OsgPosition;
import com.ruoyi.system.service.impl.OsgAssistantAccessService;
import com.ruoyi.system.service.impl.OsgPositionServiceImpl;

@RestController
@RequestMapping("/admin/position")
public class OsgPositionController extends BaseController
{
    private static final String POSITION_ROLE_ACCESS = "@ss.hasPermi('admin:positions:list')";

    @Autowired
    private OsgPositionServiceImpl positionService;

    @Autowired
    private OsgAssistantAccessService assistantAccessService;

    @PreAuthorize(POSITION_ROLE_ACCESS)
    @GetMapping("/list")
    public TableDataInfo list(OsgPosition position)
    {
        startPage();
        List<OsgPosition> rows = positionService.selectPositionList(position);
        return getDataTable(rows);
    }

    @GetMapping("/stats")
    public AjaxResult stats(OsgPosition position)
    {
        if (!hasPositionStatsAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, "没有权限，请联系管理员授权");
        }
        return AjaxResult.success(positionService.selectPositionStats(position));
    }

    @GetMapping("/drill-down")
    public AjaxResult drillDown(OsgPosition position)
    {
        if (!hasPositionStatsAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, "没有权限，请联系管理员授权");
        }
        return AjaxResult.success(positionService.selectPositionDrillDown(position));
    }

    @PreAuthorize(POSITION_ROLE_ACCESS)
    @GetMapping("/meta")
    public AjaxResult meta()
    {
        return AjaxResult.success(positionService.selectPositionMeta());
    }

    @PreAuthorize(POSITION_ROLE_ACCESS)
    @GetMapping("/company-options")
    public AjaxResult companyOptions(@RequestParam(value = "keyword", required = false) String keyword)
    {
        return AjaxResult.success(positionService.selectPositionCompanyOptions(keyword));
    }

    @PreAuthorize(POSITION_ROLE_ACCESS)
    @GetMapping("/{positionId}/students")
    public AjaxResult students(@PathVariable Long positionId)
    {
        return AjaxResult.success(positionService.selectPositionStudents(positionId));
    }

    @PreAuthorize(POSITION_ROLE_ACCESS)
    @PostMapping
    public AjaxResult create(@RequestBody Map<String, Object> body)
    {
        try
        {
            Map<String, Object> result = positionService.createPosition(body, getUsername());
            return AjaxResult.success("新增岗位成功", result);
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    @PreAuthorize(POSITION_ROLE_ACCESS)
    @PutMapping
    public AjaxResult update(@RequestBody Map<String, Object> body)
    {
        try
        {
            Map<String, Object> result = positionService.updatePosition(body, getUsername());
            return AjaxResult.success("岗位更新成功", result);
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    @PreAuthorize(POSITION_ROLE_ACCESS)
    @PostMapping("/batch-upload")
    public AjaxResult batchUpload(@RequestParam("file") MultipartFile file)
    {
        try
        {
            return AjaxResult.success(positionService.batchUploadPositions(file, getUsername()));
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    @PreAuthorize(POSITION_ROLE_ACCESS)
    @GetMapping("/export")
    public void export(HttpServletResponse response,
                       OsgPosition position,
                       @RequestParam(value = "template", required = false, defaultValue = "false") boolean template)
    {
        List<PositionExportRow> exportRows = template
            ? new ArrayList<>()
            : toExportRows(positionService.selectPositionList(position));

        ExcelUtil<PositionExportRow> util = new ExcelUtil<>(PositionExportRow.class);
        util.exportExcel(response, exportRows, template ? "岗位导入模板" : "岗位列表");
    }

    private List<PositionExportRow> toExportRows(List<OsgPosition> rows)
    {
        List<PositionExportRow> exportRows = new ArrayList<>(rows.size());
        for (OsgPosition position : rows)
        {
            exportRows.add(new PositionExportRow(
                position.getCompanyName(),
                position.getPositionName(),
                position.getRegion(),
                position.getCity(),
                position.getProjectYear(),
                position.getIndustry(),
                position.getPositionCategory(),
                position.getDisplayStatus(),
                position.getPublishTime()
            ));
        }
        return exportRows;
    }

    private boolean hasPositionStatsAccess()
    {
        if (SecurityUtils.hasPermi("admin:positions:list"))
        {
            return true;
        }
        LoginUser loginUser = SecurityUtils.getLoginUser();
        SysUser user = loginUser == null ? null : loginUser.getUser();
        return assistantAccessService.hasAssistantAccess(user);
    }

    private static class PositionExportRow
    {
        @Excel(name = "公司名称")
        private final String companyName;

        @Excel(name = "岗位名称")
        private final String positionName;

        @Excel(name = "大区")
        private final String region;

        @Excel(name = "城市")
        private final String city;

        @Excel(name = "项目时间")
        private final String projectYear;

        @Excel(name = "行业")
        private final String industry;

        @Excel(name = "岗位分类")
        private final String positionCategory;

        @Excel(name = "展示状态")
        private final String displayStatus;

        @Excel(name = "发布时间", width = 20, dateFormat = "yyyy-MM-dd HH:mm:ss")
        private final Date publishTime;

        private PositionExportRow(String companyName, String positionName, String region, String city,
                                  String projectYear, String industry, String positionCategory,
                                  String displayStatus, Date publishTime)
        {
            this.companyName = companyName;
            this.positionName = positionName;
            this.region = region;
            this.city = city;
            this.projectYear = projectYear;
            this.industry = industry;
            this.positionCategory = positionCategory;
            this.displayStatus = displayStatus;
            this.publishTime = publishTime;
        }
    }
}
