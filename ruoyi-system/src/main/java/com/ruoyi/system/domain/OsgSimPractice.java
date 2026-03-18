package com.ruoyi.system.domain;

import java.util.Date;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.ruoyi.common.core.domain.BaseEntity;

public class OsgSimPractice extends BaseEntity
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
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date scheduledAt;
    private Integer completedHours;
    private Integer feedbackRating;
    private String feedbackSummary;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date submittedAt;
    private String delFlag;
    // transient: mentor端按 mentor_ids LIKE 查询
    private Long currentMentorId;

    public Long getPracticeId(){return practiceId;} public void setPracticeId(Long v){this.practiceId=v;}
    public Long getStudentId(){return studentId;} public void setStudentId(Long v){this.studentId=v;}
    public String getStudentName(){return studentName;} public void setStudentName(String v){this.studentName=v;}
    public String getPracticeType(){return practiceType;} public void setPracticeType(String v){this.practiceType=v;}
    public String getRequestContent(){return requestContent;} public void setRequestContent(String v){this.requestContent=v;}
    public Integer getRequestedMentorCount(){return requestedMentorCount;} public void setRequestedMentorCount(Integer v){this.requestedMentorCount=v;}
    public String getPreferredMentorNames(){return preferredMentorNames;} public void setPreferredMentorNames(String v){this.preferredMentorNames=v;}
    public String getStatus(){return status;} public void setStatus(String v){this.status=v;}
    public String getMentorIds(){return mentorIds;} public void setMentorIds(String v){this.mentorIds=v;}
    public String getMentorNames(){return mentorNames;} public void setMentorNames(String v){this.mentorNames=v;}
    public String getMentorBackgrounds(){return mentorBackgrounds;} public void setMentorBackgrounds(String v){this.mentorBackgrounds=v;}
    public Date getScheduledAt(){return scheduledAt;} public void setScheduledAt(Date v){this.scheduledAt=v;}
    public Integer getCompletedHours(){return completedHours;} public void setCompletedHours(Integer v){this.completedHours=v;}
    public Integer getFeedbackRating(){return feedbackRating;} public void setFeedbackRating(Integer v){this.feedbackRating=v;}
    public String getFeedbackSummary(){return feedbackSummary;} public void setFeedbackSummary(String v){this.feedbackSummary=v;}
    public Date getSubmittedAt(){return submittedAt;} public void setSubmittedAt(Date v){this.submittedAt=v;}
    public String getDelFlag(){return delFlag;} public void setDelFlag(String v){this.delFlag=v;}
    public Long getCurrentMentorId(){return currentMentorId;} public void setCurrentMentorId(Long v){this.currentMentorId=v;}
}
