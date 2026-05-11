package com.ruoyi.system.mapper;

import java.util.List;
import java.util.Map;
import com.ruoyi.system.domain.OsgMentorProfileChangeRequest;

public interface OsgMentorProfileChangeRequestMapper
{
    int insertChangeRequest(OsgMentorProfileChangeRequest request);

    List<OsgMentorProfileChangeRequest> selectChangeRequestList(Map<String, Object> params);

    OsgMentorProfileChangeRequest selectChangeRequestById(Long requestId);

    int updateChangeRequestReview(OsgMentorProfileChangeRequest request);
}
