package com.ruoyi.system.domain;

import java.util.Date;
import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;
import com.ruoyi.common.core.domain.BaseEntity;

public class OsgStudentChangeRequest extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    private Long requestId;

    private Long studentId;

    private String changeType;

    private String fieldKey;

    private String fieldLabel;

    private String beforeValue;

    private String afterValue;

    private String status;

    private String reviewer;

    private Date reviewedAt;

    private String requestedBy;

    public Long getRequestId()
    {
        return requestId;
    }

    public void setRequestId(Long requestId)
    {
        this.requestId = requestId;
    }

    public Long getStudentId()
    {
        return studentId;
    }

    public void setStudentId(Long studentId)
    {
        this.studentId = studentId;
    }

    public String getChangeType()
    {
        return changeType;
    }

    public void setChangeType(String changeType)
    {
        this.changeType = changeType;
    }

    public String getFieldKey()
    {
        return fieldKey;
    }

    public void setFieldKey(String fieldKey)
    {
        this.fieldKey = fieldKey;
    }

    public String getFieldLabel()
    {
        return fieldLabel;
    }

    public void setFieldLabel(String fieldLabel)
    {
        this.fieldLabel = fieldLabel;
    }

    public String getBeforeValue()
    {
        return beforeValue;
    }

    public void setBeforeValue(String beforeValue)
    {
        this.beforeValue = beforeValue;
    }

    public String getAfterValue()
    {
        return afterValue;
    }

    public void setAfterValue(String afterValue)
    {
        this.afterValue = afterValue;
    }

    public String getStatus()
    {
        return status;
    }

    public void setStatus(String status)
    {
        this.status = status;
    }

    public String getReviewer()
    {
        return reviewer;
    }

    public void setReviewer(String reviewer)
    {
        this.reviewer = reviewer;
    }

    public Date getReviewedAt()
    {
        return reviewedAt;
    }

    public void setReviewedAt(Date reviewedAt)
    {
        this.reviewedAt = reviewedAt;
    }

    public String getRequestedBy()
    {
        return requestedBy;
    }

    public void setRequestedBy(String requestedBy)
    {
        this.requestedBy = requestedBy;
    }

    @Override
    public String toString()
    {
        return new ToStringBuilder(this, ToStringStyle.MULTI_LINE_STYLE)
            .append("requestId", getRequestId())
            .append("studentId", getStudentId())
            .append("changeType", getChangeType())
            .append("fieldKey", getFieldKey())
            .append("fieldLabel", getFieldLabel())
            .append("beforeValue", getBeforeValue())
            .append("afterValue", getAfterValue())
            .append("status", getStatus())
            .append("reviewer", getReviewer())
            .append("reviewedAt", getReviewedAt())
            .append("requestedBy", getRequestedBy())
            .append("createBy", getCreateBy())
            .append("createTime", getCreateTime())
            .append("updateBy", getUpdateBy())
            .append("updateTime", getUpdateTime())
            .append("remark", getRemark())
            .toString();
    }
}
