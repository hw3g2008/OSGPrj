package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
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
        when(positionMapper.selectPositionByPositionId(501L)).thenReturn(publicPosition(501L, "Goldman Sachs", "Summer Analyst", "New York"));
        when(identityResolver.resolveStudentByUserId(838L)).thenReturn(student(12766L, "Curl Stu"));
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
        when(positionMapper.selectPositionByPositionId(501L)).thenReturn(publicPosition(501L, "Goldman Sachs", "Summer Analyst", "New York"));
        when(identityResolver.resolveStudentByUserId(838L)).thenReturn(student(12766L, "Curl Stu"));
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
        when(positionMapper.selectPositionByPositionId(501L)).thenReturn(publicPosition(501L, "Goldman Sachs", "Summer Analyst", "New York"));
        when(identityResolver.resolveStudentByUserId(838L)).thenReturn(student(12766L, "Curl Stu"));
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
    void requestCoachingExtendedHirevuePathSerializesAllFieldsToRemark()
    {
        OsgJobApplication existing = new OsgJobApplication();
        existing.setApplicationId(9001L);
        existing.setStudentId(12766L);
        existing.setCompanyName("Goldman Sachs");
        existing.setPositionName("Summer Analyst");

        when(studentJobPositionMapper.countVisiblePosition(501L, 838L)).thenReturn(1);
        when(positionMapper.selectPositionByPositionId(501L)).thenReturn(publicPosition(501L, "Goldman Sachs", "Summer Analyst", "New York"));
        when(identityResolver.resolveStudentByUserId(838L)).thenReturn(student(12766L, "Curl Stu"));
        when(jobApplicationMapper.selectLatestByStudentAndCompanyAndPosition(12766L, "Goldman Sachs", "Summer Analyst")).thenReturn(existing);
        when(jobApplicationMapper.updateJobApplicationCoaching(any(OsgJobApplication.class))).thenReturn(1);
        when(studentJobPositionMapper.upsertCoachingState(eq(501L), eq(838L), eq("pending"), eq("hirevue"), eq("0"), any())).thenReturn(1);

        Map<String, Object> params = new LinkedHashMap<>();
        params.put("stage", "hirevue");
        params.put("hirevueType", "vi");
        params.put("viLink", "https://hirevue.example.com/abc");
        params.put("hirevueDeadline", "2026-03-30T15:00");
        params.put("inviteScreenshotName", "invite.png");
        params.put("inviteScreenshotUrl", "http://localhost:28080/profile/upload/2026/04/26/invite.png");
        params.put("mentorHelp", "yes");
        params.put("note", "希望尽快安排");

        int rows = service.requestCoaching(501L, params, 838L);

        assertEquals(1, rows);
        ArgumentCaptor<String> remarkCaptor = ArgumentCaptor.forClass(String.class);
        verify(studentJobPositionMapper).upsertCoachingState(eq(501L), eq(838L), eq("pending"), eq("hirevue"), eq("0"), remarkCaptor.capture());
        String remark = remarkCaptor.getValue();
        assertTrue(remark.contains("needCoaching=yes"), remark);
        assertTrue(remark.contains("stage=hirevue"), remark);
        assertTrue(remark.contains("hirevueType=vi"), remark);
        assertTrue(remark.contains("viLink=https://hirevue.example.com/abc"), remark);
        assertTrue(remark.contains("hirevueDeadline=2026-03-30T15:00"), remark);
        assertTrue(remark.contains("inviteScreenshot=invite.png"), remark);
        assertTrue(remark.contains("inviteScreenshotUrl=http://localhost:28080/profile/upload/2026/04/26/invite.png"), remark);
        assertTrue(remark.contains("mentorHelp=yes"), remark);
        assertTrue(remark.contains("note=希望尽快安排"), remark);
    }

    @Test
    void requestCoachingExtendedRegularPathSerializesInterviewTimeAndMentorPreferences()
    {
        OsgJobApplication existing = new OsgJobApplication();
        existing.setApplicationId(9001L);
        existing.setStudentId(12766L);
        existing.setCompanyName("Goldman Sachs");
        existing.setPositionName("Summer Analyst");

        when(studentJobPositionMapper.countVisiblePosition(501L, 838L)).thenReturn(1);
        when(positionMapper.selectPositionByPositionId(501L)).thenReturn(publicPosition(501L, "Goldman Sachs", "Summer Analyst", "New York"));
        when(identityResolver.resolveStudentByUserId(838L)).thenReturn(student(12766L, "Curl Stu"));
        when(jobApplicationMapper.selectLatestByStudentAndCompanyAndPosition(12766L, "Goldman Sachs", "Summer Analyst")).thenReturn(existing);
        when(jobApplicationMapper.updateJobApplicationCoaching(any(OsgJobApplication.class))).thenReturn(1);
        when(studentJobPositionMapper.upsertCoachingState(eq(501L), eq(838L), eq("pending"), eq("first"), eq("2"), any())).thenReturn(1);

        Map<String, Object> params = new LinkedHashMap<>();
        params.put("stage", "first");
        params.put("interviewTime", "2026-04-01T10:30");
        params.put("mentorCount", "2");
        params.put("preferMentor", "Jerry Li");
        params.put("excludeMentor", "Tom Z");
        params.put("note", "希望有投行导师");

        int rows = service.requestCoaching(501L, params, 838L);

        assertEquals(1, rows);
        ArgumentCaptor<String> remarkCaptor = ArgumentCaptor.forClass(String.class);
        verify(studentJobPositionMapper).upsertCoachingState(eq(501L), eq(838L), eq("pending"), eq("first"), eq("2"), remarkCaptor.capture());
        String remark = remarkCaptor.getValue();
        assertTrue(remark.contains("needCoaching=yes"), remark);
        assertTrue(remark.contains("stage=first"), remark);
        assertTrue(remark.contains("interviewTime=2026-04-01T10:30"), remark);
        assertTrue(remark.contains("mentorCount=2"), remark);
        assertTrue(remark.contains("preferMentor=Jerry Li"), remark);
        assertTrue(remark.contains("excludeMentor=Tom Z"), remark);
        assertTrue(remark.contains("note=希望有投行导师"), remark);
    }

    @Test
    void requestCoachingExtendedThrowsWhenHirevueTypeMissing()
    {
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("stage", "hirevue");
        params.put("hirevueDeadline", "2026-03-30T15:00");
        params.put("inviteScreenshotName", "invite.png");
        params.put("inviteScreenshotUrl", "http://localhost:28080/profile/upload/2026/04/26/invite.png");
        params.put("mentorHelp", "yes");

        ServiceException ex = assertThrows(ServiceException.class, () -> service.requestCoaching(501L, params, 838L));
        assertEquals("请选择 HireVue / OT 类型", ex.getMessage());
        verify(studentJobPositionMapper, never()).upsertCoachingState(any(), any(), any(), any(), any(), any());
    }

    @Test
    void requestCoachingExtendedThrowsWhenInviteScreenshotUrlMissingForHirevue()
    {
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("stage", "hirevue");
        params.put("hirevueType", "vi");
        params.put("viLink", "https://hirevue.example.com/abc");
        params.put("hirevueDeadline", "2026-03-30T15:00");
        params.put("inviteScreenshotName", "invite.png");
        params.put("mentorHelp", "yes");

        ServiceException ex = assertThrows(ServiceException.class, () -> service.requestCoaching(501L, params, 838L));
        assertEquals("请上传邀请邮件截图", ex.getMessage());
        verify(studentJobPositionMapper, never()).upsertCoachingState(any(), any(), any(), any(), any(), any());
    }

    @Test
    void requestCoachingExtendedThrowsWhenInterviewTimeMissingForNonHirevue()
    {
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("stage", "first");
        params.put("preferMentor", "Jerry Li");

        ServiceException ex = assertThrows(ServiceException.class, () -> service.requestCoaching(501L, params, 838L));
        assertEquals("请填写该阶段的面试时间", ex.getMessage());
        verify(studentJobPositionMapper, never()).upsertCoachingState(any(), any(), any(), any(), any(), any());
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

        Long reviewId = service.createManualPosition(manualPositionParams("summer", "OpenAI Intern", "OpenAI", "San Francisco"), 838L);

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
    void createManualPositionUsesApprovedMainStudentIntentInsteadOfStaleProfileSnapshot()
    {
        OsgStudent approvedStudent = student(12766L, "Curl Stu");
        approvedStudent.setMajorDirection("咨询 Consulting");
        approvedStudent.setRecruitmentCycle("2027");

        when(sysDictDataMapper.selectDictDataByType(any())).thenReturn(List.of());
        when(identityResolver.resolveStudentByUserId(838L)).thenReturn(approvedStudent);
        when(studentPositionMapper.insertStudentPosition(any(OsgStudentPosition.class))).thenAnswer(invocation -> {
            OsgStudentPosition row = invocation.getArgument(0);
            row.setStudentPositionId(702L);
            return 1;
        });

        Long reviewId = service.createManualPosition(manualPositionParams("summer", "OpenAI Intern", "OpenAI", "San Francisco"), 838L);

        assertEquals(702L, reviewId);
        ArgumentCaptor<OsgStudentPosition> captor = ArgumentCaptor.forClass(OsgStudentPosition.class);
        verify(studentPositionMapper).insertStudentPosition(captor.capture());
        OsgStudentPosition saved = captor.getValue();
        assertEquals("brokerage", saved.getIndustry());
        assertEquals("2027", saved.getRecruitmentCycle());
    }

    @Test
    void selectPositionMetaUsesApprovedMainStudentIntentSummaryInsteadOfStaleProfileSnapshot()
    {
        OsgStudent approvedStudent = student(12766L, "Curl Stu");
        approvedStudent.setMajorDirection("金融 Finance");
        approvedStudent.setRecruitmentCycle("2027");
        approvedStudent.setTargetRegion("New York");

        when(identityResolver.resolveStudentIdByUserId(838L)).thenReturn(12766L);
        when(identityResolver.resolveStudentByUserId(838L)).thenReturn(approvedStudent);
        when(studentPositionMapper.selectStudentPositionList(any(OsgStudentPosition.class))).thenReturn(List.of());
        when(sysDictDataMapper.selectDictDataByTypes(anyList())).thenReturn(List.of());

        Map<String, Object> payload = service.selectPositionMeta(838L);

        @SuppressWarnings("unchecked")
        Map<String, Object> intentSummary = (Map<String, Object>) payload.get("intentSummary");
        assertEquals("2027", intentSummary.get("recruitmentCycle"));
        assertEquals("New York", intentSummary.get("targetRegion"));
        assertEquals("金融 Finance", intentSummary.get("primaryDirection"));
    }

    @Test
    void selectPositionListIncludesOwnedPendingManualReviewRows()
    {
        when(identityResolver.resolveStudentIdByUserId(838L)).thenReturn(12766L);
        when(studentPositionMapper.selectStudentPositionList(any(OsgStudentPosition.class))).thenReturn(List.of(reviewRow()));
        when(sysDictDataMapper.selectDictDataByTypes(anyList())).thenReturn(List.of());

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

        when(identityResolver.resolveStudentIdByUserId(838L)).thenReturn(12766L);
        when(studentPositionMapper.selectStudentPositionList(any(OsgStudentPosition.class))).thenReturn(List.of());
        when(sysDictDataMapper.selectDictDataByTypes(anyList())).thenReturn(List.of(
            dict(1L, "osg_student_position_category", "summer", "暑期实习", "岗位分类"),
            dict(2L, "osg_student_position_industry", "ib", "Investment Bank", "行业展示"),
            dictWithStyle(7L, "osg_student_position_location", "New York", "New York", "ny", null, 100L, "地区展示"),
            dictWithStyle(8L, "osg_student_position_company_brand", "gs", "Goldman Sachs", "#4F46E5", "GS", 200L, "公司品牌")
        ));

        List<Map<String, Object>> rows = service.selectPositionList(838L);

        assertEquals(0, rows.size());
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
        verify(sysDictDataMapper, atLeastOnce()).selectDictDataByTypes(anyList());
    }

    @Test
    void updateApplyStatusFailsWhenStudentIdentityMissing()
    {
        when(studentJobPositionMapper.countVisiblePosition(501L, 838L)).thenReturn(1);
        when(positionMapper.selectPositionByPositionId(501L)).thenReturn(publicPosition(501L, "Goldman Sachs", "Summer Analyst", "New York"));
        when(identityResolver.resolveStudentByUserId(838L)).thenThrow(new ServiceException("学员主数据不存在，无法建立五端主链"));

        ServiceException error = assertThrows(ServiceException.class, () ->
            service.updateApplyStatus(501L, true, "2026-03-25", "官网投递", "通过官网直投", 838L));

        assertEquals("学员主数据不存在，无法建立五端主链", error.getMessage());
        verify(jobApplicationMapper, never()).insertJobApplication(any());
    }

    @Test
    void updateApplyStatusFalseSoftDeletesByMarkingWithdrawn()
    {
        OsgJobApplication existing = new OsgJobApplication();
        existing.setApplicationId(9101L);
        existing.setStudentId(12766L);
        existing.setCurrentStage("applied");

        when(studentJobPositionMapper.countVisiblePosition(501L, 838L)).thenReturn(1);
        when(studentJobPositionMapper.upsertApplyState(any(), any(), any(), any(), any(), any(), any(), any())).thenReturn(1);
        when(positionMapper.selectPositionByPositionId(501L)).thenReturn(publicPosition(501L, "Goldman Sachs", "Summer Analyst", "New York"));
        when(identityResolver.resolveStudentByUserId(838L)).thenReturn(student(12766L, "Curl Stu"));
        when(jobApplicationMapper.selectLatestByStudentAndCompanyAndPosition(12766L, "Goldman Sachs", "Summer Analyst")).thenReturn(existing);
        when(jobApplicationMapper.updateJobApplicationStage(any(OsgJobApplication.class))).thenReturn(1);

        int rows = service.updateApplyStatus(501L, false, null, null, null, 838L);

        assertEquals(1, rows);
        ArgumentCaptor<OsgJobApplication> captor = ArgumentCaptor.forClass(OsgJobApplication.class);
        verify(jobApplicationMapper).updateJobApplicationStage(captor.capture());
        OsgJobApplication patch = captor.getValue();
        assertEquals(9101L, patch.getApplicationId());
        assertEquals("withdrawn", patch.getCurrentStage());
        assertEquals("学生取消投递标记", patch.getRemark());
        assertEquals("838", patch.getUpdateBy());
        verify(jobApplicationMapper, never()).insertJobApplication(any());
    }

    @Test
    void updateApplyStatusTrueAfterWithdrawnReusesExistingRow()
    {
        OsgJobApplication existing = new OsgJobApplication();
        existing.setApplicationId(9101L);
        existing.setStudentId(12766L);
        existing.setCurrentStage("withdrawn");

        when(studentJobPositionMapper.countVisiblePosition(501L, 838L)).thenReturn(1);
        when(studentJobPositionMapper.upsertApplyState(any(), any(), any(), any(), any(), any(), any(), any())).thenReturn(1);
        when(positionMapper.selectPositionByPositionId(501L)).thenReturn(publicPosition(501L, "Goldman Sachs", "Summer Analyst", "New York"));
        when(identityResolver.resolveStudentByUserId(838L)).thenReturn(student(12766L, "Curl Stu"));
        when(jobApplicationMapper.selectLatestByStudentAndCompanyAndPosition(12766L, "Goldman Sachs", "Summer Analyst")).thenReturn(existing);
        when(jobApplicationMapper.updateJobApplicationStage(any(OsgJobApplication.class))).thenReturn(1);

        int rows = service.updateApplyStatus(501L, true, "2026-04-28", "官网投递", "重新投递", 838L);

        assertEquals(1, rows);
        ArgumentCaptor<OsgJobApplication> captor = ArgumentCaptor.forClass(OsgJobApplication.class);
        verify(jobApplicationMapper).updateJobApplicationStage(captor.capture());
        OsgJobApplication patch = captor.getValue();
        assertEquals(9101L, patch.getApplicationId());
        assertEquals("applied", patch.getCurrentStage());
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

    private Map<String, Object> manualPositionParams(String category, String title, String company, String location)
    {
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("category", category);
        params.put("title", title);
        params.put("company", company);
        params.put("location", location);
        params.put("recruitmentCycle", "2027");
        params.put("projectYear", "2027");
        params.put("companyType", "brokerage");
        params.put("region", "north-america");
        params.put("city", location);
        params.put("website", "https://example.com");
        params.put("link", "https://example.com/jobs");
        params.put("needCoaching", false);
        return params;
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

    private OsgPosition publicPosition(Long positionId, String company, String title, String location)
    {
        OsgPosition position = new OsgPosition();
        position.setPositionId(positionId);
        position.setCompanyName(company);
        position.setPositionName(title);
        position.setCity(location);
        position.setIndustry("ib");
        position.setPositionCategory("summer");
        position.setRecruitmentCycle("2027");
        position.setDisplayStatus("visible");
        position.setDisplayStartTime(Date.from(java.time.Instant.now().minus(1, ChronoUnit.DAYS)));
        position.setDisplayEndTime(Date.from(java.time.Instant.now().plus(30, ChronoUnit.DAYS)));
        return position;
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
