package com.ruoyi.web.controller.osg;

import java.util.List;
import java.util.Map;
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
import com.ruoyi.system.service.IOsgLeadMentorPositionService;
import com.ruoyi.system.service.impl.OsgLeadMentorAccessService;

@RestController
@RequestMapping("/lead-mentor/positions")
public class OsgLeadMentorPositionController extends BaseController
{
    private static final String ACCESS_DENIED_MESSAGE = "该账号无班主任端访问权限";

    @Autowired
    private IOsgLeadMentorPositionService leadMentorPositionService;

    @Autowired
    private OsgLeadMentorAccessService leadMentorAccessService;

    @GetMapping("/list")
    public AjaxResult list(OsgPosition query)
    {
        if (!hasLeadMentorAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }

        List<Map<String, Object>> rows = leadMentorPositionService.selectPositionList(query, getUserId());
        return AjaxResult.success().put("rows", rows);
    }

    @GetMapping("/meta")
    public AjaxResult meta()
    {
        if (!hasLeadMentorAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }

        return AjaxResult.success(leadMentorPositionService.selectPositionMeta());
    }

    @GetMapping("/{positionId}/students")
    public AjaxResult students(@PathVariable Long positionId)
    {
        if (!hasLeadMentorAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }

        return AjaxResult.success(leadMentorPositionService.selectPositionStudents(positionId, getUserId()));
    }

    private boolean hasLeadMentorAccess()
    {
        LoginUser loginUser = SecurityUtils.getLoginUser();
        SysUser user = loginUser == null ? null : loginUser.getUser();
        return leadMentorAccessService.hasLeadMentorAccess(user);
    }
}
