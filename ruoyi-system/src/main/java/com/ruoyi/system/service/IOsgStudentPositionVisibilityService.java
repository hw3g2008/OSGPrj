package com.ruoyi.system.service;

import java.util.List;

import com.ruoyi.system.domain.OsgPosition;
import com.ruoyi.system.domain.OsgStudent;

/**
 * 学生岗位可见性匹配服务
 * <p>
 * 三规则交集判定：招聘周期 ∧ 求职大区 ∧ 主攻方向，全部相交才视为命中。
 * 任一学生字段为空 → 直接返回 false（PRD §1.2 + §三 Q10：列表为空 + 引导补全）。
 */
public interface IOsgStudentPositionVisibilityService
{
    /**
     * 单条岗位是否对当前学生可见
     */
    boolean isVisibleToStudent(OsgPosition position, OsgStudent student);

    /**
     * 批量过滤：仅保留对当前学生可见的岗位（保持原顺序）
     */
    List<OsgPosition> filterVisible(List<OsgPosition> positions, OsgStudent student);
}
