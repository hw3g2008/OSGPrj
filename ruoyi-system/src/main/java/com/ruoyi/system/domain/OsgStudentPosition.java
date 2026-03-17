package com.ruoyi.system.domain;

import java.util.Date;
import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;
import com.ruoyi.common.core.domain.BaseEntity;

public class OsgStudentPosition extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    private Long studentPositionId;

    private Long studentId;

    private String studentName;

    private String positionCategory;

    private String industry;

    private String companyName;

    private String companyType;

    private String companyWebsite;

    private String positionName;

    private String department;

    private String region;

    private String city;

    private String recruitmentCycle;

    private String projectYear;

    private Date deadline;

    private String positionUrl;

    private String status;

    private String hasCoachingRequest;

    private String rejectReason;

    private String rejectNote;

    private String reviewer;

    private Date reviewedAt;

    private Long publicPositionId;

    private String flowStatus;

    private String keyword;

    public Long getStudentPositionId()
    {
        return studentPositionId;
    }

    public void setStudentPositionId(Long studentPositionId)
    {
        this.studentPositionId = studentPositionId;
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

    public String getPositionCategory()
    {
        return positionCategory;
    }

    public void setPositionCategory(String positionCategory)
    {
        this.positionCategory = positionCategory;
    }

    public String getIndustry()
    {
        return industry;
    }

    public void setIndustry(String industry)
    {
        this.industry = industry;
    }

    public String getCompanyName()
    {
        return companyName;
    }

    public void setCompanyName(String companyName)
    {
        this.companyName = companyName;
    }

    public String getCompanyType()
    {
        return companyType;
    }

    public void setCompanyType(String companyType)
    {
        this.companyType = companyType;
    }

    public String getCompanyWebsite()
    {
        return companyWebsite;
    }

    public void setCompanyWebsite(String companyWebsite)
    {
        this.companyWebsite = companyWebsite;
    }

    public String getPositionName()
    {
        return positionName;
    }

    public void setPositionName(String positionName)
    {
        this.positionName = positionName;
    }

    public String getDepartment()
    {
        return department;
    }

    public void setDepartment(String department)
    {
        this.department = department;
    }

    public String getRegion()
    {
        return region;
    }

    public void setRegion(String region)
    {
        this.region = region;
    }

    public String getCity()
    {
        return city;
    }

    public void setCity(String city)
    {
        this.city = city;
    }

    public String getRecruitmentCycle()
    {
        return recruitmentCycle;
    }

    public void setRecruitmentCycle(String recruitmentCycle)
    {
        this.recruitmentCycle = recruitmentCycle;
    }

    public String getProjectYear()
    {
        return projectYear;
    }

    public void setProjectYear(String projectYear)
    {
        this.projectYear = projectYear;
    }

    public Date getDeadline()
    {
        return deadline;
    }

    public void setDeadline(Date deadline)
    {
        this.deadline = deadline;
    }

    public String getPositionUrl()
    {
        return positionUrl;
    }

    public void setPositionUrl(String positionUrl)
    {
        this.positionUrl = positionUrl;
    }

    public String getStatus()
    {
        return status;
    }

    public void setStatus(String status)
    {
        this.status = status;
    }

    public String getHasCoachingRequest()
    {
        return hasCoachingRequest;
    }

    public void setHasCoachingRequest(String hasCoachingRequest)
    {
        this.hasCoachingRequest = hasCoachingRequest;
    }

    public String getRejectReason()
    {
        return rejectReason;
    }

    public void setRejectReason(String rejectReason)
    {
        this.rejectReason = rejectReason;
    }

    public String getRejectNote()
    {
        return rejectNote;
    }

    public void setRejectNote(String rejectNote)
    {
        this.rejectNote = rejectNote;
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

    public Long getPublicPositionId()
    {
        return publicPositionId;
    }

    public void setPublicPositionId(Long publicPositionId)
    {
        this.publicPositionId = publicPositionId;
    }

    public String getFlowStatus()
    {
        return flowStatus;
    }

    public void setFlowStatus(String flowStatus)
    {
        this.flowStatus = flowStatus;
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
            .append("studentPositionId", getStudentPositionId())
            .append("studentId", getStudentId())
            .append("studentName", getStudentName())
            .append("positionCategory", getPositionCategory())
            .append("industry", getIndustry())
            .append("companyName", getCompanyName())
            .append("positionName", getPositionName())
            .append("status", getStatus())
            .append("publicPositionId", getPublicPositionId())
            .append("reviewer", getReviewer())
            .append("reviewedAt", getReviewedAt())
            .append("createTime", getCreateTime())
            .append("updateTime", getUpdateTime())
            .toString();
    }
}
