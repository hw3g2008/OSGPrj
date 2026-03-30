package com.ruoyi.system.domain;

import java.util.Date;
import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;
import com.ruoyi.common.core.domain.BaseEntity;

public class OsgJobApplication extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    private Long applicationId;

    private Long studentId;

    private Long positionId;

    private String studentName;

    private String companyName;

    private String positionName;

    private String region;

    private String city;

    private String currentStage;

    private Date interviewTime;

    private String coachingStatus;

    private Long leadMentorId;

    private String leadMentorName;

    private String assignStatus;

    private Integer requestedMentorCount;

    private String preferredMentorNames;

    private Boolean stageUpdated;

    private Date submittedAt;

    private String month;

    private String status;

    private String keyword;

    public Long getApplicationId()
    {
        return applicationId;
    }

    public void setApplicationId(Long applicationId)
    {
        this.applicationId = applicationId;
    }

    public Long getStudentId()
    {
        return studentId;
    }

    public void setStudentId(Long studentId)
    {
        this.studentId = studentId;
    }

    public Long getPositionId()
    {
        return positionId;
    }

    public void setPositionId(Long positionId)
    {
        this.positionId = positionId;
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

    public String getPositionName()
    {
        return positionName;
    }

    public void setPositionName(String positionName)
    {
        this.positionName = positionName;
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

    public String getCurrentStage()
    {
        return currentStage;
    }

    public void setCurrentStage(String currentStage)
    {
        this.currentStage = currentStage;
    }

    public Date getInterviewTime()
    {
        return interviewTime;
    }

    public void setInterviewTime(Date interviewTime)
    {
        this.interviewTime = interviewTime;
    }

    public String getCoachingStatus()
    {
        return coachingStatus;
    }

    public void setCoachingStatus(String coachingStatus)
    {
        this.coachingStatus = coachingStatus;
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

    public String getAssignStatus()
    {
        return assignStatus;
    }

    public void setAssignStatus(String assignStatus)
    {
        this.assignStatus = assignStatus;
    }

    public Integer getRequestedMentorCount()
    {
        return requestedMentorCount;
    }

    public void setRequestedMentorCount(Integer requestedMentorCount)
    {
        this.requestedMentorCount = requestedMentorCount;
    }

    public String getPreferredMentorNames()
    {
        return preferredMentorNames;
    }

    public void setPreferredMentorNames(String preferredMentorNames)
    {
        this.preferredMentorNames = preferredMentorNames;
    }

    public Boolean getStageUpdated()
    {
        return stageUpdated;
    }

    public void setStageUpdated(Boolean stageUpdated)
    {
        this.stageUpdated = stageUpdated;
    }

    public Date getSubmittedAt()
    {
        return submittedAt;
    }

    public void setSubmittedAt(Date submittedAt)
    {
        this.submittedAt = submittedAt;
    }

    public String getMonth()
    {
        return month;
    }

    public void setMonth(String month)
    {
        this.month = month;
    }

    public String getStatus()
    {
        return status;
    }

    public void setStatus(String status)
    {
        this.status = status;
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
            .append("applicationId", getApplicationId())
            .append("studentId", getStudentId())
            .append("positionId", getPositionId())
            .append("studentName", getStudentName())
            .append("companyName", getCompanyName())
            .append("positionName", getPositionName())
            .append("region", getRegion())
            .append("city", getCity())
            .append("currentStage", getCurrentStage())
            .append("interviewTime", getInterviewTime())
            .append("coachingStatus", getCoachingStatus())
            .append("leadMentorId", getLeadMentorId())
            .append("leadMentorName", getLeadMentorName())
            .append("assignStatus", getAssignStatus())
            .append("requestedMentorCount", getRequestedMentorCount())
            .append("preferredMentorNames", getPreferredMentorNames())
            .append("stageUpdated", getStageUpdated())
            .append("submittedAt", getSubmittedAt())
            .append("month", getMonth())
            .append("status", getStatus())
            .append("createBy", getCreateBy())
            .append("createTime", getCreateTime())
            .append("updateBy", getUpdateBy())
            .append("updateTime", getUpdateTime())
            .append("remark", getRemark())
            .toString();
    }
}
