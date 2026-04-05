package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.LinkedHashMap;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgMentorProfileChangeRequest;
import com.ruoyi.system.mapper.OsgMentorProfileChangeRequestMapper;

@ExtendWith(MockitoExtension.class)
class OsgMentorProfileChangeRequestServiceImplTest
{
    @InjectMocks
    private OsgMentorProfileChangeRequestServiceImpl service;

    @Mock
    private OsgMentorProfileChangeRequestMapper changeRequestMapper;

    @Mock
    private ObjectMapper objectMapper;

    @Test
    void submitChangeRequestShouldPersistPendingPayloadWithoutUpdatingUserProfile() throws Exception
    {
        SysUser currentUser = new SysUser();
        currentUser.setUserId(12767L);
        currentUser.setNickName("Mentor D Chain");
        currentUser.setEmail("mentor-d-chain@osg.local");
        currentUser.setPhonenumber("13900012767");
        currentUser.setSex("1");
        currentUser.setRemark("mentor submit/admin review chain seed");

        Map<String, Object> submitted = new LinkedHashMap<>();
        submitted.put("nickName", "Mentor D Chain QA");
        submitted.put("sex", "1");
        submitted.put("phonenumber", "13900012767");
        submitted.put("email", "mentor-d-chain@osg.local");
        submitted.put("remark", "mentor submit/admin review chain seed");
        submitted.put("region", "north-america");
        submitted.put("city", "new-york");

        when(objectMapper.writeValueAsString(any())).thenReturn("{\"nickName\":\"Mentor D Chain QA\"}");
        when(changeRequestMapper.insertChangeRequest(any(OsgMentorProfileChangeRequest.class))).thenAnswer(invocation -> {
            OsgMentorProfileChangeRequest request = invocation.getArgument(0);
            request.setRequestId(9001L);
            return 1;
        });

        Map<String, Object> result = service.submitChangeRequest(currentUser, "testmentor", submitted);

        assertEquals(9001L, result.get("requestId"));
        assertEquals("pending", result.get("status"));
        assertNotNull(result.get("changedFields"));
        verify(changeRequestMapper).insertChangeRequest(any(OsgMentorProfileChangeRequest.class));
    }

    @Test
    void submitChangeRequestShouldRejectEmptyPayload()
    {
        SysUser currentUser = new SysUser();
        currentUser.setUserId(12767L);

        assertThrows(ServiceException.class, () -> service.submitChangeRequest(currentUser, "testmentor", new LinkedHashMap<>()));
        verify(changeRequestMapper, never()).insertChangeRequest(any());
    }
}
