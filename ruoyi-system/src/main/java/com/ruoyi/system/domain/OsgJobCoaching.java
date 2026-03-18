package com.ruoyi.system.domain;

import java.util.Date;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.ruoyi.common.core.domain.BaseEntity;

public class OsgJobCoaching extends BaseEntity
{
    private static final long serialVersionUID = 1L;
    private Long id;
    private Long studentId;
    private Long mentorId;
    private String company;
    private String position;
    private String location;
    private String interviewStage;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date interviewTime;
    private String coachingStatus;
    private String result;
    private String delFlag;
    private String studentName;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getStudentId() { return studentId; }
    public void setStudentId(Long studentId) { this.studentId = studentId; }
    public Long getMentorId() { return mentorId; }
    public void setMentorId(Long mentorId) { this.mentorId = mentorId; }
    public String getCompany() { return company; }
    public void setCompany(String company) { this.company = company; }
    public String getPosition() { return position; }
    public void setPosition(String position) { this.position = position; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getInterviewStage() { return interviewStage; }
    public void setInterviewStage(String interviewStage) { this.interviewStage = interviewStage; }
    public Date getInterviewTime() { return interviewTime; }
    public void setInterviewTime(Date interviewTime) { this.interviewTime = interviewTime; }
    public String getCoachingStatus() { return coachingStatus; }
    public void setCoachingStatus(String coachingStatus) { this.coachingStatus = coachingStatus; }
    public String getResult() { return result; }
    public void setResult(String result) { this.result = result; }
    public String getDelFlag() { return delFlag; }
    public void setDelFlag(String delFlag) { this.delFlag = delFlag; }
    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }
}
