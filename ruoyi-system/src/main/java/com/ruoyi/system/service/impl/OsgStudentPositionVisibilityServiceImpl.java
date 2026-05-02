package com.ruoyi.system.service.impl;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.ruoyi.system.domain.OsgPosition;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.service.IOsgStudentPositionVisibilityService;

/**
 * 学生岗位可见性匹配服务实现
 *
 * 三规则：
 *   1) 招聘周期：岗位 recruitment_cycle ∩ 学生 recruitment_cycle ≠ ∅
 *   2) 求职大区：岗位 region ∈ 学生 target_region 集合
 *   3) 主攻方向：岗位 target_majors ∩ 学生 major_direction ≠ ∅
 *
 * 任一字段空值（学生侧或岗位侧）→ 直接返回 false。
 *
 * 关联文档:
 *   PRD: osg-spec-docs/docs/01-product/prd/career-position-visibility/position-visibility-rules.md §1.1
 *   SRS: osg-spec-docs/docs/02-requirements/srs/career-position-visibility.md FR-CPV-001
 *   开发文档: 2026-04-29-position-visibility-rules-dev.md §3.2
 */
@Service
public class OsgStudentPositionVisibilityServiceImpl implements IOsgStudentPositionVisibilityService
{
    @Override
    public boolean isVisibleToStudent(OsgPosition position, OsgStudent student)
    {
        if (position == null || student == null)
        {
            return false;
        }

        Set<String> studentMajors = splitToSet(student.getMajorDirection());
        Set<String> studentCycles = splitToSet(student.getRecruitmentCycle());
        Set<String> studentRegions = splitToSet(student.getTargetRegion());

        // 学生任一意向字段为空 → 直接不可见（不退化为忽略该维度）
        if (studentMajors.isEmpty() || studentCycles.isEmpty() || studentRegions.isEmpty())
        {
            return false;
        }

        Set<String> positionMajors = splitToSet(position.getTargetMajors());
        Set<String> positionCycles = splitToSet(position.getRecruitmentCycle());
        String positionRegion = trimToNull(position.getRegion());

        // 岗位 target_majors 为空 → 不命中（与必填语义一致）
        if (positionMajors.isEmpty() || positionCycles.isEmpty() || positionRegion == null)
        {
            return false;
        }

        // 维度 1：招聘周期相交
        if (Collections.disjoint(positionCycles, studentCycles))
        {
            return false;
        }

        // 维度 2：岗位大区 ∈ 学生大区集合
        if (!studentRegions.contains(positionRegion))
        {
            return false;
        }

        // 维度 3：主攻方向相交
        if (Collections.disjoint(positionMajors, studentMajors))
        {
            return false;
        }

        return true;
    }

    @Override
    public List<OsgPosition> filterVisible(List<OsgPosition> positions, OsgStudent student)
    {
        if (positions == null || positions.isEmpty())
        {
            return new ArrayList<>();
        }
        return positions.stream()
            .filter(p -> isVisibleToStudent(p, student))
            .collect(Collectors.toList());
    }

    private static Set<String> splitToSet(String csv)
    {
        if (csv == null)
        {
            return new HashSet<>();
        }
        return Arrays.stream(csv.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .collect(Collectors.toSet());
    }

    private static String trimToNull(String value)
    {
        if (value == null)
        {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
