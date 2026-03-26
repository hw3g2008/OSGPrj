package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Map;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.domain.OsgStudentChangeRequest;
import com.ruoyi.system.mapper.OsgStudentChangeRequestMapper;
import com.ruoyi.system.mapper.OsgStudentMapper;

@ExtendWith(MockitoExtension.class)
class OsgStudentChangeRequestServiceImplTest
{
    @InjectMocks
    private OsgStudentChangeRequestServiceImpl service;

    @Mock
    private OsgStudentChangeRequestMapper changeRequestMapper;

    @Mock
    private OsgStudentMapper studentMapper;

    @Test
    void approveChangeRequestShouldMapPrimaryDirectionToMajorDirection()
    {
        OsgStudentChangeRequest request = buildPendingRequest("primaryDirection", "主攻方向", "金融 Finance");
        OsgStudent student = buildStudent();
        when(changeRequestMapper.selectChangeRequestById(10L)).thenReturn(request);
        when(studentMapper.selectStudentByStudentId(1L)).thenReturn(student);
        when(studentMapper.updateStudent(any(OsgStudent.class))).thenReturn(1);
        when(changeRequestMapper.updateChangeRequestReview(any(OsgStudentChangeRequest.class))).thenReturn(1);

        Map<String, Object> result = service.approveChangeRequest(10L, "clerk");

        assertEquals("approved", result.get("status"));
        assertEquals("金融 Finance", student.getMajorDirection());
        verify(studentMapper).updateStudent(any(OsgStudent.class));
    }

    @Test
    void approveChangeRequestShouldMapSecondaryDirectionToSubDirection()
    {
        OsgStudentChangeRequest request = buildPendingRequest("secondaryDirection", "子方向", "IB 投行");
        OsgStudent student = buildStudent();
        when(changeRequestMapper.selectChangeRequestById(10L)).thenReturn(request);
        when(studentMapper.selectStudentByStudentId(1L)).thenReturn(student);
        when(studentMapper.updateStudent(any(OsgStudent.class))).thenReturn(1);
        when(changeRequestMapper.updateChangeRequestReview(any(OsgStudentChangeRequest.class))).thenReturn(1);

        Map<String, Object> result = service.approveChangeRequest(10L, "clerk");

        assertEquals("approved", result.get("status"));
        assertEquals("IB 投行", student.getSubDirection());
        verify(studentMapper).updateStudent(any(OsgStudent.class));
    }

    @ParameterizedTest
    @MethodSource("profileOnlyFieldCases")
    void approveChangeRequestShouldPersistStudentProfileOnlyFieldsInRemark(String fieldKey, String fieldLabel, String afterValue, String expectedFragment)
    {
        OsgStudentChangeRequest request = buildPendingRequest(fieldKey, fieldLabel, afterValue);
        OsgStudent student = buildStudent();
        when(changeRequestMapper.selectChangeRequestById(10L)).thenReturn(request);
        when(studentMapper.selectStudentByStudentId(1L)).thenReturn(student);
        when(studentMapper.updateStudent(any(OsgStudent.class))).thenReturn(1);
        when(changeRequestMapper.updateChangeRequestReview(any(OsgStudentChangeRequest.class))).thenReturn(1);

        Map<String, Object> result = service.approveChangeRequest(10L, "clerk");

        assertEquals("approved", result.get("status"));
        assertTrue(student.getRemark().contains(expectedFragment));
        verify(studentMapper).updateStudent(any(OsgStudent.class));
    }

    private static Stream<Arguments> profileOnlyFieldCases()
    {
        return Stream.of(
            Arguments.of("highSchool", "高中", "Boston Latin", "highSchool=Boston Latin"),
            Arguments.of("postgraduatePlan", "是否读研或延毕", "是", "postgraduate=是"),
            Arguments.of("visaStatus", "签证", "F1", "visaStatus=F1"));
    }

    private OsgStudentChangeRequest buildPendingRequest(String fieldKey, String fieldLabel, String afterValue)
    {
        OsgStudentChangeRequest request = new OsgStudentChangeRequest();
        request.setRequestId(10L);
        request.setStudentId(1L);
        request.setChangeType("学生资料");
        request.setFieldKey(fieldKey);
        request.setFieldLabel(fieldLabel);
        request.setBeforeValue("-");
        request.setAfterValue(afterValue);
        request.setStatus("pending");
        return request;
    }

    private OsgStudent buildStudent()
    {
        OsgStudent student = new OsgStudent();
        student.setStudentId(1L);
        student.setMajorDirection("科技 Tech");
        student.setSubDirection("Backend");
        student.setRemark("phone=+1 617-555-0100");
        return student;
    }
}
