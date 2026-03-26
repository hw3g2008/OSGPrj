package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
import com.ruoyi.system.mapper.OsgCoachingMapper;
import com.ruoyi.system.mapper.OsgJobApplicationMapper;

@ExtendWith(MockitoExtension.class)
class OsgJobOverviewServiceImplTest
{
    @InjectMocks
    private OsgJobOverviewServiceImpl service;

    @Mock
    private OsgJobApplicationMapper jobApplicationMapper;

    @Mock
    private OsgCoachingMapper coachingMapper;

    @Mock
    private OsgIdentityResolver identityResolver;

    @Test
    void assignMentorsStoresResolvedUserIdsInsteadOfStaffIds()
    {
        OsgJobApplication application = new OsgJobApplication();
        application.setApplicationId(7001L);
        application.setStudentId(3001L);
        application.setAssignStatus("pending");

        when(jobApplicationMapper.selectJobApplicationByApplicationId(7001L)).thenReturn(application);
        when(coachingMapper.selectCoachingByApplicationId(7001L)).thenReturn(null);
        when(identityResolver.resolveUserIdByStaffId(9201L)).thenReturn(9001L);
        when(identityResolver.resolveUserIdByStaffId(9202L)).thenReturn(9002L);
        when(coachingMapper.insertCoaching(any(OsgCoaching.class))).thenReturn(1);
        when(jobApplicationMapper.updateJobApplicationAssignment(any(OsgJobApplication.class))).thenReturn(1);

        Map<String, Object> result = service.assignMentors(
            Map.of(
                "applicationId", 7001L,
                "mentorIds", List.of(9201L, 9202L),
                "mentorNames", List.of("Jerry Li", "Mike Wang"),
                "assignNote", "优先覆盖 First Round 题型"),
            "admin_jobs");

        assertEquals(List.of(9001L, 9002L), result.get("mentorIds"));

        ArgumentCaptor<OsgCoaching> captor = ArgumentCaptor.forClass(OsgCoaching.class);
        verify(coachingMapper).insertCoaching(captor.capture());
        assertEquals("9001,9002", captor.getValue().getMentorIds());

        verify(identityResolver).resolveUserIdByStaffId(9201L);
        verify(identityResolver).resolveUserIdByStaffId(9202L);
    }

    @Test
    void assignMentorsRejectsWhenResolverCannotResolveStaffId()
    {
        OsgJobApplication application = new OsgJobApplication();
        application.setApplicationId(7001L);
        application.setStudentId(3001L);
        application.setAssignStatus("pending");

        when(identityResolver.resolveUserIdByStaffId(9201L)).thenThrow(new ServiceException("员工账号不存在，无法完成导师分配"));

        ServiceException error = assertThrows(ServiceException.class, () -> service.assignMentors(
            Map.of(
                "applicationId", 7001L,
                "mentorIds", List.of(9201L),
                "mentorNames", List.of("Jerry Li")),
            "admin_jobs"));

        assertEquals("员工账号不存在，无法完成导师分配", error.getMessage());
    }
}
