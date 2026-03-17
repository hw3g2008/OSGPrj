package com.ruoyi.web.controller.osg;

import static org.mockito.ArgumentMatchers.any;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import jakarta.servlet.http.HttpServletRequest;
import com.ruoyi.RuoYiApplication;
import com.ruoyi.common.core.domain.entity.SysRole;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.core.redis.RedisCache;
import com.ruoyi.framework.config.SecurityConfig;
import com.ruoyi.framework.config.properties.PermitAllUrlProperties;
import com.ruoyi.framework.security.filter.JwtAuthenticationTokenFilter;
import com.ruoyi.framework.security.handle.AuthenticationEntryPointImpl;
import com.ruoyi.framework.security.handle.LogoutSuccessHandlerImpl;
import com.ruoyi.framework.web.service.PermissionService;
import com.ruoyi.framework.web.service.TokenService;
import com.ruoyi.system.domain.OsgClassRecord;
import com.ruoyi.system.domain.OsgFinanceSettlement;
import com.ruoyi.system.domain.OsgStaff;
import com.ruoyi.system.mapper.OsgClassRecordMapper;
import com.ruoyi.system.mapper.OsgFinanceSettlementMapper;
import com.ruoyi.system.mapper.OsgStaffMapper;
import com.ruoyi.system.service.impl.OsgFinanceServiceImpl;

@WebMvcTest(controllers = OsgFinanceController.class)
@AutoConfigureMockMvc(addFilters = true)
@ContextConfiguration(classes = RuoYiApplication.class)
@Import({
    SecurityConfig.class,
    PermissionService.class,
    AuthenticationEntryPointImpl.class,
    LogoutSuccessHandlerImpl.class,
    JwtAuthenticationTokenFilter.class,
    PermitAllUrlProperties.class,
    OsgFinanceServiceImpl.class
})
class OsgFinanceControllerTest
{
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OsgClassRecordMapper classRecordMapper;

    @MockBean
    private OsgFinanceSettlementMapper financeSettlementMapper;

    @MockBean
    private OsgStaffMapper staffMapper;

    @MockBean
    private TokenService tokenService;

    @MockBean
    private RedisCache redisCache;

    private final AtomicReference<List<OsgClassRecord>> recordsRef = new AtomicReference<>();
    private final AtomicReference<List<OsgFinanceSettlement>> settlementsRef = new AtomicReference<>();
    private final AtomicLong settlementIdSequence = new AtomicLong(10L);

    @BeforeEach
    void setUp()
    {
        recordsRef.set(new ArrayList<>(buildRecords()));
        settlementsRef.set(new ArrayList<>(buildSettlements()));
        settlementIdSequence.set(20L);

        org.mockito.Mockito.when(tokenService.getLoginUser(any())).thenAnswer(invocation -> {
            HttpServletRequest request = invocation.getArgument(0);
            String authorization = request.getHeader("Authorization");
            if ("Bearer accountant-token".equals(authorization))
            {
                return buildLoginUser("accountant", "accountant");
            }
            if ("Bearer super-admin-token".equals(authorization))
            {
                return buildLoginUser("super_admin", "super-admin");
            }
            if ("Bearer clerk-token".equals(authorization))
            {
                return buildLoginUser("clerk", "clerk");
            }
            return null;
        });

        org.mockito.Mockito.when(classRecordMapper.selectClassRecordList(any(OsgClassRecord.class)))
            .thenAnswer(invocation -> selectRecords(invocation.getArgument(0)));
        org.mockito.Mockito.when(classRecordMapper.selectClassRecordByRecordId(any(Long.class)))
            .thenAnswer(invocation -> recordsRef.get().stream()
                .filter(item -> java.util.Objects.equals(item.getRecordId(), invocation.getArgument(0)))
                .findFirst()
                .orElse(null));

        org.mockito.Mockito.when(financeSettlementMapper.selectFinanceSettlementBySettlementId(any(Long.class)))
            .thenAnswer(invocation -> settlementsRef.get().stream()
                .filter(item -> java.util.Objects.equals(item.getSettlementId(), invocation.getArgument(0)))
                .findFirst()
                .orElse(null));
        org.mockito.Mockito.when(financeSettlementMapper.selectFinanceSettlementByRecordId(any(Long.class)))
            .thenAnswer(invocation -> settlementsRef.get().stream()
                .filter(item -> java.util.Objects.equals(item.getRecordId(), invocation.getArgument(0)))
                .findFirst()
                .orElse(null));
        org.mockito.Mockito.when(financeSettlementMapper.insertFinanceSettlement(any(OsgFinanceSettlement.class)))
            .thenAnswer(invocation -> insertSettlement(invocation.getArgument(0)));
        org.mockito.Mockito.when(financeSettlementMapper.updateFinanceSettlement(any(OsgFinanceSettlement.class)))
            .thenAnswer(invocation -> updateSettlement(invocation.getArgument(0)));

        org.mockito.Mockito.when(staffMapper.selectStaffByStaffId(any(Long.class)))
            .thenAnswer(invocation -> buildStaff(invocation.getArgument(0)));
    }

