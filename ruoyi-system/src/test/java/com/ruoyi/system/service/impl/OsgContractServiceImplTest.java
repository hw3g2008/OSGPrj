package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentCaptor.forClass;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgContract;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.OsgContractMapper;
import com.ruoyi.system.mapper.OsgStudentMapper;

@ExtendWith(MockitoExtension.class)
class OsgContractServiceImplTest
{
    @InjectMocks
    private OsgContractServiceImpl service;

    @Mock
    private OsgContractMapper contractMapper;

    @Mock
    private OsgStudentMapper studentMapper;

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void selectContractListShouldPreserveHalfHourUsage()
    {
        OsgContract contract = new OsgContract();
        contract.setContractId(101L);
        contract.setContractNo("CT-half-hour");
        contract.setStudentId(3001L);
        contract.setStudentName("Half Hour Student");
        contract.setContractType("initial");
        contract.setContractAmount(new BigDecimal("9800"));
        contract.setTotalHours(24);
        contract.setUsedHours(BigDecimal.ZERO);
        contract.setRemainingHours(new BigDecimal("24"));
        contract.setContractStatus("active");
        contract.setStartDate(Date.valueOf(LocalDate.of(2030, 1, 1)));
        contract.setEndDate(Date.valueOf(LocalDate.of(2030, 3, 31)));

        when(contractMapper.selectContractList(any(OsgContract.class))).thenReturn(List.of(contract));
        when(jdbcTemplate.queryForList(any(String.class), any(Object[].class)))
            .thenReturn(List.of(Map.of(
                "student_id", 3001L,
                "used_hours", new BigDecimal("1.5")
            )));

        List<OsgContract> rows = service.selectContractList(new OsgContract());

        assertEquals(1, rows.size());
        assertEquals(new BigDecimal("1.5"), rows.get(0).getUsedHours());
        assertEquals(new BigDecimal("22.5"), rows.get(0).getRemainingHours());
    }

    @Test
    void selectContractStatsShouldAggregateHalfHourUsage()
    {
        OsgContract contract = new OsgContract();
        contract.setContractId(102L);
        contract.setContractNo("CT-half-hour-stats");
        contract.setStudentId(3002L);
        contract.setStudentName("Half Hour Stats Student");
        contract.setContractType("initial");
        contract.setContractAmount(new BigDecimal("9800"));
        contract.setTotalHours(24);
        contract.setUsedHours(BigDecimal.ZERO);
        contract.setRemainingHours(new BigDecimal("24"));
        contract.setContractStatus("active");
        contract.setStartDate(Date.valueOf(LocalDate.of(2030, 1, 1)));
        contract.setEndDate(Date.valueOf(LocalDate.of(2030, 3, 31)));

        when(contractMapper.selectContractList(any(OsgContract.class))).thenReturn(List.of(contract));
        when(jdbcTemplate.queryForList(any(String.class), any(Object[].class)))
            .thenReturn(List.of(Map.of(
                "student_id", 3002L,
                "used_hours", new BigDecimal("1.5")
            )));

        Map<String, Object> stats = service.selectContractStats(new OsgContract());

        assertEquals(new BigDecimal("1.5"), stats.get("usedHours"));
        assertEquals(new BigDecimal("22.5"), stats.get("remainingHours"));
        assertEquals(24, stats.get("totalHours"));
    }

    // ════════════════════════════════════════════════════════════════════
    // 批次 7.5 「重新加入」renewContract reactivateAccount 分支覆盖
    // 见 docs/plans/stage-coaching-request/09-rule-a-alignment-fix-plan.md §13.6
    //
    // 决策表：
    //   reactivateAccount  | student.accountStatus | 期望
    //   -------------------|-----------------------|----------------------
    //   true / "true"      | "3" 退费              | 同事务激活 → 0/0 + 返回 accountReactivated=true
    //   true               | "0" 正常              | ServiceException「仅退费学员可通过续签合同重新加入」
    //   false / 不传       | 任意                  | 不动 account flags → accountReactivated=false
    // ════════════════════════════════════════════════════════════════════

    private Map<String, Object> baseRenewPayload(Long studentId, Object reactivateAccount)
    {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("studentId", studentId);
        payload.put("currency", "USD");
        payload.put("amountUsd", 5000);
        payload.put("contractAmount", 5000);
        payload.put("totalHours", 40);
        payload.put("startDate", "2026-05-12");
        payload.put("endDate", "2027-05-12");
        payload.put("renewalReason", "学员申请续费");
        payload.put("attachmentPath", "/tmp/unit-test-renew.pdf");
        if (reactivateAccount != null)
        {
            payload.put("reactivateAccount", reactivateAccount);
        }
        return payload;
    }

    private OsgStudent stubStudentWithStatus(Long studentId, String accountStatus)
    {
        OsgStudent student = new OsgStudent();
        student.setStudentId(studentId);
        student.setStudentName("Test Student " + studentId);
        student.setAccountStatus(accountStatus);
        return student;
    }

