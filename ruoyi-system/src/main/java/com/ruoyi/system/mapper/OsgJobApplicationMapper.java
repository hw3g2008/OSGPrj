package com.ruoyi.system.mapper;

import java.util.List;
import com.ruoyi.system.domain.OsgJobApplication;

public interface OsgJobApplicationMapper
{
    OsgJobApplication selectJobApplicationByApplicationId(Long applicationId);

    List<OsgJobApplication> selectJobApplicationList(OsgJobApplication jobApplication);

    int insertJobApplication(OsgJobApplication jobApplication);

    int updateJobApplicationAssignment(OsgJobApplication jobApplication);

    int updateJobApplicationStage(OsgJobApplication jobApplication);
}
