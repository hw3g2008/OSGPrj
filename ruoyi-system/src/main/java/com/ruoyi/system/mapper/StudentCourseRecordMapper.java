package com.ruoyi.system.mapper;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Param;

/**
 * 学生课程记录数据层
 */
public interface StudentCourseRecordMapper
{
    /**
     * 查询课程记录
     *
     * @param userId 用户ID
     * @return 列表
     */
    public List<Map<String, Object>> selectCourseRecordList(Long userId);

    /**
     * 检查记录是否属于当前学生
     *
     * @param recordId 记录ID
     * @param userId 用户ID
     * @return 结果
     */
    public int countCourseRecord(@Param("recordId") String recordId, @Param("userId") Long userId);

    /**
     * 更新评价
     *
     * @param recordId 记录ID
     * @param userId 用户ID
     * @param ratingScore 评分
     * @param ratingTags 标签
     * @param ratingFeedback 反馈
     * @return 结果
     */
    public int updateCourseRating(@Param("recordId") String recordId, @Param("userId") Long userId,
            @Param("ratingScore") BigDecimal ratingScore, @Param("ratingTags") String ratingTags,
            @Param("ratingFeedback") String ratingFeedback);
}
