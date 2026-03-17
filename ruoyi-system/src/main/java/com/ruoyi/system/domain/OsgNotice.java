package com.ruoyi.system.domain;

import com.ruoyi.common.core.domain.BaseEntity;

public class OsgNotice extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    private Long noticeId;
    private String receiverType;
    private String receiverLabel;
    private String noticeTitle;
    private String noticeContent;

    public Long getNoticeId()
    {
        return noticeId;
    }

    public void setNoticeId(Long noticeId)
    {
        this.noticeId = noticeId;
    }

    public String getReceiverType()
    {
        return receiverType;
    }

    public void setReceiverType(String receiverType)
    {
        this.receiverType = receiverType;
    }

    public String getReceiverLabel()
    {
        return receiverLabel;
    }

    public void setReceiverLabel(String receiverLabel)
    {
        this.receiverLabel = receiverLabel;
    }

    public String getNoticeTitle()
    {
        return noticeTitle;
    }

    public void setNoticeTitle(String noticeTitle)
    {
        this.noticeTitle = noticeTitle;
    }

    public String getNoticeContent()
    {
        return noticeContent;
    }

    public void setNoticeContent(String noticeContent)
    {
        this.noticeContent = noticeContent;
    }
}
