package com.ruoyi.web.controller.osg;

import java.util.HashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.ruoyi.common.annotation.Anonymous;
import com.ruoyi.common.annotation.RateLimiter;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.enums.LimitType;
import com.ruoyi.framework.web.service.SysPasswordService;

/**
 * 导师端忘记密码 — 委托 SysPasswordService（复用 permission 模块已有逻辑）
 */
@RestController
@RequestMapping("/api/mentor/forgot-password")
public class OsgForgotPasswordController
{
    private static final String SEND_CODE_ACK = "我们会往您的注册邮箱发送验证码，请查收";

    @Autowired
    private SysPasswordService passwordService;

    @Anonymous
    @RateLimiter(time = 300, count = 5, limitType = LimitType.IP)
    @PostMapping("/send-code")
    public AjaxResult sendCode(@RequestBody Map<String, String> params)
    {
        String email = params.get("email");
        if (email == null || email.isBlank())
        {
            return AjaxResult.error("邮箱地址不能为空");
        }
        passwordService.sendResetCode(email);
        return AjaxResult.success(SEND_CODE_ACK);
    }

    @Anonymous
    @PostMapping("/verify-code")
    public AjaxResult verifyCode(@RequestBody Map<String, String> params)
    {
        String email = params.get("email");
        String code = params.get("code");
        if (email == null || email.isBlank())
        {
            return AjaxResult.error("邮箱地址不能为空");
        }
        if (code == null || code.isBlank())
        {
            return AjaxResult.error("验证码不能为空");
        }
        String resetToken = passwordService.verifyResetCode(email, code);
        Map<String, Object> data = new HashMap<>();
        data.put("resetToken", resetToken);
        return AjaxResult.success("验证成功", data);
    }

    @Anonymous
    @PostMapping("/reset")
    public AjaxResult reset(@RequestBody Map<String, String> params)
    {
        String email = params.get("email");
        String password = params.get("password");
        String resetToken = params.get("resetToken");
        if (email == null || email.isBlank())
        {
            return AjaxResult.error("邮箱地址不能为空");
        }
        if (password == null || password.isBlank())
        {
            return AjaxResult.error("新密码不能为空");
        }
        if (resetToken == null || resetToken.isBlank())
        {
            return AjaxResult.error("重置令牌不能为空");
        }
        passwordService.resetPassword(email, password, resetToken);
        return AjaxResult.success("密码重置成功");
    }
}
