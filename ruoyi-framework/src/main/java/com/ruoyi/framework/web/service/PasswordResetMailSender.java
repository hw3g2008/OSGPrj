package com.ruoyi.framework.web.service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.framework.config.PasswordResetMailConfig;

/**
 * 密码重置邮件发送器。
 */
@Service
public class PasswordResetMailSender
{
    private final JavaMailSender mailSender;

    private final PasswordResetMailConfig mailConfig;

    private final ObjectMapper objectMapper;

    public PasswordResetMailSender(JavaMailSender mailSender, PasswordResetMailConfig mailConfig, ObjectMapper objectMapper)
    {
        this.mailSender = mailSender;
        this.mailConfig = mailConfig;
        this.objectMapper = objectMapper;
    }

    public void sendResetCode(String email, String code, SysUser user)
    {
        validateConfig();
        String subject = "OSG Admin 密码重置验证码";
        String body = buildMailBody(user, code);

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailConfig.getFrom());
        message.setTo(email);
        if (StringUtils.hasText(mailConfig.getMailbox()) && !mailConfig.getMailbox().equalsIgnoreCase(email))
        {
            message.setBcc(mailConfig.getMailbox());
        }
        message.setSubject(subject);
        message.setText(body);

        try
        {
            mailSender.send(message);
            appendProviderLog(email, code, user, subject, body);
        }
        catch (MailException | IOException ex)
        {
            throw new ServiceException("验证码邮件发送失败，请稍后重试");
        }
    }

    private void validateConfig()
    {
        if (!StringUtils.hasText(mailConfig.getFrom()))
        {
            throw new ServiceException("密码重置邮件发送配置缺失: from");
        }
        if (!StringUtils.hasText(mailConfig.getMailbox()))
        {
            throw new ServiceException("密码重置邮件证据邮箱配置缺失: mailbox");
        }
        if (!StringUtils.hasText(mailConfig.getProviderLogPath()))
        {
            throw new ServiceException("密码重置邮件证据路径配置缺失: providerLogPath");
        }
    }

    private String buildMailBody(SysUser user, String code)
    {
        String displayName = resolveDisplayName(user);
        return String.format(
            "您好，%s。%n%n您的 OSG Admin 密码重置验证码为：%s%n验证码 5 分钟内有效。若非本人操作，请忽略此邮件。",
            displayName,
            code
        );
    }

    private String resolveDisplayName(SysUser user)
    {
        if (StringUtils.hasText(user.getNickName()))
        {
            return user.getNickName();
        }
        if (StringUtils.hasText(user.getUserName()))
        {
            return user.getUserName();
        }
        if (StringUtils.hasText(user.getEmail()))
        {
            return user.getEmail();
        }
        return "用户";
    }

    private void appendProviderLog(String email, String code, SysUser user, String subject, String body) throws IOException
    {
        Path logPath = resolveLogPath(mailConfig.getProviderLogPath());
        Path parent = logPath.getParent();
        if (parent != null)
        {
            Files.createDirectories(parent);
        }

        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("sentAt", OffsetDateTime.now(ZoneOffset.UTC).toString());
        entry.put("email", email);
        entry.put("code", code);
        entry.put("userId", user.getUserId());
        entry.put("userName", user.getUserName());
        entry.put("capabilityId", "forgot-password-send-code");
        entry.put("to", email);
        entry.put("mailboxTarget", mailConfig.getMailbox());
        entry.put("provider", "smtp");
        entry.put("subject", subject);
        entry.put("body", body);

        Files.writeString(
            logPath,
            objectMapper.writeValueAsString(entry) + System.lineSeparator(),
            StandardCharsets.UTF_8,
            StandardOpenOption.CREATE,
            StandardOpenOption.APPEND
        );
    }

    private Path resolveLogPath(String configuredPath)
    {
        Path candidate = Paths.get(configuredPath);
        if (candidate.isAbsolute())
        {
            return candidate;
        }
        return Paths.get("").toAbsolutePath().resolve(candidate).normalize();
    }
}
