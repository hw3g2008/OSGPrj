package com.ruoyi.system.mapper;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Param;

/**
 * 学生个人资料数据层
 */
public interface StudentProfileMapper
{
    /**
     * 查询当前生效的学生资料
     *
     * @param userId 用户ID
     * @return 资料
     */
    public Map<String, Object> selectProfileByUserId(Long userId);

    /**
     * 查询待审核变更
     *
     * @param userId 用户ID
     * @return 列表
     */
    public List<Map<String, Object>> selectPendingChangesByUserId(Long userId);

    /**
     * 新建默认资料
     *
     * @param params 参数
     * @return 结果
     */
    public int insertProfile(Map<String, Object> params);

    /**
     * 更新即时生效字段
     *
     * @param userId 用户ID
     * @param phone 电话
     * @param wechatId 微信
     * @return 结果
     */
    public int updateImmediateFields(@Param("userId") Long userId, @Param("phone") String phone,
            @Param("wechatId") String wechatId);

    /**
     * 清理待审核记录
     *
     * @param userId 用户ID
     * @return 结果
     */
    public int deletePendingChangesByUserId(Long userId);

    /**
     * 写入待审核记录
     *
     * @param userId 用户ID
     * @param fieldKey 字段键
     * @param fieldLabel 字段名
     * @param oldValue 旧值
     * @param newValue 新值
     * @return 结果
     */
    public int insertPendingChange(@Param("userId") Long userId, @Param("fieldKey") String fieldKey,
            @Param("fieldLabel") String fieldLabel, @Param("oldValue") String oldValue,
            @Param("newValue") String newValue);
}
