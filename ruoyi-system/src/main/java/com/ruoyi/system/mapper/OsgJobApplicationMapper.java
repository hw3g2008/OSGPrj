package com.ruoyi.system.mapper;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Param;
import com.ruoyi.system.domain.OsgJobApplication;

public interface OsgJobApplicationMapper
{
    OsgJobApplication selectJobApplicationByApplicationId(Long applicationId);

    OsgJobApplication selectLatestByStudentAndCompanyAndPosition(@Param("studentId") Long studentId,
            @Param("companyName") String companyName, @Param("positionName") String positionName);

    List<Map<String, Object>> selectStudentApplicationRecords(@Param("userId") Long userId);

    List<OsgJobApplication> selectJobApplicationList(OsgJobApplication jobApplication);

    List<OsgJobApplication> selectJobApplicationsByIds(@Param("applicationIds") List<Long> applicationIds);

    List<OsgJobApplication> selectByStudentIds(@Param("studentIds") List<Long> studentIds);

    int insertJobApplication(OsgJobApplication jobApplication);

    int updateJobApplicationAssignment(OsgJobApplication jobApplication);

    int updateJobApplicationStage(OsgJobApplication jobApplication);

    int updateJobApplicationCoaching(OsgJobApplication jobApplication);
}
