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

class OsgNoticeControllerTest
{
    @Test
    void noticeControllerSourceShouldExposeProtectedSendAndListEndpoints() throws Exception
    {
        Path sourcePath = Path.of("src/main/java/com/ruoyi/web/controller/osg/OsgNoticeController.java");

        assertTrue(Files.exists(sourcePath));

        String source = Files.readString(sourcePath);
        assertTrue(source.contains("@RequestMapping(\"/admin/notice\")"));
        assertTrue(source.contains("@GetMapping(\"/list\")"));
        assertTrue(source.contains("@PostMapping(\"/send\")"));
        assertTrue(source.contains("@ss.hasPermi('admin:notice:list')"));
    }

    @Test
    void listAndSendShouldPersistRowsAndRejectBlankFields() throws Exception
    {
        List<Map<String, Object>> rows = new ArrayList<>();
        rows.add(Map.of(
            "noticeId", 9L,
            "receiverType", "all_mentor",
            "receiverLabel", "全部导师",
            "noticeTitle", "周会提醒",
            "noticeContent", "请准时参加周会",
            "createTime", Timestamp.valueOf(LocalDateTime.of(2026, 3, 14, 10, 0))
        ));

        Class<?> mapperClass = Class.forName("com.ruoyi.system.mapper.OsgNoticeMapper");
        Object mapperProxy = Proxy.newProxyInstance(
            mapperClass.getClassLoader(),
            new Class<?>[] { mapperClass },
            (_proxy, method, args) -> switch (method.getName())
            {
                case "selectNoticeList" -> new ArrayList<>(rows);
                case "insertNotice" -> {
                    Object notice = args[0];
                    Long noticeId = (Long) notice.getClass().getMethod("getNoticeId").invoke(notice);
                    if (noticeId == null)
                    {
                        notice.getClass().getMethod("setNoticeId", Long.class).invoke(notice, 11L);
                    }
                    rows.add(Map.of(
                        "noticeId", notice.getClass().getMethod("getNoticeId").invoke(notice),
                        "receiverType", notice.getClass().getMethod("getReceiverType").invoke(notice),
                        "receiverLabel", notice.getClass().getMethod("getReceiverLabel").invoke(notice),
                        "noticeTitle", notice.getClass().getMethod("getNoticeTitle").invoke(notice),
                        "noticeContent", notice.getClass().getMethod("getNoticeContent").invoke(notice),
                        "createTime", notice.getClass().getMethod("getCreateTime").invoke(notice)
                    ));
                    yield 1;
                }
                default -> null;
            }
        );

        Class<?> controllerClass = Class.forName("com.ruoyi.web.controller.osg.OsgNoticeController");
        Object controller = controllerClass.getDeclaredConstructor().newInstance();
        ReflectionTestUtils.setField(controller, "noticeMapper", mapperProxy);

        Method listMethod = controllerClass.getMethod("list", String.class, String.class);
        AjaxResult initial = (AjaxResult) listMethod.invoke(controller, null, null);
        assertEquals(200, initial.get("code"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> initialRows = (List<Map<String, Object>>) initial.get("rows");
        assertEquals(1, initialRows.size());
        assertEquals("全部导师", initialRows.get(0).get("receiverLabel"));

        Class<?> noticeClass = Class.forName("com.ruoyi.system.domain.OsgNotice");
        Object blankNotice = noticeClass.getDeclaredConstructor().newInstance();
        noticeClass.getMethod("setReceiverType", String.class).invoke(blankNotice, "all_student");
        noticeClass.getMethod("setReceiverLabel", String.class).invoke(blankNotice, "全部学员");
        noticeClass.getMethod("setNoticeTitle", String.class).invoke(blankNotice, "");
        noticeClass.getMethod("setNoticeContent", String.class).invoke(blankNotice, "");
        Method sendMethod = controllerClass.getMethod("send", noticeClass);
        AjaxResult blankResult = (AjaxResult) sendMethod.invoke(controller, blankNotice);
        assertEquals(500, blankResult.get("code"));
        assertEquals("标题和内容不能为空", blankResult.get("msg"));

        Object newNotice = noticeClass.getDeclaredConstructor().newInstance();
        noticeClass.getMethod("setReceiverType", String.class).invoke(newNotice, "target_student");
        noticeClass.getMethod("setReceiverLabel", String.class).invoke(newNotice, "学员A");
        noticeClass.getMethod("setNoticeTitle", String.class).invoke(newNotice, "模拟面试安排");
        noticeClass.getMethod("setNoticeContent", String.class).invoke(newNotice, "请于周五完成模拟面试预约");
        noticeClass.getMethod("setCreateTime", java.util.Date.class)
            .invoke(newNotice, Timestamp.valueOf(LocalDateTime.of(2026, 3, 14, 18, 0)));

        AjaxResult sendResult = (AjaxResult) sendMethod.invoke(controller, newNotice);
        assertEquals(200, sendResult.get("code"));

        AjaxResult afterSend = (AjaxResult) listMethod.invoke(controller, null, null);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rowsAfterSend = (List<Map<String, Object>>) afterSend.get("rows");
        assertEquals(2, rowsAfterSend.size());
        assertEquals("模拟面试安排", rowsAfterSend.get(1).get("noticeTitle"));
        assertEquals("学员A", rowsAfterSend.get(1).get("receiverLabel"));
    }
    @Test
    void sendShouldRejectBlankContent() throws Exception
    {
        Class<?> mapperClass = Class.forName("com.ruoyi.system.mapper.OsgNoticeMapper");
        Object mapperProxy = Proxy.newProxyInstance(
            mapperClass.getClassLoader(),
            new Class<?>[] { mapperClass },
            (_proxy, method, args) -> null
        );

        Class<?> controllerClass = Class.forName("com.ruoyi.web.controller.osg.OsgNoticeController");
        Object controller = controllerClass.getDeclaredConstructor().newInstance();
        ReflectionTestUtils.setField(controller, "noticeMapper", mapperProxy);

        Class<?> noticeClass = Class.forName("com.ruoyi.system.domain.OsgNotice");
        Object notice = noticeClass.getDeclaredConstructor().newInstance();
        noticeClass.getMethod("setNoticeTitle", String.class).invoke(notice, "Valid Title");
        noticeClass.getMethod("setNoticeContent", String.class).invoke(notice, "");

        java.lang.reflect.Method sendMethod = controllerClass.getMethod("send", noticeClass);
        AjaxResult result = (AjaxResult) sendMethod.invoke(controller, notice);
        assertEquals(500, result.get("code"));
        assertEquals("标题和内容不能为空", result.get("msg"));
    }

    @Test
    void sendShouldSetCreateTimeWhenNull() throws Exception
    {
        List<Map<String, Object>> rows = new ArrayList<>();

        Class<?> mapperClass = Class.forName("com.ruoyi.system.mapper.OsgNoticeMapper");
        Object mapperProxy = Proxy.newProxyInstance(
            mapperClass.getClassLoader(),
            new Class<?>[] { mapperClass },
            (_proxy, method, args) -> switch (method.getName())
            {
                case "selectNoticeList" -> new ArrayList<>(rows);
                case "insertNotice" -> {
                    Object notice = args[0];
                    notice.getClass().getMethod("setNoticeId", Long.class).invoke(notice, 12L);
                    yield 1;
                }
                default -> null;
            }
        );

        Class<?> controllerClass = Class.forName("com.ruoyi.web.controller.osg.OsgNoticeController");
        Object controller = controllerClass.getDeclaredConstructor().newInstance();
        ReflectionTestUtils.setField(controller, "noticeMapper", mapperProxy);

        Class<?> noticeClass = Class.forName("com.ruoyi.system.domain.OsgNotice");
        Object notice = noticeClass.getDeclaredConstructor().newInstance();
        noticeClass.getMethod("setReceiverType", String.class).invoke(notice, "all_student");
        noticeClass.getMethod("setReceiverLabel", String.class).invoke(notice, "全部学员");
        noticeClass.getMethod("setNoticeTitle", String.class).invoke(notice, "Auto Time Notice");
        noticeClass.getMethod("setNoticeContent", String.class).invoke(notice, "Content here");
        // Do NOT set createTime

        java.lang.reflect.Method sendMethod = controllerClass.getMethod("send", noticeClass);
        AjaxResult result = (AjaxResult) sendMethod.invoke(controller, notice);
        assertEquals(200, result.get("code"));

        Object createTime = noticeClass.getMethod("getCreateTime").invoke(notice);
        assertTrue(createTime != null, "createTime should be auto-set when null");
    }


}
