package com.ruoyi.system.domain;

import java.util.Date;
import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;
import com.ruoyi.common.core.domain.BaseEntity;

public class OsgCoaching extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    private Long coachingId;

    private Long applicationId;

    private Long studentId;

    private Long mentorId;

    private String mentorName;

    private String mentorIds;

    private String mentorNames;

    private String mentorBackground;

    private String status;

    private Integer totalHours;

    private String feedbackSummary;

    private String assignNote;

    private Date assignedAt;

    private Date confirmedAt;

    public Long getCoachingId()
    {
        return coachingId;
    }

    public void setCoachingId(Long coachingId)
    {
        this.coachingId = coachingId;
    }

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

    public String getMentorIds()
    {
        return mentorIds;
    }

    public void setMentorIds(String mentorIds)
    {
        this.mentorIds = mentorIds;
    }

    public String getMentorNames()
    {
        return mentorNames;
    }

    public void setMentorNames(String mentorNames)
    {
        this.mentorNames = mentorNames;
    }

    public String getMentorBackground()
    {
        return mentorBackground;
    }

    public void setMentorBackground(String mentorBackground)
    {
        this.mentorBackground = mentorBackground;
    }

    public String getStatus()
    {
        return status;
    }

    public void setStatus(String status)
    {
        this.status = status;
    }

    public Integer getTotalHours()
    {
        return totalHours;
    }

    public void setTotalHours(Integer totalHours)
    {
        this.totalHours = totalHours;
    }

    public String getFeedbackSummary()
    {
        return feedbackSummary;
    }

    public void setFeedbackSummary(String feedbackSummary)
    {
        this.feedbackSummary = feedbackSummary;
    }

    public String getAssignNote()
    {
        return assignNote;
    }

    public void setAssignNote(String assignNote)
    {
        this.assignNote = assignNote;
    }

    public Date getAssignedAt()
    {
        return assignedAt;
    }

    public void setAssignedAt(Date assignedAt)
    {
        this.assignedAt = assignedAt;
    }

    public Date getConfirmedAt()
    {
        return confirmedAt;
    }

    public void setConfirmedAt(Date confirmedAt)
    {
        this.confirmedAt = confirmedAt;
    }

    @Override
    public String toString()
    {
        return new ToStringBuilder(this, ToStringStyle.MULTI_LINE_STYLE)
            .append("coachingId", getCoachingId())
            .append("applicationId", getApplicationId())
            .append("studentId", getStudentId())
            .append("mentorId", getMentorId())
            .append("mentorName", getMentorName())
            .append("mentorIds", getMentorIds())
            .append("mentorNames", getMentorNames())
            .append("mentorBackground", getMentorBackground())
            .append("status", getStatus())
            .append("totalHours", getTotalHours())
            .append("feedbackSummary", getFeedbackSummary())
            .append("assignNote", getAssignNote())
            .append("assignedAt", getAssignedAt())
            .append("confirmedAt", getConfirmedAt())
            .append("createBy", getCreateBy())
            .append("createTime", getCreateTime())
            .append("updateBy", getUpdateBy())
            .append("updateTime", getUpdateTime())
            .append("remark", getRemark())
            .toString();
    }
}
