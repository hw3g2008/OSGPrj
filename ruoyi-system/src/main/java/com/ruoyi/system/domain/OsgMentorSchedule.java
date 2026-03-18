package com.ruoyi.system.domain;
import java.math.BigDecimal;
import java.util.Date;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.ruoyi.common.core.domain.BaseEntity;
public class OsgMentorSchedule extends BaseEntity {
    private static final long serialVersionUID = 1L;
    private Long id;
    private Long mentorId;
    @JsonFormat(pattern = "yyyy-MM-dd")
    private Date weekStartDate;
    private BigDecimal totalHours;
    private String monday;
    private String tuesday;
    private String wednesday;
    private String thursday;
    private String friday;
    private String saturday;
    private String sunday;
    private String delFlag;
    public Long getId(){return id;} public void setId(Long v){this.id=v;}
    public Long getMentorId(){return mentorId;} public void setMentorId(Long v){this.mentorId=v;}
    public Date getWeekStartDate(){return weekStartDate;} public void setWeekStartDate(Date v){this.weekStartDate=v;}
    public BigDecimal getTotalHours(){return totalHours;} public void setTotalHours(BigDecimal v){this.totalHours=v;}
    public String getMonday(){return monday;} public void setMonday(String v){this.monday=v;}
    public String getTuesday(){return tuesday;} public void setTuesday(String v){this.tuesday=v;}
    public String getWednesday(){return wednesday;} public void setWednesday(String v){this.wednesday=v;}
    public String getThursday(){return thursday;} public void setThursday(String v){this.thursday=v;}
    public String getFriday(){return friday;} public void setFriday(String v){this.friday=v;}
    public String getSaturday(){return saturday;} public void setSaturday(String v){this.saturday=v;}
    public String getSunday(){return sunday;} public void setSunday(String v){this.sunday=v;}
    public String getDelFlag(){return delFlag;} public void setDelFlag(String v){this.delFlag=v;}
}
