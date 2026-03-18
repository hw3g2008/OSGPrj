package com.ruoyi.web.controller.osg;

import org.junit.jupiter.api.Test;
import com.ruoyi.common.core.domain.AjaxResult;

import static org.junit.jupiter.api.Assertions.*;

class OsgDashboardControllerTest
{
    private final OsgDashboardController controller = new OsgDashboardController();

    @Test
    void testStatsSuccess()
    {
        AjaxResult result = controller.stats();
        assertEquals(200, result.get("code"));
        @SuppressWarnings("unchecked")
        java.util.Map<String, Object> data = (java.util.Map<String, Object>) result.get("data");
        assertNotNull(data);
        assertTrue(data.containsKey("studentCount"));
        assertTrue(data.containsKey("pendingSettlement"));
    }

    @Test
    void testTodosSuccess()
    {
        AjaxResult result = controller.todos();
        assertEquals(200, result.get("code"));
        @SuppressWarnings("unchecked")
        java.util.List<java.util.Map<String, Object>> data =
                (java.util.List<java.util.Map<String, Object>>) result.get("data");
        assertNotNull(data);
        assertFalse(data.isEmpty());
        assertTrue(data.get(0).containsKey("route"));
    }

    @Test
    void testActivitiesSuccess()
    {
        AjaxResult result = controller.activities();
        assertEquals(200, result.get("code"));
        @SuppressWarnings("unchecked")
        java.util.List<java.util.Map<String, Object>> data =
                (java.util.List<java.util.Map<String, Object>>) result.get("data");
        assertNotNull(data);
        assertFalse(data.isEmpty());
        assertTrue(data.get(0).containsKey("title"));
    }

    @Test
    void testStudentStatusSuccess()
    {
        AjaxResult result = controller.studentStatus();
        assertEquals(200, result.get("code"));
        @SuppressWarnings("unchecked")
        java.util.Map<String, Object> data = (java.util.Map<String, Object>) result.get("data");
        assertNotNull(data);
        assertTrue(data.containsKey("activeNormal"));
        assertTrue(data.containsKey("total"));
    }

    @Test
    void testMonthlySuccess()
    {
        AjaxResult result = controller.monthly();
        assertEquals(200, result.get("code"));
        @SuppressWarnings("unchecked")
        java.util.Map<String, Object> data = (java.util.Map<String, Object>) result.get("data");
        assertNotNull(data);
        assertTrue(data.containsKey("newStudents"));
        assertTrue(data.containsKey("settledAmount"));
    }
}
