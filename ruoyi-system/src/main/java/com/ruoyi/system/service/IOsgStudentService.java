package com.ruoyi.system.service;

import java.util.List;
import com.ruoyi.system.domain.OsgStudent;

public interface IOsgStudentService
{
    public OsgStudent selectStudentByStudentId(Long studentId);

    public List<OsgStudent> selectStudentList(OsgStudent student);

    public int insertStudent(OsgStudent student);

    public int updateStudent(OsgStudent student);

    public int updateStudentStatus(OsgStudent student);

    public int deleteStudentByStudentIds(Long[] studentIds);

    public int deleteStudentByStudentId(Long studentId);
}
