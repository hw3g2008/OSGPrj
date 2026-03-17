package com.ruoyi.system.domain;

import java.math.BigDecimal;
import java.util.Date;
import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;
import com.ruoyi.common.core.domain.BaseEntity;

public class OsgExpense extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    private Long expenseId;
    private Long mentorId;
    private String mentorName;
    private String expenseType;
    private BigDecimal expenseAmount;
    private Date expenseDate;
    private String description;
    private String attachmentUrl;
    private String status;
    private String reviewComment;
    private String reviewedBy;
    private Date reviewedAt;
    private String keyword;

    public Long getExpenseId()
    {
        return expenseId;
    }

    public void setExpenseId(Long expenseId)
    {
        this.expenseId = expenseId;
    }

    public Long getMentorId()
    {
        return mentorId;
    }

    public void setMentorId(Long mentorId)
    {
        this.mentorId = mentorId;
    }

    public String getMentorName()
    {
        return mentorName;
    }

    public void setMentorName(String mentorName)
    {
        this.mentorName = mentorName;
    }

    public String getExpenseType()
    {
        return expenseType;
    }

    public void setExpenseType(String expenseType)
    {
        this.expenseType = expenseType;
    }

    public BigDecimal getExpenseAmount()
    {
        return expenseAmount;
    }

    public void setExpenseAmount(BigDecimal expenseAmount)
    {
        this.expenseAmount = expenseAmount;
    }

    public Date getExpenseDate()
    {
        return expenseDate;
    }

    public void setExpenseDate(Date expenseDate)
    {
        this.expenseDate = expenseDate;
    }

    public String getDescription()
    {
        return description;
    }

    public void setDescription(String description)
    {
        this.description = description;
    }

    public String getAttachmentUrl()
    {
        return attachmentUrl;
    }

    public void setAttachmentUrl(String attachmentUrl)
    {
        this.attachmentUrl = attachmentUrl;
    }

    public String getStatus()
    {
        return status;
    }

    public void setStatus(String status)
    {
        this.status = status;
    }

    public String getReviewComment()
    {
        return reviewComment;
    }

    public void setReviewComment(String reviewComment)
    {
        this.reviewComment = reviewComment;
    }

    public String getReviewedBy()
    {
        return reviewedBy;
    }

    public void setReviewedBy(String reviewedBy)
    {
        this.reviewedBy = reviewedBy;
    }

    public Date getReviewedAt()
    {
        return reviewedAt;
    }

    public void setReviewedAt(Date reviewedAt)
    {
        this.reviewedAt = reviewedAt;
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
            .append("expenseId", getExpenseId())
            .append("mentorId", getMentorId())
            .append("mentorName", getMentorName())
            .append("expenseType", getExpenseType())
            .append("expenseAmount", getExpenseAmount())
            .append("expenseDate", getExpenseDate())
            .append("description", getDescription())
            .append("attachmentUrl", getAttachmentUrl())
            .append("status", getStatus())
            .append("reviewComment", getReviewComment())
            .append("reviewedBy", getReviewedBy())
            .append("reviewedAt", getReviewedAt())
            .append("createBy", getCreateBy())
            .append("createTime", getCreateTime())
            .append("updateBy", getUpdateBy())
            .append("updateTime", getUpdateTime())
            .append("remark", getRemark())
            .toString();
    }
}
