package com.ruoyi.web.controller.osg;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.entity.SysDictData;
import com.ruoyi.common.core.domain.entity.SysDictType;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.system.service.IOsgAdminDictRegistryService;
import com.ruoyi.system.service.ISysDictDataService;
import com.ruoyi.system.service.ISysDictTypeService;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OsgBaseDataControllerTest
{
    private OsgBaseDataController controller;
    private InMemoryDictDataService dictDataService;

    @BeforeEach
    void setUp()
    {
        dictDataService = new InMemoryDictDataService(seedData());
        controller = new OsgBaseDataController(
            dictDataService,
            new StubDictTypeService(seedTypes()),
            new StubRegistryService()
        );
    }

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
        assertEquals(9L, row.get("sort"));
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
        assertEquals(11L, updated.get("sort"));
        assertEquals("1", updated.get("status"));
    }

    @Test
    void testCategoriesReturnsRegistryPayload()
    {
        AjaxResult result = controller.categories();
        assertEquals(200, result.get("code"));
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) result.get("data");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> categories = (List<Map<String, Object>>) data.get("categories");
        assertFalse(categories.isEmpty());
        assertEquals("job", categories.get(0).get("key"));
    }

    private List<SysDictData> seedData()
    {
        return List.of(
            dict(1L, "osg_job_category", "java_dev", "Java开发", "0", 1L),
            dict(2L, "osg_job_category", "risk", "风控分析", "0", 2L),
            dict(3L, "osg_city", "beijing", "北京", "0", 1L),
            dict(4L, "osg_city", "shanghai", "上海", "0", 2L),
            dict(5L, "osg_school", "tsinghua", "清华大学", "0", 1L),
            dict(6L, "osg_major_direction", "cs", "计算机", "0", 1L),
            dict(7L, "osg_course_type", "practical", "实训课", "0", 1L),
            dict(8L, "osg_expense_type", "travel", "交通报销", "1", 1L)
        );
    }

    private List<SysDictType> seedTypes()
    {
        return List.of(
            dictType(1L, "岗位分类", "osg_job_category", "0"),
            dictType(2L, "地区/城市", "osg_city", "0"),
            dictType(3L, "学校", "osg_school", "0"),
            dictType(4L, "主攻方向", "osg_major_direction", "0"),
            dictType(5L, "课程类型", "osg_course_type", "0"),
            dictType(6L, "报销类型", "osg_expense_type", "0")
        );
    }

    private SysDictData dict(Long code, String type, String value, String label, String status, Long sort)
    {
        SysDictData item = new SysDictData();
        item.setDictCode(code);
        item.setDictType(type);
        item.setDictValue(value);
        item.setDictLabel(label);
        item.setStatus(status);
        item.setDictSort(sort);
        return item;
    }

    private SysDictType dictType(Long id, String name, String type, String status)
    {
        SysDictType item = new SysDictType();
        item.setDictId(id);
        item.setDictName(name);
        item.setDictType(type);
        item.setStatus(status);
        return item;
    }

    private static final class InMemoryDictDataService implements ISysDictDataService
    {
        private final List<SysDictData> store = new ArrayList<>();
        private long nextId;

        private InMemoryDictDataService(List<SysDictData> seed)
        {
            store.addAll(seed);
            nextId = seed.stream().map(SysDictData::getDictCode).max(Long::compareTo).orElse(0L) + 1;
        }

        @Override
        public List<SysDictData> selectDictDataList(SysDictData dictData)
        {
            return store.stream()
                .filter(item -> dictData.getDictType() == null || dictData.getDictType().equals(item.getDictType()))
                .filter(item -> dictData.getDictLabel() == null || item.getDictLabel().contains(dictData.getDictLabel()))
                .filter(item -> dictData.getStatus() == null || dictData.getStatus().equals(item.getStatus()))
                .toList();
        }

        @Override
        public String selectDictLabel(String dictType, String dictValue)
        {
            return store.stream()
                .filter(item -> dictType.equals(item.getDictType()) && dictValue.equals(item.getDictValue()))
                .map(SysDictData::getDictLabel)
                .findFirst()
                .orElse(null);
        }

        @Override
        public SysDictData selectDictDataById(Long dictCode)
        {
            return store.stream().filter(item -> dictCode.equals(item.getDictCode())).findFirst().orElse(null);
        }

        @Override
        public void deleteDictDataByIds(Long[] dictCodes)
        {
            store.removeIf(item -> List.of(dictCodes).contains(item.getDictCode()));
        }

        @Override
        public int insertDictData(SysDictData dictData)
        {
            dictData.setDictCode(nextId++);
            store.add(dictData);
            return 1;
        }

        @Override
        public int updateDictData(SysDictData dictData)
        {
            deleteDictDataByIds(new Long[] { dictData.getDictCode() });
            store.add(dictData);
            return 1;
        }
    }

    private static final class StubDictTypeService implements ISysDictTypeService
    {
        private final List<SysDictType> types;

        private StubDictTypeService(List<SysDictType> types)
        {
            this.types = types;
        }

        @Override
        public List<SysDictType> selectDictTypeList(SysDictType dictType)
        {
            return types.stream()
                .filter(item -> dictType.getStatus() == null || dictType.getStatus().equals(item.getStatus()))
                .filter(item -> dictType.getDictType() == null || item.getDictType().contains(dictType.getDictType()))
                .toList();
        }

        @Override
        public List<SysDictType> selectDictTypeAll()
        {
            return types;
        }

        @Override
        public List<SysDictData> selectDictDataByType(String dictType)
        {
            return null;
        }

        @Override
        public SysDictType selectDictTypeById(Long dictId)
        {
            return types.stream().filter(item -> dictId.equals(item.getDictId())).findFirst().orElse(null);
        }

        @Override
        public SysDictType selectDictTypeByType(String dictType)
        {
            return types.stream().filter(item -> dictType.equals(item.getDictType())).findFirst().orElse(null);
        }

        @Override
        public void deleteDictTypeByIds(Long[] dictIds)
        {
        }

        @Override
        public void loadingDictCache()
        {
        }

        @Override
        public void clearDictCache()
        {
        }

        @Override
        public void resetDictCache()
        {
        }

        @Override
        public int insertDictType(SysDictType dictType)
        {
            return 0;
        }

        @Override
        public int updateDictType(SysDictType dictType)
        {
            return 0;
        }

        @Override
        public boolean checkDictTypeUnique(SysDictType dictType)
        {
            return true;
        }
    }

    private static final class StubRegistryService implements IOsgAdminDictRegistryService
    {
        @Override
        public List<Map<String, Object>> loadRegistryGroups()
        {
            return List.of(
                category("job", "求职相关", List.of(
                    dictType("osg_job_category", "岗位分类", false, null),
                    dictType("osg_city", "地区/城市", true, "osg_region")
                )),
                category("student", "学员相关", List.of(
                    dictType("osg_school", "学校", false, null),
                    dictType("osg_major_direction", "主攻方向", false, null)
                )),
                category("course", "课程相关", List.of(
                    dictType("osg_course_type", "课程类型", false, null)
                )),
                category("finance", "财务相关", List.of(
                    dictType("osg_expense_type", "报销类型", false, null)
                ))
            );
        }

        private Map<String, Object> category(String key, String label, List<Map<String, Object>> dictTypes)
        {
            Map<String, Object> category = new LinkedHashMap<>();
            category.put("group_key", key);
            category.put("group_label", label);
            category.put("icon", "mdi");
            category.put("icon_color", "#000");
            category.put("icon_bg", "#fff");
            category.put("order", 10);
            category.put("dict_types", dictTypes);
            return category;
        }

        private Map<String, Object> dictType(String type, String name, boolean hasParent, String parent)
        {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("dict_type", type);
            entry.put("dict_name", name);
            entry.put("has_parent", hasParent);
            if (parent != null)
            {
                entry.put("parent_dict_type", parent);
            }
            return entry;
        }
    }
}
