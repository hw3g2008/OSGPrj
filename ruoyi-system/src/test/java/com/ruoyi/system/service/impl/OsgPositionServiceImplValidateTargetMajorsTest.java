package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.ruoyi.common.core.domain.entity.SysDictData;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgPosition;
import com.ruoyi.system.mapper.OsgCoachingMapper;
import com.ruoyi.system.mapper.OsgJobApplicationMapper;
import com.ruoyi.system.mapper.OsgPositionMapper;
import com.ruoyi.system.mapper.SysDictDataMapper;

/**
 * Validates target_majors enforcement at Service layer:
 *   - empty list / blank csv → ServiceException("主攻方向不能为空")
 *   - any value not in osg_major_direction dict → ServiceException("主攻方向含非法值：xxx")
 *   - all values in dict → join CSV persisted via insertPosition
 * Covers T-257 / T-258 AC.
 */
@ExtendWith(MockitoExtension.class)
class OsgPositionServiceImplValidateTargetMajorsTest
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
    void createPositionShouldRejectEmptyTargetMajors()
    {
        Map<String, Object> body = baseBody();
        body.put("targetMajors", List.of());

        ServiceException ex = assertThrows(ServiceException.class,
            () -> service.createPosition(body, "admin"));

        assertEquals("主攻方向不能为空", ex.getMessage());
        verify(positionMapper, never()).insertPosition(org.mockito.ArgumentMatchers.any(OsgPosition.class));
        verify(sysDictDataMapper, never()).selectDictDataByType("osg_major_direction");
    }

    @Test
    void createPositionShouldRejectBlankCsvTargetMajors()
    {
        Map<String, Object> body = baseBody();
        body.put("targetMajors", "  ,  , ");

        ServiceException ex = assertThrows(ServiceException.class,
            () -> service.createPosition(body, "admin"));

        assertEquals("主攻方向不能为空", ex.getMessage());
        verify(positionMapper, never()).insertPosition(org.mockito.ArgumentMatchers.any(OsgPosition.class));
    }

    @Test
    void createPositionShouldRejectUnknownDictValue()
    {
        when(sysDictDataMapper.selectDictDataByType("osg_major_direction")).thenReturn(List.of(
            dictItem("finance", "金融 Finance"),
            dictItem("tech", "科技 Technology")
        ));

        Map<String, Object> body = baseBody();
        body.put("targetMajors", List.of("finance", "unknown_xyz"));

        ServiceException ex = assertThrows(ServiceException.class,
            () -> service.createPosition(body, "admin"));

        assertEquals("主攻方向含非法值：unknown_xyz", ex.getMessage());
        verify(positionMapper, never()).insertPosition(org.mockito.ArgumentMatchers.any(OsgPosition.class));
    }

    @Test
    void createPositionShouldPersistJoinedCsvWhenAllDictValuesValid()
    {
        when(sysDictDataMapper.selectDictDataByType("osg_major_direction")).thenReturn(List.of(
            dictItem("finance", "金融 Finance"),
            dictItem("tech", "科技 Technology"),
            dictItem("consulting", "咨询 Consulting")
        ));
        when(positionMapper.insertPosition(org.mockito.ArgumentMatchers.any(OsgPosition.class))).thenAnswer(invocation -> {
            OsgPosition p = invocation.getArgument(0);
            p.setPositionId(99L);
            return 1;
        });
        when(positionMapper.selectPositionByPositionId(99L)).thenAnswer(invocation -> {
            OsgPosition p = new OsgPosition();
            p.setPositionId(99L);
            p.setCompanyName("ByteDance");
            p.setTargetMajors("finance,tech,consulting");
            return p;
        });

        Map<String, Object> body = baseBody();
        body.put("targetMajors", List.of("finance", "tech", "consulting"));

        Map<String, Object> result = service.createPosition(body, "admin");

        assertEquals(99L, ((Number) result.get("positionId")).longValue());
        @SuppressWarnings("unchecked")
        List<String> majors = (List<String>) result.get("targetMajors");
        assertEquals(List.of("finance", "tech", "consulting"), majors);

        org.mockito.ArgumentCaptor<OsgPosition> captor =
            org.mockito.ArgumentCaptor.forClass(OsgPosition.class);
        verify(positionMapper).insertPosition(captor.capture());
        assertEquals("finance,tech,consulting", captor.getValue().getTargetMajors());
    }

    private Map<String, Object> baseBody()
    {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("positionCategory", "fulltime");
        body.put("companyName", "ByteDance");
        body.put("companyType", "swe_pm");
        body.put("positionName", "Backend Engineer");
        body.put("region", "ap");
        body.put("city", "Singapore");
        body.put("recruitmentCycle", "2026");
        body.put("projectYear", "2026");
        body.put("displayStatus", "visible");
        return body;
    }

    private SysDictData dictItem(String value, String label)
    {
        SysDictData item = new SysDictData();
        item.setDictType("osg_major_direction");
        item.setDictValue(value);
        item.setDictLabel(label);
        item.setStatus("0");
        return item;
    }
}
