package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentCaptor.forClass;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.OsgStudentMapper;

/**
 * 批次 7 + 7.5 changeStudentStatus 分支覆盖。
 * 见 docs/plans/stage-coaching-request/09-rule-a-alignment-fix-plan.md §13.4 / §13.5
 *
 * 决策表（changeStudentStatus 4 参签名）：
 *   accountStatus | frozen | 期望
 *   --------------|--------|--------------------------------------------------
 *   null          | null   | ServiceException「accountStatus / frozen 至少需提供一个」
 *   "0"           | null   | mapper 被调用，OsgStudent.accountStatus="0" frozen=null
 *   null          | 1      | mapper 被调用，OsgStudent.accountStatus=null frozen=1
 *   "0"           | 0      | mapper 被调用，accountStatus="0" frozen=0（rejoin 路径）
 *
 * 3 参 legacy 签名应桥接到 4 参，frozen 传 null。
 */
@ExtendWith(MockitoExtension.class)
class OsgStudentServiceImplChangeStatusTest
{
    @InjectMocks
    private OsgStudentServiceImpl service;

    @Mock
    private OsgStudentMapper studentMapper;

    @Test
    void changeStudentStatusShouldThrowWhenBothAccountStatusAndFrozenNull()
    {
        ServiceException ex = assertThrows(ServiceException.class,
            () -> service.changeStudentStatus(1L, null, null, "operator"));
        assertEquals("accountStatus / frozen 至少需提供一个", ex.getMessage());
    }

    @Test
    void changeStudentStatusShouldUpdateAccountStatusOnlyWhenFrozenNull()
    {
        when(studentMapper.updateStudentAccountFlags(any(OsgStudent.class))).thenReturn(1);

        int rows = service.changeStudentStatus(1L, "2", null, "operator");

        assertEquals(1, rows);
        ArgumentCaptor<OsgStudent> captor = forClass(OsgStudent.class);
        org.mockito.Mockito.verify(studentMapper).updateStudentAccountFlags(captor.capture());
        OsgStudent flags = captor.getValue();
        assertEquals(1L, flags.getStudentId());
        assertEquals("2", flags.getAccountStatus());
        assertNull(flags.getFrozen(), "frozen 维度不动时入参应为 null");
        assertEquals("operator", flags.getUpdateBy());
    }

    @Test
    void changeStudentStatusShouldUpdateFrozenOnlyWhenAccountStatusNull()
    {
        when(studentMapper.updateStudentAccountFlags(any(OsgStudent.class))).thenReturn(1);

        int rows = service.changeStudentStatus(2L, null, 1, "operator");

        assertEquals(1, rows);
        ArgumentCaptor<OsgStudent> captor = forClass(OsgStudent.class);
        org.mockito.Mockito.verify(studentMapper).updateStudentAccountFlags(captor.capture());
        OsgStudent flags = captor.getValue();
        assertEquals(2L, flags.getStudentId());
        assertNull(flags.getAccountStatus(), "accountStatus 维度不动时入参应为 null");
        assertEquals(Integer.valueOf(1), flags.getFrozen());
    }

    @Test
    void changeStudentStatusShouldUpdateBothFieldsForRejoinAction()
    {
        // rejoin：accountStatus='0' + frozen=0
        when(studentMapper.updateStudentAccountFlags(any(OsgStudent.class))).thenReturn(1);

        int rows = service.changeStudentStatus(3L, "0", 0, "operator");

        assertEquals(1, rows);
        ArgumentCaptor<OsgStudent> captor = forClass(OsgStudent.class);
        org.mockito.Mockito.verify(studentMapper).updateStudentAccountFlags(captor.capture());
        OsgStudent flags = captor.getValue();
        assertEquals("0", flags.getAccountStatus());
        assertEquals(Integer.valueOf(0), flags.getFrozen());
    }

    @Test
    void changeStudentStatusLegacyThreeArgShouldBridgeToFourArgWithNullFrozen()
    {
        // 兼容 legacy 3 参签名：仅刷 accountStatus，frozen 保持不动（传 null）
        when(studentMapper.updateStudentAccountFlags(any(OsgStudent.class))).thenReturn(1);

        int rows = service.changeStudentStatus(4L, "3", "operator");

        assertEquals(1, rows);
        ArgumentCaptor<OsgStudent> captor = forClass(OsgStudent.class);
        org.mockito.Mockito.verify(studentMapper).updateStudentAccountFlags(captor.capture());
        OsgStudent flags = captor.getValue();
        assertEquals("3", flags.getAccountStatus());
        assertNull(flags.getFrozen(), "3 参 legacy 桥接必须传 frozen=null");
    }
}
