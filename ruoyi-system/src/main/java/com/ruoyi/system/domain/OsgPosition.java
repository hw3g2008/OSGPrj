package com.ruoyi.system.domain;

import java.util.Date;
import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;
import com.ruoyi.common.core.domain.BaseEntity;

public class OsgPosition extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    private Long positionId;

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

    private Date publishTime;

    private Date deadline;

    private String displayStatus;

    private Date displayStartTime;

    private Date displayEndTime;

    private String positionUrl;

    private String applicationNote;

    private Integer studentCount;

    private String keyword;

    public Long getPositionId()
    {
        return positionId;
    }

    public void setPositionId(Long positionId)
    {
        this.positionId = positionId;
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

    public Date getPublishTime()
    {
        return publishTime;
    }

    public void setPublishTime(Date publishTime)
    {
        this.publishTime = publishTime;
    }

    public Date getDeadline()
    {
        return deadline;
    }

    public void setDeadline(Date deadline)
    {
        this.deadline = deadline;
    }

    public String getDisplayStatus()
    {
        return displayStatus;
    }

    public void setDisplayStatus(String displayStatus)
    {
        this.displayStatus = displayStatus;
    }

    public Date getDisplayStartTime()
    {
        return displayStartTime;
    }

    public void setDisplayStartTime(Date displayStartTime)
    {
        this.displayStartTime = displayStartTime;
    }

    public Date getDisplayEndTime()
    {
        return displayEndTime;
    }

    public void setDisplayEndTime(Date displayEndTime)
    {
        this.displayEndTime = displayEndTime;
    }

    public String getPositionUrl()
    {
        return positionUrl;
    }

    public void setPositionUrl(String positionUrl)
    {
        this.positionUrl = positionUrl;
    }

    public String getApplicationNote()
    {
        return applicationNote;
    }

    public void setApplicationNote(String applicationNote)
    {
        this.applicationNote = applicationNote;
    }

    public Integer getStudentCount()
    {
        return studentCount;
    }

    public void setStudentCount(Integer studentCount)
    {
        this.studentCount = studentCount;
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
            .append("positionId", getPositionId())
            .append("positionCategory", getPositionCategory())
            .append("industry", getIndustry())
            .append("companyName", getCompanyName())
            .append("companyType", getCompanyType())
            .append("companyWebsite", getCompanyWebsite())
            .append("positionName", getPositionName())
            .append("department", getDepartment())
            .append("region", getRegion())
            .append("city", getCity())
            .append("recruitmentCycle", getRecruitmentCycle())
            .append("projectYear", getProjectYear())
            .append("publishTime", getPublishTime())
            .append("deadline", getDeadline())
            .append("displayStatus", getDisplayStatus())
            .append("displayStartTime", getDisplayStartTime())
            .append("displayEndTime", getDisplayEndTime())
            .append("positionUrl", getPositionUrl())
            .append("applicationNote", getApplicationNote())
            .append("studentCount", getStudentCount())
            .append("keyword", getKeyword())
            .append("createBy", getCreateBy())
            .append("createTime", getCreateTime())
            .append("updateBy", getUpdateBy())
            .append("updateTime", getUpdateTime())
            .append("remark", getRemark())
            .toString();
    }
}