    @Test
    void renewContractShouldReactivateRefundedStudentWhenReactivateAccountTrue()
    {
        Long studentId = 7777L;
        OsgStudent student = stubStudentWithStatus(studentId, "3");
        when(studentMapper.selectStudentByStudentId(studentId)).thenReturn(student);
        when(contractMapper.insertContract(any(OsgContract.class))).thenAnswer(invocation -> {
            OsgContract c = invocation.getArgument(0);
            c.setContractId(8001L);
            return 1;
        });
        when(studentMapper.updateStudentAccountFlags(any(OsgStudent.class))).thenReturn(1);

        Map<String, Object> result = service.renewContract(
            baseRenewPayload(studentId, Boolean.TRUE), "test-operator");

        assertNotNull(result);
        assertEquals(Boolean.TRUE, result.get("accountReactivated"));

        // 验证 updateStudentAccountFlags 入参：accountStatus='0' + frozen=0
        ArgumentCaptor<OsgStudent> captor = forClass(OsgStudent.class);
        verify(studentMapper, times(1)).updateStudentAccountFlags(captor.capture());
        OsgStudent flags = captor.getValue();
        assertEquals(studentId, flags.getStudentId());
        assertEquals("0", flags.getAccountStatus());
        assertEquals(Integer.valueOf(0), flags.getFrozen());
    }

    @Test
    void renewContractShouldReactivateAlsoWhenReactivateAccountIsStringTrue()
    {
        // 覆盖 || "true".equalsIgnoreCase(String.valueOf(...)) 分支
        Long studentId = 7778L;
        when(studentMapper.selectStudentByStudentId(studentId))
            .thenReturn(stubStudentWithStatus(studentId, "3"));
        when(contractMapper.insertContract(any(OsgContract.class))).thenAnswer(invocation -> {
            ((OsgContract) invocation.getArgument(0)).setContractId(8002L);
            return 1;
        });
        when(studentMapper.updateStudentAccountFlags(any(OsgStudent.class))).thenReturn(1);

        Map<String, Object> result = service.renewContract(
            baseRenewPayload(studentId, "true"), "operator");

        assertTrue((Boolean) result.get("accountReactivated"));
    }

    @Test
    void renewContractShouldRejectReactivateWhenStudentNotRefunded()
    {
        // 覆盖 if (reactivateAccount) → if (!"3".equals(...)) throw 分支
        Long studentId = 7779L;
        when(studentMapper.selectStudentByStudentId(studentId))
            .thenReturn(stubStudentWithStatus(studentId, "0"));
        when(contractMapper.insertContract(any(OsgContract.class))).thenAnswer(invocation -> {
            ((OsgContract) invocation.getArgument(0)).setContractId(8003L);
            return 1;
        });

        ServiceException ex = assertThrows(ServiceException.class, () ->
            service.renewContract(baseRenewPayload(studentId, Boolean.TRUE), "operator"));
        assertEquals("仅退费学员可通过续签合同重新加入", ex.getMessage());

        // 未触发 updateStudentAccountFlags（rollback 期望由 @Transactional 兜底）
        verify(studentMapper, never()).updateStudentAccountFlags(any(OsgStudent.class));
    }

    @Test
    void renewContractShouldSkipReactivateWhenFlagOmitted()
    {
        // 覆盖 reactivateAccount=false 分支：不刷 account flags + accountReactivated=false
        Long studentId = 7780L;
        when(studentMapper.selectStudentByStudentId(studentId))
            .thenReturn(stubStudentWithStatus(studentId, "0"));
        when(contractMapper.insertContract(any(OsgContract.class))).thenAnswer(invocation -> {
            ((OsgContract) invocation.getArgument(0)).setContractId(8004L);
            return 1;
        });

        Map<String, Object> result = service.renewContract(
            baseRenewPayload(studentId, null), "operator");

        assertFalse((Boolean) result.get("accountReactivated"));
        verify(studentMapper, never()).updateStudentAccountFlags(any(OsgStudent.class));
    }

    @Test
    void renewContractShouldThrowWhenReactivateUpdateRowsZero()
    {
        // 覆盖 updateStudentAccountFlags 返回 0 → throw 「重新加入失败」分支
        Long studentId = 7781L;
        when(studentMapper.selectStudentByStudentId(studentId))
            .thenReturn(stubStudentWithStatus(studentId, "3"));
        when(contractMapper.insertContract(any(OsgContract.class))).thenAnswer(invocation -> {
            ((OsgContract) invocation.getArgument(0)).setContractId(8005L);
            return 1;
        });
        when(studentMapper.updateStudentAccountFlags(any(OsgStudent.class))).thenReturn(0);

        ServiceException ex = assertThrows(ServiceException.class, () ->
            service.renewContract(baseRenewPayload(studentId, Boolean.TRUE), "operator"));
        assertEquals("重新加入失败：账号状态刷新出错", ex.getMessage());
    }
}