    @Test
    void listAndStatsShouldReturnSettlementRowsForAccountant() throws Exception
    {
        mockMvc.perform(get("/admin/finance/list")
                .header("Authorization", "Bearer accountant-token")
                .param("tab", "unpaid"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.rows[0].settlementId").value(11))
            .andExpect(jsonPath("$.rows[0].sourceLabel").value("导师端"))
            .andExpect(jsonPath("$.rows[0].paymentStatus").value("unpaid"));

        mockMvc.perform(get("/admin/finance/stats")
                .header("Authorization", "Bearer accountant-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.unpaidAmount").value("860.0"))
            .andExpect(jsonPath("$.data.monthPaidAmount").value("540.0"))
            .andExpect(jsonPath("$.data.weekClassCount").value(3));
    }

    @Test
    void markPaidShouldPersistStateForSubsequentPaidList() throws Exception
    {
        mockMvc.perform(put("/admin/finance/11/mark-paid")
                .header("Authorization", "Bearer accountant-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"paymentDate\":\"2026-03-14\",\"bankReferenceNo\":\"BANK-001\",\"remark\":\"周结算\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.paymentStatus").value("paid"))
            .andExpect(jsonPath("$.data.bankReferenceNo").value("BANK-001"));

        mockMvc.perform(get("/admin/finance/list")
                .header("Authorization", "Bearer accountant-token")
                .param("tab", "paid"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.rows[0].settlementId").value(11))
            .andExpect(jsonPath("$.rows[0].paymentStatus").value("paid"))
            .andExpect(jsonPath("$.rows[0].paymentDate").value("2026-03-14"));
    }

    @Test
    void batchPayShouldPersistMultipleRowsAndRejectRepeatPayment() throws Exception
    {
        mockMvc.perform(put("/admin/finance/batch-pay")
                .header("Authorization", "Bearer super-admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"settlementIds\":[11,12],\"paymentDate\":\"2026-03-15\",\"remark\":\"批量周结\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.reviewedCount").value(2))
            .andExpect(jsonPath("$.totalAmount").value("860.0"));

        mockMvc.perform(put("/admin/finance/13/mark-paid")
                .header("Authorization", "Bearer accountant-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"paymentDate\":\"2026-03-16\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(500))
            .andExpect(jsonPath("$.msg").value("该结算记录已支付，不能重复操作"));
    }

    @Test
    void financeApisShouldRejectUnauthorizedRole() throws Exception
    {
        mockMvc.perform(get("/admin/finance/list")
                .header("Authorization", "Bearer clerk-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(403))
            .andExpect(jsonPath("$.msg").value("没有权限，请联系管理员授权"));
    }

    private LoginUser buildLoginUser(String roleKey, String username)
    {
        SysRole role = new SysRole();
        role.setRoleKey(roleKey);
        role.setRoleName(roleKey);

        SysUser user = new SysUser();
        user.setUserId(3L);
        user.setUserName(username);
        user.setPassword("password");
        user.setRoles(List.of(role));

        return new LoginUser(3L, 1L, user, OsgTestPermissions.permissionsForRole(roleKey));
    }

    private List<OsgClassRecord> buildRecords()
    {
        return List.of(
            buildRecord(901L, 201L, "导师A", "学员A", "mentor", 1.5, 0),
            buildRecord(902L, 202L, "导师B", "学员B", "clerk", 2.0, 2),
            buildRecord(903L, 203L, "导师C", "学员C", "assistant", 1.8, 4)
        );
    }

    private OsgClassRecord buildRecord(Long recordId,
                                       Long mentorId,
                                       String mentorName,
                                       String studentName,
                                       String courseSource,
                                       double durationHours,
                                       int minusDays)
    {
        LocalDateTime classDate = LocalDate.now()
            .with(DayOfWeek.SUNDAY)
            .atTime(20, 0)
            .minusDays(minusDays);
        OsgClassRecord row = new OsgClassRecord();
        row.setRecordId(recordId);
        row.setMentorId(mentorId);
        row.setMentorName(mentorName);
        row.setStudentId(8000L + recordId);
        row.setStudentName(studentName);
        row.setCourseType("mock_interview");
        row.setCourseSource(courseSource);
        row.setStatus("approved");
        row.setDurationHours(durationHours);
        row.setClassDate(Timestamp.valueOf(classDate));
        return row;
    }

    private List<OsgFinanceSettlement> buildSettlements()
    {
        String currentMonthPaidDate = LocalDate.now().withDayOfMonth(2).toString();
        return List.of(
            buildSettlement(11L, 901L, "unpaid", "300.0", null, null, null),
            buildSettlement(12L, 902L, "unpaid", "560.0", null, null, null),
            buildSettlement(13L, 903L, "paid", "540.0", currentMonthPaidDate, "BANK-HIST", "历史结算")
        );
    }

    private OsgFinanceSettlement buildSettlement(Long settlementId,
                                                 Long recordId,
                                                 String paymentStatus,
                                                 String amount,
                                                 String paymentDate,
                                                 String bankReferenceNo,
                                                 String remark)
    {
        OsgFinanceSettlement settlement = new OsgFinanceSettlement();
        settlement.setSettlementId(settlementId);
        settlement.setRecordId(recordId);
        settlement.setPaymentStatus(paymentStatus);
        settlement.setDueAmount(new BigDecimal(amount));
        settlement.setPaidAmount(new BigDecimal(amount));
        settlement.setPaymentDate(paymentDate == null ? null : java.sql.Date.valueOf(paymentDate));
        settlement.setBankReferenceNo(bankReferenceNo);
        settlement.setPaymentRemark(remark);
        return settlement;
    }

    private List<OsgClassRecord> selectRecords(OsgClassRecord query)
    {
        return recordsRef.get().stream()
            .filter(item -> query.getStatus() == null || query.getStatus().isBlank()
                || query.getStatus().equals(item.getStatus()))
            .toList();
    }

    private int insertSettlement(OsgFinanceSettlement settlement)
    {
        List<OsgFinanceSettlement> current = new ArrayList<>(settlementsRef.get());
        settlement.setSettlementId(settlementIdSequence.getAndIncrement());
        current.add(settlement);
        settlementsRef.set(current);
        return 1;
    }

    private int updateSettlement(OsgFinanceSettlement settlement)
    {
        List<OsgFinanceSettlement> current = new ArrayList<>(settlementsRef.get());
        for (int index = 0; index < current.size(); index++)
        {
            OsgFinanceSettlement existing = current.get(index);
            if (!java.util.Objects.equals(existing.getSettlementId(), settlement.getSettlementId()))
            {
                continue;
            }
            if (settlement.getPaymentStatus() != null)
            {
                existing.setPaymentStatus(settlement.getPaymentStatus());
            }
            if (settlement.getPaymentDate() != null)
            {
                existing.setPaymentDate(settlement.getPaymentDate());
            }
            if (settlement.getBankReferenceNo() != null)
            {
                existing.setBankReferenceNo(settlement.getBankReferenceNo());
            }
            existing.setPaymentRemark(settlement.getPaymentRemark());
            if (settlement.getPaidAmount() != null)
            {
                existing.setPaidAmount(settlement.getPaidAmount());
            }
            current.set(index, existing);
            settlementsRef.set(current);
            return 1;
        }
        return 0;
    }

    private OsgStaff buildStaff(Long staffId)
    {
        OsgStaff staff = new OsgStaff();
        staff.setStaffId(staffId);
        if (staffId == 201L)
        {
            staff.setHourlyRate(BigDecimal.valueOf(200));
        }
        else if (staffId == 202L)
        {
            staff.setHourlyRate(BigDecimal.valueOf(280));
        }
        else
        {
            staff.setHourlyRate(BigDecimal.valueOf(300));
        }
        return staff;
    }
}
