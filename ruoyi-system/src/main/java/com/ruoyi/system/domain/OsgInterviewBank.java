package com.ruoyi.system.domain;

import java.util.Date;
import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;
import com.ruoyi.common.core.domain.BaseEntity;

public class OsgInterviewBank extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    private Long bankId;
    private String recordType;
    private String interviewBankName;
    private String interviewStage;
    private String interviewType;
    private String industryName;
    private Integer questionCount;
    private String status;
    private Date updatedAt;
    private String applicationCode;
    private String studentName;
    private String appliedPosition;
    private Date applicationTime;
    private String applicationSource;
    private String pendingFlag;
    private String keyword;

    public Long getBankId()
    {
        return bankId;
    }

    public void setBankId(Long bankId)
    {
        this.bankId = bankId;
    }

    public String getRecordType()
    {
        return recordType;
    }

    public void setRecordType(String recordType)
    {
        this.recordType = recordType;
    }

    public String getInterviewBankName()
    {
        return interviewBankName;
    }

    public void setInterviewBankName(String interviewBankName)
    {
        this.interviewBankName = interviewBankName;
    }

    public String getInterviewStage()
    {
        return interviewStage;
    }

    public void setInterviewStage(String interviewStage)
    {
        this.interviewStage = interviewStage;
    }

    public String getInterviewType()
    {
        return interviewType;
    }

    public void setInterviewType(String interviewType)
    {
        this.interviewType = interviewType;
    }

    public String getIndustryName()
    {
        return industryName;
    }

    public void setIndustryName(String industryName)
    {
        this.industryName = industryName;
    }

    public Integer getQuestionCount()
    {
        return questionCount;
    }

    public void setQuestionCount(Integer questionCount)
    {
        this.questionCount = questionCount;
    }

    public String getStatus()
    {
        return status;
    }

    public void setStatus(String status)
    {
        this.status = status;
    }

    public Date getUpdatedAt()
    {
        return updatedAt;
    }

    public void setUpdatedAt(Date updatedAt)
    {
        this.updatedAt = updatedAt;
    }

    public String getApplicationCode()
    {
        return applicationCode;
    }

    public void setApplicationCode(String applicationCode)
    {
        this.applicationCode = applicationCode;
    }

    public String getStudentName()
    {
        return studentName;
    }

    public void setStudentName(String studentName)
    {
        this.studentName = studentName;
    }

    public String getAppliedPosition()
    {
        return appliedPosition;
    }

    public void setAppliedPosition(String appliedPosition)
    {
        this.appliedPosition = appliedPosition;
    }

    public Date getApplicationTime()
    {
        return applicationTime;
    }

    public void setApplicationTime(Date applicationTime)
    {
        this.applicationTime = applicationTime;
    }

    public String getApplicationSource()
    {
        return applicationSource;
    }

    public void setApplicationSource(String applicationSource)
    {
        this.applicationSource = applicationSource;
    }

    public String getPendingFlag()
    {
        return pendingFlag;
    }

    public void setPendingFlag(String pendingFlag)
    {
        this.pendingFlag = pendingFlag;
    }

    public String getKeyword()
    {
        return keyword;
    }

    public void setKeyword(String keyword)
    {
        this.keyword = keyword;
    }

    @Override
    public String toString()
    {
        return new ToStringBuilder(this, ToStringStyle.MULTI_LINE_STYLE)
            .append("bankId", getBankId())
            .append("recordType", getRecordType())
            .append("interviewBankName", getInterviewBankName())
            .append("interviewStage", getInterviewStage())
            .append("interviewType", getInterviewType())
            .append("industryName", getIndustryName())
            .append("questionCount", getQuestionCount())
            .append("status", getStatus())
            .append("updatedAt", getUpdatedAt())
            .append("applicationCode", getApplicationCode())
            .append("studentName", getStudentName())
            .append("appliedPosition", getAppliedPosition())
            .append("applicationTime", getApplicationTime())
            .append("applicationSource", getApplicationSource())
            .append("pendingFlag", getPendingFlag())
            .append("createBy", getCreateBy())
            .append("createTime", getCreateTime())
            .append("updateBy", getUpdateBy())
            .append("updateTime", getUpdateTime())
            .append("remark", getRemark())
            .toString();
    }
}
