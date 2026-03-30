package com.ruoyi.system.service.impl;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.ruoyi.system.domain.SysOperLog;
import com.ruoyi.system.mapper.SysOperLogMapper;
import com.ruoyi.system.service.ISysOperLogService;

/**
 * 操作日志 服务层处理
 * 
 * @author ruoyi
 */
@Service
public class SysOperLogServiceImpl implements ISysOperLogService
{
    @Autowired
    private SysOperLogMapper operLogMapper;

    /**
     * 新增操作日志
     * 
     * @param operLog 操作日志对象
     */
    @Override
    public void insertOperlog(SysOperLog operLog)
    {
        operLogMapper.insertOperlog(operLog);
    }

    /**
     * 查询系统操作日志集合
     * 
     * @param operLog 操作日志对象
     * @return 操作日志集合
     */
    @Override
    public List<SysOperLog> selectOperLogList(SysOperLog operLog)
    {
        return operLogMapper.selectOperLogList(operLog);
    }

    public List<SysOperLog> selectScopedOperLogList(String keyword, String operationType, String beginTime, String endTime)
    {
        SysOperLog query = new SysOperLog();
        if (beginTime != null && !beginTime.isBlank())
        {
            query.getParams().put("beginTime", normalizeBeginTime(beginTime));
        }
        if (endTime != null && !endTime.isBlank())
        {
            query.getParams().put("endTime", normalizeEndTime(endTime));
        }

        List<SysOperLog> rows = selectOperLogList(query);
        if (rows == null || rows.isEmpty())
        {
            return Collections.emptyList();
        }
        return rows.stream()
            .filter(row -> matchesKeyword(row, keyword))
            .filter(row -> matchesOperationType(row, operationType))
            .filter(row -> matchesDateRange(row, beginTime, endTime))
            .toList();
    }

    /**
     * 批量删除系统操作日志
     * 
     * @param operIds 需要删除的操作日志ID
     * @return 结果
     */
    @Override
    public int deleteOperLogByIds(Long[] operIds)
    {
        return operLogMapper.deleteOperLogByIds(operIds);
    }

    /**
     * 查询操作日志详细
     * 
     * @param operId 操作ID
     * @return 操作日志对象
     */
    @Override
    public SysOperLog selectOperLogById(Long operId)
    {
        return operLogMapper.selectOperLogById(operId);
    }

    /**
     * 清空操作日志
     */
    @Override
    public void cleanOperLog()
    {
        operLogMapper.cleanOperLog();
    }

    private boolean matchesKeyword(SysOperLog row, String keyword)
    {
        if (keyword == null || keyword.isBlank())
        {
            return true;
        }
        String normalizedKeyword = keyword.trim().toLowerCase();
        return containsIgnoreCase(row.getOperName(), normalizedKeyword)
            || containsIgnoreCase(row.getTitle(), normalizedKeyword);
    }

    private boolean matchesOperationType(SysOperLog row, String operationType)
    {
        if (operationType == null || operationType.isBlank())
        {
            return true;
        }
        return switch (operationType.trim())
        {
            case "登录" -> Objects.equals("登录", row.getTitle());
            case "新增" -> Objects.equals(Integer.valueOf(1), row.getBusinessType());
            case "修改" -> Objects.equals(Integer.valueOf(2), row.getBusinessType());
            case "删除" -> Objects.equals(Integer.valueOf(3), row.getBusinessType());
            default -> true;
        };
    }

    private boolean matchesDateRange(SysOperLog row, String beginTime, String endTime)
    {
        if (row.getOperTime() == null)
        {
            return beginTime == null && endTime == null;
        }
        LocalDateTime operatedAt = LocalDateTime.ofInstant(row.getOperTime().toInstant(), ZoneId.systemDefault());
        if (beginTime != null && !beginTime.isBlank() && operatedAt.isBefore(parseDateTime(normalizeBeginTime(beginTime))))
        {
            return false;
        }
        if (endTime != null && !endTime.isBlank() && operatedAt.isAfter(parseDateTime(normalizeEndTime(endTime))))
        {
            return false;
        }
        return true;
    }

    private boolean containsIgnoreCase(String source, String keyword)
    {
        return source != null && source.toLowerCase().contains(keyword);
    }

    private String normalizeBeginTime(String beginTime)
    {
        return beginTime.trim().length() == 10 ? beginTime.trim() + " 00:00:00" : beginTime.trim();
    }

    private String normalizeEndTime(String endTime)
    {
        return endTime.trim().length() == 10 ? endTime.trim() + " 23:59:59" : endTime.trim();
    }

    private LocalDateTime parseDateTime(String value)
    {
        if (value.length() == 10)
        {
            return LocalDate.parse(value).atStartOfDay();
        }
        return LocalDateTime.parse(value, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }
}
