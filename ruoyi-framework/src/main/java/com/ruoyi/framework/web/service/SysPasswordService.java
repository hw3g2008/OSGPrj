package com.ruoyi.framework.web.service;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import com.ruoyi.common.constant.CacheConstants;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.redis.RedisCache;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.exception.user.UserPasswordNotMatchException;
import com.ruoyi.common.exception.user.UserPasswordRetryLimitExceedException;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.framework.security.context.AuthenticationContextHolder;
import com.ruoyi.system.service.ISysUserService;

/**
 * 登录密码方法
 * 
 * @author ruoyi
 */
@Component
public class SysPasswordService
{
    @Autowired
    private RedisCache redisCache;

    @Autowired
    private ISysUserService userService;

    private static final String RESET_CODE_KEY = "pwd_reset_code:";
    private static final String RESET_TOKEN_KEY = "pwd_reset_token:";

    @Value(value = "${user.password.maxRetryCount}")
    private int maxRetryCount;

    @Value(value = "${user.password.lockTime}")
    private int lockTime;

    /**
     * 登录账户密码错误次数缓存键名
     * 
     * @param username 用户名
     * @return 缓存键key
     */
    private String getCacheKey(String username)
    {
        return CacheConstants.PWD_ERR_CNT_KEY + username;
    }

    public void validate(SysUser user)
    {
        Authentication usernamePasswordAuthenticationToken = AuthenticationContextHolder.getContext();
        String username = usernamePasswordAuthenticationToken.getName();
        String password = usernamePasswordAuthenticationToken.getCredentials().toString();

        Integer retryCount = redisCache.getCacheObject(getCacheKey(username));

        if (retryCount == null)
        {
            retryCount = 0;
        }

        if (retryCount >= Integer.valueOf(maxRetryCount).intValue())
        {
            throw new UserPasswordRetryLimitExceedException(maxRetryCount, lockTime);
        }

        if (!matches(user, password))
        {
            retryCount = retryCount + 1;
            redisCache.setCacheObject(getCacheKey(username), retryCount, lockTime, TimeUnit.MINUTES);
            throw new UserPasswordNotMatchException();
        }
        else
        {
            clearLoginRecordCache(username);
        }
    }

    public boolean matches(SysUser user, String rawPassword)
    {
        return SecurityUtils.matchesPassword(rawPassword, user.getPassword());
    }

    public void clearLoginRecordCache(String loginName)
    {
        if (redisCache.hasKey(getCacheKey(loginName)))
        {
            redisCache.deleteObject(getCacheKey(loginName));
        }
    }

    /**
     * 根据邮箱查找用户
     */
    private SysUser findUserByEmail(String email)
    {
        SysUser query = new SysUser();
        query.setEmail(email);
        List<SysUser> users = userService.selectUserList(query);
        if (users == null || users.isEmpty())
        {
            return null;
        }
        return users.get(0);
    }

    /**
     * 生成6位数字验证码
     */
    private String generateCode()
    {
        int code = (int) ((Math.random() * 900000) + 100000);
        return String.valueOf(code);
    }

    /**
     * 验证密码规则：8-20位，包含字母和数字
     */
    private void validatePasswordRule(String password)
    {
        if (password.length() < 8 || password.length() > 20)
        {
            throw new ServiceException("密码长度需为8-20字符");
        }
        if (!password.matches(".*[a-zA-Z].*"))
        {
            throw new ServiceException("密码需包含字母");
        }
        if (!password.matches(".*[0-9].*"))
        {
            throw new ServiceException("密码需包含数字");
        }
    }

    /**
     * 发送密码重置验证码
     * 
     * @param email 邮箱地址
     */
    public void sendResetCode(String email)
    {
        SysUser user = findUserByEmail(email);
        if (user == null)
        {
            throw new ServiceException("该邮箱未注册");
        }
        String code = generateCode();
        redisCache.setCacheObject(RESET_CODE_KEY + email, code, 5, TimeUnit.MINUTES);
        // 实际发送邮件逻辑（当前阶段仅缓存验证码，邮件发送待集成邮件服务）
    }

    /**
     * 验证密码重置验证码
     * 
     * @param email 邮箱地址
     * @param code 验证码
     * @return resetToken
     */
    public String verifyResetCode(String email, String code)
    {
        String cachedCode = redisCache.getCacheObject(RESET_CODE_KEY + email);
        if (cachedCode == null)
        {
            throw new ServiceException("验证码已过期，请重新发送");
        }
        if (!cachedCode.equals(code))
        {
            throw new ServiceException("验证码错误");
        }
        redisCache.deleteObject(RESET_CODE_KEY + email);
        String resetToken = UUID.randomUUID().toString();
        redisCache.setCacheObject(RESET_TOKEN_KEY + email, resetToken, 10, TimeUnit.MINUTES);
        return resetToken;
    }

    /**
     * 重置密码
     * 
     * @param email 邮箱地址
     * @param password 新密码
     * @param resetToken 重置令牌
     */
    public void resetPassword(String email, String password, String resetToken)
    {
        String cachedToken = redisCache.getCacheObject(RESET_TOKEN_KEY + email);
        if (cachedToken == null || !cachedToken.equals(resetToken))
        {
            throw new ServiceException("重置令牌无效或已过期");
        }
        validatePasswordRule(password);
        SysUser user = findUserByEmail(email);
        if (user == null)
        {
            throw new ServiceException("用户不存在");
        }
        userService.resetUserPwd(user.getUserId(), SecurityUtils.encryptPassword(password));
        redisCache.deleteObject(RESET_TOKEN_KEY + email);
    }
}
