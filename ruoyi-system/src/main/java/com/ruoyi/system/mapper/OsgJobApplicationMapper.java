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

    /**
     * §B1: 学生班主任变更时，把该学生名下所有 application 的 lead_mentor_id 同步刷新。
     * 全量同步（不按 stage 过滤）：表无 status 列，且已结束的 application 在 coaching/assign_status 层已被流转列表过滤。
     */
    int updateLeadMentorByStudent(@Param("studentId") Long studentId,
            @Param("leadMentorUserId") Long leadMentorUserId);

    /**
     * §B1: service 入口惰性兜底回填。仅当目标 application 的 lead_mentor_id 还是 NULL 时才补值，
     * 不覆盖任何已有班主任绑定。给 fixture/历史漏填的 application 提供自愈机会。
     */
    int updateLeadMentorByApplicationIfNull(@Param("applicationId") Long applicationId,
            @Param("leadMentorUserId") Long leadMentorUserId);
}
