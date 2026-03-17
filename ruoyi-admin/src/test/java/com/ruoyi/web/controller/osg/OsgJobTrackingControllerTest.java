package com.ruoyi.web.controller.osg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import com.ruoyi.common.core.domain.AjaxResult;

class OsgJobTrackingControllerTest
{
    @Test
    void jobTrackingControllerSourceShouldExposeProtectedListAndUpdateEndpoints() throws Exception
    {
        Path sourcePath = Path.of("src/main/java/com/ruoyi/web/controller/osg/OsgJobTrackingController.java");

        assertTrue(Files.exists(sourcePath));

        String source = Files.readString(sourcePath);
        assertTrue(source.contains("@RequestMapping(\"/admin/job-tracking\")"));
        assertTrue(source.contains("@GetMapping(\"/list\")"));
        assertTrue(source.contains("@PutMapping(\"/{applicationId}/update\")"));
        assertTrue(source.contains("@ss.hasPermi('admin:job-tracking:list')"));
    }

    @Test
    void listAndUpdateShouldReturnStatsAndPersistTrackingFields() throws Exception
    {
        Class<?> applicationClass = Class.forName("com.ruoyi.system.domain.OsgJobApplication");
        List<Object> rows = new ArrayList<>(List.of(
            newApplication(applicationClass, 1L, 101L, "Alice", "Jess", "Goldman Sachs", "Summer Analyst", "New York", "applied", null, null),
            newApplication(applicationClass, 2L, 102L, "Bob", "Amy", "McKinsey", "Business Analyst", "London", "first_round", "JT:{\"preferredMentor\":\"Jess\"}", hoursFromNow(48)),
            newApplication(applicationClass, 3L, 103L, "Cathy", "Jess", "Google", "Product Strategy", "Singapore", "offer", null, null),
            newApplication(applicationClass, 4L, 104L, "David", "Amy", "JP Morgan", "Markets Analyst", "Hong Kong", "rejected", null, null),
            newApplication(applicationClass, 5L, 101L, "Alice", "Jess", "Blackstone", "Private Equity Analyst", "New York", "applied", null, null)
        ));

        Class<?> mapperClass = Class.forName("com.ruoyi.system.mapper.OsgJobApplicationMapper");
        Object mapperProxy = Proxy.newProxyInstance(
            mapperClass.getClassLoader(),
            new Class<?>[] { mapperClass },
            (_proxy, method, args) -> switch (method.getName())
            {
                case "selectJobApplicationList" -> new ArrayList<>(rows);
                case "selectJobApplicationByApplicationId" -> findApplication(rows, (Long) args[0], applicationClass);
                case "updateJobApplicationStage" -> applyStageUpdate(rows, args[0], applicationClass);
                default -> null;
            }
        );

        Class<?> serviceClass = Class.forName("com.ruoyi.system.service.impl.OsgJobTrackingServiceImpl");
        Object service = serviceClass.getDeclaredConstructor().newInstance();
        ReflectionTestUtils.setField(service, "jobApplicationMapper", mapperProxy);

        Class<?> controllerClass = Class.forName("com.ruoyi.web.controller.osg.OsgJobTrackingController");
        Object controller = controllerClass.getDeclaredConstructor().newInstance();
        ReflectionTestUtils.setField(controller, "jobTrackingService", service);

        Method listMethod = controllerClass.getMethod("list", String.class, String.class, String.class, String.class, String.class);
        AjaxResult initial = (AjaxResult) listMethod.invoke(controller, null, null, null, null, null);
        assertEquals(200, initial.get("code"));

        @SuppressWarnings("unchecked")
        Map<String, Object> stats = (Map<String, Object>) initial.get("stats");
        assertNotNull(stats);
        assertEquals(4, stats.get("totalStudentCount"));
        assertEquals(2, stats.get("trackingCount"));
        assertEquals(1, stats.get("interviewingCount"));
        assertEquals(1, stats.get("offerCount"));
        assertEquals(1, stats.get("rejectedCount"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> initialRows = (List<Map<String, Object>>) initial.get("rows");
        Map<String, Object> firstInterviewRow = initialRows.stream()
            .filter(item -> Long.valueOf(2L).equals(item.get("applicationId")))
            .findFirst()
            .orElseThrow();
        assertEquals("interviewing", firstInterviewRow.get("trackingStatus"));
        assertEquals("Jess", firstInterviewRow.get("preferredMentor"));

        Method updateMethod = controllerClass.getMethod("update", Long.class, Map.class);
        AjaxResult updated = (AjaxResult) updateMethod.invoke(controller, 1L, Map.of(
            "trackingStatus", "interviewing",
            "interviewStage", "final",
            "interviewTime", "2026-03-20T14:30:00",
            "preferredMentor", "Jess",
            "excludedMentor", "Amy",
            "note", "需重点准备 valuation"
        ));
        assertEquals(200, updated.get("code"));
        assertEquals("final", updated.get("currentStage"));
        assertEquals("Jess", updated.get("preferredMentor"));
        assertEquals("Amy", updated.get("excludedMentor"));

        AjaxResult afterUpdate = (AjaxResult) listMethod.invoke(controller, null, null, "interviewing", null, "new york");
        assertEquals(200, afterUpdate.get("code"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> filteredRows = (List<Map<String, Object>>) afterUpdate.get("rows");
        assertEquals(1, filteredRows.size());
        Map<String, Object> updatedRow = filteredRows.stream()
            .filter(item -> Long.valueOf(1L).equals(item.get("applicationId")))
            .findFirst()
            .orElseThrow();
        assertEquals("interviewing", updatedRow.get("trackingStatus"));
        assertEquals("final", updatedRow.get("interviewStage"));
        assertEquals("Jess", updatedRow.get("preferredMentor"));
        assertEquals("Amy", updatedRow.get("excludedMentor"));
        assertEquals("需重点准备 valuation", updatedRow.get("note"));
    }

    private static Object newApplication(
        Class<?> applicationClass,
        Long applicationId,
        Long studentId,
        String studentName,
        String leadMentorName,
        String companyName,
        String positionName,
        String city,
        String currentStage,
        String remark,
        Timestamp interviewTime) throws Exception
    {
        Object row = applicationClass.getDeclaredConstructor().newInstance();
        applicationClass.getMethod("setApplicationId", Long.class).invoke(row, applicationId);
        applicationClass.getMethod("setStudentId", Long.class).invoke(row, studentId);
        applicationClass.getMethod("setStudentName", String.class).invoke(row, studentName);
        applicationClass.getMethod("setLeadMentorName", String.class).invoke(row, leadMentorName);
        applicationClass.getMethod("setCompanyName", String.class).invoke(row, companyName);
        applicationClass.getMethod("setPositionName", String.class).invoke(row, positionName);
        applicationClass.getMethod("setCity", String.class).invoke(row, city);
        applicationClass.getMethod("setCurrentStage", String.class).invoke(row, currentStage);
        applicationClass.getMethod("setSubmittedAt", java.util.Date.class)
            .invoke(row, Timestamp.valueOf(LocalDateTime.of(2026, 3, 14, 9, 0).plusHours(applicationId)));
        applicationClass.getMethod("setRemark", String.class).invoke(row, remark);
        applicationClass.getMethod("setInterviewTime", java.util.Date.class).invoke(row, interviewTime);
        return row;
    }

    private static Object findApplication(List<Object> rows, Long applicationId, Class<?> applicationClass) throws Exception
    {
        for (Object row : rows)
        {
            Long currentId = (Long) applicationClass.getMethod("getApplicationId").invoke(row);
            if (Objects.equals(applicationId, currentId))
            {
                return row;
            }
        }
        return null;
    }

    private static int applyStageUpdate(List<Object> rows, Object patch, Class<?> applicationClass) throws Exception
    {
        Long applicationId = (Long) applicationClass.getMethod("getApplicationId").invoke(patch);
        Object existing = findApplication(rows, applicationId, applicationClass);
        if (existing == null)
        {
            return 0;
        }

        Object currentStage = applicationClass.getMethod("getCurrentStage").invoke(patch);
        if (currentStage != null)
        {
            applicationClass.getMethod("setCurrentStage", String.class).invoke(existing, currentStage);
        }

        Object interviewTime = applicationClass.getMethod("getInterviewTime").invoke(patch);
        if (interviewTime != null)
        {
            applicationClass.getMethod("setInterviewTime", java.util.Date.class).invoke(existing, interviewTime);
        }

        Object remark = applicationClass.getMethod("getRemark").invoke(patch);
        if (remark != null)
        {
            applicationClass.getMethod("setRemark", String.class).invoke(existing, remark);
        }

        return 1;
    }

    private static Timestamp hoursFromNow(int hours)
    {
        return Timestamp.valueOf(LocalDateTime.of(2026, 3, 15, 9, 0).plusHours(hours));
    }
}
