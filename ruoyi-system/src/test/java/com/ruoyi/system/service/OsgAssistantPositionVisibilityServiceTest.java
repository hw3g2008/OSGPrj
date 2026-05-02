package com.ruoyi.system.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import com.ruoyi.system.domain.OsgPosition;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.OsgPositionMapper;
import com.ruoyi.system.service.impl.OsgAssistantPositionVisibilityServiceImpl;
import com.ruoyi.system.service.impl.OsgStudentPositionVisibilityServiceImpl;

@ExtendWith(MockitoExtension.class)
class OsgAssistantPositionVisibilityServiceTest
{
    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private OsgPositionMapper positionMapper;

    private final IOsgStudentPositionVisibilityService studentVisibilityService =
        new OsgStudentPositionVisibilityServiceImpl();

    @InjectMocks
    private OsgAssistantPositionVisibilityServiceImpl service;

    @org.junit.jupiter.api.BeforeEach
    void setUp()
    {
        // 真实注入 student visibility service（替换 InjectMocks 留下的 null）
        try
        {
            java.lang.reflect.Field f = OsgAssistantPositionVisibilityServiceImpl.class
                .getDeclaredField("studentVisibilityService");
            f.setAccessible(true);
            f.set(service, studentVisibilityService);
        }
        catch (Exception e)
        {
            throw new RuntimeException(e);
        }
    }

    @Test
    void nullAssistantId_returnsEmpty()
    {
        assertTrue(service.listForAssistant(null).isEmpty());
    }

    @Test
    void zeroOwnedStudents_returnsEmpty()
    {
        when(jdbcTemplate.query(any(String.class), any(RowMapper.class), eq(42L)))
            .thenReturn(Collections.emptyList());

        List<Map<String, Object>> result = service.listForAssistant(42L);
        assertTrue(result.isEmpty());
    }

    @Test
    void noVisiblePositions_returnsEmpty()
    {
        when(jdbcTemplate.query(any(String.class), any(RowMapper.class), eq(42L)))
            .thenReturn(Arrays.asList(student("finance", "2026spring", "cn")));
        when(positionMapper.selectVisiblePublicPositionList(any(OsgPosition.class)))
            .thenReturn(Collections.emptyList());

        assertTrue(service.listForAssistant(42L).isEmpty());
    }

    @Test
    void unionOfHits_dedupedAndCounted()
    {
        OsgStudent s1 = student("finance", "2026spring", "cn");
        OsgStudent s2 = student("tech", "2026spring", "cn");

        OsgPosition p1 = position(101L, "finance", "2026spring", "cn");        // s1 hit
        OsgPosition p2 = position(102L, "tech", "2026spring", "cn");           // s2 hit
        OsgPosition p3 = position(103L, "finance,tech", "2026spring", "cn");   // both hit
        OsgPosition p4 = position(104L, "quant", "2026spring", "cn");          // none hit

        when(jdbcTemplate.query(any(String.class), any(RowMapper.class), eq(42L)))
            .thenReturn(Arrays.asList(s1, s2));
        when(positionMapper.selectVisiblePublicPositionList(any(OsgPosition.class)))
            .thenReturn(Arrays.asList(p1, p2, p3, p4));

        List<Map<String, Object>> rows = service.listForAssistant(42L);

        // 并集去重：3 个不同 positionId
        assertEquals(3, rows.size());

        // myStudentCount 计数：p1=1, p2=1, p3=2
        Map<Long, Integer> countByPid = new java.util.HashMap<>();
        for (Map<String, Object> r : rows)
        {
            countByPid.put((Long) r.get("positionId"), (Integer) r.get("myStudentCount"));
        }
        assertEquals(1, (int) countByPid.get(101L));
        assertEquals(1, (int) countByPid.get(102L));
        assertEquals(2, (int) countByPid.get(103L));
    }

    @Test
    void rowFormat_containsTargetMajorsAndMyStudentCount()
    {
        OsgStudent s = student("finance", "2026spring", "cn");
        OsgPosition p = position(101L, "finance", "2026spring", "cn");

        when(jdbcTemplate.query(any(String.class), any(RowMapper.class), eq(42L)))
            .thenReturn(Arrays.asList(s));
        when(positionMapper.selectVisiblePublicPositionList(any(OsgPosition.class)))
            .thenReturn(Arrays.asList(p));

        Map<String, Object> row = service.listForAssistant(42L).get(0);
        assertEquals("finance", row.get("targetMajors"));
        assertEquals(1, row.get("myStudentCount"));
        assertEquals(101L, row.get("positionId"));
    }

    private static OsgStudent student(String major, String cycle, String region)
    {
        OsgStudent s = new OsgStudent();
        s.setMajorDirection(major);
        s.setRecruitmentCycle(cycle);
        s.setTargetRegion(region);
        return s;
    }

    private static OsgPosition position(Long id, String targetMajors, String cycle, String region)
    {
        OsgPosition p = new OsgPosition();
        p.setPositionId(id);
        p.setTargetMajors(targetMajors);
        p.setRecruitmentCycle(cycle);
        p.setRegion(region);
        return p;
    }
}
