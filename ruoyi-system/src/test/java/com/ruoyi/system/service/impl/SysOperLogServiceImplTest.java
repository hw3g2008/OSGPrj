package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.ruoyi.system.domain.SysOperLog;
import com.ruoyi.system.mapper.SysOperLogMapper;

@ExtendWith(MockitoExtension.class)
class SysOperLogServiceImplTest
{
    @InjectMocks
    private SysOperLogServiceImpl service;

    @Mock
    private SysOperLogMapper operLogMapper;

    @Test
    void selectScopedOperLogListShouldFilterKeywordTypeAndDateRange()
    {
        when(operLogMapper.selectOperLogList(any(SysOperLog.class))).thenReturn(List.of(
            newLog(11L, "admin", 1, 0, "登录", "127.0.0.1", LocalDateTime.of(2026, 3, 14, 9, 0)),
            newLog(12L, "clerk", 1, 1, "新增岗位", "127.0.0.2", LocalDateTime.of(2026, 3, 14, 10, 30)),
            newLog(13L, "clerk", 1, 2, "修改导师", "127.0.0.3", LocalDateTime.of(2026, 3, 15, 10, 30))
        ));

        List<SysOperLog> rows = service.selectScopedOperLogList("clerk", "新增", "2026-03-14", "2026-03-14");

        assertEquals(1, rows.size());
        assertEquals(Long.valueOf(12L), rows.get(0).getOperId());
    }

    private SysOperLog newLog(
        Long operId,
        String operName,
        Integer operatorType,
        Integer businessType,
        String title,
        String operIp,
        LocalDateTime operTime)
    {
        SysOperLog operLog = new SysOperLog();
        operLog.setOperId(operId);
        operLog.setOperName(operName);
        operLog.setOperatorType(operatorType);
        operLog.setBusinessType(businessType);
        operLog.setTitle(title);
        operLog.setOperIp(operIp);
        operLog.setOperTime(Timestamp.valueOf(operTime));
        return operLog;
    }
}
