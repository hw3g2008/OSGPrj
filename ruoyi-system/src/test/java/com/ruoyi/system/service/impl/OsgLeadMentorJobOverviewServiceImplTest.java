package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Date;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgCoaching;
import com.ruoyi.system.domain.OsgJobApplication;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.OsgCoachingMapper;
import com.ruoyi.system.mapper.OsgJobApplicationMapper;
import com.ruoyi.system.mapper.OsgStudentMapper;

@ExtendWith(MockitoExtension.class)
class OsgLeadMentorJobOverviewServiceImplTest
{
    @InjectMocks
    private OsgLeadMentorJobOverviewServiceImpl service;

    @Mock
    private OsgJobApplicationMapper jobApplicationMapper;

    @Mock
    private OsgCoachingMapper coachingMapper;

    @Mock
    private OsgIdentityResolver identityResolver;

    @Mock
    private OsgStudentMapper studentMapper;

    @Test
    void assignMentorsStoresResolvedUserIdsInsteadOfStaffIds()
    {
        OsgJobApplication application = new OsgJobApplication();
        application.setApplicationId(7001L);
        application.setStudentId(3001L);
        application.setLeadMentorId(810L);
        application.setAssignStatus("pending");

        when(jobApplicationMapper.selectJobApplicationByApplicationId(7001L)).thenReturn(application);
        when(coachingMapper.selectCoachingByApplicationId(7001L)).thenReturn(null);
        when(identityResolver.resolveUserIdByStaffId(9201L)).thenReturn(9001L);
        when(identityResolver.resolveUserIdByStaffId(9202L)).thenReturn(9002L);
        when(coachingMapper.insertCoaching(any(OsgCoaching.class))).thenReturn(1);
        when(jobApplicationMapper.updateJobApplicationAssignment(any(OsgJobApplication.class))).thenReturn(1);

        Map<String, Object> result = service.assignMentors(
            7001L,
            Map.of(
                "mentorIds", List.of(9201L, 9202L),
                "mentorNames", List.of("Jerry Li", "Mike Wang"),
                "assignNote", "优先覆盖 First Round 题型"),
            810L,
            "leadmentor_jobs");

        assertEquals(List.of(9001L, 9002L), result.get("mentorIds"));

        ArgumentCaptor<OsgCoaching> captor = ArgumentCaptor.forClass(OsgCoaching.class);
        verify(coachingMapper).insertCoaching(captor.capture());
        assertEquals("9001,9002", captor.getValue().getMentorIds());
    }

    @Test
    void assignMentorsRejectsWhenResolverCannotResolveStaffId()
    {
        OsgJobApplication application = new OsgJobApplication();
        application.setApplicationId(7001L);
        application.setStudentId(3001L);
        application.setLeadMentorId(810L);
        application.setAssignStatus("pending");

        when(jobApplicationMapper.selectJobApplicationByApplicationId(7001L)).thenReturn(application);
        when(identityResolver.resolveUserIdByStaffId(9201L)).thenThrow(new ServiceException("员工账号不存在，无法完成导师分配"));

        ServiceException error = assertThrows(ServiceException.class, () -> service.assignMentors(
            7001L,
            Map.of("mentorIds", List.of(9201L)),
            810L,
            "leadmentor_jobs"));

        assertEquals("员工账号不存在，无法完成导师分配", error.getMessage());
    }

    @Test
    void confirmCoachingShouldUpdateConfirmedAtAndReturnLegacyStatus()
    {
        OsgJobApplication application = new OsgJobApplication();
        application.setApplicationId(7002L);
        application.setStudentId(3002L);
        application.setLeadMentorId(810L);
        application.setCurrentStage("Case Study");

        OsgCoaching coaching = new OsgCoaching();
        coaching.setCoachingId(8001L);
        coaching.setApplicationId(7002L);
        coaching.setStudentId(3002L);
        coaching.setStatus("待审批");
        coaching.setMentorId(810L);
        coaching.setMentorIds("810");

        when(jobApplicationMapper.selectJobApplicationByApplicationId(7002L)).thenReturn(application);
        when(coachingMapper.selectCoachingByApplicationId(7002L)).thenReturn(coaching);
        when(coachingMapper.selectCoachingList(any(OsgCoaching.class))).thenReturn(List.of(coaching));
        when(coachingMapper.updateCoaching(any(OsgCoaching.class))).thenReturn(1);

        Map<String, Object> result = service.confirmCoaching(7002L, 810L, "mentor_user");

        assertEquals(7002L, result.get("applicationId"));
        assertEquals("coaching", result.get("coachingStatus"));

        ArgumentCaptor<OsgCoaching> captor = ArgumentCaptor.forClass(OsgCoaching.class);
        verify(coachingMapper).updateCoaching(captor.capture());
        assertEquals(8001L, captor.getValue().getCoachingId());
        assertEquals("辅导中", captor.getValue().getStatus());
        assertEquals("mentor_user", captor.getValue().getUpdateBy());
        assertNotNull(captor.getValue().getConfirmedAt());
    }

    @Test
    void confirmCoachingShouldRejectWhenCurrentMentorCannotAccessApplication()
    {
        OsgJobApplication application = new OsgJobApplication();
        application.setApplicationId(7002L);
        application.setStudentId(3002L);
        application.setLeadMentorId(810L);

        when(jobApplicationMapper.selectJobApplicationByApplicationId(7002L)).thenReturn(application);
        when(coachingMapper.selectCoachingList(any(OsgCoaching.class))).thenReturn(List.of());

        ServiceException error = assertThrows(ServiceException.class, () -> service.confirmCoaching(7002L, 999L, "mentor_user"));

        assertEquals("无权确认该求职申请", error.getMessage());
    }

    @Test
    void selectOverviewListShouldIncludeAssistantOwnedApplicationsForSharedAssistantView()
    {
        OsgJobApplication application = new OsgJobApplication();
        application.setApplicationId(7010L);
        application.setStudentId(3010L);
        application.setStudentName("Assistant Student");
        application.setCompanyName("Assistant Capital");
        application.setPositionName("Analyst");
        application.setCurrentStage("applied");
        application.setSubmittedAt(new Date());

        OsgStudent student = new OsgStudent();
        student.setStudentId(3010L);
        student.setAssistantId(920L);

        when(jobApplicationMapper.selectJobApplicationList(any(OsgJobApplication.class))).thenReturn(List.of(application));
        when(coachingMapper.selectCoachingList(any(OsgCoaching.class))).thenReturn(List.of());
        when(studentMapper.selectStudentByStudentIds(List.of(3010L))).thenReturn(List.of(student));

        List<Map<String, Object>> rows = service.selectOverviewList("coaching", new OsgJobApplication(), 920L);

        assertEquals(1, rows.size());
        assertEquals(7010L, rows.get(0).get("applicationId"));
        assertEquals("Assistant Student", rows.get(0).get("studentName"));
    }

    @Test
    void confirmCoachingShouldRejectAssistantOwnedButUnassignedApplication()
    {
        OsgJobApplication application = new OsgJobApplication();
        application.setApplicationId(7011L);
        application.setStudentId(3011L);

        when(jobApplicationMapper.selectJobApplicationByApplicationId(7011L)).thenReturn(application);
        when(coachingMapper.selectCoachingList(any(OsgCoaching.class))).thenReturn(List.of());

        ServiceException error = assertThrows(ServiceException.class, () -> service.confirmCoaching(7011L, 920L, "assistant_user"));

        assertEquals("无权确认该求职申请", error.getMessage());
    }
}
