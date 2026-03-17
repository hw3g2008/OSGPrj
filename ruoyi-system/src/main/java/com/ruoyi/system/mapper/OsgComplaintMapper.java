package com.ruoyi.system.mapper;

import java.util.List;
import com.ruoyi.system.domain.OsgComplaint;

public interface OsgComplaintMapper
{
    List<OsgComplaint> selectComplaintList(OsgComplaint query);

    OsgComplaint selectComplaintById(Long complaintId);

    int updateComplaintStatus(OsgComplaint complaint);
}
