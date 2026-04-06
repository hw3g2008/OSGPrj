package com.ruoyi.web.controller.osg;

import java.util.Date;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ruoyi.common.constant.HttpStatus;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.service.impl.OsgAssistantAccessService;
import com.ruoyi.system.service.impl.OsgClassRecordServiceImpl;

@RestController
@RequestMapping("/assistant/class-records")
public class OsgAssistantClassRecordController extends BaseController
{
    private static final String ACCESS_DENIED_MESSAGE = "该账号无助教端访问权限";

    @Autowired
    private OsgClassRecordServiceImpl classRecordService;

    @Autowired
    private OsgAssistantAccessService assistantAccessService;

    @GetMapping("/list")
    public TableDataInfo list(@RequestParam(value = "keyword", required = false) String keyword,
                              @RequestParam(value = "courseType", required = false) String courseType,
                              @RequestParam(value = "classStatus", required = false) String classStatus,
                              @RequestParam(value = "courseSource", required = false) String courseSource,
                              @RequestParam(value = "tab", required = false) String tab,
                              @RequestParam(value = "classDateStart", required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") Date classDateStart,
                              @RequestParam(value = "classDateEnd", required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") Date classDateEnd)
    {
        if (!hasAssistantAccess())
        {
            TableDataInfo info = new TableDataInfo();
            info.setCode(HttpStatus.FORBIDDEN);
            info.setMsg(ACCESS_DENIED_MESSAGE);
            return info;
        }

        List<Map<String, Object>> rows = classRecordService.selectAssistantClassRecordList(
            keyword, courseType, classStatus, courseSource, tab, classDateStart, classDateEnd,
            SecurityUtils.getUserId()
        );
        return getDataTable(rows);
    }

    @GetMapping("/stats")
    public AjaxResult stats(@RequestParam(value = "keyword", required = false) String keyword,
                            @RequestParam(value = "courseType", required = false) String courseType,
                            @RequestParam(value = "classStatus", required = false) String classStatus,
                            @RequestParam(value = "courseSource", required = false) String courseSource,
                            @RequestParam(value = "tab", required = false) String tab,
                            @RequestParam(value = "classDateStart", required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") Date classDateStart,
                            @RequestParam(value = "classDateEnd", required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") Date classDateEnd)
    {
        if (!hasAssistantAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }

        return AjaxResult.success(classRecordService.selectAssistantClassRecordStats(
            keyword, courseType, classStatus, courseSource, tab, classDateStart, classDateEnd,
            SecurityUtils.getUserId()
        ));
    }

    private boolean hasAssistantAccess()
    {
        LoginUser loginUser = SecurityUtils.getLoginUser();
        SysUser user = loginUser == null ? null : loginUser.getUser();
        return assistantAccessService.hasAssistantAccess(user);
    }
}
