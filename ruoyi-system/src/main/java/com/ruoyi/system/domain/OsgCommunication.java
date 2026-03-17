package com.ruoyi.system.domain;

import com.ruoyi.common.core.domain.BaseEntity;

public class OsgCommunication extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    private String tab;

    private String keyword;

    private Long communicationId;

    private String tabType;

    private String studentName;

    private String recorderName;

    private String communicationMethod;

    private String communicationTime;

    private String contentPreview;

    private String followUpStatus;

    private String contactName;

    private String contactCompany;

    private String contactPosition;

    private String networkingType;

    private String statusLabel;

    public String getTab()
    {
        return tab;
    }

    public void setTab(String tab)
    {
        this.tab = tab;
    }

    public String getKeyword()
    {
        return keyword;
    }

    public void setKeyword(String keyword)
    {
        this.keyword = keyword;
    }

    public Long getCommunicationId()
    {
        return communicationId;
    }

    public void setCommunicationId(Long communicationId)
    {
        this.communicationId = communicationId;
    }

    public String getTabType()
    {
        return tabType;
    }

    public void setTabType(String tabType)
    {
        this.tabType = tabType;
    }

    public String getStudentName()
    {
        return studentName;
    }

    public void setStudentName(String studentName)
    {
        this.studentName = studentName;
    }

    public String getRecorderName()
    {
        return recorderName;
    }

    public void setRecorderName(String recorderName)
    {
        this.recorderName = recorderName;
    }

    public String getCommunicationMethod()
    {
        return communicationMethod;
    }

    public void setCommunicationMethod(String communicationMethod)
    {
        this.communicationMethod = communicationMethod;
    }

    public String getCommunicationTime()
    {
        return communicationTime;
    }

    public void setCommunicationTime(String communicationTime)
    {
        this.communicationTime = communicationTime;
    }

    public String getContentPreview()
    {
        return contentPreview;
    }

    public void setContentPreview(String contentPreview)
    {
        this.contentPreview = contentPreview;
    }

    public String getFollowUpStatus()
    {
        return followUpStatus;
    }

    public void setFollowUpStatus(String followUpStatus)
    {
        this.followUpStatus = followUpStatus;
    }

    public String getContactName()
    {
        return contactName;
    }

    public void setContactName(String contactName)
    {
        this.contactName = contactName;
    }

    public String getContactCompany()
    {
        return contactCompany;
    }

    public void setContactCompany(String contactCompany)
    {
        this.contactCompany = contactCompany;
    }

    public String getContactPosition()
    {
        return contactPosition;
    }

    public void setContactPosition(String contactPosition)
    {
        this.contactPosition = contactPosition;
    }

    public String getNetworkingType()
    {
        return networkingType;
    }

    public void setNetworkingType(String networkingType)
    {
        this.networkingType = networkingType;
    }

    public String getStatusLabel()
    {
        return statusLabel;
    }

    public void setStatusLabel(String statusLabel)
    {
        this.statusLabel = statusLabel;
    }
}
