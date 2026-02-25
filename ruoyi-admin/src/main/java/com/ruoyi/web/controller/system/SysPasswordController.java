package com.ruoyi.web.controller.system;

import java.util.Map;
import java.util.HashMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.framework.web.service.SysPasswordService;

/**
 * 密码找回
 * 
 * @author osg
 */
@RestController
@RequestMapping("/system/password")
public class SysPasswordController
{
    @Autowired
    private SysPasswordService passwordService;

    /**
     * 发送密码重置验证码
     * 
     * @param params 包含 email 字段
     * @return 结果
     */
    @PostMapping("/sendCode")
    public AjaxResult sendCode(@RequestBody Map<String, String> params)
    {
        String email = params.get("email");
        if (email == null || email.isEmpty())
        {
            return AjaxResult.error("邮箱地址不能为空");
        }
        passwordService.sendResetCode(email);
        return AjaxResult.success("验证码已发送");
    }

    /**
     * 验证密码重置验证码
     * 
     * @param params 包含 email 和 code 字段
     * @return 结果（包含 resetToken）
     */
    @PostMapping("/verify")
    public AjaxResult verify(@RequestBody Map<String, String> params)
    {
        String email = params.get("email");
        String code = params.get("code");
        if (email == null || email.isEmpty())
        {
            return AjaxResult.error("邮箱地址不能为空");
        }
        if (code == null || code.isEmpty())
        {
            return AjaxResult.error("验证码不能为空");
        }
        String resetToken = passwordService.verifyResetCode(email, code);
        Map<String, Object> data = new HashMap<>();
        data.put("resetToken", resetToken);
        return AjaxResult.success(data);
    }

    /**
     * 重置密码
     * 
     * @param params 包含 email、password 和 resetToken 字段
     * @return 结果
     */
    @PostMapping("/reset")
    public AjaxResult reset(@RequestBody Map<String, String> params)
    {
        String email = params.get("email");
        String password = params.get("password");
        String resetToken = params.get("resetToken");
        if (email == null || email.isEmpty())
        {
            return AjaxResult.error("邮箱地址不能为空");
        }
        if (password == null || password.isEmpty())
        {
            return AjaxResult.error("新密码不能为空");
        }
        if (resetToken == null || resetToken.isEmpty())
        {
            return AjaxResult.error("重置令牌不能为空");
        }
        passwordService.resetPassword(email, password, resetToken);
        return AjaxResult.success("密码重置成功");
    }
}
