package com.ruoyi.system.mapper;

import java.util.List;
import com.ruoyi.system.domain.OsgStudentChangeRequest;

public interface OsgStudentChangeRequestMapper
{
    public OsgStudentChangeRequest selectChangeRequestById(Long requestId);

    public List<OsgStudentChangeRequest> selectChangeRequestList(OsgStudentChangeRequest request);

    public int insertChangeRequest(OsgStudentChangeRequest request);

    public int updateChangeRequestReview(OsgStudentChangeRequest request);
}
