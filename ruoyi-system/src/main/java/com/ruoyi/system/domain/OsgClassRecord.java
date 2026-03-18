package com.ruoyi.system.domain;

import java.math.BigDecimal;
import java.util.Date;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.ruoyi.common.core.domain.BaseEntity;

/**
 * 课程记录 — 适配实际 osg_class_record 表结构
 */
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
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date classDate;
    private BigDecimal durationHours;
    private BigDecimal weeklyHours;
    private String status;
    private String classStatus;
    private String rate;
    private String topics;
    private String comments;
    private String feedbackContent;
    private String reviewRemark;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date reviewedAt;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date submittedAt;
    private String delFlag;

    // transient query
    private Date classDateStart;
    private Date classDateEnd;

    public Long getRecordId() { return recordId; }
    public void setRecordId(Long v) { this.recordId = v; }
    public String getClassId() { return classId; }
    public void setClassId(String v) { this.classId = v; }
    public Long getMentorId() { return mentorId; }
    public void setMentorId(Long v) { this.mentorId = v; }
    public String getMentorName() { return mentorName; }
    public void setMentorName(String v) { this.mentorName = v; }
    public Long getStudentId() { return studentId; }
    public void setStudentId(Long v) { this.studentId = v; }
    public String getStudentName() { return studentName; }
    public void setStudentName(String v) { this.studentName = v; }
    public String getCourseType() { return courseType; }
    public void setCourseType(String v) { this.courseType = v; }
    public String getCourseSource() { return courseSource; }
    public void setCourseSource(String v) { this.courseSource = v; }
    public Date getClassDate() { return classDate; }
    public void setClassDate(Date v) { this.classDate = v; }
    public BigDecimal getDurationHours() { return durationHours; }
    public void setDurationHours(BigDecimal v) { this.durationHours = v; }
    public BigDecimal getWeeklyHours() { return weeklyHours; }
    public void setWeeklyHours(BigDecimal v) { this.weeklyHours = v; }
    public String getStatus() { return status; }
    public void setStatus(String v) { this.status = v; }
    public String getClassStatus() { return classStatus; }
    public void setClassStatus(String v) { this.classStatus = v; }
    public String getRate() { return rate; }
    public void setRate(String v) { this.rate = v; }
    public String getTopics() { return topics; }
    public void setTopics(String v) { this.topics = v; }
    public String getComments() { return comments; }
    public void setComments(String v) { this.comments = v; }
    public String getFeedbackContent() { return feedbackContent; }
    public void setFeedbackContent(String v) { this.feedbackContent = v; }
    public String getReviewRemark() { return reviewRemark; }
    public void setReviewRemark(String v) { this.reviewRemark = v; }
    public Date getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(Date v) { this.reviewedAt = v; }
    public Date getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(Date v) { this.submittedAt = v; }
    public String getDelFlag() { return delFlag; }
    public void setDelFlag(String v) { this.delFlag = v; }
    public Date getClassDateStart() { return classDateStart; }
    public void setClassDateStart(Date v) { this.classDateStart = v; }
    public Date getClassDateEnd() { return classDateEnd; }
    public void setClassDateEnd(Date v) { this.classDateEnd = v; }
}
