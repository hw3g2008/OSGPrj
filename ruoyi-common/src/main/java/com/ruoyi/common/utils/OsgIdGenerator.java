package com.ruoyi.common.utils;

import java.util.concurrent.ThreadLocalRandom;
import org.springframework.jdbc.core.JdbcTemplate;
import com.ruoyi.common.exception.ServiceException;

/**
 * OSG 5位随机数ID生成器
 * 生成范围 10000~99999 的不重复随机数ID，用于学员/导师等业务主键
 */
public class OsgIdGenerator
{
    private static final int MIN_ID = 10000;
    private static final int MAX_ID = 99999;
    private static final int MAX_RETRY = 100;

    /**
     * 生成5位随机数ID，确保在指定表中不重复
     * @param jdbc JdbcTemplate
     * @param table 表名 (如 "osg_student")
     * @param idColumn 主键列名 (如 "student_id")
     * @return 不重复的5位随机数ID
     */
    public static long generateUniqueId(JdbcTemplate jdbc, String table, String idColumn)
    {
        for (int i = 0; i < MAX_RETRY; i++)
        {
            long candidate = ThreadLocalRandom.current().nextInt(MIN_ID, MAX_ID + 1);
            Integer count = jdbc.queryForObject(
                "SELECT COUNT(1) FROM " + table + " WHERE " + idColumn + " = ?",
                Integer.class, candidate);
            if (count == null || count == 0)
            {
                return candidate;
            }
        }
        throw new ServiceException("无法生成不重复的5位随机数ID，已重试" + MAX_RETRY + "次");
    }
}
