package com.ruoyi.system.domain;

import com.ruoyi.common.core.domain.BaseEntity;

public class OsgClassFeedback extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    private String type;

    private String keyword;

    private Long feedbackId;

    private String feedbackType;

    private String mentorName;

    private String studentName;

    private String courseLabel;

    private String performanceLabel;

    private String sourceLabel;

    private String feedbackDate;

    private String updatedAt;

    private Integer emailQuality;

    private Integer etiquetteScore;

    private Integer callQuality;

    private String recommendedLabel;

    private Integer score;

    private String assessmentTopic;

    public String getType()
    {
        return type;
    }

    public void setType(String type)
    {
        this.type = type;
    }

    public String getKeyword()
    {
        return keyword;
    }

    public void setKeyword(String keyword)
    {
        this.keyword = keyword;
    }

    public Long getFeedbackId()
    {
        return feedbackId;
    }

    public void setFeedbackId(Long feedbackId)
    {
        this.feedbackId = feedbackId;
    }

    public String getFeedbackType()
    {
        return feedbackType;
    }

    public void setFeedbackType(String feedbackType)
    {
        this.feedbackType = feedbackType;
    }

    public String getMentorName()
    {
        return mentorName;
    }

    public void setMentorName(String mentorName)
    {
        this.mentorName = mentorName;
    }

    public String getStudentName()
    {
        return studentName;
    }

    public void setStudentName(String studentName)
    {
        this.studentName = studentName;
    }

    public String getCourseLabel()
    {
        return courseLabel;
    }

    public void setCourseLabel(String courseLabel)
    {
        this.courseLabel = courseLabel;
    }

    public String getPerformanceLabel()
    {
        return performanceLabel;
    }

    public void setPerformanceLabel(String performanceLabel)
    {
        this.performanceLabel = performanceLabel;
    }

    public String getSourceLabel()
    {
        return sourceLabel;
    }

    public void setSourceLabel(String sourceLabel)
    {
        this.sourceLabel = sourceLabel;
    }

    public String getFeedbackDate()
    {
        return feedbackDate;
    }

    public void setFeedbackDate(String feedbackDate)
    {
        this.feedbackDate = feedbackDate;
    }

    public String getUpdatedAt()
    {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt)
    {
        this.updatedAt = updatedAt;
    }

    public Integer getEmailQuality()
    {
        return emailQuality;
    }

    public void setEmailQuality(Integer emailQuality)
    {
        this.emailQuality = emailQuality;
    }

    public Integer getEtiquetteScore()
    {
        return etiquetteScore;
    }

    public void setEtiquetteScore(Integer etiquetteScore)
    {
        this.etiquetteScore = etiquetteScore;
    }

    public Integer getCallQuality()
    {
        return callQuality;
    }

    public void setCallQuality(Integer callQuality)
    {
        this.callQuality = callQuality;
    }

    public String getRecommendedLabel()
    {
        return recommendedLabel;
    }

    public void setRecommendedLabel(String recommendedLabel)
    {
        this.recommendedLabel = recommendedLabel;
    }

    public Integer getScore()
    {
        return score;
    }

    public void setScore(Integer score)
    {
        this.score = score;
    }

    public String getAssessmentTopic()
    {
        return assessmentTopic;
    }

    public void setAssessmentTopic(String assessmentTopic)
    {
        this.assessmentTopic = assessmentTopic;
    }
}
