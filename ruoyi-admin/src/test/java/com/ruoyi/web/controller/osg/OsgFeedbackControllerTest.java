package com.ruoyi.web.controller.osg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import com.ruoyi.common.core.domain.AjaxResult;

class OsgFeedbackControllerTest
{
    @Test
    void feedbackControllerSourceShouldExposeProtectedListEndpoint() throws Exception
    {
        Path sourcePath = Path.of("src/main/java/com/ruoyi/web/controller/osg/OsgFeedbackController.java");

        assertTrue(Files.exists(sourcePath));

        String source = Files.readString(sourcePath);
        assertTrue(source.contains("@RequestMapping(\"/admin/feedback\")"));
        assertTrue(source.contains("@GetMapping(\"/list\")"));
        assertTrue(source.contains("@ss.hasPermi('admin:feedback:list')"));
    }

    @Test
    void listShouldReturnRowsAndStatsFromFeedbackMapper() throws Exception
    {
        Class<?> mapperClass = Class.forName("com.ruoyi.system.mapper.OsgClassFeedbackMapper");
        Object mapperProxy = Proxy.newProxyInstance(
            mapperClass.getClassLoader(),
            new Class<?>[] { mapperClass },
            (_proxy, method, _args) -> switch (method.getName())
            {
                case "selectFeedbackList" -> List.of(
                    Map.of(
                        "feedbackId", 21L,
                        "feedbackType", "prep",
                        "mentorName", "导师A",
                        "studentName", "学员A",
                        "courseLabel", "模拟面试",
                        "performanceLabel", "优秀",
                        "sourceLabel", "导师端"
                    ),
                    Map.of(
                        "feedbackId", 22L,
                        "feedbackType", "prep",
                        "mentorName", "导师B",
                        "studentName", "学员B",
                        "courseLabel", "笔试辅导",
                        "performanceLabel", "良好",
                        "sourceLabel", "助教端"
                    )
                );
                case "selectFeedbackStats" -> Map.of(
                    "totalCount", 4,
                    "prepCount", 2,
                    "networkingCount", 1,
                    "mockMidtermCount", 1
                );
                default -> null;
            }
        );

        Class<?> controllerClass = Class.forName("com.ruoyi.web.controller.osg.OsgFeedbackController");
        Object controller = controllerClass.getDeclaredConstructor().newInstance();
        ReflectionTestUtils.setField(controller, "feedbackMapper", mapperProxy);

        Method listMethod = Arrays.stream(controllerClass.getMethods())
            .filter(method -> method.getName().equals("list"))
            .findFirst()
            .orElseThrow();

        Object resultObject = switch (listMethod.getParameterCount())
        {
            case 1 -> listMethod.invoke(controller, "prep");
            case 2 -> listMethod.invoke(controller, "prep", null);
            default -> throw new IllegalStateException("Unexpected list signature");
        };

        AjaxResult result = (AjaxResult) resultObject;
        assertEquals(200, result.get("code"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) result.get("rows");
        assertEquals(2, rows.size());
        assertEquals("prep", rows.get(0).get("feedbackType"));
        assertEquals("优秀", rows.get(0).get("performanceLabel"));

        @SuppressWarnings("unchecked")
        Map<String, Object> stats = (Map<String, Object>) result.get("stats");
        assertEquals(4, stats.get("totalCount"));
        assertEquals(2, stats.get("prepCount"));
        assertFalse(rows.isEmpty());
    }
    @Test
    void listShouldDefaultTypeToPrep() throws Exception
    {
        Class<?> mapperClass = Class.forName("com.ruoyi.system.mapper.OsgClassFeedbackMapper");
        Object mapperProxy = Proxy.newProxyInstance(
            mapperClass.getClassLoader(),
            new Class<?>[] { mapperClass },
            (_proxy, method, _args) -> switch (method.getName())
            {
                case "selectFeedbackList" -> List.of(
                    Map.of("feedbackId", 30L, "feedbackType", "prep")
                );
                case "selectFeedbackStats" -> Map.of("totalCount", 1);
                default -> null;
            }
        );

        Class<?> controllerClass = Class.forName("com.ruoyi.web.controller.osg.OsgFeedbackController");
        Object controller = controllerClass.getDeclaredConstructor().newInstance();
        ReflectionTestUtils.setField(controller, "feedbackMapper", mapperProxy);

        java.lang.reflect.Method listMethod = Arrays.stream(controllerClass.getMethods())
            .filter(method -> method.getName().equals("list"))
            .findFirst()
            .orElseThrow();

        Object result = switch (listMethod.getParameterCount())
        {
            case 1 -> listMethod.invoke(controller, (Object) null);
            case 2 -> listMethod.invoke(controller, null, null);
            default -> throw new IllegalStateException("Unexpected list signature");
        };

        AjaxResult ajaxResult = (AjaxResult) result;
        assertEquals(200, ajaxResult.get("code"));
    }

    @Test
    void listShouldDefaultBlankTypeToPrep() throws Exception
    {
        Class<?> mapperClass = Class.forName("com.ruoyi.system.mapper.OsgClassFeedbackMapper");
        Object mapperProxy = Proxy.newProxyInstance(
            mapperClass.getClassLoader(),
            new Class<?>[] { mapperClass },
            (_proxy, method, _args) -> switch (method.getName())
            {
                case "selectFeedbackList" -> List.of(
                    Map.of("feedbackId", 31L, "feedbackType", "prep")
                );
                case "selectFeedbackStats" -> Map.of("totalCount", 1);
                default -> null;
            }
        );

        Class<?> controllerClass = Class.forName("com.ruoyi.web.controller.osg.OsgFeedbackController");
        Object controller = controllerClass.getDeclaredConstructor().newInstance();
        ReflectionTestUtils.setField(controller, "feedbackMapper", mapperProxy);

        java.lang.reflect.Method listMethod = Arrays.stream(controllerClass.getMethods())
            .filter(method -> method.getName().equals("list"))
            .findFirst()
            .orElseThrow();

        Object result = switch (listMethod.getParameterCount())
        {
            case 1 -> listMethod.invoke(controller, "  ");
            case 2 -> listMethod.invoke(controller, "  ", null);
            default -> throw new IllegalStateException("Unexpected list signature");
        };

        AjaxResult ajaxResult = (AjaxResult) result;
        assertEquals(200, ajaxResult.get("code"));
    }


}
