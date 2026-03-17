package com.ruoyi.system.domain;

import java.math.BigDecimal;
import java.util.Date;
import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;
import com.ruoyi.common.core.domain.BaseEntity;

public class OsgContract extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    private Long contractId;

    private String contractNo;

    private Long studentId;

    private String studentName;

    private Long leadMentorId;

    private String leadMentorName;

    private String contractType;

    private BigDecimal contractAmount;

    private Integer totalHours;

    private Integer usedHours;

    private Integer remainingHours;

    private Date startDate;

    private Date endDate;

    private String renewalReason;

    private String contractStatus;

    private String attachmentPath;

    public Long getContractId()
    {
        return contractId;
    }

    public void setContractId(Long contractId)
    {
        this.contractId = contractId;
    }

    public String getContractNo()
    {
        return contractNo;
    }

    public void setContractNo(String contractNo)
    {
        this.contractNo = contractNo;
    }

    public Long getStudentId()
    {
        return studentId;
    }

    public void setStudentId(Long studentId)
    {
        this.studentId = studentId;
    }

    public String getStudentName()
    {
        return studentName;
    }

    public void setStudentName(String studentName)
    {
        this.studentName = studentName;
    }

    public Long getLeadMentorId()
    {
        return leadMentorId;
    }

    public void setLeadMentorId(Long leadMentorId)
    {
        this.leadMentorId = leadMentorId;
    }

    public String getLeadMentorName()
    {
        return leadMentorName;
    }

    public void setLeadMentorName(String leadMentorName)
    {
        this.leadMentorName = leadMentorName;
    }

    public String getContractType()
    {
        return contractType;
    }

    public void setContractType(String contractType)
    {
        this.contractType = contractType;
    }

    public BigDecimal getContractAmount()
    {
        return contractAmount;
    }

    public void setContractAmount(BigDecimal contractAmount)
    {
        this.contractAmount = contractAmount;
    }

    public Integer getTotalHours()
    {
        return totalHours;
    }

    public void setTotalHours(Integer totalHours)
    {
        this.totalHours = totalHours;
    }

    public Integer getUsedHours()
    {
        return usedHours;
    }

    public void setUsedHours(Integer usedHours)
    {
        this.usedHours = usedHours;
    }

    public Integer getRemainingHours()
    {
        return remainingHours;
    }

    public void setRemainingHours(Integer remainingHours)
    {
        this.remainingHours = remainingHours;
    }

    public Date getStartDate()
    {
        return startDate;
    }

    public void setStartDate(Date startDate)
    {
        this.startDate = startDate;
    }

    public Date getEndDate()
    {
        return endDate;
    }

    public void setEndDate(Date endDate)
    {
        this.endDate = endDate;
    }

    public String getRenewalReason()
    {
        return renewalReason;
    }

    public void setRenewalReason(String renewalReason)
    {
        this.renewalReason = renewalReason;
    }

    public String getContractStatus()
    {
        return contractStatus;
    }

    public void setContractStatus(String contractStatus)
    {
        this.contractStatus = contractStatus;
    }

    public String getAttachmentPath()
    {
        return attachmentPath;
    }

    public void setAttachmentPath(String attachmentPath)
    {
        this.attachmentPath = attachmentPath;
    }

    @Override
    public String toString()
    {
        return new ToStringBuilder(this, ToStringStyle.MULTI_LINE_STYLE)
            .append("contractId", getContractId())
            .append("contractNo", getContractNo())
            .append("studentId", getStudentId())
            .append("studentName", getStudentName())
            .append("leadMentorId", getLeadMentorId())
            .append("leadMentorName", getLeadMentorName())
            .append("contractType", getContractType())
            .append("contractAmount", getContractAmount())
            .append("totalHours", getTotalHours())
            .append("usedHours", getUsedHours())
            .append("remainingHours", getRemainingHours())
            .append("startDate", getStartDate())
            .append("endDate", getEndDate())
            .append("renewalReason", getRenewalReason())
            .append("contractStatus", getContractStatus())
            .append("attachmentPath", getAttachmentPath())
            .append("createBy", getCreateBy())
            .append("createTime", getCreateTime())
            .append("updateBy", getUpdateBy())
            .append("updateTime", getUpdateTime())
            .append("remark", getRemark())
            .toString();
    }
}
