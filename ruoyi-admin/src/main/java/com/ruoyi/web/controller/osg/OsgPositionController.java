package com.ruoyi.web.controller.osg;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
import com.ruoyi.common.config.RuoYiConfig;
import com.ruoyi.common.constant.HttpStatus;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.common.utils.file.FileUploadUtils;
import com.ruoyi.common.utils.poi.ExcelUtil;
import com.ruoyi.framework.config.ServerConfig;
import com.ruoyi.system.domain.OsgPosition;
import com.ruoyi.system.service.impl.OsgAssistantAccessService;
import com.ruoyi.system.service.impl.OsgPositionServiceImpl;

@RestController
@RequestMapping("/admin/position")
public class OsgPositionController extends BaseController
{
    private static final String POSITION_ROLE_ACCESS = "@ss.hasPermi('admin:positions:list')";

    /** T3.4 投递备注附件参数 */
    private static final String[] ATTACHMENT_EXTENSIONS = { "pdf", "jpg", "jpeg", "png", "gif" };
    private static final Set<String> ATTACHMENT_MIME_WHITELIST = Set.of(
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif"
    );
    private static final long ATTACHMENT_MAX_SIZE_BYTES = 10L * 1024 * 1024;

    @Autowired
    private OsgPositionServiceImpl positionService;

    @Autowired
    private OsgAssistantAccessService assistantAccessService;

    @Autowired
    private ServerConfig serverConfig;

    @PreAuthorize(POSITION_ROLE_ACCESS)
    @GetMapping("/list")
    public TableDataInfo list(OsgPosition position,
                              @RequestParam(required = false) String beginDisplayStartTime,
                              @RequestParam(required = false) String endDisplayStartTime)
    {
        applyDisplayStartTimeRange(position, beginDisplayStartTime, endDisplayStartTime);
        startPage();
        List<OsgPosition> rows = positionService.selectPositionList(position);
        return getDataTable(rows);
    }

