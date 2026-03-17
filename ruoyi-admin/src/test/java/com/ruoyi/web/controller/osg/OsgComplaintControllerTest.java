package com.ruoyi.web.controller.osg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import com.ruoyi.common.core.domain.AjaxResult;

class OsgComplaintControllerTest
{
    @Test
    void complaintControllerSourceShouldExposeProtectedListAndStatusEndpoints() throws Exception
    {
        Path sourcePath = Path.of("src/main/java/com/ruoyi/web/controller/osg/OsgComplaintController.java");

        assertTrue(Files.exists(sourcePath));

        String source = Files.readString(sourcePath);
        assertTrue(source.contains("@RequestMapping(\"/admin/complaint\")"));
        assertTrue(source.contains("@GetMapping(\"/list\")"));
        assertTrue(source.contains("@PutMapping(\"/{complaintId}/status\")"));
        assertTrue(source.contains("@ss.hasPermi('admin:complaints:list')"));
    }

    @Test
    void listAndStatusChangeShouldPersistStateAndRejectRollbackFromCompleted() throws Exception
    {
        Class<?> complaintClass = Class.forName("com.ruoyi.system.domain.OsgComplaint");
        Object complaint = newComplaint(
            complaintClass,
            1L,
            "学员A",
            "complaint",
            "课程安排冲突",
            "pending",
            LocalDateTime.of(2026, 3, 14, 9, 0));
        Object suggestion = newComplaint(
            complaintClass,
            2L,
            "学员B",
            "suggestion",
            "增加案例复盘",
            "completed",
            LocalDateTime.of(2026, 3, 14, 10, 0));

        List<Object> rows = new ArrayList<>();
        rows.add(complaint);
        rows.add(suggestion);

        Class<?> mapperClass = Class.forName("com.ruoyi.system.mapper.OsgComplaintMapper");
        Object mapperProxy = Proxy.newProxyInstance(
            mapperClass.getClassLoader(),
            new Class<?>[] { mapperClass },
            (_proxy, method, args) -> switch (method.getName())
            {
                case "selectComplaintList" -> new ArrayList<>(rows);
                case "selectComplaintById" -> findComplaint(rows, (Long) args[0], complaintClass);
                case "updateComplaintStatus" -> 1;
                default -> null;
            }
        );

        Class<?> controllerClass = Class.forName("com.ruoyi.web.controller.osg.OsgComplaintController");
        Object controller = controllerClass.getDeclaredConstructor().newInstance();
        ReflectionTestUtils.setField(controller, "complaintMapper", mapperProxy);

        Method listMethod = controllerClass.getMethod("list");
        AjaxResult initial = (AjaxResult) listMethod.invoke(controller);
        assertEquals(200, initial.get("code"));
        @SuppressWarnings("unchecked")
        List<Object> initialRows = (List<Object>) initial.get("rows");
        assertEquals(2, initialRows.size());
        assertEquals("complaint", complaintClass.getMethod("getComplaintType").invoke(initialRows.get(0)));
        assertEquals("suggestion", complaintClass.getMethod("getComplaintType").invoke(initialRows.get(1)));

        Method changeStatusMethod = controllerClass.getMethod("changeStatus", Long.class, String.class);
        AjaxResult changeToProcessing = (AjaxResult) changeStatusMethod.invoke(controller, 1L, "processing");
        assertEquals(200, changeToProcessing.get("code"));

        AjaxResult afterChange = (AjaxResult) listMethod.invoke(controller);
        @SuppressWarnings("unchecked")
        List<Object> rowsAfterChange = (List<Object>) afterChange.get("rows");
        assertEquals("processing", complaintClass.getMethod("getProcessStatus").invoke(rowsAfterChange.get(0)));

        AjaxResult invalidRollback = (AjaxResult) changeStatusMethod.invoke(controller, 2L, "pending");
        assertEquals(500, invalidRollback.get("code"));
        assertEquals("已完成的投诉不可回退到待处理", invalidRollback.get("msg"));

        AjaxResult afterRollback = (AjaxResult) listMethod.invoke(controller);
        @SuppressWarnings("unchecked")
        List<Object> rowsAfterRollback = (List<Object>) afterRollback.get("rows");
        assertEquals("completed", complaintClass.getMethod("getProcessStatus").invoke(rowsAfterRollback.get(1)));
    }

    private static Object newComplaint(
        Class<?> complaintClass,
        Long complaintId,
        String studentName,
        String complaintType,
        String complaintTitle,
        String processStatus,
        LocalDateTime submitTime) throws Exception
    {
        Object complaint = complaintClass.getDeclaredConstructor().newInstance();
        complaintClass.getMethod("setComplaintId", Long.class).invoke(complaint, complaintId);
        complaintClass.getMethod("setStudentName", String.class).invoke(complaint, studentName);
        complaintClass.getMethod("setComplaintType", String.class).invoke(complaint, complaintType);
        complaintClass.getMethod("setComplaintTitle", String.class).invoke(complaint, complaintTitle);
        complaintClass.getMethod("setComplaintContent", String.class).invoke(complaint, complaintTitle + " 详情");
        complaintClass.getMethod("setProcessStatus", String.class).invoke(complaint, processStatus);
        complaintClass.getMethod("setSubmitTime", java.util.Date.class)
            .invoke(complaint, Timestamp.valueOf(submitTime));
        return complaint;
    }

    private static Object findComplaint(List<Object> rows, Long complaintId, Class<?> complaintClass) throws Exception
    {
        for (Object row : rows)
        {
            Long currentId = (Long) complaintClass.getMethod("getComplaintId").invoke(row);
            if (complaintId.equals(currentId))
            {
                return row;
            }
        }
        return null;
    }
}
