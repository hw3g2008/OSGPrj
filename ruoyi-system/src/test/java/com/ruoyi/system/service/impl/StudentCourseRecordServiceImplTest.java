package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
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
import com.ruoyi.system.domain.OsgClassRecord;
import com.ruoyi.system.mapper.OsgClassRecordMapper;
import com.ruoyi.system.mapper.StudentCourseRecordMapper;
import com.ruoyi.system.mapper.SysDictDataMapper;

@ExtendWith(MockitoExtension.class)
class StudentCourseRecordServiceImplTest
{
    @InjectMocks
    private StudentCourseRecordServiceImpl service;

    @Mock
    private StudentCourseRecordMapper studentCourseRecordMapper;

    @Mock
    private SysDictDataMapper sysDictDataMapper;

    @Mock
    private OsgClassRecordMapper osgClassRecordMapper;

    @Mock
    private OsgIdentityResolver identityResolver;

    @Test
    void selectCourseRecordListReadsApprovedMainRecords()
    {
        OsgClassRecord record = new OsgClassRecord();
        record.setRecordId(8801L);
        record.setClassId("#R8801");
        record.setStudentId(12766L);
        record.setStudentName("Curl Stu");
        record.setMentorName("Jerry Li");
        record.setCourseType("mock_practice");
        record.setClassStatus("mock_interview");
        record.setCourseSource("mentor");
        record.setClassDate(Timestamp.valueOf(LocalDateTime.of(2026, 3, 24, 20, 0)));
        record.setDurationHours(1.5D);
        record.setStatus("approved");
        record.setRate("");
        record.setComments("");
        record.setRemark("");

        when(sysDictDataMapper.selectDictDataByType(any())).thenReturn(List.of());
        when(identityResolver.resolveStudentIdByUserId(838L)).thenReturn(12766L);
        when(osgClassRecordMapper.selectStudentApprovedClassRecordList(12766L)).thenReturn(List.of(record));

        List<Map<String, Object>> rows = service.selectCourseRecordList(838L);

        assertEquals(1, rows.size());
        assertEquals("#R8801", rows.get(0).get("recordId"));
        assertEquals("模拟应聘", rows.get(0).get("coachingType"));
        assertEquals("模拟面试", rows.get(0).get("courseContent"));
        assertEquals("Jerry Li", rows.get(0).get("mentor"));
        assertEquals("待评价", rows.get(0).get("ratingLabel"));
        verify(osgClassRecordMapper).selectStudentApprovedClassRecordList(12766L);
        verify(studentCourseRecordMapper, never()).selectCourseRecordList(any());
    }

    @Test
    void rateCourseRecordWritesBackToMainRecord()
    {
        OsgClassRecord record = new OsgClassRecord();
        record.setRecordId(8801L);
        record.setClassId("#R8801");
        record.setStudentId(12766L);
        record.setStatus("approved");

        when(sysDictDataMapper.selectDictDataByType(any())).thenReturn(List.of());
        when(identityResolver.resolveStudentIdByUserId(838L)).thenReturn(12766L);
        when(osgClassRecordMapper.selectStudentClassRecordByClassId("#R8801", 12766L)).thenReturn(record);
        when(osgClassRecordMapper.updateStudentClassRecordRating(any(OsgClassRecord.class))).thenReturn(1);

        int rows = service.rateCourseRecord("#R8801", 5, List.of("反馈及时", "收获很大"), "真实课程评价联调", 838L);

        assertEquals(1, rows);
        ArgumentCaptor<OsgClassRecord> captor = ArgumentCaptor.forClass(OsgClassRecord.class);
        verify(osgClassRecordMapper).updateStudentClassRecordRating(captor.capture());
        OsgClassRecord patch = captor.getValue();
        assertEquals(8801L, patch.getRecordId());
        assertEquals("5", patch.getRate());
        assertEquals("反馈及时,收获很大", patch.getTopics());
        assertEquals("真实课程评价联调", patch.getComments());
    }

    @Test
    void rateCourseRecordAcceptsFallbackRecordIdTokenWhenClassIdMissing()
    {
        OsgClassRecord record = new OsgClassRecord();
        record.setRecordId(8802L);
        record.setClassId(null);
        record.setStudentId(12766L);
        record.setStatus("approved");

        when(sysDictDataMapper.selectDictDataByType(any())).thenReturn(List.of());
        when(identityResolver.resolveStudentIdByUserId(838L)).thenReturn(12766L);
        when(osgClassRecordMapper.selectStudentClassRecordByClassId("#8802", 12766L)).thenReturn(null);
        when(osgClassRecordMapper.selectClassRecordByRecordId(8802L)).thenReturn(record);
        when(osgClassRecordMapper.updateStudentClassRecordRating(any(OsgClassRecord.class))).thenReturn(1);

        int rows = service.rateCourseRecord("#8802", 5, List.of("反馈及时"), "fallback recordId 评分", 838L);

        assertEquals(1, rows);
        verify(osgClassRecordMapper).selectClassRecordByRecordId(8802L);
    }

    @Test
    void rateCourseRecordRejectsForeignRecord()
    {
        when(sysDictDataMapper.selectDictDataByType(any())).thenReturn(List.of());
        when(identityResolver.resolveStudentIdByUserId(838L)).thenReturn(12766L);
        when(osgClassRecordMapper.selectStudentClassRecordByClassId("#R8801", 12766L)).thenReturn(null);

        ServiceException error = assertThrows(ServiceException.class, () ->
            service.rateCourseRecord("#R8801", 5, List.of("反馈及时"), "真实课程评价联调", 838L));

        assertEquals("课程记录不存在或无权操作", error.getMessage());
        verify(osgClassRecordMapper, never()).updateStudentClassRecordRating(any());
    }
}
