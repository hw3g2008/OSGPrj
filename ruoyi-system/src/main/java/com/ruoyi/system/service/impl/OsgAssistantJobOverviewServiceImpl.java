package com.ruoyi.system.service.impl;

import java.util.Comparator;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.ruoyi.system.domain.OsgJobApplication;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.OsgJobApplicationMapper;
import com.ruoyi.system.mapper.OsgStudentMapper;
import com.ruoyi.system.service.IOsgAssistantJobOverviewService;

@Service
public class OsgAssistantJobOverviewServiceImpl implements IOsgAssistantJobOverviewService
{
    @Autowired
    private OsgStudentMapper studentMapper;

    @Autowired
    private OsgJobApplicationMapper jobApplicationMapper;

    @Override
    public List<Map<String, Object>> selectOverviewList(OsgJobApplication query, Long currentUserId)
    {
        List<OsgStudent> students = studentMapper.selectStudentList(buildStudentQuery(currentUserId));
        if (students.isEmpty())
        {
            return List.of();
        }

        List<Long> studentIds = students.stream()
            .map(OsgStudent::getStudentId)
            .toList();

        List<OsgJobApplication> applications = jobApplicationMapper.selectByStudentIds(studentIds);
        if (query != null)
        {
            applications = filterApplications(applications, query);
        }

        return applications.stream()
            .sorted(Comparator.comparing(OsgJobApplication::getSubmittedAt, Comparator.nullsLast(Date::compareTo)).reversed())
            .map(this::toOverviewRow)
            .toList();
    }

    @Override
    public Map<String, Object> selectOverviewDetail(Long applicationId, Long currentUserId)
    {
        OsgJobApplication application = jobApplicationMapper.selectJobApplicationByApplicationId(applicationId);
        if (application == null)
        {
            return Map.of();
        }

        if (!isAssistantOfStudent(application.getStudentId(), currentUserId))
        {
            return Map.of();
        }

        return toOverviewRow(application);
    }

    @Override
    public List<Map<String, Object>> selectCalendarEvents(Long currentUserId)
    {
        List<OsgStudent> students = studentMapper.selectStudentList(buildStudentQuery(currentUserId));
        if (students.isEmpty())
        {
            return List.of();
        }

        List<Long> studentIds = students.stream()
            .map(OsgStudent::getStudentId)
            .toList();

        List<OsgJobApplication> applications = jobApplicationMapper.selectByStudentIds(studentIds);

        return applications.stream()
            .filter(app -> app.getInterviewTime() != null)
            .sorted(Comparator.comparing(OsgJobApplication::getInterviewTime, Comparator.nullsLast(Date::compareTo)))
            .map(this::toCalendarRow)
            .toList();
    }

    private OsgStudent buildStudentQuery(Long currentUserId)
    {
        OsgStudent student = new OsgStudent();
        student.setAssistantId(currentUserId);
        return student;
    }

    private boolean isAssistantOfStudent(Long studentId, Long currentUserId)
    {
        if (studentId == null)
        {
            return false;
        }
        List<OsgStudent> students = studentMapper.selectStudentList(buildStudentQuery(currentUserId));
        return students.stream().anyMatch(s -> studentId.equals(s.getStudentId()));
    }

    private List<OsgJobApplication> filterApplications(List<OsgJobApplication> applications, OsgJobApplication query)
    {
        return applications.stream().filter(app -> {
            if (query.getStudentName() != null && !query.getStudentName().isBlank())
            {
                String name = app.getStudentName();
                if (name == null || !name.toLowerCase().contains(query.getStudentName().toLowerCase()))
                {
                    return false;
                }
            }
            if (query.getCompanyName() != null && !query.getCompanyName().isBlank())
            {
                String company = app.getCompanyName();
                if (company == null || !company.toLowerCase().contains(query.getCompanyName().toLowerCase()))
                {
                    return false;
                }
            }
            if (query.getCurrentStage() != null && !query.getCurrentStage().isBlank())
            {
                String stage = app.getCurrentStage();
                if (stage == null || !stage.equalsIgnoreCase(query.getCurrentStage()))
                {
                    return false;
                }
            }
            return true;
        }).toList();
    }

    private Map<String, Object> toOverviewRow(OsgJobApplication app)
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", app.getApplicationId());
        row.put("studentId", app.getStudentId());
        row.put("studentName", app.getStudentName());
        row.put("company", app.getCompanyName());
        row.put("position", app.getPositionName());
        row.put("location", firstText(app.getCity(), app.getRegion()));
        row.put("interviewStage", app.getCurrentStage());
        row.put("interviewTime", app.getInterviewTime());
        row.put("coachingStatus", toLegacyCoachingStatus(app.getCoachingStatus()));
        row.put("result", toLegacyResult(app.getCurrentStage()));
        row.put("createTime", app.getSubmittedAt());
        return row;
    }

    private Map<String, Object> toCalendarRow(OsgJobApplication app)
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", app.getApplicationId());
        row.put("studentName", app.getStudentName());
        row.put("company", app.getCompanyName());
        row.put("position", app.getPositionName());
        row.put("interviewTime", app.getInterviewTime());
        row.put("stage", app.getCurrentStage());
        row.put("coachingStatus", toLegacyCoachingStatus(app.getCoachingStatus()));
        row.put("result", toLegacyResult(app.getCurrentStage()));
        return row;
    }

    private String toLegacyCoachingStatus(String coachingStatus)
    {
        if (coachingStatus == null)
        {
            return "none";
        }
        String normalized = coachingStatus.trim().toLowerCase();
        if (normalized.isEmpty() || "new".equals(normalized) || "none".equals(normalized) || "待审批".equals(coachingStatus) || "pending".equals(normalized))
        {
            return "new";
        }
        if ("辅导中".equals(coachingStatus) || "coaching".equals(normalized))
        {
            return "coaching";
        }
        return "none";
    }

    private String toLegacyResult(String currentStage)
    {
        if (currentStage == null)
        {
            return null;
        }
        String normalized = currentStage.trim().toLowerCase();
        if ("offer".equals(normalized))
        {
            return "offer";
        }
        if ("rejected".equals(normalized) || "拒绝".equals(currentStage))
        {
            return "rejected";
        }
        if ("withdrawn".equals(normalized) || "withdraw".equals(normalized))
        {
            return "cancelled";
        }
        return null;
    }

    private String firstText(String primary, String fallback)
    {
        if (primary != null && !primary.isBlank())
        {
            return primary;
        }
        return fallback != null ? fallback : "";
    }
}
