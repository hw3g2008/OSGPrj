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
import com.ruoyi.system.domain.SysOperLog;

class OsgLogControllerTest
{
    @Test
    void logControllerSourceShouldExposeProtectedListAndExportEndpoints() throws Exception
    {
        Path sourcePath = Path.of("src/main/java/com/ruoyi/web/controller/osg/OsgLogController.java");

        assertTrue(Files.exists(sourcePath));

        String source = Files.readString(sourcePath);
        assertTrue(source.contains("@RequestMapping(\"/admin/log\")"));
        assertTrue(source.contains("@GetMapping(\"/list\")"));
        assertTrue(source.contains("@GetMapping(\"/export\")"));
        assertTrue(source.contains("@ss.hasPermi('admin:logs:list')"));
    }

    @Test
    void listAndExportShouldSurfaceRowsAndExportMetadata() throws Exception
    {
        List<SysOperLog> rows = new ArrayList<>();
        rows.add(newLog(11L, "admin", 1, 0, "登录", "127.0.0.1", LocalDateTime.of(2026, 3, 14, 9, 0)));
        rows.add(newLog(12L, "clerk", 1, 1, "新增岗位", "127.0.0.2", LocalDateTime.of(2026, 3, 14, 10, 30)));

        Class<?> serviceClass = Class.forName("com.ruoyi.system.service.ISysOperLogService");
        Object serviceProxy = Proxy.newProxyInstance(
            serviceClass.getClassLoader(),
            new Class<?>[] { serviceClass },
            (_proxy, method, _args) -> switch (method.getName())
            {
                case "selectOperLogList" -> new ArrayList<>(rows);
                default -> null;
            }
        );

        Class<?> controllerClass = Class.forName("com.ruoyi.web.controller.osg.OsgLogController");
        Object controller = controllerClass.getDeclaredConstructor().newInstance();
        ReflectionTestUtils.setField(controller, "operLogService", serviceProxy);

        Method listMethod = controllerClass.getMethod("list");
        AjaxResult listResult = (AjaxResult) listMethod.invoke(controller);
        assertEquals(200, listResult.get("code"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> responseRows = (List<Map<String, Object>>) listResult.get("rows");
        assertEquals(2, responseRows.size());
        assertEquals("admin", responseRows.get(0).get("operatorName"));
        assertEquals("登录", responseRows.get(0).get("operationType"));
        assertEquals("127.0.0.2", responseRows.get(1).get("ipAddress"));

        Method exportMethod = controllerClass.getMethod("export");
        AjaxResult exportResult = (AjaxResult) exportMethod.invoke(controller);
        assertEquals(200, exportResult.get("code"));
        assertEquals("操作日志.xlsx", exportResult.get("fileName"));
        assertEquals(2, exportResult.get("exportCount"));
    }

    private static SysOperLog newLog(
        Long operId,
        String operName,
        Integer operatorType,
        Integer businessType,
        String title,
        String operIp,
        LocalDateTime operTime)
    {
        SysOperLog operLog = new SysOperLog();
        operLog.setOperId(operId);
        operLog.setOperName(operName);
        operLog.setOperatorType(operatorType);
        operLog.setBusinessType(businessType);
        operLog.setTitle(title);
        operLog.setOperIp(operIp);
        operLog.setOperTime(Timestamp.valueOf(operTime));
        return operLog;
    }
}
