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
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import com.ruoyi.common.core.domain.AjaxResult;

class OsgMailJobControllerTest
{
    @Test
    void mailJobControllerSourceShouldExposeProtectedListAndCreateEndpoints() throws Exception
    {
        Path sourcePath = Path.of("src/main/java/com/ruoyi/web/controller/osg/OsgMailJobController.java");

        assertTrue(Files.exists(sourcePath));

        String source = Files.readString(sourcePath);
        assertTrue(source.contains("@RequestMapping(\"/admin/mailjob\")"));
        assertTrue(source.contains("@GetMapping(\"/list\")"));
        assertTrue(source.contains("@PostMapping"));
        assertTrue(source.contains("@ss.hasPermi('admin:mailjob:list')"));
    }

    @Test
    void listAndCreateShouldPersistRowsAndRejectMissingSmtp() throws Exception
    {
        List<Map<String, Object>> rows = new ArrayList<>();
        rows.add(Map.of(
            "jobId", 7L,
            "jobTitle", "春招投递提醒",
            "recipientGroup", "全部学员",
            "emailSubject", "春招材料更新",
            "smtpServerName", "Primary SMTP",
            "totalCount", 80,
            "pendingCount", 12,
            "successCount", 66,
            "failCount", 2,
            "createTime", Timestamp.valueOf(LocalDateTime.of(2026, 3, 14, 11, 0))
        ));

        Class<?> mapperClass = Class.forName("com.ruoyi.system.mapper.OsgMailJobMapper");
        Object mapperProxy = Proxy.newProxyInstance(
            mapperClass.getClassLoader(),
            new Class<?>[] { mapperClass },
            (_proxy, method, args) -> switch (method.getName())
            {
                case "selectMailJobList" -> new ArrayList<>(rows);
                case "insertMailJob" -> {
                    Object job = args[0];
                    Long jobId = (Long) job.getClass().getMethod("getJobId").invoke(job);
                    if (jobId == null)
                    {
                        job.getClass().getMethod("setJobId", Long.class).invoke(job, 8L);
                    }
                    rows.add(Map.of(
                        "jobId", job.getClass().getMethod("getJobId").invoke(job),
                        "jobTitle", job.getClass().getMethod("getJobTitle").invoke(job),
                        "recipientGroup", job.getClass().getMethod("getRecipientGroup").invoke(job),
                        "emailSubject", job.getClass().getMethod("getEmailSubject").invoke(job),
                        "smtpServerName", job.getClass().getMethod("getSmtpServerName").invoke(job),
                        "totalCount", job.getClass().getMethod("getTotalCount").invoke(job),
                        "pendingCount", job.getClass().getMethod("getPendingCount").invoke(job),
                        "successCount", job.getClass().getMethod("getSuccessCount").invoke(job),
                        "failCount", job.getClass().getMethod("getFailCount").invoke(job),
                        "createTime", job.getClass().getMethod("getCreateTime").invoke(job)
                    ));
                    yield 1;
                }
                default -> null;
            }
        );

        Class<?> controllerClass = Class.forName("com.ruoyi.web.controller.osg.OsgMailJobController");
        Object controller = controllerClass.getDeclaredConstructor().newInstance();
        ReflectionTestUtils.setField(controller, "mailJobMapper", mapperProxy);

        Method listMethod = controllerClass.getMethod("list");
        AjaxResult initial = (AjaxResult) listMethod.invoke(controller);
        assertEquals(200, initial.get("code"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> initialRows = (List<Map<String, Object>>) initial.get("rows");
        assertEquals(1, initialRows.size());
        assertEquals(80, initialRows.get(0).get("totalCount"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> smtpServers = (List<Map<String, Object>>) initial.get("smtpServers");
        assertEquals("Primary SMTP", smtpServers.get(0).get("serverName"));

        Class<?> jobClass = Class.forName("com.ruoyi.system.domain.OsgMailJob");
        Object invalidJob = jobClass.getDeclaredConstructor().newInstance();
        jobClass.getMethod("setJobTitle", String.class).invoke(invalidJob, "导师周报");
        jobClass.getMethod("setRecipientGroup", String.class).invoke(invalidJob, "全部导师");
        jobClass.getMethod("setEmailSubject", String.class).invoke(invalidJob, "导师周报提醒");
        jobClass.getMethod("setEmailContent", String.class).invoke(invalidJob, "请及时完成本周复盘");
        Method createMethod = controllerClass.getMethod("create", jobClass);
        AjaxResult invalidResult = (AjaxResult) createMethod.invoke(controller, invalidJob);
        assertEquals(500, invalidResult.get("code"));
        assertEquals("SMTP未配置，无法发送邮件任务", invalidResult.get("msg"));

        Object newJob = jobClass.getDeclaredConstructor().newInstance();
        jobClass.getMethod("setJobTitle", String.class).invoke(newJob, "导师周报");
        jobClass.getMethod("setRecipientGroup", String.class).invoke(newJob, "全部导师");
        jobClass.getMethod("setEmailSubject", String.class).invoke(newJob, "导师周报提醒");
        jobClass.getMethod("setEmailContent", String.class).invoke(newJob, "请及时完成本周复盘");
        jobClass.getMethod("setSmtpServerName", String.class).invoke(newJob, "Primary SMTP");
        jobClass.getMethod("setTotalCount", Integer.class).invoke(newJob, 40);
        jobClass.getMethod("setPendingCount", Integer.class).invoke(newJob, 40);
        jobClass.getMethod("setSuccessCount", Integer.class).invoke(newJob, 0);
        jobClass.getMethod("setFailCount", Integer.class).invoke(newJob, 0);
        jobClass.getMethod("setCreateTime", java.util.Date.class)
            .invoke(newJob, Timestamp.valueOf(LocalDateTime.of(2026, 3, 14, 18, 30)));

        AjaxResult createResult = (AjaxResult) createMethod.invoke(controller, newJob);
        assertEquals(200, createResult.get("code"));

        AjaxResult afterCreate = (AjaxResult) listMethod.invoke(controller);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rowsAfterCreate = (List<Map<String, Object>>) afterCreate.get("rows");
        assertEquals(2, rowsAfterCreate.size());
        assertEquals("导师周报", rowsAfterCreate.get(1).get("jobTitle"));
        assertEquals("Primary SMTP", rowsAfterCreate.get(1).get("smtpServerName"));
    }
    @Test
    void createShouldDefaultNullCountsToZeroAndSetCreateTime() throws Exception
    {
        List<Map<String, Object>> rows = new ArrayList<>();

        Class<?> mapperClass = Class.forName("com.ruoyi.system.mapper.OsgMailJobMapper");
        Object mapperProxy = Proxy.newProxyInstance(
            mapperClass.getClassLoader(),
            new Class<?>[] { mapperClass },
            (_proxy, method, args) -> switch (method.getName())
            {
                case "selectMailJobList" -> new ArrayList<>(rows);
                case "insertMailJob" -> {
                    Object job = args[0];
                    job.getClass().getMethod("setJobId", Long.class).invoke(job, 9L);
                    yield 1;
                }
                default -> null;
            }
        );

        Class<?> controllerClass = Class.forName("com.ruoyi.web.controller.osg.OsgMailJobController");
        Object controller = controllerClass.getDeclaredConstructor().newInstance();
        ReflectionTestUtils.setField(controller, "mailJobMapper", mapperProxy);

        Class<?> jobClass = Class.forName("com.ruoyi.system.domain.OsgMailJob");
        Object job = jobClass.getDeclaredConstructor().newInstance();
        jobClass.getMethod("setJobTitle", String.class).invoke(job, "Test Job");
        jobClass.getMethod("setRecipientGroup", String.class).invoke(job, "all");
        jobClass.getMethod("setEmailSubject", String.class).invoke(job, "Test");
        jobClass.getMethod("setEmailContent", String.class).invoke(job, "Test content");
        jobClass.getMethod("setSmtpServerName", String.class).invoke(job, "Primary SMTP");
        // Do NOT set totalCount, pendingCount, successCount, failCount, createTime - they should default

        java.lang.reflect.Method createMethod = controllerClass.getMethod("create", jobClass);
        AjaxResult result = (AjaxResult) createMethod.invoke(controller, job);
        assertEquals(200, result.get("code"));

        // Verify defaults were applied
        assertEquals(0, jobClass.getMethod("getTotalCount").invoke(job));
        assertEquals(0, jobClass.getMethod("getPendingCount").invoke(job));
        assertEquals(0, jobClass.getMethod("getSuccessCount").invoke(job));
        assertEquals(0, jobClass.getMethod("getFailCount").invoke(job));
        assertTrue(jobClass.getMethod("getCreateTime").invoke(job) != null);
    }

    @Test
    void createShouldRejectUnknownSmtpServer() throws Exception
    {
        Class<?> mapperClass = Class.forName("com.ruoyi.system.mapper.OsgMailJobMapper");
        Object mapperProxy = Proxy.newProxyInstance(
            mapperClass.getClassLoader(),
            new Class<?>[] { mapperClass },
            (_proxy, method, args) -> null
        );

        Class<?> controllerClass = Class.forName("com.ruoyi.web.controller.osg.OsgMailJobController");
        Object controller = controllerClass.getDeclaredConstructor().newInstance();
        ReflectionTestUtils.setField(controller, "mailJobMapper", mapperProxy);

        Class<?> jobClass = Class.forName("com.ruoyi.system.domain.OsgMailJob");
        Object job = jobClass.getDeclaredConstructor().newInstance();
        jobClass.getMethod("setJobTitle", String.class).invoke(job, "Test");
        jobClass.getMethod("setSmtpServerName", String.class).invoke(job, "Unknown SMTP");

        java.lang.reflect.Method createMethod = controllerClass.getMethod("create", jobClass);
        AjaxResult result = (AjaxResult) createMethod.invoke(controller, job);
        assertEquals(500, result.get("code"));
        assertEquals("SMTP未配置，无法发送邮件任务", result.get("msg"));
    }


}
