package com.ruoyi.system.service;

import java.util.Map;

/**
 * 学生个人中心资料服务
 */
public interface IStudentProfileService
{
    /**
     * 查询学生个人资料聚合视图
     *
     * @param userId 用户ID
     * @return 个人资料
     */
    public Map<String, Object> selectProfileView(Long userId);

    /**
     * 更新学生个人资料
     *
     * @param userId 用户ID
     * @param params 提交参数
     * @return 更新后的视图
     */
    public Map<String, Object> updateProfile(Long userId, Map<String, Object> params);
}
