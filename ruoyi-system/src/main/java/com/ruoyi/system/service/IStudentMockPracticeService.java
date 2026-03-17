package com.ruoyi.system.service;

import java.util.Map;

/**
 * 学生模拟应聘 / 课程申请服务
 */
public interface IStudentMockPracticeService
{
    /**
     * 查询页面元数据
     *
     * @param userId 用户ID
     * @return 页面元数据
     */
    public Map<String, Object> selectMeta(Long userId);

    /**
     * 查询页面总览
     *
     * @param userId 用户ID
     * @return 页面数据
     */
    public Map<String, Object> selectOverview(Long userId);

    /**
     * 新建模拟应聘申请
     *
     * @param practiceType 申请类型
     * @param reason 申请原因
     * @param mentorCount 导师数量
     * @param preferredMentor 意向导师
     * @param excludedMentor 排除导师
     * @param remark 备注
     * @param userId 用户ID
     * @return 申请ID
     */
    public Long createPracticeRequest(String practiceType, String reason, String mentorCount, String preferredMentor,
            String excludedMentor, String remark, Long userId);

    /**
     * 新建课程申请
     *
     * @param courseType 课程类型
     * @param company 目标公司
     * @param jobStatus 当前状态
     * @param remark 备注
     * @param userId 用户ID
     * @return 申请ID
     */
    public Long createClassRequest(String courseType, String company, String jobStatus, String remark, Long userId);
}
