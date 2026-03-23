package com.ruoyi.web.controller.osg;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
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
import com.ruoyi.system.service.impl.OsgLeadMentorAccessService;
import com.ruoyi.system.service.impl.OsgLeadMentorProfileService;

@RestController
@RequestMapping("/lead-mentor/profile")
public class OsgLeadMentorProfileController extends BaseController
{
    private static final String ACCESS_DENIED_MESSAGE = "该账号无班主任端访问权限";

    @Autowired
    private OsgLeadMentorProfileService leadMentorProfileService;

    @Autowired
    private OsgLeadMentorAccessService leadMentorAccessService;

    @GetMapping
    public AjaxResult profile()
    {
        if (!hasLeadMentorAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }

        try
        {
            return AjaxResult.success(leadMentorProfileService.selectProfileView(resolveUser()));
        }
        catch (ServiceException ex)
        {
            return handleServiceException(ex);
        }
    }

    @PostMapping("/change-request")
    public AjaxResult submitChangeRequest(@RequestBody Map<String, Object> body)
    {
        if (!hasLeadMentorAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }

        try
        {
            return AjaxResult.success("班主任资料变更申请已提交",
                leadMentorProfileService.submitChangeRequest(resolveUser(), resolveOperator(), body));
        }
        catch (ServiceException ex)
        {
            return handleServiceException(ex);
        }
    }

    private boolean hasLeadMentorAccess()
    {
        return leadMentorAccessService.hasLeadMentorAccess(resolveUser());
    }

    private SysUser resolveUser()
    {
        LoginUser loginUser = SecurityUtils.getLoginUser();
        return loginUser == null ? null : loginUser.getUser();
    }

    private String resolveOperator()
    {
        try
        {
            return getUsername();
        }
        catch (ServiceException ex)
        {
            SysUser user = resolveUser();
            return user == null ? "system" : user.getUserName();
        }
    }

    private AjaxResult handleServiceException(ServiceException ex)
    {
        String message = ex.getMessage();
        if (message != null && (message.contains("无权") || message.contains("仅允许")))
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, message);
        }
        return AjaxResult.error(HttpStatus.BAD_REQUEST, message);
    }
}
