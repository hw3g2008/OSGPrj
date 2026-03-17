package com.ruoyi.system.mapper;

import java.util.List;
import com.ruoyi.system.domain.OsgStudent;

public interface OsgStudentMapper
{
    public OsgStudent selectStudentByStudentId(Long studentId);

    public List<OsgStudent> selectStudentList(OsgStudent student);

    public int insertStudent(OsgStudent student);

    public int updateStudent(OsgStudent student);

    public int updateStudentStatus(OsgStudent student);

    public int deleteStudentByStudentId(Long studentId);

    public int deleteStudentByStudentIds(Long[] studentIds);
}
