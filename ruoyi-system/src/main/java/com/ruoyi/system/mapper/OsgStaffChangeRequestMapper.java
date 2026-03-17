package com.ruoyi.system.mapper;

import com.ruoyi.system.domain.OsgStaffChangeRequest;

public interface OsgStaffChangeRequestMapper
{
    public int insertChangeRequest(OsgStaffChangeRequest request);

    public int selectPendingReviewCount();
}
