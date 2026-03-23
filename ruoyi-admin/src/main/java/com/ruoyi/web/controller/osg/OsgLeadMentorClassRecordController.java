package com.ruoyi.web.controller.osg;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ruoyi.common.constant.HttpStatus;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.domain.OsgClassRecord;
import com.ruoyi.system.service.IOsgClassRecordService;
import com.ruoyi.system.service.impl.OsgLeadMentorAccessService;

@RestController
@RequestMapping("/lead-mentor/class-records")
public class OsgLeadMentorClassRecordController extends BaseController
{
    private static final String ACCESS_DENIED_MESSAGE = "该账号无班主任端访问权限";

    @Autowired
    private IOsgClassRecordService classRecordService;

    @Autowired
    private OsgLeadMentorAccessService leadMentorAccessService;

    @PostMapping
    public AjaxResult create(@RequestBody OsgClassRecord record)
    {
        if (!hasLeadMentorAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }

        record.setMentorId(getUserId());
        record.setMentorName(resolveOperator());
        record.setCreateBy(resolveOperator());
        record.setUpdateBy(resolveOperator());

        try
        {
            return AjaxResult.success(classRecordService.createLeadMentorClassRecord(record));
        }
        catch (ServiceException ex)
        {
            return handleServiceException(ex);
        }
    }

    private boolean hasLeadMentorAccess()
    {
        LoginUser loginUser = SecurityUtils.getLoginUser();
        SysUser user = loginUser == null ? null : loginUser.getUser();
        return leadMentorAccessService.hasLeadMentorAccess(user);
    }

    private AjaxResult handleServiceException(ServiceException ex)
    {
        String message = ex.getMessage();
        if (message != null && message.contains("无权"))
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, message);
        }
        return AjaxResult.error(HttpStatus.BAD_REQUEST, message);
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
