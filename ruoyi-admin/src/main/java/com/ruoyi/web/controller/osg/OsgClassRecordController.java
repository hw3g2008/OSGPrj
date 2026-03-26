package com.ruoyi.web.controller.osg;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.constant.HttpStatus;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.domain.OsgClassRecord;
import com.ruoyi.system.service.impl.OsgAssistantAccessService;
import com.ruoyi.system.service.impl.OsgClassRecordServiceImpl;

@RestController
public class OsgClassRecordController extends BaseController
{
    private static final String CLASS_RECORD_ACCESS = "@ss.hasPermi('admin:class-records:list')";

    @Autowired
    private OsgClassRecordServiceImpl classRecordService;

    @Autowired
    private OsgAssistantAccessService assistantAccessService;

    @GetMapping("/admin/class-record/list")
    public TableDataInfo list(@RequestParam(value = "keyword", required = false) String keyword)
    {
        if (SecurityUtils.hasPermi("admin:class-records:list"))
        {
            startPage();
            List<Map<String, Object>> rows = classRecordService.selectClassRecordList(keyword);
            return getDataTable(rows);
        }
        if (hasAssistantAccess())
        {
            List<Map<String, Object>> rows = classRecordService.selectAssistantClassRecordList(keyword, SecurityUtils.getUserId());
            return getDataTable(rows);
        }
        return forbiddenTable();
    }

    @GetMapping("/admin/class-record/stats")
    public AjaxResult stats(@RequestParam(value = "keyword", required = false) String keyword)
    {
        if (SecurityUtils.hasPermi("admin:class-records:list"))
        {
            return AjaxResult.success(classRecordService.selectClassRecordStats(keyword));
        }
        if (hasAssistantAccess())
        {
            return AjaxResult.success(classRecordService.selectAssistantClassRecordStats(keyword, SecurityUtils.getUserId()));
        }
        return AjaxResult.error(HttpStatus.FORBIDDEN, "没有权限，请联系管理员授权");
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
}
