package com.ruoyi.system.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.ruoyi.system.domain.OsgPosition;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.service.impl.OsgStudentPositionVisibilityServiceImpl;

/**
 * OsgStudentPositionVisibilityServiceImpl 单元测试
 *
 * 覆盖三规则匹配的全部分支（含空值边界），确保分支覆盖率 100%。
 */
class OsgStudentPositionVisibilityServiceTest
{
    private final OsgStudentPositionVisibilityServiceImpl service = new OsgStudentPositionVisibilityServiceImpl();

    // -------------------- 命中用例 --------------------
    @Test
    void allThreeDimensionsIntersect_returnsTrue()
    {
        OsgStudent s = student("finance,tech", "2026spring,2026fall", "cn,ap");
        OsgPosition p = position("finance,consulting", "2026spring", "cn");
        assertTrue(service.isVisibleToStudent(p, s));
    }

    @Test
    void targetRegionMultiValueAnyIntersect_returnsTrue()
    {
        OsgStudent s = student("finance", "2026spring", "cn,na");
        OsgPosition p = position("finance", "2026spring", "na");
        assertTrue(service.isVisibleToStudent(p, s));
    }

    // -------------------- 不命中：维度不交 --------------------
    @Test
    void recruitmentCycleDisjoint_returnsFalse()
    {
        OsgStudent s = student("finance", "2026spring", "cn");
        OsgPosition p = position("finance", "2026fall", "cn");
        assertFalse(service.isVisibleToStudent(p, s));
    }

    @Test
    void regionNotInStudentTargets_returnsFalse()
    {
        OsgStudent s = student("finance", "2026spring", "cn,ap");
        OsgPosition p = position("finance", "2026spring", "na");
        assertFalse(service.isVisibleToStudent(p, s));
    }

    @Test
    void majorDirectionDisjoint_returnsFalse()
    {
        OsgStudent s = student("finance", "2026spring", "cn");
        OsgPosition p = position("tech,quant", "2026spring", "cn");
        assertFalse(service.isVisibleToStudent(p, s));
    }

    // -------------------- 学生字段空值 --------------------
    @Test
    void studentMajorDirectionEmpty_returnsFalse()
    {
        OsgStudent s = student("", "2026spring", "cn");
        OsgPosition p = position("finance", "2026spring", "cn");
        assertFalse(service.isVisibleToStudent(p, s));
    }

    @Test
    void studentRecruitmentCycleNull_returnsFalse()
    {
        OsgStudent s = student("finance", null, "cn");
        OsgPosition p = position("finance", "2026spring", "cn");
        assertFalse(service.isVisibleToStudent(p, s));
    }

    @Test
    void studentTargetRegionEmpty_returnsFalse()
    {
        OsgStudent s = student("finance", "2026spring", "");
        OsgPosition p = position("finance", "2026spring", "cn");
        assertFalse(service.isVisibleToStudent(p, s));
    }

    // -------------------- 岗位字段空值 --------------------
    @Test
    void positionTargetMajorsEmpty_returnsFalse()
    {
        OsgStudent s = student("finance", "2026spring", "cn");
        OsgPosition p = position("", "2026spring", "cn");
        assertFalse(service.isVisibleToStudent(p, s));
    }

    @Test
    void positionRegionNull_returnsFalse()
    {
        OsgStudent s = student("finance", "2026spring", "cn");
        OsgPosition p = position("finance", "2026spring", null);
        assertFalse(service.isVisibleToStudent(p, s));
    }

    @Test
    void positionRecruitmentCycleEmpty_returnsFalse()
    {
        OsgStudent s = student("finance", "2026spring", "cn");
        OsgPosition p = position("finance", "", "cn");
        assertFalse(service.isVisibleToStudent(p, s));
    }

    // -------------------- null 输入边界 --------------------
    @Test
    void nullPosition_returnsFalse()
    {
        OsgStudent s = student("finance", "2026spring", "cn");
        assertFalse(service.isVisibleToStudent(null, s));
    }

    @Test
    void nullStudent_returnsFalse()
    {
        OsgPosition p = position("finance", "2026spring", "cn");
        assertFalse(service.isVisibleToStudent(p, null));
    }

    // -------------------- filterVisible 列表过滤 --------------------
    @Test
    void filterVisible_keepsOnlyMatchingPositions()
    {
        OsgStudent s = student("finance", "2026spring", "cn");
        OsgPosition hit1 = position("finance", "2026spring", "cn");
        OsgPosition miss = position("tech", "2026spring", "cn");
        OsgPosition hit2 = position("finance,consulting", "2026spring", "cn");

        List<OsgPosition> result = service.filterVisible(Arrays.asList(hit1, miss, hit2), s);

        assertEquals(2, result.size());
        assertTrue(result.contains(hit1));
        assertTrue(result.contains(hit2));
    }

    @Test
    void filterVisible_emptyInput_returnsEmpty()
    {
        OsgStudent s = student("finance", "2026spring", "cn");
        assertTrue(service.filterVisible(null, s).isEmpty());
        assertTrue(service.filterVisible(java.util.Collections.emptyList(), s).isEmpty());
    }

    // -------------------- helpers --------------------
    private static OsgStudent student(String major, String cycle, String region)
    {
        OsgStudent s = new OsgStudent();
        s.setMajorDirection(major);
        s.setRecruitmentCycle(cycle);
        s.setTargetRegion(region);
        return s;
    }

    private static OsgPosition position(String targetMajors, String cycle, String region)
    {
        OsgPosition p = new OsgPosition();
        p.setTargetMajors(targetMajors);
        p.setRecruitmentCycle(cycle);
        p.setRegion(region);
        return p;
    }
}
