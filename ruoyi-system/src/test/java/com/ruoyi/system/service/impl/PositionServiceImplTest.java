package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.core.domain.entity.SysDictData;
import com.ruoyi.system.domain.OsgJobApplication;
import com.ruoyi.system.domain.OsgPosition;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.domain.OsgStudentPosition;
import com.ruoyi.system.mapper.OsgJobApplicationMapper;
import com.ruoyi.system.mapper.OsgPositionMapper;
import com.ruoyi.system.mapper.OsgStudentPositionMapper;
import com.ruoyi.system.mapper.StudentJobPositionMapper;
import com.ruoyi.system.mapper.StudentProfileMapper;
import com.ruoyi.system.mapper.SysDictDataMapper;

@ExtendWith(MockitoExtension.class)
class PositionServiceImplTest
{
    @InjectMocks
    private PositionServiceImpl service;

    @Mock
    private StudentJobPositionMapper studentJobPositionMapper;

    @Mock
    private StudentProfileMapper studentProfileMapper;

    @Mock
    private SysDictDataMapper sysDictDataMapper;

    @Mock
    private OsgPositionMapper positionMapper;

    @Mock
    private OsgJobApplicationMapper jobApplicationMapper;

    @Mock
    private OsgStudentPositionMapper studentPositionMapper;

    @Mock
    private OsgIdentityResolver identityResolver;

    @Test
    void updateApplyStatusCreatesMainApplicationRecord()
    {
        when(studentJobPositionMapper.countVisiblePosition(501L, 838L)).thenReturn(1);
        when(studentJobPositionMapper.upsertApplyState(any(), any(), any(), any(), any(), any(), any(), any())).thenReturn(1);
        when(identityResolver.resolveStudentByUserId(838L)).thenReturn(student(12766L, "Curl Stu"));
        when(studentJobPositionMapper.selectPositionList(838L)).thenReturn(List.of(positionRow(501L, "Goldman Sachs", "Summer Analyst", "New York")));
        when(jobApplicationMapper.selectLatestByStudentAndCompanyAndPosition(12766L, "Goldman Sachs", "Summer Analyst")).thenReturn(null);
        when(jobApplicationMapper.insertJobApplication(any(OsgJobApplication.class))).thenReturn(1);

        int rows = service.updateApplyStatus(501L, true, "2026-03-25", "官网投递", "通过官网直投", 838L);

        assertEquals(1, rows);
        ArgumentCaptor<OsgJobApplication> captor = ArgumentCaptor.forClass(OsgJobApplication.class);
        verify(jobApplicationMapper).insertJobApplication(captor.capture());
        OsgJobApplication saved = captor.getValue();
        assertEquals(12766L, saved.getStudentId());
        assertEquals(9001L, saved.getLeadMentorId());
        assertEquals("Curl Stu", saved.getStudentName());
        assertEquals("Goldman Sachs", saved.getCompanyName());
        assertEquals("Summer Analyst", saved.getPositionName());
        assertEquals("New York", saved.getCity());
        assertEquals("applied", saved.getCurrentStage());
        assertEquals("pending", saved.getAssignStatus());
        assertEquals(0, saved.getRequestedMentorCount());
        assertEquals("none", saved.getCoachingStatus());
        assertEquals("通过官网直投", saved.getRemark());
        verify(studentJobPositionMapper).upsertApplyState(
            501L,
            838L,
            "1",
            LocalDate.of(2026, 3, 25),
            "官网投递",
            "通过官网直投",
            "applied",
            "");
    }

