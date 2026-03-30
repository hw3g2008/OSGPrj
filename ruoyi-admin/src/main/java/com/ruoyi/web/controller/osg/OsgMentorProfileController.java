package com.ruoyi.web.controller.osg;
import java.util.Map;
import org.springframework.validation.annotation.Validated;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.constant.HttpStatus;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.service.ISysUserService;
import com.ruoyi.system.service.impl.OsgMentorProfileChangeRequestServiceImpl;
@RestController
@RequestMapping("/api/mentor/profile")
public class OsgMentorProfileController extends BaseController {
    @Autowired private ISysUserService userService;
    @Autowired private OsgMentorProfileChangeRequestServiceImpl mentorProfileChangeRequestService;
    @GetMapping
    public AjaxResult getProfile() {
        SysUser user = userService.selectUserById(SecurityUtils.getUserId());
        return success(user);
    }
    @PutMapping
    public AjaxResult updateProfile(@Validated @RequestBody Map<String, Object> body) {
        String nickName = body == null ? null : toText(body.get("nickName"));
        if (StringUtils.isNotEmpty(nickName) && nickName.length() > 30)
        {
            return AjaxResult.error(HttpStatus.BAD_REQUEST, "用户昵称长度不能超过30个字符");
        }
        try
        {
            SysUser currentUser = userService.selectUserById(SecurityUtils.getUserId());
            return AjaxResult.success("保存成功！后台文员已收到您的信息变更通知。",
                mentorProfileChangeRequestService.submitChangeRequest(currentUser, SecurityUtils.getUsername(), body));
        }
        catch (ServiceException e)
        {
            return AjaxResult.error(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    private String toText(Object value)
    {
        return value == null ? null : String.valueOf(value);
    }
}
