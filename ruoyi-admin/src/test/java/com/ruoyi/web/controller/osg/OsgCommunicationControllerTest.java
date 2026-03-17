package com.ruoyi.web.controller.osg;

import static org.junit.jupiter.api.Assertions.assertEquals;
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

class OsgCommunicationControllerTest
{
    @Test
    void communicationControllerSourceShouldExposeProtectedListEndpoint() throws Exception
    {
        Path sourcePath = Path.of("src/main/java/com/ruoyi/web/controller/osg/OsgCommunicationController.java");

        assertTrue(Files.exists(sourcePath));

        String source = Files.readString(sourcePath);
        assertTrue(source.contains("@RequestMapping(\"/admin/communication\")"));
        assertTrue(source.contains("@GetMapping(\"/list\")"));
        assertTrue(source.contains("@ss.hasPermi('admin:communication:list')"));
    }

    @Test
    void listShouldReturnCommunicationAndNetworkingRowsByTab() throws Exception
    {
        Class<?> mapperClass = Class.forName("com.ruoyi.system.mapper.OsgCommunicationMapper");
        Object mapperProxy = Proxy.newProxyInstance(
            mapperClass.getClassLoader(),
            new Class<?>[] { mapperClass },
            (_proxy, method, args) -> switch (method.getName())
            {
                case "selectCommunicationList" -> {
                    Object query = args[0];
                    String tab = (String) query.getClass().getMethod("getTab").invoke(query);
                    if ("networking".equals(tab))
                    {
                        yield List.of(
                            Map.of(
                                "communicationId", 41L,
                                "tabType", "networking",
                                "studentName", "学员A",
                                "contactName", "Liam Chen",
                                "contactCompany", "Goldman Sachs",
                                "contactPosition", "Associate",
                                "networkingType", "Coffee Chat",
                                "statusLabel", "已完成"
                            )
                        );
                    }
                    yield List.of(
                        Map.of(
                            "communicationId", 31L,
                            "tabType", "record",
                            "studentName", "学员B",
                            "recorderName", "Jess",
                            "communicationMethod", "微信",
                            "followUpStatus", "待跟进"
                        )
                    );
                }
                default -> null;
            }
        );

        Class<?> controllerClass = Class.forName("com.ruoyi.web.controller.osg.OsgCommunicationController");
        Object controller = controllerClass.getDeclaredConstructor().newInstance();
        ReflectionTestUtils.setField(controller, "communicationMapper", mapperProxy);

        Method listMethod = Arrays.stream(controllerClass.getMethods())
            .filter(method -> method.getName().equals("list"))
            .findFirst()
            .orElseThrow();

        Object recordResultObject = switch (listMethod.getParameterCount())
        {
            case 1 -> listMethod.invoke(controller, "record");
            case 2 -> listMethod.invoke(controller, "record", null);
            default -> throw new IllegalStateException("Unexpected list signature");
        };
        AjaxResult recordResult = (AjaxResult) recordResultObject;
        assertEquals(200, recordResult.get("code"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> recordRows = (List<Map<String, Object>>) recordResult.get("rows");
        assertEquals("record", recordRows.get(0).get("tabType"));
        assertEquals("待跟进", recordRows.get(0).get("followUpStatus"));

        Object networkingResultObject = switch (listMethod.getParameterCount())
        {
            case 1 -> listMethod.invoke(controller, "networking");
            case 2 -> listMethod.invoke(controller, "networking", null);
            default -> throw new IllegalStateException("Unexpected list signature");
        };
        AjaxResult networkingResult = (AjaxResult) networkingResultObject;
        assertEquals(200, networkingResult.get("code"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> networkingRows = (List<Map<String, Object>>) networkingResult.get("rows");
        assertEquals("networking", networkingRows.get(0).get("tabType"));
        assertEquals("Goldman Sachs", networkingRows.get(0).get("contactCompany"));
    }
}
