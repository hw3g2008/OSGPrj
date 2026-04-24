package com.ruoyi.web.controller.osg;

import java.util.Map;

import com.ruoyi.common.annotation.Excel;

/**
 * 求职总览导出行 DTO（admin + mentor 两端共用）。
 * 由 OsgAdminJobOverviewController / OsgMentorJobOverviewController 使用。
 */
class JobOverviewExportRow
{
    @Excel(name = "申请ID")
    private final Long applicationId;

    @Excel(name = "学员ID")
    private final Long studentId;

    @Excel(name = "学员姓名")
    private final String studentName;

    @Excel(name = "公司")
    private final String companyName;

    @Excel(name = "岗位")
    private final String positionName;

    @Excel(name = "当前阶段")
    private final String currentStage;

    @Excel(name = "面试时间", width = 20, dateFormat = "yyyy-MM-dd HH:mm:ss")
    private final Object interviewTime;

    @Excel(name = "分配状态")
    private final String assignedStatusLabel;

    @Excel(name = "数据视图")
    private final String datasetLabel;

    @Excel(name = "班主任")
    private final String leadMentorName;

    @Excel(name = "导师")
    private final String mentorName;

    @Excel(name = "辅导状态")
    private final String coachingStatus;

    @Excel(name = "需求导师数")
    private final Integer requestedMentorCount;

    @Excel(name = "意向导师")
    private final String preferredMentorNames;

    @Excel(name = "已用课时")
    private final Integer hoursUsed;

    @Excel(name = "反馈摘要")
    private final String feedbackSummary;

    @Excel(name = "申请时间", width = 20, dateFormat = "yyyy-MM-dd HH:mm:ss")
    private final Object submittedAt;

    private JobOverviewExportRow(Long applicationId, Long studentId, String studentName, String companyName,
                                 String positionName, String currentStage, Object interviewTime,
                                 String assignedStatusLabel, String datasetLabel, String leadMentorName,
                                 String mentorName, String coachingStatus, Integer requestedMentorCount,
                                 String preferredMentorNames, Integer hoursUsed, String feedbackSummary,
                                 Object submittedAt)
    {
        this.applicationId = applicationId;
        this.studentId = studentId;
        this.studentName = studentName;
        this.companyName = companyName;
        this.positionName = positionName;
        this.currentStage = currentStage;
        this.interviewTime = interviewTime;
        this.assignedStatusLabel = assignedStatusLabel;
        this.datasetLabel = datasetLabel;
        this.leadMentorName = leadMentorName;
        this.mentorName = mentorName;
        this.coachingStatus = coachingStatus;
        this.requestedMentorCount = requestedMentorCount;
        this.preferredMentorNames = preferredMentorNames;
        this.hoursUsed = hoursUsed;
        this.feedbackSummary = feedbackSummary;
        this.submittedAt = submittedAt;
    }

    static JobOverviewExportRow from(Map<String, Object> row)
    {
        return new JobOverviewExportRow(
            asLong(row.get("applicationId")),
            asLong(row.get("studentId")),
            asText(row.get("studentName")),
            asText(row.get("companyName")),
            asText(row.get("positionName")),
            asText(row.get("currentStage")),
            row.get("interviewTime"),
            asText(row.get("assignedStatusLabel")),
            asText(row.get("datasetLabel")),
            asText(row.get("leadMentorName")),
            asText(row.get("mentorName")),
            asText(row.get("coachingStatus")),
            asInteger(row.get("requestedMentorCount")),
            asText(row.get("preferredMentorNames")),
            asInteger(row.get("hoursUsed")),
            asText(row.get("feedbackSummary")),
            row.get("submittedAt")
        );
    }

    static JobOverviewExportRow fromMentorLegacy(Map<String, Object> row)
    {
        return new JobOverviewExportRow(
            asLong(row.get("id")),
            asLong(row.get("studentId")),
            asText(row.get("studentName")),
            asText(row.get("company")),
            asText(row.get("position")),
            asText(row.get("interviewStage")),
            row.get("interviewTime"),
            asText(row.get("coachingStatus")),
            "导师端",
            "",
            asText(row.get("mentorName")),
            asText(row.get("coachingStatus")),
            null,
            "",
            null,
            "",
            row.get("createTime")
        );
    }

    private static Long asLong(Object value)
    {
        return value instanceof Number number ? number.longValue() : null;
    }

    private static Integer asInteger(Object value)
    {
        return value instanceof Number number ? number.intValue() : null;
    }

    private static String asText(Object value)
    {
        return value == null ? null : String.valueOf(value);
    }
}
