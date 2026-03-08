package com.ruoyi.framework.web.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import java.nio.file.Files;
import java.nio.file.Path;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.framework.config.PasswordResetMailConfig;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import static org.mockito.Mockito.mock;

class PasswordResetMailSenderTest
{
    @TempDir
    Path tempDir;

    @Test
    void sendResetCodeShouldNotRenderNullDisplayName() throws Exception
    {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        PasswordResetMailConfig config = new PasswordResetMailConfig();
        config.setFrom("noreply@example.com");
        config.setMailbox("audit@example.com");
        config.setProviderLogPath(tempDir.resolve("provider-log.jsonl").toString());
        PasswordResetMailSender sender = new PasswordResetMailSender(mailSender, config, new ObjectMapper());

        SysUser user = new SysUser();
        user.setUserId(1L);
        user.setUserName(null);
        user.setNickName(null);
        user.setEmail("target@example.com");

        sender.sendResetCode("target@example.com", "123456", user);

        ArgumentCaptor<SimpleMailMessage> messageCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(messageCaptor.capture());
        String body = messageCaptor.getValue().getText();
        assertFalse(body.contains("null"), "邮件正文不应包含 null");
        assertFalse(body.contains("undefined"), "邮件正文不应包含 undefined");
        String providerLog = Files.readString(tempDir.resolve("provider-log.jsonl"));
        assertFalse(providerLog.isBlank(), "应写入发送证据");
        assertTrue(providerLog.contains("\"capabilityId\":\"forgot-password-send-code\""), "provider log 应包含 capabilityId");
        assertTrue(providerLog.contains("\"body\":"), "provider log 应包含正文证据");
        JsonNode providerEntry = new ObjectMapper().readTree(providerLog);
        String loggedBody = providerEntry.path("body").asText();
        assertFalse(loggedBody.contains("null"), "provider log 正文不应包含 null");
        assertFalse(loggedBody.contains("undefined"), "provider log 正文不应包含 undefined");
    }
}
