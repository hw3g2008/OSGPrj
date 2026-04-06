package com.ruoyi.web.controller.osg;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ruoyi.common.constant.HttpStatus;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.domain.OsgPosition;
import com.ruoyi.system.service.impl.OsgAssistantAccessService;
import com.ruoyi.system.service.impl.OsgPositionServiceImpl;

@RestController
@RequestMapping("/assistant/positions")
public class OsgAssistantPositionController extends BaseController
{
    private static final String ACCESS_DENIED_MESSAGE = "该账号无助教端访问权限";

    @Autowired
    private OsgPositionServiceImpl positionService;

    @Autowired
    private OsgAssistantAccessService assistantAccessService;

    @GetMapping("/stats")
    public AjaxResult stats(OsgPosition position)
    {
        if (!hasAssistantAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }
        return AjaxResult.success(positionService.selectPositionStats(position));
    }

    @GetMapping("/drill-down")
    public AjaxResult drillDown(OsgPosition position)
    {
        if (!hasAssistantAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }
        return AjaxResult.success(positionService.selectPositionDrillDown(position));
    }

    @GetMapping("/{positionId}/students")
    public AjaxResult students(@PathVariable Long positionId)
    {
        if (!hasAssistantAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }
        return AjaxResult.success(positionService.selectPositionStudents(positionId));
    }

    private boolean hasAssistantAccess()
    {
        LoginUser loginUser = SecurityUtils.getLoginUser();
        SysUser user = loginUser == null ? null : loginUser.getUser();
        return assistantAccessService.hasAssistantAccess(user);
    }
}
