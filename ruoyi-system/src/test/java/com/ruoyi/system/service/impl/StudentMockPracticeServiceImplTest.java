package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgMockPractice;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.OsgMockPracticeMapper;
import com.ruoyi.system.mapper.StudentJobPositionMapper;
import com.ruoyi.system.mapper.StudentMockPracticeMapper;
import com.ruoyi.system.mapper.SysDictDataMapper;

@ExtendWith(MockitoExtension.class)
class StudentMockPracticeServiceImplTest
{
    @InjectMocks
    private StudentMockPracticeServiceImpl service;

    @Mock
    private StudentMockPracticeMapper studentMockPracticeMapper;

    @Mock
    private StudentJobPositionMapper studentJobPositionMapper;

    @Mock
    private SysDictDataMapper sysDictDataMapper;

    @Mock
    private OsgMockPracticeMapper osgMockPracticeMapper;

    @Mock
    private OsgIdentityResolver identityResolver;

    @Test
    void createPracticeRequestCreatesMainMockPracticeRecord()
    {
        OsgStudent student = new OsgStudent();
        student.setStudentId(12766L);
        student.setStudentName("Curl Stu");

        when(sysDictDataMapper.selectDictDataByType(any())).thenReturn(List.of());
        when(identityResolver.resolveStudentByUserId(838L)).thenReturn(student);
        doAnswer(invocation -> {
            OsgMockPractice practice = invocation.getArgument(0);
            practice.setPracticeId(7001L);
            return 1;
        }).when(osgMockPracticeMapper).insertMockPractice(any(OsgMockPractice.class));

        Long requestId = service.createPracticeRequest("mock", "准备一面", "2位导师", "Jerry Li", "", "希望本周安排", 838L);

        ArgumentCaptor<OsgMockPractice> captor = ArgumentCaptor.forClass(OsgMockPractice.class);
        verify(osgMockPracticeMapper).insertMockPractice(captor.capture());
        OsgMockPractice saved = captor.getValue();
        assertEquals(12766L, saved.getStudentId());
        assertEquals("Curl Stu", saved.getStudentName());
        assertEquals("mock_interview", saved.getPracticeType());
        assertEquals("模拟面试", saved.getRequestContent());
        assertEquals(2, saved.getRequestedMentorCount());
        assertEquals("Jerry Li", saved.getPreferredMentorNames());
        assertEquals("pending", saved.getStatus());
        assertEquals(0, saved.getCompletedHours());
        assertNotNull(saved.getSubmittedAt());
        assertEquals("希望本周安排", saved.getRemark());
        assertNotNull(requestId);
        assertEquals(requestId, saved.getPracticeId());
        verify(studentMockPracticeMapper, never()).insertRequest(any(Map.class));
    }

    @Test
    void selectOverviewReadsPracticeRecordsFromMainTable()
    {
        OsgMockPractice practice = new OsgMockPractice();
        practice.setPracticeId(7001L);
        practice.setStudentId(12766L);
        practice.setStudentName("Curl Stu");
        practice.setPracticeType("mock_interview");
        practice.setRequestContent("模拟面试");
        practice.setStatus("scheduled");
        practice.setMentorNames("Jerry Li");
        practice.setMentorBackgrounds("Goldman Sachs IBD");
        practice.setScheduledAt(Timestamp.valueOf(LocalDateTime.of(2026, 3, 26, 9, 30)));
        practice.setCompletedHours(1);
        practice.setFeedbackSummary("结构清晰");
        practice.setSubmittedAt(Timestamp.valueOf(LocalDateTime.of(2026, 3, 25, 10, 0)));

        when(sysDictDataMapper.selectDictDataByType(any())).thenReturn(List.of());
        when(identityResolver.resolveStudentIdByUserId(838L)).thenReturn(12766L);
        when(osgMockPracticeMapper.selectStudentPracticeList(12766L)).thenReturn(List.of(practice));
        when(studentMockPracticeMapper.selectClassRequestList(838L)).thenReturn(List.of());

        Map<String, Object> overview = service.selectOverview(838L);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> practiceRecords = (List<Map<String, Object>>) overview.get("practiceRecords");
        assertEquals(1, practiceRecords.size());
        assertEquals("MP7001", practiceRecords.get(0).get("id"));
        assertEquals("模拟面试", practiceRecords.get(0).get("type"));
        assertEquals("coaching", practiceRecords.get(0).get("statusValue"));
        assertEquals("Jerry Li", practiceRecords.get(0).get("mentor"));
        verify(osgMockPracticeMapper).selectStudentPracticeList(12766L);
        verify(studentMockPracticeMapper).selectClassRequestList(838L);
        verify(studentMockPracticeMapper, never()).selectPracticeList(any());
    }

    @Test
    void createPracticeRequestFailsWhenStudentIdentityMissing()
    {
        when(sysDictDataMapper.selectDictDataByType(any())).thenReturn(List.of());
        when(identityResolver.resolveStudentByUserId(838L)).thenThrow(new ServiceException("学员主数据不存在，无法建立五端主链"));

        ServiceException error = assertThrows(ServiceException.class, () ->
            service.createPracticeRequest("mock", "准备一面", "2位导师", "Jerry Li", "", "希望本周安排", 838L));

        assertEquals("学员主数据不存在，无法建立五端主链", error.getMessage());
        verify(osgMockPracticeMapper, never()).insertMockPractice(any());
    }
}
