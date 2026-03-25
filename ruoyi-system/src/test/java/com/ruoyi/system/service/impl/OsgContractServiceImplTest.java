package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import com.ruoyi.system.domain.OsgContract;
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
}
