package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;
import com.ruoyi.system.domain.OsgMockPractice;

public interface IOsgMockPracticeService
{
    Map<String, Object> selectMockPracticeStats(String keyword, String practiceType, String status);

    List<Map<String, Object>> selectMockPracticeList(String keyword, String practiceType, String status, String tab);

    Map<String, Object> assignMockPractice(Map<String, Object> payload, String operator);

    List<OsgMockPractice> selectMentorMockPracticeList(OsgMockPractice query);

    /**
     * Asst 端 mock-practice 列表：按 student.assistantId / student.assistantIds 过滤可见性，
     * 不走 mentor 端 mentor_ids 路径。query.currentMentorId 复用为 currentUserId 载体。
     */
    List<OsgMockPractice> selectAssistantMockPracticeList(OsgMockPractice query);

    OsgMockPractice selectMentorMockPracticeById(Long id);

    int confirmMentorMockPractice(OsgMockPractice record);

    /**
     * §C.1 共用 service 方法：辅导者（mentor / asst / lead-mentor）确认接受 mock-practice 分配。
     * 用原子 SQL 防并发竞态（status='scheduled' → 'confirmed'，已 confirmed 时 affected=0 抛业务异常）。
     */
    Map<String, Object> confirmAssignment(Long practiceId, Long currentUserId, String operator);

    /**
     * §C.1 共用 service 方法：辅导者（mentor / asst / lead-mentor）确认已知悉 mock-practice 分配。
     * 与 IOsgLeadMentorMockPracticeService.acknowledgeAssignment 等价，本轮新增以统一调用入口。
     */
    Map<String, Object> acknowledgeAssignment(Long practiceId, Long currentUserId, String operator);

    /**
     * Step3-F3: mentor 端 mock-practice 详情，按 practice_id 返回 referenceType + classRecords + reportedLessonCount + latestRating。
     * 与 LM detailForLeadMentor 同口径但走 mentor 关系校验（hasMentorRelation 而非 hasLeadMentorAssignment）。
     */
    Map<String, Object> selectMentorMockPracticeDetail(Long practiceId, Long currentUserId);
}
