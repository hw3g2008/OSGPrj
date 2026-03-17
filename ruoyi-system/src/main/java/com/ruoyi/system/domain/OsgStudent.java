package com.ruoyi.system.domain;

import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;
import com.ruoyi.common.core.domain.BaseEntity;

public class OsgStudent extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    private Long studentId;

    private String studentName;

    private String email;

    private String gender;

    private String school;

    private String major;

    private Integer graduationYear;

    private String majorDirection;

    private String subDirection;

    private String targetRegion;

    private String recruitmentCycle;

    private Long leadMentorId;

    private Long assistantId;

    private String accountStatus;

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

    public String getEmail()
    {
        return email;
    }

    public void setEmail(String email)
    {
        this.email = email;
    }

    public String getGender()
    {
        return gender;
    }

    public void setGender(String gender)
    {
        this.gender = gender;
    }

    public String getSchool()
    {
        return school;
    }

    public void setSchool(String school)
    {
        this.school = school;
    }

    public String getMajor()
    {
        return major;
    }

    public void setMajor(String major)
    {
        this.major = major;
    }

    public Integer getGraduationYear()
    {
        return graduationYear;
    }

    public void setGraduationYear(Integer graduationYear)
    {
        this.graduationYear = graduationYear;
    }

    public String getMajorDirection()
    {
        return majorDirection;
    }

    public void setMajorDirection(String majorDirection)
    {
        this.majorDirection = majorDirection;
    }

    public String getSubDirection()
    {
        return subDirection;
    }

    public void setSubDirection(String subDirection)
    {
        this.subDirection = subDirection;
    }

    public String getTargetRegion()
    {
        return targetRegion;
    }

    public void setTargetRegion(String targetRegion)
    {
        this.targetRegion = targetRegion;
    }

    public String getRecruitmentCycle()
    {
        return recruitmentCycle;
    }

    public void setRecruitmentCycle(String recruitmentCycle)
    {
        this.recruitmentCycle = recruitmentCycle;
    }

    public Long getLeadMentorId()
    {
        return leadMentorId;
    }

    public void setLeadMentorId(Long leadMentorId)
    {
        this.leadMentorId = leadMentorId;
    }

    public Long getAssistantId()
    {
        return assistantId;
    }

    public void setAssistantId(Long assistantId)
    {
        this.assistantId = assistantId;
    }

    public String getAccountStatus()
    {
        return accountStatus;
    }

    public void setAccountStatus(String accountStatus)
    {
        this.accountStatus = accountStatus;
    }

    @Override
    public String toString()
    {
        return new ToStringBuilder(this, ToStringStyle.MULTI_LINE_STYLE)
            .append("studentId", getStudentId())
            .append("studentName", getStudentName())
            .append("email", getEmail())
            .append("gender", getGender())
            .append("school", getSchool())
            .append("major", getMajor())
            .append("graduationYear", getGraduationYear())
            .append("majorDirection", getMajorDirection())
            .append("subDirection", getSubDirection())
            .append("targetRegion", getTargetRegion())
            .append("recruitmentCycle", getRecruitmentCycle())
            .append("leadMentorId", getLeadMentorId())
            .append("assistantId", getAssistantId())
            .append("accountStatus", getAccountStatus())
            .append("createBy", getCreateBy())
            .append("createTime", getCreateTime())
            .append("updateBy", getUpdateBy())
            .append("updateTime", getUpdateTime())
            .append("remark", getRemark())
            .toString();
    }
}
