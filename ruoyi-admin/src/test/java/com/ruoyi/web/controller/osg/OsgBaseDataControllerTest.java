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

    @Test
    void testAddCreatesNewBaseDataRow()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "测试分类");
        body.put("category", "job");
        body.put("tab", "job_category");
        body.put("sort", 9);
        body.put("status", "0");

        AjaxResult result = controller.add(body);

        assertEquals(200, result.get("code"));
        TableDataInfo list = controller.list("测试分类", "job", "job_category");
        assertEquals(200, list.getCode());
        assertEquals(1, list.getRows().size());
        @SuppressWarnings("unchecked")
        Map<String, Object> row = (Map<String, Object>) list.getRows().get(0);
        assertEquals("测试分类", row.get("name"));
        assertEquals(9, row.get("sort"));
    }

    @Test
    void testEditUpdatesExistingBaseDataRow()
    {
        Map<String, Object> addBody = new HashMap<>();
        addBody.put("name", "待编辑分类");
        addBody.put("category", "job");
        addBody.put("tab", "job_category");
        addBody.put("sort", 3);
        addBody.put("status", "0");
        controller.add(addBody);

        TableDataInfo beforeEdit = controller.list("待编辑分类", "job", "job_category");
        @SuppressWarnings("unchecked")
        Map<String, Object> existing = (Map<String, Object>) beforeEdit.getRows().get(0);

        Map<String, Object> editBody = new HashMap<>();
        editBody.put("id", existing.get("id"));
        editBody.put("name", "已编辑分类");
        editBody.put("sort", 11);
        editBody.put("status", "1");

        AjaxResult result = controller.edit(editBody);

        assertEquals(200, result.get("code"));
        TableDataInfo afterEdit = controller.list("已编辑分类", "job", "job_category");
        assertEquals(1, afterEdit.getRows().size());
        @SuppressWarnings("unchecked")
        Map<String, Object> updated = (Map<String, Object>) afterEdit.getRows().get(0);
        assertEquals("已编辑分类", updated.get("name"));
        assertEquals(11, updated.get("sort"));
        assertEquals("1", updated.get("status"));
    }
}
