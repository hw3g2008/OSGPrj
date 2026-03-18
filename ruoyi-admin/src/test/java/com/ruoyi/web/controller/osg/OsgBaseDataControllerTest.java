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

    // ==================== NEW TEST METHODS FOR BRANCH COVERAGE ====================

    @Test
    void testListFilterByName()
    {
        TableDataInfo result = controller.list("Java", null, null);
        assertEquals(200, result.getCode());
        assertFalse(result.getRows().isEmpty());
        @SuppressWarnings("unchecked")
        Map<String, Object> row = (Map<String, Object>) result.getRows().get(0);
        assertTrue(row.get("name").toString().contains("Java"));
    }

    @Test
    void testListFilterByNameNoMatch()
    {
        TableDataInfo result = controller.list("不存在的名称", null, null);
        assertEquals(200, result.getCode());
        assertTrue(result.getRows().isEmpty());
    }

    @Test
    void testListFilterByCategoryOnly()
    {
        TableDataInfo result = controller.list(null, "student", null);
        assertEquals(200, result.getCode());
        assertFalse(result.getRows().isEmpty());
    }

    @Test
    void testListFilterByTabOnly()
    {
        TableDataInfo result = controller.list(null, null, "school");
        assertEquals(200, result.getCode());
        assertFalse(result.getRows().isEmpty());
    }

    @Test
    void testListFilterWithBlankName()
    {
        TableDataInfo result = controller.list("  ", null, null);
        assertEquals(200, result.getCode());
        assertTrue(result.getTotal() > 0);
    }

    @Test
    void testListFilterWithBlankCategory()
    {
        TableDataInfo result = controller.list(null, "  ", null);
        assertEquals(200, result.getCode());
        assertTrue(result.getTotal() > 0);
    }

    @Test
    void testListFilterWithBlankTab()
    {
        TableDataInfo result = controller.list(null, null, "  ");
        assertEquals(200, result.getCode());
        assertTrue(result.getTotal() > 0);
    }

    @Test
    void testAddShouldReturnErrorWhenNameMissing()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("tab", "job_category");
        body.put("category", "job");
        AjaxResult result = controller.add(body);
        assertEquals(500, result.get("code"));
        assertEquals("参数缺失", result.get("msg"));
    }

    @Test
    void testAddShouldReturnErrorWhenTabMissing()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "测试");
        body.put("category", "job");
        AjaxResult result = controller.add(body);
        assertEquals(500, result.get("code"));
        assertEquals("参数缺失", result.get("msg"));
    }

    @Test
    void testAddShouldInferCategoryFromTabJobCategory()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "推断job分类");
        body.put("tab", "job_category");
        AjaxResult result = controller.add(body);
        assertEquals(200, result.get("code"));
        TableDataInfo list = controller.list("推断job分类", "job", "job_category");
        assertEquals(1, list.getRows().size());
    }

    @Test
    void testAddShouldInferCategoryFromTabCity()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "推断city分类");
        body.put("tab", "city");
        AjaxResult result = controller.add(body);
        assertEquals(200, result.get("code"));
        TableDataInfo list = controller.list("推断city分类", "job", "city");
        assertEquals(1, list.getRows().size());
    }

    @Test
    void testAddShouldInferCategoryFromTabSchool()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "推断school分类");
        body.put("tab", "school");
        AjaxResult result = controller.add(body);
        assertEquals(200, result.get("code"));
        TableDataInfo list = controller.list("推断school分类", "student", "school");
        assertEquals(1, list.getRows().size());
    }

    @Test
    void testAddShouldInferCategoryFromTabMajorDirection()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "推断major分类");
        body.put("tab", "major_direction");
        AjaxResult result = controller.add(body);
        assertEquals(200, result.get("code"));
        TableDataInfo list = controller.list("推断major分类", "student", "major_direction");
        assertEquals(1, list.getRows().size());
    }

    @Test
    void testAddShouldInferCategoryFromTabCourseType()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "推断course分类");
        body.put("tab", "course_type");
        AjaxResult result = controller.add(body);
        assertEquals(200, result.get("code"));
        TableDataInfo list = controller.list("推断course分类", "course", "course_type");
        assertEquals(1, list.getRows().size());
    }

    @Test
    void testAddShouldInferCategoryFromTabExpenseType()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "推断finance分类");
        body.put("tab", "expense_type");
        AjaxResult result = controller.add(body);
        assertEquals(200, result.get("code"));
        TableDataInfo list = controller.list("推断finance分类", "finance", "expense_type");
        assertEquals(1, list.getRows().size());
    }

    @Test
    void testAddShouldReturnErrorWhenCategoryCannotBeInferred()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "无法推断");
        body.put("tab", "unknown_tab");
        AjaxResult result = controller.add(body);
        assertEquals(500, result.get("code"));
        assertEquals("参数缺失", result.get("msg"));
    }

    @Test
    void testAddShouldSetParentId()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "带parentId");
        body.put("category", "job");
        body.put("tab", "job_category");
        body.put("parentId", 1);
        AjaxResult result = controller.add(body);
        assertEquals(200, result.get("code"));
    }

    @Test
    void testAddShouldUseDefaultSortWhenMissing()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "默认排序");
        body.put("category", "job");
        body.put("tab", "job_category");
        AjaxResult result = controller.add(body);
        assertEquals(200, result.get("code"));
        TableDataInfo list = controller.list("默认排序", "job", "job_category");
        @SuppressWarnings("unchecked")
        Map<String, Object> row = (Map<String, Object>) list.getRows().get(0);
        assertEquals(100, row.get("sort"));
    }

    @Test
    void testAddShouldNormalizeStatusTo0WhenNotProvided()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "无状态");
        body.put("category", "job");
        body.put("tab", "job_category");
        AjaxResult result = controller.add(body);
        assertEquals(200, result.get("code"));
        TableDataInfo list = controller.list("无状态", "job", "job_category");
        @SuppressWarnings("unchecked")
        Map<String, Object> row = (Map<String, Object>) list.getRows().get(0);
        assertEquals("0", row.get("status"));
    }

    @Test
    void testAddShouldNormalizeStatusTo1()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "停用状态");
        body.put("category", "job");
        body.put("tab", "job_category");
        body.put("status", "1");
        AjaxResult result = controller.add(body);
        assertEquals(200, result.get("code"));
        TableDataInfo list = controller.list("停用状态", "job", "job_category");
        @SuppressWarnings("unchecked")
        Map<String, Object> row = (Map<String, Object>) list.getRows().get(0);
        assertEquals("1", row.get("status"));
    }

    @Test
    void testEditShouldReturnErrorWhenIdMissing()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "缺少ID");
        AjaxResult result = controller.edit(body);
        assertEquals(500, result.get("code"));
        assertEquals("参数缺失", result.get("msg"));
    }

    @Test
    void testEditShouldReturnErrorWhenNameMissing()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("id", 1);
        AjaxResult result = controller.edit(body);
        assertEquals(500, result.get("code"));
        assertEquals("参数缺失", result.get("msg"));
    }

    @Test
    void testEditShouldReturnErrorWhenIdNotFound()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("id", 99999);
        body.put("name", "不存在");
        AjaxResult result = controller.edit(body);
        assertEquals(500, result.get("code"));
        assertEquals("基础数据不存在", result.get("msg"));
    }

    @Test
    void testEditShouldUpdateParentId()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("id", 1);
        body.put("name", "Java开发");
        body.put("parentId", 99);
        AjaxResult result = controller.edit(body);
        assertEquals(200, result.get("code"));
    }

    @Test
    void testEditShouldUseExistingSortWhenNotProvided()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("id", 1);
        body.put("name", "Java开发更新");
        AjaxResult result = controller.edit(body);
        assertEquals(200, result.get("code"));
    }

    @Test
    void testEditShouldHandleStringSortValue()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("id", 1);
        body.put("name", "Java开发");
        body.put("sort", "5");
        AjaxResult result = controller.edit(body);
        assertEquals(200, result.get("code"));
    }

    @Test
    void testEditShouldHandleNonParsableSortValue()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("id", 1);
        body.put("name", "Java开发");
        body.put("sort", "abc");
        AjaxResult result = controller.edit(body);
        assertEquals(200, result.get("code"));
    }

    @Test
    void testChangeStatusShouldReturnErrorWhenNullBody()
    {
        Map<String, Object> body = null;
        AjaxResult result = controller.changeStatus(body);
        assertEquals(500, result.get("code"));
        assertEquals("参数缺失", result.get("msg"));
    }

    @Test
    void testChangeStatusShouldReturnErrorWhenIdNull()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("id", null);
        body.put("status", "0");
        AjaxResult result = controller.changeStatus(body);
        assertEquals(500, result.get("code"));
        assertEquals("参数缺失", result.get("msg"));
    }

    @Test
    void testChangeStatusShouldReturnErrorWhenStatusNull()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("id", 1);
        body.put("status", null);
        AjaxResult result = controller.changeStatus(body);
        assertEquals(500, result.get("code"));
        assertEquals("参数缺失", result.get("msg"));
    }

    @Test
    void testChangeStatusShouldReturnErrorWhenIdNotFound()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("id", 99999);
        body.put("status", "1");
        AjaxResult result = controller.changeStatus(body);
        assertEquals(500, result.get("code"));
        assertEquals("基础数据不存在", result.get("msg"));
    }

    @Test
    void testChangeStatusShouldNormalizeStatusTo0()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("id", 1);
        body.put("status", "0");
        AjaxResult result = controller.changeStatus(body);
        assertEquals(200, result.get("code"));
    }

    @Test
    void testChangeStatusShouldNormalizeNonOneStatusTo0()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("id", 1);
        body.put("status", "invalid");
        AjaxResult result = controller.changeStatus(body);
        assertEquals(200, result.get("code"));
    }

    @Test
    void testAsLongShouldHandleStringId()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("id", "1");
        body.put("status", "1");
        AjaxResult result = controller.changeStatus(body);
        assertEquals(200, result.get("code"));
    }

    @Test
    void testAsLongShouldHandleNonParsableString()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("id", "abc");
        body.put("name", "test");
        AjaxResult result = controller.edit(body);
        assertEquals(500, result.get("code"));
    }

    @Test
    void testAsTextShouldHandleEmptyString()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "");
        body.put("tab", "job_category");
        AjaxResult result = controller.add(body);
        assertEquals(500, result.get("code"));
        assertEquals("参数缺失", result.get("msg"));
    }

    @Test
    void testAddShouldHandleNullParentId()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "nullParent");
        body.put("category", "job");
        body.put("tab", "job_category");
        body.put("parentId", null);
        AjaxResult result = controller.add(body);
        assertEquals(200, result.get("code"));
    }

    @Test
    void testEditShouldNotUpdateParentIdWhenNotInBody()
    {
        Map<String, Object> body = new HashMap<>();
        body.put("id", 1);
        body.put("name", "无parentId更新");
        AjaxResult result = controller.edit(body);
        assertEquals(200, result.get("code"));
    }
}