    /**
     * A-PS-012: 把前端「展示起始」预设算出的日期范围塞进 position.params，
     * 让 mapper 里既有的 params.beginDisplayStartTime / endDisplayStartTime 生效。
     * <p>不破坏其他端调用：其他端不传则 params 不动。</p>
     */
    private void applyDisplayStartTimeRange(OsgPosition position, String beginDisplayStartTime, String endDisplayStartTime)
    {
        if ((beginDisplayStartTime == null || beginDisplayStartTime.isEmpty())
                && (endDisplayStartTime == null || endDisplayStartTime.isEmpty()))
        {
            return;
        }
        Map<String, Object> params = position.getParams();
        if (params == null)
        {
            params = new java.util.HashMap<>();
            position.setParams(params);
        }
        if (beginDisplayStartTime != null && !beginDisplayStartTime.isEmpty())
        {
            params.put("beginDisplayStartTime", beginDisplayStartTime);
        }
        if (endDisplayStartTime != null && !endDisplayStartTime.isEmpty())
        {
            params.put("endDisplayStartTime", endDisplayStartTime);
        }
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

    /**
     * T3.4 投递备注附件上传：
     * - 单文件 ≤ 10MB
     * - 类型白名单：PDF / JPG / PNG / GIF
     * - 双层 MIME 校验（声明 Content-Type + Files.probeContentType 实测）防伪造
     * - UUID 文件名（FileUploadUtils.upload 的 useCustomNaming=true）防 path traversal
     */
    @PreAuthorize(POSITION_ROLE_ACCESS)
    @PostMapping("/attachment")
    public AjaxResult uploadAttachment(@RequestParam("file") MultipartFile file)
    {
        if (file == null || file.isEmpty())
        {
            return AjaxResult.error("附件不能为空");
        }
        if (file.getSize() > ATTACHMENT_MAX_SIZE_BYTES)
        {
            return AjaxResult.error("单文件不能超过 10MB");
        }
        String declaredType = file.getContentType();
        if (declaredType == null || !ATTACHMENT_MIME_WHITELIST.contains(declaredType.toLowerCase()))
        {
            return AjaxResult.error("仅支持 PDF / JPG / PNG / GIF 类型附件");
        }
        String probedType = probeContentType(file);
        if (probedType != null && !ATTACHMENT_MIME_WHITELIST.contains(probedType.toLowerCase()))
        {
            return AjaxResult.error("附件实际类型与声明类型不符，仅支持 PDF / JPG / PNG / GIF");
        }
        try
        {
            String attachmentPath = FileUploadUtils.upload(
                RuoYiConfig.getUploadPath() + "/positions", file, ATTACHMENT_EXTENSIONS, true);
            AjaxResult ajax = AjaxResult.success("附件上传成功");
            ajax.put("url", serverConfig.getUrl() + attachmentPath);
            ajax.put("attachmentPath", attachmentPath);
            ajax.put("fileName", file.getOriginalFilename());
            ajax.put("fileType", declaredType);
            ajax.put("size", file.getSize());
            return ajax;
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
        catch (Exception ex)
        {
            return AjaxResult.error("附件上传失败: " + ex.getMessage());
        }
    }

    /**
     * T3.4 双层 MIME 校验：临时落盘后用 Files.probeContentType 实测内容类型。
     * 失败时返回 null，由调用方走 declaredType + ext whitelist 兜底。
     */
    private String probeContentType(MultipartFile file)
    {
        Path tmp = null;
        try
        {
            tmp = Files.createTempFile("osg-position-", ".bin");
            file.transferTo(tmp.toFile());
            return Files.probeContentType(tmp);
        }
        catch (IOException ex)
        {
            return null;
        }
        finally
        {
            if (tmp != null)
            {
                try { Files.deleteIfExists(tmp); } catch (IOException ignored) { }
            }
        }
    }

    @PreAuthorize(POSITION_ROLE_ACCESS)
    @GetMapping("/export")
    public void export(HttpServletResponse response,
                       OsgPosition position,
                       @RequestParam(value = "template", required = false, defaultValue = "false") boolean template)
    {
        String filename = template ? "position-template.xlsx" : "positions.xlsx";
        response.setHeader("Content-Disposition", "attachment; filename=" + filename + "; filename*=UTF-8''" + filename);
        response.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
        if (template)
        {
            ExcelUtil<PositionImportTemplate> util = new ExcelUtil<>(PositionImportTemplate.class);
            util.exportExcel(response, new ArrayList<>(), "岗位导入模板");
        }
        else
        {
            List<PositionExportRow> exportRows = toExportRows(positionService.selectPositionList(position));
            ExcelUtil<PositionExportRow> util = new ExcelUtil<>(PositionExportRow.class);
            util.exportExcel(response, exportRows, "岗位列表");
        }
    }

    private List<PositionExportRow> toExportRows(List<OsgPosition> rows)
    {
        PositionExportReference reference = PositionExportReference.from(positionService.selectPositionMeta());
        List<PositionExportRow> exportRows = new ArrayList<>(rows.size());
        for (OsgPosition position : rows)
        {
            exportRows.add(new PositionExportRow(position, reference));
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
        @Excel(name = "岗位名称")
        private final String positionName;

        @Excel(name = "公司")
        private final String companyName;

        @Excel(name = "公司类别")
        private final String companyType;

        @Excel(name = "部门")
        private final String department;

        @Excel(name = "岗位分类")
        private final String positionCategory;

        @Excel(name = "地区")
        private final String city;

        @Excel(name = "招聘周期")
        private final String recruitmentCycle;

        @Excel(name = "主攻方向")
        private final String targetMajors;

        @Excel(name = "展示起始")
        private final String displayStartTime;

        @Excel(name = "截止时间")
        private final String deadlineDisplay;

        @Excel(name = "状态")
        private final String displayStatus;

        @Excel(name = "投递学员")
        private final String studentCount;

        @Excel(name = "添加人")
        private final String createBy;

        @Excel(name = "添加日期")
        private final String createTime;

        private PositionExportRow(OsgPosition p, PositionExportReference reference)
        {
            this.positionName = text(p.getPositionName(), "-");
            this.companyName = text(p.getCompanyName(), "-");
            this.companyType = text(p.getCompanyType(), "-");
            this.department = reference.label(reference.departments, p.getDepartment(), "-");
            this.positionCategory = reference.label(reference.categories, p.getPositionCategory(), "-");
            this.city = text(p.getCity(), "-");
            this.recruitmentCycle = reference.labels(reference.recruitmentCycles, p.getRecruitmentCycle());
            this.targetMajors = reference.labels(reference.majorDirections, p.getTargetMajors());
            this.displayStartTime = shortDate(p.getDisplayStartTime());
            this.deadlineDisplay = p.getDeadline() == null ? text(p.getDeadlineText(), "—") : shortDate(p.getDeadline());
            this.displayStatus = reference.label(reference.displayStatuses, p.getDisplayStatus(), "展示中");
            this.studentCount = (p.getStudentCount() == null ? 0 : p.getStudentCount()) + "人";
            this.createBy = text(p.getCreateBy(), "-");
            this.createTime = shortDate(p.getCreateTime());
        }

        private static String text(String value, String fallback)
        {
            return value == null || value.isBlank() ? fallback : value;
        }

        private static String shortDate(Date value)
        {
            return value == null ? "—" : new SimpleDateFormat("MM-dd").format(value);
        }
    }

    private static class PositionExportReference
    {
        private final Map<String, String> categories;
        private final Map<String, String> departments;
        private final Map<String, String> displayStatuses;
        private final Map<String, String> recruitmentCycles;
        private final Map<String, String> majorDirections;

        private PositionExportReference(Map<String, String> categories,
                                        Map<String, String> departments,
                                        Map<String, String> displayStatuses,
                                        Map<String, String> recruitmentCycles,
                                        Map<String, String> majorDirections)
        {
            this.categories = categories;
            this.departments = departments;
            this.displayStatuses = displayStatuses;
            this.recruitmentCycles = recruitmentCycles;
            this.majorDirections = majorDirections;
        }

        private static PositionExportReference from(Map<String, Object> meta)
        {
            return new PositionExportReference(
                optionLabels(meta.get("categories")),
                optionLabels(meta.get("departments")),
                optionLabels(meta.get("displayStatuses")),
                optionLabels(meta.get("recruitmentCycles")),
                optionLabels(meta.get("majorDirections"))
            );
        }

        private static Map<String, String> optionLabels(Object source)
        {
            Map<String, String> labels = new LinkedHashMap<>();
            if (source instanceof List<?> items)
            {
                for (Object item : items)
                {
                    if (item instanceof Map<?, ?> option)
                    {
                        Object value = option.get("value");
                        Object label = option.get("label");
                        if (value != null)
                        {
                            labels.put(String.valueOf(value), label == null ? String.valueOf(value) : String.valueOf(label));
                        }
                    }
                }
            }
            return labels;
        }

        private String label(Map<String, String> labels, String value, String fallback)
        {
            if (value == null || value.isBlank())
            {
                return fallback;
            }
            return labels.getOrDefault(value, value);
        }

        private String labels(Map<String, String> labels, String value)
        {
            if (value == null || value.isBlank())
            {
                return "-";
            }
            String[] parts = value.split(",");
            List<String> result = new ArrayList<>();
            for (String part : parts)
            {
                String item = part.trim();
                if (!item.isEmpty())
                {
                    result.add(labels.getOrDefault(item, item));
                }
            }
            return result.isEmpty() ? "-" : String.join("、", result);
        }
    }

    /**
     * T3.15 岗位导入模板（18 列）
     * 顺序按 plan 文档：分类 / 名称 / 公司 / 类别 / 官网 / 链接 / 部门 / 地区 / 城市 / 招聘周期 /
     *                  主攻方向 / 项目时间 / 展示起 / 展示止 / 截止日期 / 截止文案 / 投递备注 / 状态
     */
    private static class PositionImportTemplate
    {
        @Excel(name = "岗位分类")
        private String positionCategory;

        @Excel(name = "岗位名称")
        private String positionName;

        @Excel(name = "公司名称")
        private String companyName;

        @Excel(name = "公司类别")
        private String companyType;

        @Excel(name = "公司官网", width = 30)
        private String companyWebsite;

        @Excel(name = "岗位链接", width = 30)
        private String positionUrl;

        @Excel(name = "部门")
        private String department;

        @Excel(name = "地区")
        private String region;

        @Excel(name = "城市")
        private String city;

        @Excel(name = "招聘周期")
        private String recruitmentCycle;

        @Excel(name = "对应主攻方向")
        private String targetMajors;

        @Excel(name = "项目时间")
        private String projectYear;

        @Excel(name = "展示开始时间", width = 20, dateFormat = "yyyy-MM-dd")
        private Date displayStartTime;

        @Excel(name = "展示结束时间", width = 20, dateFormat = "yyyy-MM-dd")
        private Date displayEndTime;

        @Excel(name = "截止日期", width = 20, dateFormat = "yyyy-MM-dd")
        private Date deadline;

        @Excel(name = "截止文案")
        private String deadlineRaw;

        @Excel(name = "投递备注")
        private String applicationNote;

        @Excel(name = "岗位状态")
        private String displayStatus;
    }
}