    @Test
    void updateApplyStatusAcceptsVisiblePublicPositionOutsideStudentShadowPool()
    {
        OsgPosition publicPosition = new OsgPosition();
        publicPosition.setPositionId(114L);
        publicPosition.setCompanyName("Chain Capital");
        publicPosition.setPositionName("Chain Analyst");
        publicPosition.setCity("Hong Kong");
        publicPosition.setIndustry("Investment Bank");
        publicPosition.setPositionCategory("summer");
        publicPosition.setRecruitmentCycle("2026 Autumn");
        publicPosition.setDisplayStatus("visible");

        when(studentJobPositionMapper.countVisiblePosition(114L, 838L)).thenReturn(0);
        when(positionMapper.selectPositionByPositionId(114L)).thenReturn(publicPosition);
        when(identityResolver.resolveStudentByUserId(838L)).thenReturn(student(12766L, "Curl Stu"));
        when(jobApplicationMapper.selectLatestByStudentAndCompanyAndPosition(12766L, "Chain Capital", "Chain Analyst")).thenReturn(null);
        when(jobApplicationMapper.insertJobApplication(any(OsgJobApplication.class))).thenReturn(1);

        int rows = service.updateApplyStatus(114L, true, "2026-03-25", "官网投递", "公共岗位直投", 838L);

        assertEquals(1, rows);
        ArgumentCaptor<OsgJobApplication> captor = ArgumentCaptor.forClass(OsgJobApplication.class);
        verify(jobApplicationMapper).insertJobApplication(captor.capture());
        OsgJobApplication saved = captor.getValue();
        assertEquals(114L, saved.getPositionId());
        assertEquals(12766L, saved.getStudentId());
        assertEquals(9001L, saved.getLeadMentorId());
        assertEquals("Chain Capital", saved.getCompanyName());
        assertEquals("Chain Analyst", saved.getPositionName());
        assertEquals("Hong Kong", saved.getCity());
        assertEquals("applied", saved.getCurrentStage());
        verify(studentJobPositionMapper, never()).upsertApplyState(any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void updateApplyStatusAcceptsFreshPublicPositionWithinCreationSecond()
    {
        OsgPosition publicPosition = new OsgPosition();
        publicPosition.setPositionId(117L);
        publicPosition.setCompanyName("Chain Capital");
        publicPosition.setPositionName("Chain Analyst");
        publicPosition.setCity("Hong Kong");
        publicPosition.setIndustry("Investment Bank");
        publicPosition.setPositionCategory("summer");
        publicPosition.setRecruitmentCycle("2026 Autumn");
        publicPosition.setDisplayStatus("visible");
        publicPosition.setDisplayStartTime(Timestamp.valueOf(LocalDate.now().atStartOfDay().plusDays(1)));
        publicPosition.setDisplayStartTime(Date.from(java.time.Instant.now().plus(800, ChronoUnit.MILLIS)));
        publicPosition.setDisplayEndTime(Date.from(java.time.Instant.now().plus(90, ChronoUnit.DAYS)));

        when(studentJobPositionMapper.countVisiblePosition(117L, 838L)).thenReturn(0);
        when(positionMapper.selectPositionByPositionId(117L)).thenReturn(publicPosition);
        when(identityResolver.resolveStudentByUserId(838L)).thenReturn(student(12766L, "Curl Stu"));
        when(jobApplicationMapper.selectLatestByStudentAndCompanyAndPosition(12766L, "Chain Capital", "Chain Analyst")).thenReturn(null);
        when(jobApplicationMapper.insertJobApplication(any(OsgJobApplication.class))).thenReturn(1);

        int rows = service.updateApplyStatus(117L, true, "2026-03-25", "官网投递", "公共岗位秒级创建后立即投递", 838L);

        assertEquals(1, rows);
        verify(jobApplicationMapper).insertJobApplication(any(OsgJobApplication.class));
        verify(studentJobPositionMapper, never()).upsertApplyState(any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void insertProgressUpdatesExistingMainApplicationStage()
    {
        OsgJobApplication existing = new OsgJobApplication();
        existing.setApplicationId(9001L);
        existing.setStudentId(12766L);
        existing.setCompanyName("Goldman Sachs");
        existing.setPositionName("Summer Analyst");

        when(studentJobPositionMapper.countVisiblePosition(501L, 838L)).thenReturn(1);
        when(studentJobPositionMapper.upsertProgressState(501L, 838L, "first", "进入 First Round")).thenReturn(1);
        when(identityResolver.resolveStudentByUserId(838L)).thenReturn(student(12766L, "Curl Stu"));
        when(studentJobPositionMapper.selectPositionList(838L)).thenReturn(List.of(positionRow(501L, "Goldman Sachs", "Summer Analyst", "New York")));
        when(jobApplicationMapper.selectLatestByStudentAndCompanyAndPosition(12766L, "Goldman Sachs", "Summer Analyst")).thenReturn(existing);
        when(jobApplicationMapper.updateJobApplicationStage(any(OsgJobApplication.class))).thenReturn(1);

        int rows = service.insertProgress(501L, "first", "进入 First Round", 838L);

        assertEquals(1, rows);
        ArgumentCaptor<OsgJobApplication> captor = ArgumentCaptor.forClass(OsgJobApplication.class);
        verify(jobApplicationMapper).updateJobApplicationStage(captor.capture());
        OsgJobApplication patch = captor.getValue();
        assertEquals(9001L, patch.getApplicationId());
        assertEquals("first", patch.getCurrentStage());
        assertEquals("进入 First Round", patch.getRemark());
        assertEquals(Boolean.TRUE, patch.getStageUpdated());
        verify(studentJobPositionMapper).upsertProgressState(501L, 838L, "first", "进入 First Round");
    }

    @Test
    void requestCoachingUpdatesMainApplicationInsteadOfStudentShadowState()
    {
        OsgJobApplication existing = new OsgJobApplication();
        existing.setApplicationId(9001L);
        existing.setStudentId(12766L);
        existing.setCompanyName("Goldman Sachs");
        existing.setPositionName("Summer Analyst");

        when(studentJobPositionMapper.countVisiblePosition(501L, 838L)).thenReturn(1);
        when(studentJobPositionMapper.upsertCoachingState(501L, 838L, "pending", "first", "2 位导师", "希望有投行导师")).thenReturn(1);
        when(identityResolver.resolveStudentByUserId(838L)).thenReturn(student(12766L, "Curl Stu"));
        when(studentJobPositionMapper.selectPositionList(838L)).thenReturn(List.of(positionRow(501L, "Goldman Sachs", "Summer Analyst", "New York")));
        when(jobApplicationMapper.selectLatestByStudentAndCompanyAndPosition(12766L, "Goldman Sachs", "Summer Analyst")).thenReturn(existing);
        when(jobApplicationMapper.updateJobApplicationCoaching(any(OsgJobApplication.class))).thenReturn(1);

        int rows = service.requestCoaching(501L, "first", "2 位导师", "希望有投行导师", 838L);

        assertEquals(1, rows);
        ArgumentCaptor<OsgJobApplication> captor = ArgumentCaptor.forClass(OsgJobApplication.class);
        verify(jobApplicationMapper).updateJobApplicationCoaching(captor.capture());
        OsgJobApplication patch = captor.getValue();
        assertEquals(9001L, patch.getApplicationId());
        assertEquals("first", patch.getCurrentStage());
        assertEquals("pending", patch.getAssignStatus());
        assertEquals("pending", patch.getCoachingStatus());
        assertEquals(2, patch.getRequestedMentorCount());
        assertEquals("希望有投行导师", patch.getRemark());
        verify(studentJobPositionMapper).upsertCoachingState(501L, 838L, "pending", "first", "2 位导师", "希望有投行导师");
    }

    @Test
    void selectApplicationListReadsMainApplications()
    {
        Map<String, Object> appRow = new LinkedHashMap<>();
        appRow.put("id", 9001L);
        appRow.put("company", "Goldman Sachs");
        appRow.put("position", "Summer Analyst");
        appRow.put("location", "New York");
        appRow.put("companyType", "ib");
        appRow.put("stage", "first");
        appRow.put("stageLabel", "First Round");
        appRow.put("stageColor", "orange");
        appRow.put("interviewTime", "03/26 09:30");
        appRow.put("interviewHint", "2026-03-26 09:30:00");
        appRow.put("coachingStatus", "pending");
        appRow.put("coachingStatusLabel", "待审批");
        appRow.put("coachingColor", "warning");
        appRow.put("mentor", "-");
        appRow.put("mentorMeta", "-");
        appRow.put("hoursFeedback", "-");
        appRow.put("feedback", "-");
        appRow.put("interviewAt", "2026-03-26 09:30:00");
        appRow.put("appliedDate", "2026-03-25");
        appRow.put("applyMethod", "官网投递");
        appRow.put("progressNote", "进入 First Round");

        when(identityResolver.resolveStudentIdByUserId(838L)).thenReturn(12766L);
        when(jobApplicationMapper.selectStudentApplicationRecords(12766L)).thenReturn(List.of(appRow));
        when(sysDictDataMapper.selectDictDataByType(any())).thenReturn(List.of());

        List<Map<String, Object>> rows = service.selectApplicationList(838L);

        assertEquals(1, rows.size());
        assertSame(appRow, rows.get(0));
        assertEquals("ongoing", rows.get(0).get("bucket"));
        verify(jobApplicationMapper).selectStudentApplicationRecords(12766L);
        verify(studentJobPositionMapper, never()).selectApplicationList(any());
    }

    @Test
    void createManualPositionCreatesPendingAdminReviewRecord()
    {
        when(sysDictDataMapper.selectDictDataByType(any())).thenReturn(List.of());
        when(identityResolver.resolveStudentByUserId(838L)).thenReturn(student(12766L, "Curl Stu"));
        when(studentPositionMapper.insertStudentPosition(any(OsgStudentPosition.class))).thenAnswer(invocation -> {
            OsgStudentPosition row = invocation.getArgument(0);
            row.setStudentPositionId(701L);
            return 1;
        });

        Long reviewId = service.createManualPosition("summer", "OpenAI Intern", "OpenAI", "San Francisco", 838L);

        assertEquals(701L, reviewId);
        ArgumentCaptor<OsgStudentPosition> captor = ArgumentCaptor.forClass(OsgStudentPosition.class);
        verify(studentPositionMapper).insertStudentPosition(captor.capture());
        OsgStudentPosition saved = captor.getValue();
        assertEquals(12766L, saved.getStudentId());
        assertEquals("Curl Stu", saved.getStudentName());
        assertEquals("summer", saved.getPositionCategory());
        assertEquals("OpenAI", saved.getCompanyName());
        assertEquals("OpenAI Intern", saved.getPositionName());
        assertEquals("San Francisco", saved.getCity());
        assertEquals("pending", saved.getStatus());
        assertEquals("no", saved.getHasCoachingRequest());
        verify(studentJobPositionMapper, never()).insertManualPosition(any());
    }

    @Test
    void selectPositionListIncludesOwnedPendingManualReviewRows()
    {
        when(studentJobPositionMapper.selectPositionList(838L)).thenReturn(List.of());
        when(positionMapper.selectPositionList(any(OsgPosition.class))).thenReturn(List.of());
        when(identityResolver.resolveStudentIdByUserId(838L)).thenReturn(12766L);
        when(studentPositionMapper.selectStudentPositionList(any(OsgStudentPosition.class))).thenReturn(List.of(reviewRow()));
        when(sysDictDataMapper.selectDictDataByType(any())).thenReturn(List.of());

        List<Map<String, Object>> rows = service.selectPositionList(838L);

        assertEquals(1, rows.size());
        Map<String, Object> row = rows.get(0);
        assertEquals("OpenAI", row.get("company"));
        assertEquals("OpenAI Intern", row.get("title"));
        assertEquals("San Francisco", row.get("location"));
        assertEquals("manual", row.get("sourceType"));
    }

    @Test
    void selectPositionListDoesNotRewriteExistingDynamicDictMetadata()
    {
        Map<String, Object> publicRow = positionRow(501L, "Goldman Sachs", "Summer Analyst", "New York");
        publicRow = new LinkedHashMap<>(publicRow);
        publicRow.put("companyKey", "gs");
        publicRow.put("companyCode", "GS");
        publicRow.put("category", "summer");

        when(studentJobPositionMapper.selectPositionList(838L)).thenReturn(List.of(publicRow));
        when(positionMapper.selectPositionList(any(OsgPosition.class))).thenReturn(List.of());
        when(identityResolver.resolveStudentIdByUserId(838L)).thenReturn(12766L);
        when(studentPositionMapper.selectStudentPositionList(any(OsgStudentPosition.class))).thenReturn(List.of());
        when(sysDictDataMapper.selectDictDataByType(eq("osg_student_position_category"))).thenReturn(List.of(dict(1L, "osg_student_position_category", "summer", "暑期实习", "岗位分类")));
        when(sysDictDataMapper.selectDictDataByType(eq("osg_student_position_industry"))).thenReturn(List.of(dict(2L, "osg_student_position_industry", "ib", "Investment Bank", "行业展示")));
        when(sysDictDataMapper.selectDictDataByType(eq("osg_student_position_apply_method"))).thenReturn(List.of(dict(3L, "osg_student_position_apply_method", "官网投递", "官网投递", "投递方式")));
        when(sysDictDataMapper.selectDictDataByType(eq("osg_student_position_progress_stage"))).thenReturn(List.of(dict(4L, "osg_student_position_progress_stage", "applied", "已投递", "岗位进度")));
        when(sysDictDataMapper.selectDictDataByType(eq("osg_student_position_coaching_stage"))).thenReturn(List.of(dict(5L, "osg_student_position_coaching_stage", "first", "First Round", "辅导阶段")));
        when(sysDictDataMapper.selectDictDataByType(eq("osg_student_position_mentor_count"))).thenReturn(List.of(dict(6L, "osg_student_position_mentor_count", "2", "2 位导师", "导师数量")));
        when(sysDictDataMapper.selectDictDataByType(eq("osg_student_position_location"))).thenReturn(List.of(dictWithStyle(7L, "osg_student_position_location", "New York", "New York", "ny", null, 100L, "地区展示")));
        when(sysDictDataMapper.selectDictDataByType(eq("osg_student_position_company_brand"))).thenReturn(List.of(dictWithStyle(8L, "osg_student_position_company_brand", "gs", "Goldman Sachs", "#4F46E5", "GS", 200L, "公司品牌")));

        List<Map<String, Object>> rows = service.selectPositionList(838L);

        assertEquals(1, rows.size());
        verify(sysDictDataMapper, never()).updateDictData(argThat(dict ->
            dict != null
                && ("osg_student_position_location".equals(dict.getDictType())
                    || "osg_student_position_company_brand".equals(dict.getDictType()))
        ));
        verify(sysDictDataMapper, never()).insertDictData(argThat(dict ->
            dict != null
                && ("osg_student_position_location".equals(dict.getDictType())
                    || "osg_student_position_company_brand".equals(dict.getDictType()))
        ));
        verify(sysDictDataMapper, atLeastOnce()).selectDictDataByType("osg_student_position_location");
        verify(sysDictDataMapper, atLeastOnce()).selectDictDataByType("osg_student_position_company_brand");
    }

    @Test
    void updateApplyStatusFailsWhenStudentIdentityMissing()
    {
        when(studentJobPositionMapper.countVisiblePosition(501L, 838L)).thenReturn(1);
        when(studentJobPositionMapper.selectPositionList(838L)).thenReturn(List.of(positionRow(501L, "Goldman Sachs", "Summer Analyst", "New York")));
        when(identityResolver.resolveStudentByUserId(838L)).thenThrow(new ServiceException("学员主数据不存在，无法建立五端主链"));

        ServiceException error = assertThrows(ServiceException.class, () ->
            service.updateApplyStatus(501L, true, "2026-03-25", "官网投递", "通过官网直投", 838L));

        assertEquals("学员主数据不存在，无法建立五端主链", error.getMessage());
        verify(jobApplicationMapper, never()).insertJobApplication(any());
    }

    private OsgStudent student(Long studentId, String studentName)
    {
        OsgStudent student = new OsgStudent();
        student.setStudentId(studentId);
        student.setStudentName(studentName);
        student.setLeadMentorId(9001L);
        return student;
    }

    private Map<String, Object> positionRow(Long positionId, String company, String title, String location)
    {
        return Map.of(
            "id", positionId,
            "company", company,
            "title", title,
            "location", location,
            "industry", "ib",
            "companyKey", "gs",
            "companyCode", "GS",
            "category", "summer");
    }

    private SysDictData dict(Long dictCode, String dictType, String dictValue, String dictLabel, String remark)
    {
        return dictWithStyle(dictCode, dictType, dictValue, dictLabel, null, null, dictCode, remark);
    }

    private SysDictData dictWithStyle(Long dictCode, String dictType, String dictValue, String dictLabel, String cssClass, String listClass, Long dictSort, String remark)
    {
        SysDictData item = new SysDictData();
        item.setDictCode(dictCode);
        item.setDictType(dictType);
        item.setDictValue(dictValue);
        item.setDictLabel(dictLabel);
        item.setCssClass(cssClass);
        item.setListClass(listClass);
        item.setDictSort(dictSort);
        item.setStatus("0");
        item.setRemark(remark);
        return item;
    }

    private OsgStudentPosition reviewRow()
    {
        OsgStudentPosition row = new OsgStudentPosition();
        row.setStudentPositionId(701L);
        row.setStudentId(12766L);
        row.setStudentName("Curl Stu");
        row.setPositionCategory("summer");
        row.setIndustry("ib");
        row.setCompanyName("OpenAI");
        row.setCompanyType("Tech");
        row.setCompanyWebsite("https://openai.com");
        row.setPositionName("OpenAI Intern");
        row.setDepartment("Pending");
        row.setRegion("na");
        row.setCity("San Francisco");
        row.setRecruitmentCycle("Open");
        row.setProjectYear(String.valueOf(LocalDate.now().getYear()));
        row.setPositionUrl("#");
        row.setStatus("pending");
        row.setHasCoachingRequest("no");
        return row;
    }
}
