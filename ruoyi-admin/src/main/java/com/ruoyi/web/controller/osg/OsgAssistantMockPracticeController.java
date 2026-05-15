package com.ruoyi.web.controller.osg;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ruoyi.common.constant.HttpStatus;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.domain.OsgMockPractice;
import com.ruoyi.system.service.impl.OsgAssistantAccessService;
import com.ruoyi.system.service.impl.OsgMockPracticeServiceImpl;

@RestController
@RequestMapping("/assistant/mock-practice")
public class OsgAssistantMockPracticeController extends BaseController
{
    private static final String ACCESS_DENIED_MESSAGE = "该账号无助教端访问权限";

    @Autowired
    private OsgMockPracticeServiceImpl mockPracticeService;

    @Autowired
    private OsgAssistantAccessService assistantAccessService;

    @GetMapping("/list")
    public TableDataInfo list(OsgMockPractice query)
    {
        if (!hasAssistantAccess())
        {
            TableDataInfo info = new TableDataInfo();
            info.setCode(HttpStatus.FORBIDDEN);
            info.setMsg(ACCESS_DENIED_MESSAGE);
            return info;
        }
        startPage();
        query.setCurrentMentorId(SecurityUtils.getUserId());
        return getDataTable(mockPracticeService.selectAssistantMockPracticeList(query));
    }

    /**
     * §C.4 asst 端确认接受 mock-practice 分配（与 mentor 端等价，原子 SQL 防并发）。
     */
    @PutMapping("/{id}/confirm")
    public AjaxResult confirm(@PathVariable Long id)
    {
        if (!hasAssistantAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }
        try
        {
            return AjaxResult.success(mockPracticeService.confirmAssignment(id, SecurityUtils.getUserId(), resolveOperator()));
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    /**
     * §C.4 asst 端确认已知悉 mock-practice 分配。
     */
    @PostMapping("/{id}/acknowledge-assignment")
    public AjaxResult acknowledgeAssignment(@PathVariable Long id)
    {
        if (!hasAssistantAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }
        try
        {
            return AjaxResult.success(mockPracticeService.acknowledgeAssignment(id, SecurityUtils.getUserId(), resolveOperator()));
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    private boolean hasAssistantAccess()
    {
        LoginUser loginUser = SecurityUtils.getLoginUser();
        SysUser user = loginUser == null ? null : loginUser.getUser();
        return assistantAccessService.hasAssistantAccess(user);
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
