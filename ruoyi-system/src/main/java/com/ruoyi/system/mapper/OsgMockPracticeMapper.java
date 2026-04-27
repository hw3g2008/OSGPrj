package com.ruoyi.system.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Param;
import com.ruoyi.system.domain.OsgMockPractice;

public interface OsgMockPracticeMapper
{
    OsgMockPractice selectMockPracticeByPracticeId(Long practiceId);

    List<OsgMockPractice> selectStudentPracticeList(@Param("studentId") Long studentId);

    List<OsgMockPractice> selectMockPracticeList(OsgMockPractice mockPractice);

    List<OsgMockPractice> selectMentorMockPracticeList(OsgMockPractice mockPractice);

    OsgMockPractice selectMentorMockPracticeById(Long practiceId);

    int insertMockPractice(OsgMockPractice mockPractice);

    int updateMockPracticeAssignment(OsgMockPractice mockPractice);

    int updateMentorMockPracticeStatus(OsgMockPractice mockPractice);

    /**
     * §A.1 课时审核回写：原子累加 completed_hours，避免先查后写竞态。
     * 仅在 reviewRecord targetStatus='approved' 分支调用。
     */
    int incrementCompletedHours(@Param("practiceId") Long practiceId,
                                @Param("durationHours") Double durationHours);

    /**
     * §C.1 confirmAssignment 原子 SQL：仅当 status='scheduled' 时才更新为 'confirmed'。
     * affectedRows=1 → 首位 confirm 成功；=0 → 已被其他辅导者 confirm 或状态不可 confirm，调用方应抛业务异常。
     * 同时解决 "防重复 confirm" 与 "并发竞态" 两件事。
     */
    int confirmAssignmentIfScheduled(@Param("practiceId") Long practiceId,
                                     @Param("operator") String operator);
}
