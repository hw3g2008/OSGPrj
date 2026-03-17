package com.ruoyi.web.controller.osg;

import java.util.Date;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.domain.OsgMailJob;
import com.ruoyi.system.mapper.OsgMailJobMapper;

@RestController
@RequestMapping("/admin/mailjob")
public class OsgMailJobController extends BaseController
{
    private static final String MAILJOB_ACCESS = "@ss.hasPermi('admin:mailjob:list')";

    private static final List<Map<String, Object>> SMTP_SERVERS = List.of(
        Map.of(
            "serverName", "Primary SMTP",
            "host", "smtp.osg.local",
            "port", 465,
            "username", "ops@osg.local",
            "status", "Active"
        )
    );

    @Autowired
    private OsgMailJobMapper mailJobMapper;

    @PreAuthorize(MAILJOB_ACCESS)
    @GetMapping("/list")
    public AjaxResult list()
    {
        List<Map<String, Object>> rows = mailJobMapper.selectMailJobList(new OsgMailJob());
        return AjaxResult.success()
            .put("rows", rows)
            .put("smtpServers", SMTP_SERVERS);
    }

    @PreAuthorize(MAILJOB_ACCESS)
    @PostMapping
    public AjaxResult create(@RequestBody OsgMailJob job)
    {
        if (StringUtils.isBlank(job.getSmtpServerName()) || smtpMissing(job.getSmtpServerName()))
        {
            return AjaxResult.error("SMTP未配置，无法发送邮件任务");
        }
        if (job.getCreateTime() == null)
        {
            job.setCreateTime(new Date());
        }
        if (job.getTotalCount() == null) job.setTotalCount(0);
        if (job.getPendingCount() == null) job.setPendingCount(0);
        if (job.getSuccessCount() == null) job.setSuccessCount(0);
        if (job.getFailCount() == null) job.setFailCount(0);

        mailJobMapper.insertMailJob(job);
        return AjaxResult.success().put("data", Map.of(
            "jobId", job.getJobId(),
            "jobTitle", job.getJobTitle(),
            "smtpServerName", job.getSmtpServerName()
        ));
    }

    private boolean smtpMissing(String smtpServerName)
    {
        return SMTP_SERVERS.stream()
            .noneMatch(server -> smtpServerName.equals(server.get("serverName")));
    }
}
