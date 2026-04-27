package com.ruoyi.system.mapper;

import java.math.BigDecimal;
import java.util.List;
import org.apache.ibatis.annotations.Param;
import com.ruoyi.system.domain.OsgCoaching;

public interface OsgCoachingMapper
{
    OsgCoaching selectCoachingByApplicationId(Long applicationId);

    List<OsgCoaching> selectCoachingList(OsgCoaching coaching);

    int insertCoaching(OsgCoaching coaching);

    int updateCoaching(OsgCoaching coaching);

    /**
     * §A.1 课时审核回写：原子累加 total_hours，避免先查后写竞态。
     * 仅在 reviewRecord targetStatus='approved' 分支调用。
     */
    int incrementTotalHours(@Param("applicationId") Long applicationId,
                            @Param("durationHours") BigDecimal durationHours);

    /**
     * §A.2 / §F1 重新分配辅导者时调用：清空老辅导者的 confirm 记录，
     * 重置 status='assigned'。避免新辅导者看到“已确认”状态卡死。
     */
    int resetConfirmationByApplicationId(@Param("applicationId") Long applicationId,
                                         @Param("operator") String operator);

    /**
     * §C.1 confirmCoaching 原子 SQL：仅当 confirmed_at IS NULL 时才更新。
     * affectedRows=1 → 首位 confirm 成功；=0 → 已被其他辅导者 confirm，调用方应抛业务异常。
     * 同时解决 "bug 1：不防重复 confirm" 与 "并发竞态" 两件事。
     */
    int confirmCoachingIfPending(@Param("applicationId") Long applicationId,
                                 @Param("operator") String operator);
}
