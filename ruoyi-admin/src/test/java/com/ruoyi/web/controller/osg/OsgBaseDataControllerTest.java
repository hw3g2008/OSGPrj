package com.ruoyi.web.controller.osg;

import org.junit.jupiter.api.Test;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.core.domain.AjaxResult;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class OsgBaseDataControllerTest
{
    private final OsgBaseDataController controller = new OsgBaseDataController();

    @Test
    void testListReturnsRows()
    {
        TableDataInfo result = controller.list(null, null, null);
        assertEquals(200, result.getCode());
        assertNotNull(result.getRows());
        assertFalse(result.getRows().isEmpty());
        assertTrue(result.getTotal() > 0);
    }

    @Test
    void testListCanFilterByCategoryAndTab()
    {
        TableDataInfo result = controller.list(null, "job", "city");
        assertEquals(200, result.getCode());
        assertNotNull(result.getRows());
        assertFalse(result.getRows().isEmpty());
    }

    @Test
    void testChangeStatusWithInvalidBody()
    {
        AjaxResult result = controller.changeStatus(new HashMap<>());
        assertEquals(500, result.get("code"));
    }

    @Test
    void testChangeStatusSuccess()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("id", 1);
        body.put("status", "1");
        AjaxResult result = controller.changeStatus(body);
        assertEquals(200, result.get("code"));
    }
}
