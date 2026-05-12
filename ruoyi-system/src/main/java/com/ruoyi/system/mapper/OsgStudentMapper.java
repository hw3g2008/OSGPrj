package com.ruoyi.system.mapper;

import java.util.List;
import com.ruoyi.system.domain.OsgStudent;

public interface OsgStudentMapper
{
    public OsgStudent selectStudentByStudentId(Long studentId);

    public OsgStudent selectStudentByEmail(String email);

    public OsgStudent selectStudentByUserId(Long userId);

    public List<OsgStudent> selectStudentByStudentIds(List<Long> studentIds);

    public List<OsgStudent> selectStudentList(OsgStudent student);

    public int insertStudent(OsgStudent student);

    public int updateStudent(OsgStudent student);

    public int updateStudentStatus(OsgStudent student);

    /**
     * 批次 7 + 7.5：accountStatus + frozen 部分字段独立刷新（任一为 null 即不动该列）。
     * 见 docs/plans/stage-coaching-request/09-rule-a-alignment-fix-plan.md §13.4 / §13.5。
     */
    public int updateStudentAccountFlags(OsgStudent student);

    public int deleteStudentByStudentId(Long studentId);

    public int deleteStudentByStudentIds(Long[] studentIds);
}
