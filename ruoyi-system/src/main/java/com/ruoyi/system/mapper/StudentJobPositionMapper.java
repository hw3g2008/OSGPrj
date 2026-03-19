package com.ruoyi.system.mapper;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Param;

/**
 * 学生岗位信息数据层
 */
public interface StudentJobPositionMapper
{
    /**
     * 查询学生可见岗位列表
     * 
     * @param userId 用户ID
     * @return 岗位列表
     */
    public List<Map<String, Object>> selectPositionList(Long userId);

    /**
     * 查询学生申请追踪列表
     *
     * @param userId 用户ID
     * @return 申请追踪列表
     */
    public List<Map<String, Object>> selectApplicationList(Long userId);

    /**
     * 检查岗位是否对当前用户可见
     * 
     * @param positionId 岗位ID
     * @param userId 用户ID
     * @return 结果
     */
    public int countVisiblePosition(@Param("positionId") Long positionId, @Param("userId") Long userId);

    /**
     * 收藏状态 upsert
     * 
     * @param positionId 岗位ID
     * @param userId 用户ID
     * @param favorited 是否收藏
     * @return 结果
     */
    public int upsertFavoriteState(
            @Param("positionId") Long positionId,
            @Param("userId") Long userId,
            @Param("favorited") String favorited);

    /**
     * 投递状态 upsert
     * 
     * @param positionId 岗位ID
     * @param userId 用户ID
     * @param applied 是否投递
     * @param appliedDate 投递日期
     * @param applyMethod 投递方式
     * @param applyNote 投递备注
     * @param progressStage 当前进度阶段
     * @param progressNote 当前进度备注
     * @return 结果
     */
    public int upsertApplyState(
            @Param("positionId") Long positionId,
            @Param("userId") Long userId,
            @Param("applied") String applied,
            @Param("appliedDate") LocalDate appliedDate,
            @Param("applyMethod") String applyMethod,
            @Param("applyNote") String applyNote,
            @Param("progressStage") String progressStage,
            @Param("progressNote") String progressNote);

    /**
     * 岗位进度 upsert
     * 
     * @param positionId 岗位ID
     * @param userId 用户ID
     * @param progressStage 当前阶段
     * @param progressNote 备注
     * @return 结果
     */
    public int upsertProgressState(
            @Param("positionId") Long positionId,
            @Param("userId") Long userId,
            @Param("progressStage") String progressStage,
            @Param("progressNote") String progressNote);

    /**
     * 岗位辅导申请 upsert
     *
     * @param positionId 岗位ID
     * @param userId 用户ID
     * @param coachingStatus 辅导状态
     * @param coachingStage 当前阶段
     * @param coachingMentorCount 导师数量
     * @param coachingNote 备注
     * @return 结果
     */
    public int upsertCoachingState(
            @Param("positionId") Long positionId,
            @Param("userId") Long userId,
            @Param("coachingStatus") String coachingStatus,
            @Param("coachingStage") String coachingStage,
            @Param("coachingMentorCount") String coachingMentorCount,
            @Param("coachingNote") String coachingNote);

    /**
     * 新增手动岗位
     * 
     * @param params 岗位参数
     * @return 结果
     */
    public int insertManualPosition(Map<String, Object> params);
}
