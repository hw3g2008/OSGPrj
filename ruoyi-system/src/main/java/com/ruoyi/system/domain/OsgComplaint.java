package com.ruoyi.system.domain;

import java.util.Date;
import com.ruoyi.common.core.domain.BaseEntity;

public class OsgComplaint extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    private Long complaintId;
    private String studentName;
    private String complaintType;
    private String complaintTitle;
    private String complaintContent;
    private String processStatus;
    private Date submitTime;
    private Date handleTime;

    public Long getComplaintId()
    {
        return complaintId;
    }

    public void setComplaintId(Long complaintId)
    {
        this.complaintId = complaintId;
    }

    public String getStudentName()
    {
        return studentName;
    }

    public void setStudentName(String studentName)
    {
        this.studentName = studentName;
    }

    public String getComplaintType()
    {
        return complaintType;
    }

    public void setComplaintType(String complaintType)
    {
        this.complaintType = complaintType;
    }

    public String getComplaintTitle()
    {
        return complaintTitle;
    }

    public void setComplaintTitle(String complaintTitle)
    {
        this.complaintTitle = complaintTitle;
    }

    public String getComplaintContent()
    {
        return complaintContent;
    }

    public void setComplaintContent(String complaintContent)
    {
        this.complaintContent = complaintContent;
    }

    public String getProcessStatus()
    {
        return processStatus;
    }

    public void setProcessStatus(String processStatus)
    {
        this.processStatus = processStatus;
    }

    public Date getSubmitTime()
    {
        return submitTime;
    }

    public void setSubmitTime(Date submitTime)
    {
        this.submitTime = submitTime;
    }

    public Date getHandleTime()
    {
        return handleTime;
    }

    public void setHandleTime(Date handleTime)
    {
        this.handleTime = handleTime;
    }
}
