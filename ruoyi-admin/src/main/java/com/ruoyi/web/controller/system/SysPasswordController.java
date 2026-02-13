package com.ruoyi.web.controller.system;

import java.util.concurrent.TimeUnit;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.constant.CacheConstants;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.redis.RedisCache;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.service.ISysUserService;

/**
 * 忘记密码
 *
 * @author osg
 */
@RestController
@RequestMapping("/system/password")
public class SysPasswordController
{
    @Autowired
    private ISysUserService userService;

    @Autowired
    private RedisCache redisCache;

    /**
     * 发送验证码到邮箱
     */
    @PostMapping("/sendCode")
    public AjaxResult sendCode(@RequestBody SendCodeRequest request)
    {
        if (StringUtils.isEmpty(request.getEmail()))
        {
            return AjaxResult.error("邮箱不能为空");
        }

        // 检查邮箱是否存在
        SysUser user = userService.selectUserByEmail(request.getEmail());
        if (user == null)
        {
            return AjaxResult.error("该邮箱未注册");
        }

        // 生成6位验证码
        String code = String.valueOf((int) ((Math.random() * 9 + 1) * 100000));

        // 存储到 Redis，5分钟有效
        String cacheKey = CacheConstants.PWD_RESET_CODE_KEY + request.getEmail();
        redisCache.setCacheObject(cacheKey, code, 5, TimeUnit.MINUTES);

        // TODO: 实际发送邮件（这里模拟）
        // mailService.sendVerificationCode(request.getEmail(), code);

        return AjaxResult.success("验证码已发送");
    }

    /**
     * 验证验证码
     */
    @PostMapping("/verify")
    public AjaxResult verify(@RequestBody VerifyCodeRequest request)
    {
        if (StringUtils.isEmpty(request.getEmail()) || StringUtils.isEmpty(request.getCode()))
        {
            return AjaxResult.error("参数不完整");
        }

        String cacheKey = CacheConstants.PWD_RESET_CODE_KEY + request.getEmail();
        String cachedCode = redisCache.getCacheObject(cacheKey);

        if (StringUtils.isEmpty(cachedCode))
        {
            return AjaxResult.error("验证码已过期");
        }

        if (!cachedCode.equals(request.getCode()))
        {
            return AjaxResult.error("验证码错误");
        }

        // 验证通过，生成重置令牌
        String resetToken = java.util.UUID.randomUUID().toString();
        String tokenKey = CacheConstants.PWD_RESET_TOKEN_KEY + request.getEmail();
        redisCache.setCacheObject(tokenKey, resetToken, 10, TimeUnit.MINUTES);

        // 删除验证码
        redisCache.deleteObject(cacheKey);

        AjaxResult result = AjaxResult.success("验证成功");
        result.put("resetToken", resetToken);
        return result;
    }

    /**
     * 重置密码
     */
    @PostMapping("/reset")
    public AjaxResult reset(@RequestBody ResetPasswordRequest request)
    {
        if (StringUtils.isEmpty(request.getEmail()) || StringUtils.isEmpty(request.getPassword())
                || StringUtils.isEmpty(request.getResetToken()))
        {
            return AjaxResult.error("参数不完整");
        }

        // 验证重置令牌
        String tokenKey = CacheConstants.PWD_RESET_TOKEN_KEY + request.getEmail();
        String cachedToken = redisCache.getCacheObject(tokenKey);

        if (StringUtils.isEmpty(cachedToken) || !cachedToken.equals(request.getResetToken()))
        {
            return AjaxResult.error("重置链接已失效，请重新操作");
        }

        // 查找用户
        SysUser user = userService.selectUserByEmail(request.getEmail());
        if (user == null)
        {
            return AjaxResult.error("用户不存在");
        }

        // 更新密码
        user.setPassword(SecurityUtils.encryptPassword(request.getPassword()));
        userService.resetPwd(user);

        // 删除重置令牌
        redisCache.deleteObject(tokenKey);

        return AjaxResult.success("密码重置成功");
    }

    // 请求体类
    public static class SendCodeRequest
    {
        private String email;

        public String getEmail()
        {
            return email;
        }

        public void setEmail(String email)
        {
            this.email = email;
        }
    }

    public static class VerifyCodeRequest
    {
        private String email;
        private String code;

        public String getEmail()
        {
            return email;
        }

        public void setEmail(String email)
        {
            this.email = email;
        }

        public String getCode()
        {
            return code;
        }

        public void setCode(String code)
        {
            this.code = code;
        }
    }

    public static class ResetPasswordRequest
    {
        private String email;
        private String password;
        private String resetToken;

        public String getEmail()
        {
            return email;
        }

        public void setEmail(String email)
        {
            this.email = email;
        }

        public String getPassword()
        {
            return password;
        }

        public void setPassword(String password)
        {
            this.password = password;
        }

        public String getResetToken()
        {
            return resetToken;
        }

        public void setResetToken(String resetToken)
        {
            this.resetToken = resetToken;
        }
    }
}
