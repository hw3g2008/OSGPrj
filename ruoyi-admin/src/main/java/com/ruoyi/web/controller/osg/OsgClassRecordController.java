package com.ruoyi.web.controller.osg;

import java.util.Date;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.annotation.Excel;
import com.ruoyi.common.constant.HttpStatus;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.common.utils.file.FileUtils;
import com.ruoyi.common.utils.poi.ExcelUtil;
import com.ruoyi.system.domain.OsgClassRecord;
import com.ruoyi.system.service.impl.OsgAssistantAccessService;
import com.ruoyi.system.service.impl.OsgClassRecordServiceImpl;
import jakarta.servlet.http.HttpServletResponse;

@RestController
public class OsgClassRecordController extends BaseController
{
    private static final String CLASS_RECORD_ACCESS = "@ss.hasPermi('admin:class-records:list')";

    @Autowired
    private OsgClassRecordServiceImpl classRecordService;

    @Autowired
    private OsgAssistantAccessService assistantAccessService;

    @GetMapping("/admin/class-record/list")
    public TableDataInfo list(@RequestParam(value = "keyword", required = false) String keyword,
                              @RequestParam(value = "courseType", required = false) String courseType,
                              @RequestParam(value = "classStatus", required = false) String classStatus,
                              @RequestParam(value = "courseSource", required = false) String courseSource,
                              @RequestParam(value = "tab", required = false) String tab,
                              @RequestParam(value = "classDateStart", required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") Date classDateStart,
                              @RequestParam(value = "classDateEnd", required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") Date classDateEnd)
    {
        if (SecurityUtils.hasPermi("admin:class-records:list"))
        {
            startPage();
            List<Map<String, Object>> rows = classRecordService.selectClassRecordList(
                keyword,
                courseType,
                classStatus,
                courseSource,
                tab,
                classDateStart,
                classDateEnd
            );
            return getDataTable(rows);
        }
        if (hasAssistantAccess())
        {
            List<Map<String, Object>> rows = classRecordService.selectAssistantClassRecordList(
                keyword,
                courseType,
                classStatus,
                courseSource,
                tab,
                classDateStart,
                classDateEnd,
                SecurityUtils.getUserId()
            );
            return getDataTable(rows);
        }
        return forbiddenTable();
    }

    @GetMapping("/admin/class-record/stats")
    public AjaxResult stats(@RequestParam(value = "keyword", required = false) String keyword,
                            @RequestParam(value = "courseType", required = false) String courseType,
                            @RequestParam(value = "classStatus", required = false) String classStatus,
                            @RequestParam(value = "courseSource", required = false) String courseSource,
                            @RequestParam(value = "tab", required = false) String tab,
                            @RequestParam(value = "classDateStart", required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") Date classDateStart,
                            @RequestParam(value = "classDateEnd", required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") Date classDateEnd)
    {
        if (SecurityUtils.hasPermi("admin:class-records:list"))
        {
            return AjaxResult.success(classRecordService.selectClassRecordStats(
                keyword,
                courseType,
                classStatus,
                courseSource,
                tab,
                classDateStart,
                classDateEnd
            ));
        }
        if (hasAssistantAccess())
        {
            return AjaxResult.success(classRecordService.selectAssistantClassRecordStats(
                keyword,
                courseType,
                classStatus,
                courseSource,
                tab,
                classDateStart,
                classDateEnd,
                SecurityUtils.getUserId()
            ));
        }
        return AjaxResult.error(HttpStatus.FORBIDDEN, "没有权限，请联系管理员授权");
    }

    @PreAuthorize(CLASS_RECORD_ACCESS)
    @GetMapping("/admin/class-record/export")
    public void export(HttpServletResponse response,
                       @RequestParam(value = "keyword", required = false) String keyword,
                       @RequestParam(value = "courseType", required = false) String courseType,
                       @RequestParam(value = "classStatus", required = false) String classStatus,
                       @RequestParam(value = "courseSource", required = false) String courseSource,
                       @RequestParam(value = "tab", required = false) String tab,
                       @RequestParam(value = "classDateStart", required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") Date classDateStart,
                       @RequestParam(value = "classDateEnd", required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") Date classDateEnd)
    {
        prepareExportResponse(response, "课程记录.xlsx");
        List<ClassRecordExportRow> exportRows = classRecordService.selectClassRecordExportList(
            keyword,
            courseType,
            classStatus,
            courseSource,
            tab,
            classDateStart,
            classDateEnd
        ).stream()
            .map(ClassRecordExportRow::from)
            .toList();
        ExcelUtil<ClassRecordExportRow> util = new ExcelUtil<>(ClassRecordExportRow.class);
        util.exportExcel(response, exportRows, "课程记录");
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

    @PostMapping("/assistant/class-records")
    public AjaxResult createAssistantRecord(@RequestBody OsgClassRecord record)
    {
        if (!hasAssistantAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, "没有权限，请联系管理员授权");
        }

        record.setMentorId(SecurityUtils.getUserId());
        record.setMentorName(SecurityUtils.getUsername());
        record.setCreateBy(SecurityUtils.getUsername());
        record.setUpdateBy(SecurityUtils.getUsername());
        try
        {
            return AjaxResult.success(classRecordService.createAssistantClassRecord(record));
        }
        catch (com.ruoyi.common.exception.ServiceException ex)
        {
            return AjaxResult.error(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
    }

    private boolean hasAssistantAccess()
    {
        LoginUser loginUser = SecurityUtils.getLoginUser();
        SysUser user = loginUser == null ? null : loginUser.getUser();
        return assistantAccessService.hasAssistantAccess(user);
    }

    private TableDataInfo forbiddenTable()
    {
        TableDataInfo response = new TableDataInfo();
        response.setCode(HttpStatus.FORBIDDEN);
        response.setMsg("没有权限，请联系管理员授权");
        response.setRows(List.of());
        response.setTotal(0);
        return response;
    }

    private static class ClassRecordExportRow
    {
        @Excel(name = "记录ID")
        private final Long recordId;

        @Excel(name = "记录编码")
        private final String recordCode;

        @Excel(name = "学员ID")
        private final Long studentId;

        @Excel(name = "学员姓名")
        private final String studentName;

        @Excel(name = "导师ID")
        private final Long mentorId;

        @Excel(name = "导师姓名")
        private final String mentorName;

        @Excel(name = "申报角色")
        private final String reporterRole;

        @Excel(name = "辅导类型")
        private final String coachingType;

        @Excel(name = "课程内容")
        private final String courseContent;

        @Excel(name = "上课日期", width = 20, dateFormat = "yyyy-MM-dd HH:mm:ss")
        private final Object classDate;

        @Excel(name = "时长(h)")
        private final Object durationHours;

        @Excel(name = "课时费")
        private final String courseFee;

        @Excel(name = "学员评价")
        private final String studentRating;

        @Excel(name = "审核状态")
        private final String status;

        @Excel(name = "审核备注")
        private final String reviewRemark;

        @Excel(name = "提交时间", width = 20, dateFormat = "yyyy-MM-dd HH:mm:ss")
        private final Object submittedAt;

        private ClassRecordExportRow(Long recordId, String recordCode, Long studentId, String studentName,
                                     Long mentorId, String mentorName, String reporterRole, String coachingType,
                                     String courseContent, Object classDate, Object durationHours, String courseFee,
                                     String studentRating, String status, String reviewRemark, Object submittedAt)
        {
            this.recordId = recordId;
            this.recordCode = recordCode;
            this.studentId = studentId;
            this.studentName = studentName;
            this.mentorId = mentorId;
            this.mentorName = mentorName;
            this.reporterRole = reporterRole;
            this.coachingType = coachingType;
            this.courseContent = courseContent;
            this.classDate = classDate;
            this.durationHours = durationHours;
            this.courseFee = courseFee;
            this.studentRating = studentRating;
            this.status = status;
            this.reviewRemark = reviewRemark;
            this.submittedAt = submittedAt;
        }

        private static ClassRecordExportRow from(Map<String, Object> row)
        {
            return new ClassRecordExportRow(
                asLong(row.get("recordId")),
                asText(row.get("recordCode")),
                asLong(row.get("studentId")),
                asText(row.get("studentName")),
                asLong(row.get("mentorId")),
                asText(row.get("mentorName")),
                asText(row.get("reporterRole")),
                asText(row.get("coachingType")),
                asText(row.get("courseContent")),
                row.get("classDate"),
                row.get("durationHours"),
                asText(row.get("courseFee")),
                asText(row.get("studentRating")),
                toStatusLabel(row.get("status")),
                asText(row.get("reviewRemark")),
                row.get("submittedAt")
            );
        }

        private static Long asLong(Object value)
        {
            return value instanceof Number number ? number.longValue() : null;
        }

        private static String asText(Object value)
        {
            return value == null ? null : String.valueOf(value);
        }

        private static String toStatusLabel(Object value)
        {
            String status = asText(value);
            if (status == null || status.isBlank())
            {
                return "待审核";
            }
            return switch (status.trim().toLowerCase())
            {
                case "approved" -> "已通过";
                case "rejected" -> "已驳回";
                default -> "待审核";
            };
        }
    }
}
