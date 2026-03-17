package com.ruoyi.system.domain;

import java.util.Date;
import java.util.List;
import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;
import com.ruoyi.common.core.domain.BaseEntity;

public class OsgInterviewQuestion extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    private Long questionId;
    private String questionCode;
    private String studentId;
    private String studentName;
    private String companyName;
    private String departmentName;
    private String officeLocation;
    private String interviewRound;
    private String interviewStatus;
    private Date interviewDate;
    private String interviewerName;
    private Integer questionCount;
    private String questionItemsJson;
    private List<String> questionItems;
    private String supplementalNote;
    private String sourceType;
    private Date submittedAt;
    private String reviewStatus;
    private Integer eligibleStudentCount;
    private String sharePreview;
    private String reviewedBy;
    private Date reviewedAt;
    private String reviewComment;
    private String keyword;
    private String tab;
    private String beginDate;
    private String endDate;

    public Long getQuestionId()
    {
        return questionId;
    }

    public void setQuestionId(Long questionId)
    {
        this.questionId = questionId;
    }

    public String getQuestionCode()
    {
        return questionCode;
    }

    public void setQuestionCode(String questionCode)
    {
        this.questionCode = questionCode;
    }

    public String getStudentId()
    {
        return studentId;
    }

    public void setStudentId(String studentId)
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

    public String getCompanyName()
    {
        return companyName;
    }

    public void setCompanyName(String companyName)
    {
        this.companyName = companyName;
    }

    public String getDepartmentName()
    {
        return departmentName;
    }

    public void setDepartmentName(String departmentName)
    {
        this.departmentName = departmentName;
    }

    public String getOfficeLocation()
    {
        return officeLocation;
    }

    public void setOfficeLocation(String officeLocation)
    {
        this.officeLocation = officeLocation;
    }

    public String getInterviewRound()
    {
        return interviewRound;
    }

    public void setInterviewRound(String interviewRound)
    {
        this.interviewRound = interviewRound;
    }

    public String getInterviewStatus()
    {
        return interviewStatus;
    }

    public void setInterviewStatus(String interviewStatus)
    {
        this.interviewStatus = interviewStatus;
    }

    public Date getInterviewDate()
    {
        return interviewDate;
    }

    public void setInterviewDate(Date interviewDate)
    {
        this.interviewDate = interviewDate;
    }

    public String getInterviewerName()
    {
        return interviewerName;
    }

    public void setInterviewerName(String interviewerName)
    {
        this.interviewerName = interviewerName;
    }

    public Integer getQuestionCount()
    {
        return questionCount;
    }

    public void setQuestionCount(Integer questionCount)
    {
        this.questionCount = questionCount;
    }

    public String getQuestionItemsJson()
    {
        return questionItemsJson;
    }

    public void setQuestionItemsJson(String questionItemsJson)
    {
        this.questionItemsJson = questionItemsJson;
    }

    public List<String> getQuestionItems()
    {
        return questionItems;
    }

    public void setQuestionItems(List<String> questionItems)
    {
        this.questionItems = questionItems;
    }

    public String getSupplementalNote()
    {
        return supplementalNote;
    }

    public void setSupplementalNote(String supplementalNote)
    {
        this.supplementalNote = supplementalNote;
    }

    public String getSourceType()
    {
        return sourceType;
    }

    public void setSourceType(String sourceType)
    {
        this.sourceType = sourceType;
    }

    public Date getSubmittedAt()
    {
        return submittedAt;
    }

    public void setSubmittedAt(Date submittedAt)
    {
        this.submittedAt = submittedAt;
    }

    public String getReviewStatus()
    {
        return reviewStatus;
    }

    public void setReviewStatus(String reviewStatus)
    {
        this.reviewStatus = reviewStatus;
    }

    public Integer getEligibleStudentCount()
    {
        return eligibleStudentCount;
    }

    public void setEligibleStudentCount(Integer eligibleStudentCount)
    {
        this.eligibleStudentCount = eligibleStudentCount;
    }

    public String getSharePreview()
    {
        return sharePreview;
    }

    public void setSharePreview(String sharePreview)
    {
        this.sharePreview = sharePreview;
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

    public String getReviewComment()
    {
        return reviewComment;
    }

    public void setReviewComment(String reviewComment)
    {
        this.reviewComment = reviewComment;
    }

    public String getKeyword()
    {
        return keyword;
    }

    public void setKeyword(String keyword)
    {
        this.keyword = keyword;
    }

    public String getTab()
    {
        return tab;
    }

    public void setTab(String tab)
    {
        this.tab = tab;
    }

    public String getBeginDate()
    {
        return beginDate;
    }

    public void setBeginDate(String beginDate)
    {
        this.beginDate = beginDate;
    }

    public String getEndDate()
    {
        return endDate;
    }

    public void setEndDate(String endDate)
    {
        this.endDate = endDate;
    }

    @Override
    public String toString()
    {
        return new ToStringBuilder(this, ToStringStyle.MULTI_LINE_STYLE)
            .append("questionId", getQuestionId())
            .append("questionCode", getQuestionCode())
            .append("studentId", getStudentId())
            .append("studentName", getStudentName())
            .append("companyName", getCompanyName())
            .append("departmentName", getDepartmentName())
            .append("officeLocation", getOfficeLocation())
            .append("interviewRound", getInterviewRound())
            .append("interviewStatus", getInterviewStatus())
            .append("interviewDate", getInterviewDate())
            .append("interviewerName", getInterviewerName())
            .append("questionCount", getQuestionCount())
            .append("questionItemsJson", getQuestionItemsJson())
            .append("supplementalNote", getSupplementalNote())
            .append("sourceType", getSourceType())
            .append("submittedAt", getSubmittedAt())
            .append("reviewStatus", getReviewStatus())
            .append("eligibleStudentCount", getEligibleStudentCount())
            .append("sharePreview", getSharePreview())
            .append("reviewedBy", getReviewedBy())
            .append("reviewedAt", getReviewedAt())
            .append("reviewComment", getReviewComment())
            .append("createBy", getCreateBy())
            .append("createTime", getCreateTime())
            .append("updateBy", getUpdateBy())
            .append("updateTime", getUpdateTime())
            .append("remark", getRemark())
            .toString();
    }
}
