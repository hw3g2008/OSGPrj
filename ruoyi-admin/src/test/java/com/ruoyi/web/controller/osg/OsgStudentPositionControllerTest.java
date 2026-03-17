package com.ruoyi.web.controller.osg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgPosition;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.domain.OsgStudentPosition;
import com.ruoyi.system.mapper.OsgPositionMapper;
import com.ruoyi.system.mapper.OsgStudentMapper;
import com.ruoyi.system.mapper.OsgStudentPositionMapper;
import com.ruoyi.system.service.impl.OsgStudentPositionServiceImpl;

@ExtendWith(MockitoExtension.class)
class OsgStudentPositionControllerTest
{
    @Mock
    private OsgStudentPositionMapper studentPositionMapper;

    @Mock
    private OsgPositionMapper positionMapper;

    @Mock
    private OsgStudentMapper studentMapper;

    private OsgStudentPositionServiceImpl service;

    private OsgStudentPositionController controller;

    @BeforeEach
    void setUp()
    {
        service = new OsgStudentPositionServiceImpl();
        ReflectionTestUtils.setField(service, "studentPositionMapper", studentPositionMapper);
        ReflectionTestUtils.setField(service, "positionMapper", positionMapper);
        ReflectionTestUtils.setField(service, "studentMapper", studentMapper);

        controller = new OsgStudentPositionController();
        ReflectionTestUtils.setField(controller, "studentPositionService", service);
    }

    @Test
    void listShouldReturnPendingStudentPositionsByDefault()
    {
        OsgStudentPosition row = buildPendingPosition();
        when(studentPositionMapper.selectStudentPositionList(any())).thenReturn(List.of(row));

        AjaxResult result = controller.list(null, null, null, null);

        assertEquals(200, result.get("code"));
        List<?> rows = (List<?>) result.get("rows");
        assertEquals(1, rows.size());
        Map<?, ?> payload = (Map<?, ?>) rows.get(0);
        assertEquals("pending", payload.get("status"));
        assertEquals("Citadel", payload.get("companyName"));
    }

    @Test
    void approveShouldPersistPublicPositionAndMarkRequestApproved()
    {
        OsgStudentPosition request = buildPendingPosition();
        OsgStudent student = buildStudent();

        when(studentPositionMapper.selectStudentPositionById(10L)).thenReturn(request);
        when(studentMapper.selectStudentByStudentId(12766L)).thenReturn(student);
        when(positionMapper.selectPositionList(any(OsgPosition.class))).thenReturn(List.of());
        when(positionMapper.insertPosition(any(OsgPosition.class))).thenAnswer(invocation -> {
            OsgPosition position = invocation.getArgument(0);
            position.setPositionId(301L);
            return 1;
        });
        when(studentPositionMapper.updateStudentPositionReview(any(OsgStudentPosition.class))).thenReturn(1);

        AjaxResult result = controller.approve(10L, Map.of("department", "Quant Research"));

        assertEquals(200, result.get("code"));
        assertEquals("approved", result.get("status"));
        assertEquals(301L, result.get("positionId"));
        verify(positionMapper).insertPosition(any(OsgPosition.class));
        verify(studentPositionMapper).updateStudentPositionReview(any(OsgStudentPosition.class));
    }

    @Test
    void approveShouldRejectAlreadyProcessedRequest()
    {
        OsgStudentPosition request = buildPendingPosition();
        request.setStatus("approved");
        when(studentPositionMapper.selectStudentPositionById(10L)).thenReturn(request);

        ServiceException error = assertThrows(ServiceException.class, () -> service.approveStudentPosition(10L, Map.of(), "position_admin"));

        assertEquals("该学生自添岗位已处理，不能重复审核", error.getMessage());
    }

    @Test
    void rejectShouldPersistRejectedStateWithReason()
    {
        OsgStudentPosition request = buildPendingPosition();
        when(studentPositionMapper.selectStudentPositionById(10L)).thenReturn(request);
        when(studentPositionMapper.updateStudentPositionReview(any(OsgStudentPosition.class))).thenReturn(1);

        AjaxResult result = controller.reject(10L, Map.of("reason", "与现有岗位重复", "note", "已存在公共岗位"));

        assertEquals(200, result.get("code"));
        assertEquals("rejected", result.get("status"));
        verify(studentPositionMapper).updateStudentPositionReview(any(OsgStudentPosition.class));
        verify(positionMapper, never()).insertPosition(any(OsgPosition.class));
    }

    private OsgStudentPosition buildPendingPosition()
    {
        OsgStudentPosition row = new OsgStudentPosition();
        row.setStudentPositionId(10L);
        row.setStudentId(12766L);
        row.setPositionCategory("summer");
        row.setIndustry("Investment Bank");
        row.setCompanyName("Citadel");
        row.setCompanyType("Hedge Fund");
        row.setCompanyWebsite("https://www.citadel.com");
        row.setPositionName("Quant Researcher");
        row.setDepartment("Quant");
        row.setRegion("na");
        row.setCity("Chicago");
        row.setRecruitmentCycle("2025 Summer");
        row.setProjectYear("2025");
        row.setPositionUrl("https://www.citadel.com/careers/details/quantitative-researcher/");
        row.setStatus("pending");
        row.setHasCoachingRequest("yes");
        return row;
    }

    private OsgStudent buildStudent()
    {
        OsgStudent student = new OsgStudent();
        student.setStudentId(12766L);
        student.setStudentName("张三");
        return student;
    }
}
