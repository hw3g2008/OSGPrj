package com.ruoyi.web.controller.osg;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ruoyi.common.constant.HttpStatus;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.core.page.TableDataInfo;
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
        return getDataTable(mockPracticeService.selectMentorMockPracticeList(query));
    }

    private boolean hasAssistantAccess()
    {
        LoginUser loginUser = SecurityUtils.getLoginUser();
        SysUser user = loginUser == null ? null : loginUser.getUser();
        return assistantAccessService.hasAssistantAccess(user);
    }
}
