package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.ruoyi.system.domain.OsgPosition;
import com.ruoyi.system.mapper.OsgCoachingMapper;
import com.ruoyi.system.mapper.OsgJobApplicationMapper;
import com.ruoyi.system.mapper.OsgPositionMapper;
import com.ruoyi.system.mapper.SysDictDataMapper;

/**
 * T3 修复（第一波）后端单测覆盖：
 * - T3.13 toPositionMap 输出 createBy + createTime（drilldown/list 表格"添加日期"列依赖）
 */
@ExtendWith(MockitoExtension.class)
class OsgPositionServiceT3Test
{
    @InjectMocks
    private OsgPositionServiceImpl service;

    @Mock
    private OsgPositionMapper positionMapper;

    @Mock
    private SysDictDataMapper sysDictDataMapper;

    @Mock
    private OsgJobApplicationMapper jobApplicationMapper;

    @Mock
    private OsgCoachingMapper coachingMapper;

    @Test
    void drillDownExposesCreateByAndCreateTimeForT3_13() throws Exception
    {
        OsgPosition position = new OsgPosition();
        position.setPositionId(401L);
        position.setPositionCategory("summer");
        position.setIndustry("bulge_bracket");
        position.setCompanyName("Goldman Sachs");
        position.setCompanyType("bulge_bracket");
        position.setPositionName("Summer Analyst");
        position.setRegion("na");
        position.setCity("New York");
        position.setRecruitmentCycle("Class of 2026");
        position.setProjectYear("2026");
        position.setDisplayStatus("visible");
        position.setPublishTime(Timestamp.valueOf(LocalDateTime.of(2026, 4, 1, 9, 0)));
        position.setCreateBy("admin_alice");
        position.setCreateTime(Timestamp.valueOf(LocalDateTime.of(2026, 4, 1, 9, 0)));

        when(positionMapper.selectPositionList(any(OsgPosition.class)))
            .thenReturn(List.of(position));

        List<Map<String, Object>> drilldown = service.selectPositionDrillDown(new OsgPosition());

        assertEquals(1, drilldown.size(), "drilldown industries");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> companies = (List<Map<String, Object>>) drilldown.get(0).get("companies");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> positions = (List<Map<String, Object>>) companies.get(0).get("positions");
        Map<String, Object> row = positions.get(0);

        assertEquals("admin_alice", row.get("createBy"), "T3.13 toPositionMap 必须返回 createBy 字段");
        assertNotNull(row.get("createTime"), "T3.13 toPositionMap 必须返回 createTime 字段");
        assertEquals(Timestamp.valueOf(LocalDateTime.of(2026, 4, 1, 9, 0)), row.get("createTime"),
            "T3.13 createTime 必须保留原始时间值");
    }

    @Test
    void toPositionMapReturnsEmptyStringWhenCreateByIsNull()
    {
        OsgPosition position = new OsgPosition();
        position.setPositionId(402L);
        position.setPositionCategory("summer");
        position.setIndustry("consulting");
        position.setCompanyName("McKinsey");
        position.setCompanyType("consulting");
        position.setPositionName("Business Analyst");
        position.setRegion("eu");
        position.setCity("London");
        position.setRecruitmentCycle("Class of 2026");
        position.setProjectYear("2026");
        position.setDisplayStatus("visible");
        position.setPublishTime(Timestamp.valueOf(LocalDateTime.of(2026, 4, 2, 9, 0)));
        // createBy/createTime 故意保持 null

        when(positionMapper.selectPositionList(any(OsgPosition.class)))
            .thenReturn(List.of(position));

        List<Map<String, Object>> drilldown = service.selectPositionDrillDown(new OsgPosition());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> companies = (List<Map<String, Object>>) drilldown.get(0).get("companies");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> positions = (List<Map<String, Object>>) companies.get(0).get("positions");
        Map<String, Object> row = positions.get(0);

        assertEquals("", row.get("createBy"), "T3.13 createBy 为 null 时序列化为空字符串（与 PositionListItem.createBy 类型一致）");
        // createTime 为 null 时直接放入 Map，前端 formatShortDate('—') 已处理 null
    }
}
