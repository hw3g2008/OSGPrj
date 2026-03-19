package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;

/**
 * 学生课程记录服务
 */
public interface IStudentCourseRecordService
{
    /**
     * 查询课程记录页元数据
     *
     * @param userId 用户ID
     * @return 元数据
     */
    public Map<String, Object> selectCourseRecordMeta(Long userId);

    /**
     * 查询课程记录
     *
     * @param userId 用户ID
     * @return 记录列表
     */
    public List<Map<String, Object>> selectCourseRecordList(Long userId);

    /**
     * 提交课程评价
     *
     * @param recordId 记录ID
     * @param ratingScore 评分
     * @param ratingTags 评价标签
     * @param ratingFeedback 评价内容
     * @param userId 用户ID
     * @return 结果
     */
    public int rateCourseRecord(String recordId, Integer ratingScore, List<String> ratingTags, String ratingFeedback, Long userId);
}
