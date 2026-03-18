package com.ruoyi.system.domain;

import java.util.Date;
import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;
import com.ruoyi.common.core.domain.BaseEntity;

public class OsgClassRecord extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    private Long recordId;
    private String classId;
    private Long mentorId;
    private String mentorName;
    private Long studentId;
    private String studentName;
    private String courseType;
    private String courseSource;
    private Date classDate;
    private Double durationHours;
    private Double weeklyHours;
    private String status;
    private String classStatus;
    private String rate;
    private String topics;
    private String comments;
    private String feedbackContent;
    private String reviewRemark;
    private Date reviewedAt;
    private Date submittedAt;
    private String delFlag;
    private String keyword;
    private String tab;
    private String overtimeFlag;
    private String overdueFlag;
    private Integer pendingDays;
    private Integer pendingReviewCount;
    private Date classDateStart;
    private Date classDateEnd;

    public Long getRecordId()
    {
        return recordId;
    }

    public void setRecordId(Long recordId)
    {
        this.recordId = recordId;
    }

    public String getClassId()
    {
        return classId;
    }

    public void setClassId(String classId)
    {
        this.classId = classId;
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

    public String getCourseType()
    {
        return courseType;
    }

    public void setCourseType(String courseType)
    {
        this.courseType = courseType;
    }

    public String getCourseSource()
    {
        return courseSource;
    }

    public void setCourseSource(String courseSource)
    {
        this.courseSource = courseSource;
    }

    public Date getClassDate()
    {
        return classDate;
    }

    public void setClassDate(Date classDate)
    {
        this.classDate = classDate;
    }

    public Double getDurationHours()
    {
        return durationHours;
    }

    public void setDurationHours(Double durationHours)
    {
        this.durationHours = durationHours;
    }

    public Double getWeeklyHours()
    {
        return weeklyHours;
    }

    public void setWeeklyHours(Double weeklyHours)
    {
        this.weeklyHours = weeklyHours;
    }

    public String getStatus()
    {
        return status;
    }

    public void setStatus(String status)
    {
        this.status = status;
    }

    public String getClassStatus()
    {
        return classStatus;
    }

    public void setClassStatus(String classStatus)
    {
        this.classStatus = classStatus;
    }

    public String getRate()
    {
        return rate;
    }

    public void setRate(String rate)
    {
        this.rate = rate;
    }

    public String getTopics()
    {
        return topics;
    }

    public void setTopics(String topics)
    {
        this.topics = topics;
    }

    public String getComments()
    {
        return comments;
    }

    public void setComments(String comments)
    {
        this.comments = comments;
    }

    public String getFeedbackContent()
    {
        return feedbackContent;
    }

    public void setFeedbackContent(String feedbackContent)
    {
        this.feedbackContent = feedbackContent;
    }

    public String getReviewRemark()
    {
        return reviewRemark;
    }

    public void setReviewRemark(String reviewRemark)
    {
        this.reviewRemark = reviewRemark;
    }

    public Date getReviewedAt()
    {
        return reviewedAt;
    }

    public void setReviewedAt(Date reviewedAt)
    {
        this.reviewedAt = reviewedAt;
    }

    public Date getSubmittedAt()
    {
        return submittedAt;
    }

    public void setSubmittedAt(Date submittedAt)
    {
        this.submittedAt = submittedAt;
    }

    public String getDelFlag()
    {
        return delFlag;
    }

    public void setDelFlag(String delFlag)
    {
        this.delFlag = delFlag;
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

    public String getOvertimeFlag()
    {
        return overtimeFlag;
    }

    public void setOvertimeFlag(String overtimeFlag)
    {
        this.overtimeFlag = overtimeFlag;
    }

    public String getOverdueFlag()
    {
        return overdueFlag;
    }

    public void setOverdueFlag(String overdueFlag)
    {
        this.overdueFlag = overdueFlag;
    }

    public Integer getPendingDays()
    {
        return pendingDays;
    }

    public void setPendingDays(Integer pendingDays)
    {
        this.pendingDays = pendingDays;
    }

    public Integer getPendingReviewCount()
    {
        return pendingReviewCount;
    }

    public void setPendingReviewCount(Integer pendingReviewCount)
    {
        this.pendingReviewCount = pendingReviewCount;
    }

    public Date getClassDateStart()
    {
        return classDateStart;
    }

    public void setClassDateStart(Date classDateStart)
    {
        this.classDateStart = classDateStart;
    }

    public Date getClassDateEnd()
    {
        return classDateEnd;
    }

    public void setClassDateEnd(Date classDateEnd)
    {
        this.classDateEnd = classDateEnd;
    }

    @Override
    public String toString()
    {
        return new ToStringBuilder(this, ToStringStyle.MULTI_LINE_STYLE)
            .append("recordId", getRecordId())
            .append("classId", getClassId())
            .append("mentorId", getMentorId())
            .append("mentorName", getMentorName())
            .append("studentId", getStudentId())
            .append("studentName", getStudentName())
            .append("courseType", getCourseType())
            .append("courseSource", getCourseSource())
            .append("classDate", getClassDate())
            .append("durationHours", getDurationHours())
            .append("weeklyHours", getWeeklyHours())
            .append("status", getStatus())
            .append("classStatus", getClassStatus())
            .append("rate", getRate())
            .append("reviewRemark", getReviewRemark())
            .append("submittedAt", getSubmittedAt())
            .append("delFlag", getDelFlag())
            .append("pendingDays", getPendingDays())
            .append("overtimeFlag", getOvertimeFlag())
            .append("overdueFlag", getOverdueFlag())
            .append("remark", getRemark())
            .toString();
    }
}
