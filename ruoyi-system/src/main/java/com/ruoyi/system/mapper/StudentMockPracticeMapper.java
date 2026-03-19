package com.ruoyi.system.mapper;

import java.util.List;
import java.util.Map;

/**
 * 学生模拟应聘 / 课程申请数据层
 */
public interface StudentMockPracticeMapper
{
    /**
     * 查询模拟应聘记录
     *
     * @param userId 用户ID
     * @return 记录列表
     */
    public List<Map<String, Object>> selectPracticeList(Long userId);

    /**
     * 查询课程申请记录
     *
     * @param userId 用户ID
     * @return 记录列表
     */
    public List<Map<String, Object>> selectClassRequestList(Long userId);

    /**
     * 新增申请
     *
     * @param params 申请参数
     * @return 结果
     */
    public int insertRequest(Map<String, Object> params);
}
