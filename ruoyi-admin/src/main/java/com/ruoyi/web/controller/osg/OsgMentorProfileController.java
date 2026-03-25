package com.ruoyi.web.controller.osg;
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
@RestController
@RequestMapping("/api/mentor/profile")
public class OsgMentorProfileController extends BaseController {
    @Autowired private ISysUserService userService;
    @GetMapping
    public AjaxResult getProfile() {
        SysUser user = userService.selectUserById(SecurityUtils.getUserId());
        return success(user);
    }
    @PutMapping
    public AjaxResult updateProfile(@Validated @RequestBody SysUser user) {
        if (StringUtils.isNotEmpty(user.getNickName()) && user.getNickName().length() > 30)
        {
            return AjaxResult.error(HttpStatus.BAD_REQUEST, "用户昵称长度不能超过30个字符");
        }
        user.setUserId(SecurityUtils.getUserId());
        user.setUpdateBy(SecurityUtils.getUsername());
        try
        {
            return toAjax(userService.updateUserProfile(user));
        }
        catch (ServiceException e)
        {
            return AjaxResult.error(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }
}
