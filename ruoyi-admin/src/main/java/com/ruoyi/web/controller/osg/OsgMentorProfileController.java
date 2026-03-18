package com.ruoyi.web.controller.osg;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.entity.SysUser;
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
    public AjaxResult updateProfile(@RequestBody SysUser user) {
        user.setUserId(SecurityUtils.getUserId());
        user.setUpdateBy(SecurityUtils.getUsername());
        return toAjax(userService.updateUser(user));
    }
}
