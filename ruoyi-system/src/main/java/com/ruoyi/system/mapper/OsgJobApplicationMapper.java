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

    /**
     * 学员申请追踪列表（T14: 支持按 interview_time/submitted_at 时间范围过滤）
     *
     * @param userId  当前学员对应的 user id
     * @param fromIso 起始日期（yyyy-MM-dd, 含）；null 表示不下界
     * @param toIso   结束日期（yyyy-MM-dd, 不含）；null 表示不上界
     */
    List<Map<String, Object>> selectStudentApplicationRecords(@Param("userId") Long userId,
            @Param("fromIso") String fromIso, @Param("toIso") String toIso);

    List<OsgJobApplication> selectJobApplicationList(OsgJobApplication jobApplication);

    List<OsgJobApplication> selectJobApplicationsByIds(@Param("applicationIds") List<Long> applicationIds);

    List<OsgJobApplication> selectByStudentIds(@Param("studentIds") List<Long> studentIds);

    int insertJobApplication(OsgJobApplication jobApplication);

    int updateJobApplicationAssignment(OsgJobApplication jobApplication);

    int updateJobApplicationStage(OsgJobApplication jobApplication);

    int updateJobApplicationCoaching(OsgJobApplication jobApplication);
}
