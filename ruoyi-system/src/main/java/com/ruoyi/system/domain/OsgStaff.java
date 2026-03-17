package com.ruoyi.system.domain;

import java.math.BigDecimal;
import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;
import com.ruoyi.common.core.domain.BaseEntity;

public class OsgStaff extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    private Long staffId;

    private String staffName;

    private String email;

    private String phone;

    private String staffType;

    private String majorDirection;

    private String subDirection;

    private String region;

    private String city;

    private BigDecimal hourlyRate;

    private Integer studentCount;

    private String accountStatus;

    public Long getStaffId()
    {
        return staffId;
    }

    public void setStaffId(Long staffId)
    {
        this.staffId = staffId;
    }

    public String getStaffName()
    {
        return staffName;
    }

    public void setStaffName(String staffName)
    {
        this.staffName = staffName;
    }

    public String getEmail()
    {
        return email;
    }

    public void setEmail(String email)
    {
        this.email = email;
    }

    public String getPhone()
    {
        return phone;
    }

    public void setPhone(String phone)
    {
        this.phone = phone;
    }

    public String getStaffType()
    {
        return staffType;
    }

    public void setStaffType(String staffType)
    {
        this.staffType = staffType;
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

    public BigDecimal getHourlyRate()
    {
        return hourlyRate;
    }

    public void setHourlyRate(BigDecimal hourlyRate)
    {
        this.hourlyRate = hourlyRate;
    }

    public Integer getStudentCount()
    {
        return studentCount;
    }

    public void setStudentCount(Integer studentCount)
    {
        this.studentCount = studentCount;
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
            .append("staffId", getStaffId())
            .append("staffName", getStaffName())
            .append("email", getEmail())
            .append("phone", getPhone())
            .append("staffType", getStaffType())
            .append("majorDirection", getMajorDirection())
            .append("subDirection", getSubDirection())
            .append("region", getRegion())
            .append("city", getCity())
            .append("hourlyRate", getHourlyRate())
            .append("studentCount", getStudentCount())
            .append("accountStatus", getAccountStatus())
            .append("createBy", getCreateBy())
            .append("createTime", getCreateTime())
            .append("updateBy", getUpdateBy())
            .append("updateTime", getUpdateTime())
            .append("remark", getRemark())
            .toString();
    }
}
