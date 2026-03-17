package com.ruoyi.system.domain;

import java.math.BigDecimal;
import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;
import com.ruoyi.common.core.domain.BaseEntity;

public class OsgStaffSchedule extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    private Long scheduleId;

    private Long staffId;

    private String weekScope;

    private Integer weekday;

    private String timeSlot;

    private Integer isAvailable;

    private BigDecimal availableHours;

    private String adjustReason;

    private Integer notifyStaff;

    private Long operatorId;

    public Long getScheduleId()
    {
        return scheduleId;
    }

    public void setScheduleId(Long scheduleId)
    {
        this.scheduleId = scheduleId;
    }

    public Long getStaffId()
    {
        return staffId;
    }

    public void setStaffId(Long staffId)
    {
        this.staffId = staffId;
    }

    public String getWeekScope()
    {
        return weekScope;
    }

    public void setWeekScope(String weekScope)
    {
        this.weekScope = weekScope;
    }

    public Integer getWeekday()
    {
        return weekday;
    }

    public void setWeekday(Integer weekday)
    {
        this.weekday = weekday;
    }

    public String getTimeSlot()
    {
        return timeSlot;
    }

    public void setTimeSlot(String timeSlot)
    {
        this.timeSlot = timeSlot;
    }

    public Integer getIsAvailable()
    {
        return isAvailable;
    }

    public void setIsAvailable(Integer isAvailable)
    {
        this.isAvailable = isAvailable;
    }

    public BigDecimal getAvailableHours()
    {
        return availableHours;
    }

    public void setAvailableHours(BigDecimal availableHours)
    {
        this.availableHours = availableHours;
    }

    public String getAdjustReason()
    {
        return adjustReason;
    }

    public void setAdjustReason(String adjustReason)
    {
        this.adjustReason = adjustReason;
    }

    public Integer getNotifyStaff()
    {
        return notifyStaff;
    }

    public void setNotifyStaff(Integer notifyStaff)
    {
        this.notifyStaff = notifyStaff;
    }

    public Long getOperatorId()
    {
        return operatorId;
    }

    public void setOperatorId(Long operatorId)
    {
        this.operatorId = operatorId;
    }

    @Override
    public String toString()
    {
        return new ToStringBuilder(this, ToStringStyle.MULTI_LINE_STYLE)
            .append("scheduleId", getScheduleId())
            .append("staffId", getStaffId())
            .append("weekScope", getWeekScope())
            .append("weekday", getWeekday())
            .append("timeSlot", getTimeSlot())
            .append("isAvailable", getIsAvailable())
            .append("availableHours", getAvailableHours())
            .append("adjustReason", getAdjustReason())
            .append("notifyStaff", getNotifyStaff())
            .append("operatorId", getOperatorId())
            .append("createBy", getCreateBy())
            .append("createTime", getCreateTime())
            .append("updateBy", getUpdateBy())
            .append("updateTime", getUpdateTime())
            .append("remark", getRemark())
            .toString();
    }
}
