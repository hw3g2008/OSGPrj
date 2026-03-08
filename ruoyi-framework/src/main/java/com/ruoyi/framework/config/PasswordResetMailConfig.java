package com.ruoyi.framework.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * 密码重置邮件配置。
 */
@Configuration
@ConfigurationProperties(prefix = "user.password.mail")
public class PasswordResetMailConfig
{
    private String from;

    private String mailbox;

    private String providerLogPath;

    public String getFrom()
    {
        return from;
    }

    public void setFrom(String from)
    {
        this.from = from;
    }

    public String getMailbox()
    {
        return mailbox;
    }

    public void setMailbox(String mailbox)
    {
        this.mailbox = mailbox;
    }

    public String getProviderLogPath()
    {
        return providerLogPath;
    }

    public void setProviderLogPath(String providerLogPath)
    {
        this.providerLogPath = providerLogPath;
    }
}
