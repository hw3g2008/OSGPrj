package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;

/**
 * 岗位信息 业务层
 */
public interface IPositionService
{
    /**
     * 查询岗位列表
     * 
     * @param userId 用户ID
     * @return 岗位列表
     */
    public List<Map<String, Object>> selectPositionList(Long userId);

    /**
     * 查询岗位页元数据
     *
     * @param userId 用户ID
     * @return 岗位页元数据
     */
    public Map<String, Object> selectPositionMeta(Long userId);

    /**
     * 查询申请追踪列表
     * 
     * @param userId 用户ID
     * @return 申请追踪列表
     */
    public List<Map<String, Object>> selectApplicationList(Long userId);

    /**
     * 查询申请追踪页元数据
     *
     * @param userId 用户ID
     * @return 申请追踪页元数据
     */
    public Map<String, Object> selectApplicationMeta(Long userId);

    /**
     * 标记投递状态
     * 
     * @param positionId 岗位ID
     * @param applied 是否投递
     * @param appliedDate 投递日期
     * @param method 投递方式
     * @param note 备注
     * @param userId 用户ID
     * @return 结果
     */
    public int updateApplyStatus(Long positionId, Boolean applied, String appliedDate, String method, String note, Long userId);

    /**
     * 收藏岗位
     * 
     * @param positionId 岗位ID
     * @param favorited 是否收藏
     * @param userId 用户ID
     * @return 结果
     */
    public int updateFavoriteStatus(Long positionId, Boolean favorited, Long userId);

    /**
     * 记录进度
     * 
     * @param positionId 岗位ID
     * @param stage 阶段
     * @param notes 备注
     * @param userId 用户ID
     * @return 结果
     */
    public int insertProgress(Long positionId, String stage, String notes, Long userId);

    /**
     * 提交岗位辅导申请
     *
     * @param positionId 岗位ID
     * @param stage 当前面试阶段
     * @param mentorCount 导师数量
     * @param note 备注
     * @param userId 用户ID
     * @return 结果
     */
    public int requestCoaching(Long positionId, String stage, String mentorCount, String note, Long userId);

    /**
     * 手动添加岗位
     * 
     * @param category 岗位分类
     * @param title 岗位名称
     * @param company 公司名称
     * @param location 工作地点
     * @param userId 用户ID
     * @return 岗位ID
     */
    public Long createManualPosition(String category, String title, String company, String location, Long userId);
}
