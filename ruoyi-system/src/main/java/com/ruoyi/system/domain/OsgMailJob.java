package com.ruoyi.system.domain;

import com.ruoyi.common.core.domain.BaseEntity;

public class OsgMailJob extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    private Long jobId;
    private String jobTitle;
    private String recipientGroup;
    private String emailSubject;
    private String emailContent;
    private String smtpServerName;
    private Integer totalCount;
    private Integer pendingCount;
    private Integer successCount;
    private Integer failCount;

    public Long getJobId()
    {
        return jobId;
    }

    public void setJobId(Long jobId)
    {
        this.jobId = jobId;
    }

    public String getJobTitle()
    {
        return jobTitle;
    }

    public void setJobTitle(String jobTitle)
    {
        this.jobTitle = jobTitle;
    }

    public String getRecipientGroup()
    {
        return recipientGroup;
    }

    public void setRecipientGroup(String recipientGroup)
    {
        this.recipientGroup = recipientGroup;
    }

    public String getEmailSubject()
    {
        return emailSubject;
    }

    public void setEmailSubject(String emailSubject)
    {
        this.emailSubject = emailSubject;
    }

    public String getEmailContent()
    {
        return emailContent;
    }

    public void setEmailContent(String emailContent)
    {
        this.emailContent = emailContent;
    }

    public String getSmtpServerName()
    {
        return smtpServerName;
    }

    public void setSmtpServerName(String smtpServerName)
    {
        this.smtpServerName = smtpServerName;
    }

    public Integer getTotalCount()
    {
        return totalCount;
    }

    public void setTotalCount(Integer totalCount)
    {
        this.totalCount = totalCount;
    }

    public Integer getPendingCount()
    {
        return pendingCount;
    }

    public void setPendingCount(Integer pendingCount)
    {
        this.pendingCount = pendingCount;
    }

    public Integer getSuccessCount()
    {
        return successCount;
    }

    public void setSuccessCount(Integer successCount)
    {
        this.successCount = successCount;
    }

    public Integer getFailCount()
    {
        return failCount;
    }

    public void setFailCount(Integer failCount)
    {
        this.failCount = failCount;
    }
}
