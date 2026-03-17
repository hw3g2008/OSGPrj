package com.ruoyi.system.domain;

import java.util.Date;
import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;
import com.ruoyi.common.core.domain.BaseEntity;

public class OsgMockPractice extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    private Long practiceId;

    private Long studentId;

    private String studentName;

    private String practiceType;

    private String requestContent;

    private Integer requestedMentorCount;

    private String preferredMentorNames;

    private String status;

    private String mentorIds;

    private String mentorNames;

    private String mentorBackgrounds;

    private Date scheduledAt;

    private Integer completedHours;

    private Integer feedbackRating;

    private String feedbackSummary;

    private Date submittedAt;

    private String keyword;

    private String tab;

    public Long getPracticeId()
    {
        return practiceId;
    }

    public void setPracticeId(Long practiceId)
    {
        this.practiceId = practiceId;
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

    public String getPracticeType()
    {
        return practiceType;
    }

    public void setPracticeType(String practiceType)
    {
        this.practiceType = practiceType;
    }

    public String getRequestContent()
    {
        return requestContent;
    }

    public void setRequestContent(String requestContent)
    {
        this.requestContent = requestContent;
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

    public String getStatus()
    {
        return status;
    }

    public void setStatus(String status)
    {
        this.status = status;
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

    public String getMentorBackgrounds()
    {
        return mentorBackgrounds;
    }

    public void setMentorBackgrounds(String mentorBackgrounds)
    {
        this.mentorBackgrounds = mentorBackgrounds;
    }

    public Date getScheduledAt()
    {
        return scheduledAt;
    }

    public void setScheduledAt(Date scheduledAt)
    {
        this.scheduledAt = scheduledAt;
    }

    public Integer getCompletedHours()
    {
        return completedHours;
    }

    public void setCompletedHours(Integer completedHours)
    {
        this.completedHours = completedHours;
    }

    public Integer getFeedbackRating()
    {
        return feedbackRating;
    }

    public void setFeedbackRating(Integer feedbackRating)
    {
        this.feedbackRating = feedbackRating;
    }

    public String getFeedbackSummary()
    {
        return feedbackSummary;
    }

    public void setFeedbackSummary(String feedbackSummary)
    {
        this.feedbackSummary = feedbackSummary;
    }

    public Date getSubmittedAt()
    {
        return submittedAt;
    }

    public void setSubmittedAt(Date submittedAt)
    {
        this.submittedAt = submittedAt;
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

    @Override
    public String toString()
    {
        return new ToStringBuilder(this, ToStringStyle.MULTI_LINE_STYLE)
            .append("practiceId", getPracticeId())
            .append("studentId", getStudentId())
            .append("studentName", getStudentName())
            .append("practiceType", getPracticeType())
            .append("requestContent", getRequestContent())
            .append("requestedMentorCount", getRequestedMentorCount())
            .append("preferredMentorNames", getPreferredMentorNames())
            .append("status", getStatus())
            .append("mentorIds", getMentorIds())
            .append("mentorNames", getMentorNames())
            .append("mentorBackgrounds", getMentorBackgrounds())
            .append("scheduledAt", getScheduledAt())
            .append("completedHours", getCompletedHours())
            .append("feedbackRating", getFeedbackRating())
            .append("feedbackSummary", getFeedbackSummary())
            .append("submittedAt", getSubmittedAt())
            .append("remark", getRemark())
            .toString();
    }
}
