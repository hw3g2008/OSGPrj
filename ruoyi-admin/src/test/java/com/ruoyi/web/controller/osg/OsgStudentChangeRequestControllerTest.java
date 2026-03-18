package com.ruoyi.web.controller.osg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.LinkedHashMap;
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
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.domain.OsgStudentChangeRequest;
import com.ruoyi.system.mapper.OsgStudentChangeRequestMapper;
import com.ruoyi.system.mapper.OsgStudentMapper;
import com.ruoyi.system.service.impl.OsgStudentChangeRequestServiceImpl;

@ExtendWith(MockitoExtension.class)
class OsgStudentChangeRequestControllerTest
{
    @Mock
    private OsgStudentChangeRequestMapper changeRequestMapper;

    @Mock
    private OsgStudentMapper studentMapper;

    private OsgStudentChangeRequestServiceImpl service;

    private OsgStudentChangeRequestController controller;

    @BeforeEach
    void setUp()
    {
        service = new OsgStudentChangeRequestServiceImpl();
        ReflectionTestUtils.setField(service, "changeRequestMapper", changeRequestMapper);
        ReflectionTestUtils.setField(service, "studentMapper", studentMapper);

        controller = new OsgStudentChangeRequestController();
        ReflectionTestUtils.setField(controller, "changeRequestService", service);
    }

    @Test
    void listShouldReturnChangeRequests() {
        OsgStudentChangeRequest request = buildPendingRequest();
        when(changeRequestMapper.selectChangeRequestList(any())).thenReturn(List.of(request));

        AjaxResult result = controller.list(1L, "pending");

        assertEquals(200, result.get("code"));
        List<?> rows = (List<?>) result.get("rows");
        assertEquals(1, rows.size());
    }

    @Test
    void approveShouldUpdateStudentImmediately() {
        OsgStudentChangeRequest request = buildPendingRequest();
        OsgStudent student = buildStudent();
        when(changeRequestMapper.selectChangeRequestById(10L)).thenReturn(request);
        when(studentMapper.selectStudentByStudentId(1L)).thenReturn(student);
        when(studentMapper.updateStudent(any(OsgStudent.class))).thenReturn(1);
        when(changeRequestMapper.updateChangeRequestReview(any(OsgStudentChangeRequest.class))).thenReturn(1);

        AjaxResult result = controller.approve(10L);

        assertEquals(200, result.get("code"));
        assertEquals("approved", result.get("status"));
        assertEquals("金融 Finance", student.getMajorDirection());
        verify(studentMapper).updateStudent(any(OsgStudent.class));
        verify(changeRequestMapper).updateChangeRequestReview(any(OsgStudentChangeRequest.class));
    }

    @Test
    void approveShouldRejectAlreadyProcessedRequest() {
        OsgStudentChangeRequest request = buildPendingRequest();
        request.setStatus("approved");
        when(changeRequestMapper.selectChangeRequestById(10L)).thenReturn(request);

        ServiceException error = assertThrows(ServiceException.class, () -> service.approveChangeRequest(10L, "clerk"));

        assertEquals("该变更申请已处理，不能重复审核", error.getMessage());
    }

    @Test
    void submitContactChangeShouldApplyImmediately() {
        OsgStudent student = buildStudent();
        when(studentMapper.selectStudentByStudentId(1L)).thenReturn(student);
        when(studentMapper.updateStudent(any(OsgStudent.class))).thenReturn(1);
        when(changeRequestMapper.insertChangeRequest(any(OsgStudentChangeRequest.class))).thenReturn(1);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("studentId", 1L);
        payload.put("changeType", "联系方式");
        payload.put("fieldKey", "phone");
        payload.put("fieldLabel", "电话");
        payload.put("beforeValue", "+1 617-555-0100");
        payload.put("afterValue", "+1 617-555-0123");

        Map<String, Object> result = service.submitChangeRequest(payload, "student");

        assertEquals("auto_applied", result.get("status"));
        assertEquals("phone=+1 617-555-0123", student.getRemark());
        verify(studentMapper).updateStudent(any(OsgStudent.class));
    }

    @Test
    void createChangeRequestShouldReturnSuccess() {
        OsgStudent student = buildStudent();
        when(studentMapper.selectStudentByStudentId(1L)).thenReturn(student);
        when(changeRequestMapper.insertChangeRequest(any(OsgStudentChangeRequest.class))).thenReturn(1);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("studentId", 1L);
        body.put("changeType", "求职方向");
        body.put("fieldKey", "majorDirection");
        body.put("fieldLabel", "主攻方向");
        body.put("beforeValue", "科技 Tech");
        body.put("afterValue", "金融 Finance");

        AjaxResult result = controller.submit(body);

        assertEquals(200, result.get("code"));
        assertEquals("变更申请已提交", result.get("msg"));
    }

    @Test
    void rejectChangeRequestShouldReturnSuccess() {
        OsgStudentChangeRequest request = buildPendingRequest();
        when(changeRequestMapper.selectChangeRequestById(10L)).thenReturn(request);
        when(changeRequestMapper.updateChangeRequestReview(any(OsgStudentChangeRequest.class))).thenReturn(1);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("reason", "信息有误");

        AjaxResult result = controller.reject(10L, body);

        assertEquals(200, result.get("code"));
        assertEquals("rejected", result.get("status"));
        assertEquals("变更申请已驳回", result.get("msg"));
    }


    @Test
    void rejectWithNullBodyShouldUseNullReason()
    {
        OsgStudentChangeRequest request = buildPendingRequest();
        when(changeRequestMapper.selectChangeRequestById(10L)).thenReturn(request);
        when(changeRequestMapper.updateChangeRequestReview(any(OsgStudentChangeRequest.class))).thenReturn(1);

        AjaxResult result = controller.reject(10L, null);

        assertEquals(200, result.get("code"));
        assertEquals("rejected", result.get("status"));
    }

    private OsgStudentChangeRequest buildPendingRequest()
    {
        OsgStudentChangeRequest request = new OsgStudentChangeRequest();
        request.setRequestId(10L);
        request.setStudentId(1L);
        request.setChangeType("求职方向");
        request.setFieldKey("majorDirection");
        request.setFieldLabel("主攻方向");
        request.setBeforeValue("科技 Tech");
        request.setAfterValue("金融 Finance");
        request.setStatus("pending");
        return request;
    }

    private OsgStudent buildStudent()
    {
        OsgStudent student = new OsgStudent();
        student.setStudentId(1L);
        student.setMajorDirection("科技 Tech");
        student.setRemark("phone=+1 617-555-0100");
        return student;
    }
}
