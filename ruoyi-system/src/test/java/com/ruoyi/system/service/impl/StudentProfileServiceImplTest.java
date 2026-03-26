package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.StudentProfileMapper;
import com.ruoyi.system.service.IOsgStudentChangeRequestService;
import com.ruoyi.system.service.ISysUserService;

@ExtendWith(MockitoExtension.class)
class StudentProfileServiceImplTest
{
    @InjectMocks
    private StudentProfileServiceImpl service;

    @Mock
    private StudentProfileMapper studentProfileMapper;

    @Mock
    private ISysUserService userService;

    @Mock
    private IOsgStudentChangeRequestService changeRequestService;

    @Mock
    private OsgIdentityResolver identityResolver;

    @Test
    void updateProfileShouldRouteReviewChangesToAdminChangeRequestChain()
    {
        Map<String, Object> current = buildProfileSnapshot();
        Map<String, Object> params = new LinkedHashMap<>(current);
        params.put("highSchool", "Boston Latin");
        params.put("primaryDirection", "金融 Finance");

        when(studentProfileMapper.selectProfileByUserId(838L)).thenReturn(current);
        when(identityResolver.resolveStudentIdByUserId(838L)).thenReturn(2001L);
        when(changeRequestService.selectChangeRequestList(2001L, "pending"))
            .thenReturn(List.of(Map.of(
                "requestId", 9001L,
                "fieldKey", "primaryDirection",
                "fieldLabel", "主攻方向",
                "beforeValue", "科技 Tech",
                "afterValue", "咨询 Consulting",
                "status", "pending",
                "requestedAt", "2026-03-27 00:50")))
            .thenReturn(List.of(
                changeRequestRow(9101L, "highSchool", "高中", "-", "Boston Latin"),
                changeRequestRow(9102L, "primaryDirection", "主攻方向", "科技 Tech", "金融 Finance")));

        Map<String, Object> result = service.updateProfile(838L, params);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> requestCaptor = ArgumentCaptor.forClass(Map.class);
        verify(changeRequestService, times(2)).submitChangeRequest(requestCaptor.capture(), anyString());
        verify(changeRequestService).rejectChangeRequest(eq(9001L), anyString(), contains("覆盖"));
        verify(studentProfileMapper, never()).insertPendingChange(anyLong(), anyString(), anyString(),
            anyString(), anyString());

        List<Map<String, Object>> submitted = requestCaptor.getAllValues();
        assertTrue(submitted.stream().anyMatch(payload ->
            Objects.equals(2001L, payload.get("studentId"))
                && Objects.equals("highSchool", payload.get("fieldKey"))
                && Objects.equals("Boston Latin", payload.get("afterValue"))));
        assertTrue(submitted.stream().anyMatch(payload ->
            Objects.equals(2001L, payload.get("studentId"))
                && Objects.equals("primaryDirection", payload.get("fieldKey"))
                && Objects.equals("金融 Finance", payload.get("afterValue"))));
        assertEquals(2, result.get("pendingCount"));
    }

    @Test
    void selectProfileViewShouldOverlayApprovedMainStudentFields()
    {
        Map<String, Object> current = buildProfileSnapshot();
        current.put("school", "Old School");
        current.put("major", "Old Major");
        current.put("graduationYear", "2024");
        current.put("highSchool", "-");
        current.put("postgraduatePlan", "否");
        current.put("visaStatus", "-");
        current.put("targetRegion", "Old Region");
        current.put("recruitmentCycle", "2024");
        current.put("primaryDirection", "科技 Tech");
        current.put("secondaryDirection", "Backend");

        when(studentProfileMapper.selectProfileByUserId(838L)).thenReturn(current);
        when(identityResolver.resolveStudentIdByUserId(838L)).thenReturn(2001L);
        when(identityResolver.resolveStudentByUserId(838L)).thenReturn(buildMainStudent());
        when(changeRequestService.selectChangeRequestList(2001L, "pending")).thenReturn(List.of());

        Map<String, Object> result = service.selectProfileView(838L);

        @SuppressWarnings("unchecked")
        Map<String, Object> profile = (Map<String, Object>) result.get("profile");
        assertEquals("Columbia", profile.get("school"));
        assertEquals("Economics", profile.get("major"));
        assertEquals("2027", profile.get("graduationYear"));
        assertEquals("Boston Latin", profile.get("highSchool"));
        assertEquals("是", profile.get("postgraduatePlan"));
        assertEquals("F1", profile.get("visaStatus"));
        assertEquals("New York", profile.get("targetRegion"));
        assertEquals("2027", profile.get("recruitmentCycle"));
        assertEquals("金融 Finance", profile.get("primaryDirection"));
        assertEquals("IB 投行", profile.get("secondaryDirection"));
    }

    private Map<String, Object> buildProfileSnapshot()
    {
        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("studentCode", "STU-838");
        profile.put("fullName", "Student Example");
        profile.put("englishName", "Student Example");
        profile.put("email", "student@example.com");
        profile.put("sexLabel", "Male");
        profile.put("leadMentor", "-");
        profile.put("assistantName", "-");
        profile.put("school", "Old School");
        profile.put("major", "Old Major");
        profile.put("graduationYear", "2024");
        profile.put("highSchool", "-");
        profile.put("postgraduatePlan", "否");
        profile.put("visaStatus", "-");
        profile.put("targetRegion", "Old Region");
        profile.put("recruitmentCycle", "2024");
        profile.put("primaryDirection", "科技 Tech");
        profile.put("secondaryDirection", "Backend");
        profile.put("phone", "+1 617-555-0100");
        profile.put("wechatId", "student-wechat");
        return profile;
    }

    private Map<String, Object> changeRequestRow(Long requestId, String fieldKey, String fieldLabel, String beforeValue, String afterValue)
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("requestId", requestId);
        row.put("fieldKey", fieldKey);
        row.put("fieldLabel", fieldLabel);
        row.put("beforeValue", beforeValue);
        row.put("afterValue", afterValue);
        row.put("status", "pending");
        row.put("requestedAt", "2026-03-27 01:15");
        return row;
    }

    private OsgStudent buildMainStudent()
    {
        OsgStudent student = new OsgStudent();
        student.setStudentId(2001L);
        student.setEmail("student@example.com");
        student.setSchool("Columbia");
        student.setMajor("Economics");
        student.setGraduationYear(2027);
        student.setTargetRegion("New York");
        student.setRecruitmentCycle("2027");
        student.setMajorDirection("金融 Finance");
        student.setSubDirection("IB 投行");
        student.setRemark("highSchool=Boston Latin; postgraduate=是; visaStatus=F1");
        return student;
    }
}
