package com.ruoyi.system.service.impl;

import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Objects;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.context.MessageSource;

import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.spring.SpringUtils;
import com.ruoyi.system.domain.OsgClassRecord;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.OsgClassRecordMapper;
import com.ruoyi.system.mapper.OsgStaffMapper;
import com.ruoyi.system.mapper.OsgStudentMapper;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 学员账号状态对申报课消的拦截分支（spec § 5.2 T4/T5）。
 *
 * 内核 validateStudentAccountForClassRecord 由 lead-mentor 与 assistant 申报路径共用：
 * - account_status=0 / 2 / 黑名单 → 通过（合同结束/黑名单不拦申报）
 * - account_status=1 → 抛 class_record.student.frozen
 * - account_status=3 → 抛 class_record.student.refunded
 * - studentId 不存在 → 抛 "学员不存在"
 *
 * 同时通过 createLeadMentorClassRecord / createAssistantClassRecord 两条入口
 * 各做一个 frozen 拦截整链路冒烟，确认两端真实复用同一私有方法。
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class OsgClassRecordServiceImplStudentStatusTest
{
    @Mock
    private OsgClassRecordMapper classRecordMapper;

    @Mock
    private OsgStaffMapper staffMapper;

    @Mock
    private OsgStudentMapper studentMapper;

    private OsgClassRecordServiceImpl service;
    private Method validateMethod;
    private Object originalBeanFactory;

    @BeforeEach
    void setUp() throws Exception
    {
        MockitoAnnotations.openMocks(this);
        service = new OsgClassRecordServiceImpl();
        injectField("classRecordMapper", classRecordMapper);
        injectField("staffMapper", staffMapper);
        injectField("studentMapper", studentMapper);

        validateMethod = OsgClassRecordServiceImpl.class.getDeclaredMethod(
                "validateStudentAccountForClassRecord", Long.class);
        validateMethod.setAccessible(true);

        MessageSource messageSource = mock(MessageSource.class);
        when(messageSource.getMessage(any(String.class), any(), any(Locale.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        ConfigurableListableBeanFactory beanFactory = mock(ConfigurableListableBeanFactory.class);
        when(beanFactory.getBean(MessageSource.class)).thenReturn(messageSource);
        Field bf = SpringUtils.class.getDeclaredField("beanFactory");
        bf.setAccessible(true);
        originalBeanFactory = bf.get(null);
        bf.set(null, beanFactory);
    }

    @AfterEach
    void tearDown() throws Exception
    {
        Field bf = SpringUtils.class.getDeclaredField("beanFactory");
        bf.setAccessible(true);
        bf.set(null, originalBeanFactory);
    }

    private void injectField(String name, Object value) throws Exception
    {
        Field field = OsgClassRecordServiceImpl.class.getDeclaredField(name);
        field.setAccessible(true);
        field.set(service, value);
    }

    private void invokeValidate(Long studentId)
    {
        try
        {
            validateMethod.invoke(service, studentId);
        }
        catch (InvocationTargetException ex)
        {
            if (ex.getCause() instanceof RuntimeException re)
            {
                throw re;
            }
            throw new RuntimeException(ex.getCause());
        }
        catch (IllegalAccessException ex)
        {
            throw new RuntimeException(ex);
        }
    }

    private OsgStudent stub(String accountStatus, Long leadMentorId, Long assistantId)
    {
        OsgStudent student = new OsgStudent();
        student.setStudentId(46706L);
        student.setStudentName("Story1 Test Student");
        student.setLeadMentorId(leadMentorId);
        student.setAssistantId(assistantId);
        student.setAccountStatus(accountStatus);
        return student;
    }

    // ===== 私有方法 5 分支 =====

    @Test
    void shouldThrowWhenStudentMissing()
    {
        when(studentMapper.selectStudentByStudentId(46706L)).thenReturn(null);
        ServiceException ex = assertThrows(ServiceException.class, () -> invokeValidate(46706L));
        assertEquals("学员不存在", ex.getMessage());
    }

    @Test
    void shouldPassWhenStatusNormal()
    {
        when(studentMapper.selectStudentByStudentId(46706L)).thenReturn(stub("0", null, null));
        assertDoesNotThrow(() -> invokeValidate(46706L));
    }

    @Test
    void shouldRejectWhenStatusFrozen()
    {
        when(studentMapper.selectStudentByStudentId(46706L)).thenReturn(stub("1", null, null));
        ServiceException ex = assertThrows(ServiceException.class, () -> invokeValidate(46706L));
        assertEquals("class_record.student.frozen", ex.getMessage());
    }

    @Test
    void shouldPassWhenStatusContractEnded()
    {
        when(studentMapper.selectStudentByStudentId(46706L)).thenReturn(stub("2", null, null));
        assertDoesNotThrow(() -> invokeValidate(46706L));
    }

    @Test
    void shouldRejectWhenStatusRefunded()
    {
        when(studentMapper.selectStudentByStudentId(46706L)).thenReturn(stub("3", null, null));
        ServiceException ex = assertThrows(ServiceException.class, () -> invokeValidate(46706L));
        assertEquals("class_record.student.refunded", ex.getMessage());
    }

    // ===== 整链路冒烟：两端入口都触发同一拦截 =====

    @Test
    void leadMentorCreateShouldRejectFrozenStudent()
    {
        OsgClassRecord record = baseRecord(12814L);
        when(studentMapper.selectStudentByStudentId(46706L)).thenReturn(stub("1", 12814L, 12813L));

        ServiceException ex = assertThrows(ServiceException.class, () -> service.createLeadMentorClassRecord(record));
        assertEquals("class_record.student.frozen", ex.getMessage());
    }

    @Test
    void assistantCreateShouldRejectRefundedStudent()
    {
        OsgClassRecord record = baseRecord(12813L);
        when(studentMapper.selectStudentByStudentId(46706L)).thenReturn(stub("3", 12814L, 12813L));

        ServiceException ex = assertThrows(ServiceException.class, () -> service.createAssistantClassRecord(record));
        assertEquals("class_record.student.refunded", ex.getMessage());
    }

    private OsgClassRecord baseRecord(Long mentorId)
    {
        OsgClassRecord record = new OsgClassRecord();
        record.setStudentId(46706L);
        record.setMentorId(mentorId);
        record.setClassDate(Timestamp.valueOf(LocalDateTime.of(2026, 5, 8, 10, 0)));
        record.setClassStatus("completed");
        record.setDurationHours(1.0D);
        record.setCourseType("basic");
        record.setFeedbackContent("ok");
        record.setCreateBy("tester");
        Objects.requireNonNull(record);
        return record;
    }
}
