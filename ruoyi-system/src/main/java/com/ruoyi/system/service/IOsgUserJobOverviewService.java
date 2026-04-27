package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;

import com.ruoyi.system.domain.OsgJobApplication;

/**
 * 用户端求职总览 Service（三端共用：Assistant / Lead-Mentor / Mentor）。
 * <p>
 * Admin 端有独立的 {@link IOsgJobOverviewService}（管理员视角，签名不同），本接口仅用于用户端。
 * <p>
 * 设计原则：
 * <ul>
 *   <li>方法按业务视角命名（forAssistant / forLeadMentor / forMentor），不按端的"Side"后缀</li>
 *   <li>签名相同但实现逻辑不同的方法按视角拆分，避免 impl 内部 "if (端 == X)" 端分支反模式（路线图 §2.3）</li>
 *   <li>端特有业务操作（assignMentors / confirmCoaching 等）放在同一接口，Controller 只调自己该调的</li>
 * </ul>
 * <p>
 * 由 M0.2 合并 IOsgAssistantJobOverviewService + IOsgLeadMentorJobOverviewService 而来。
 */
public interface IOsgUserJobOverviewService
{
    // ===== Assistant 端 =====

    /**
     * 助理视角：查名下学员的求职总览列表。
     * 权限：按 student.assistant_id = assistantId 过滤。
     */
    List<Map<String, Object>> listByAssistant(OsgJobApplication query, Long assistantId);

    /**
     * 助理视角：求职申请详情。
     * 权限：application 关联学员必须属于 assistantId 名下。
     */
    Map<String, Object> detailForAssistant(Long applicationId, Long assistantId);

    /**
     * 助理视角：日历事件（名下学员的面试）。
     */
    List<Map<String, Object>> calendarForAssistant(Long assistantId);

    // ===== Lead-Mentor 端 =====

    /**
     * 班主任视角：查管辖学员的求职总览，按 scope 分组。
     * @param scope "pending"（待分配）/ "coaching"（辅导中）/ "managed"（已管理）
     */
    List<Map<String, Object>> listByLeadMentor(String scope, OsgJobApplication query, Long leadMentorId);

    /**
     * 班主任视角：求职申请详情。
     * 权限：application 必须通过 coaching 关系可被 leadMentorId 访问。
     */
    Map<String, Object> detailForLeadMentor(Long applicationId, Long leadMentorId);

    /**
     * 班主任视角：日历事件。
     */
    List<Map<String, Object>> calendarForLeadMentor(Long leadMentorId);

    // ===== Mentor 端 =====

    /**
     * 导师视角：查辅导学员的求职总览列表。
     */
    List<Map<String, Object>> listByMentor(OsgJobApplication query, Long mentorId);

    /**
     * 导师视角：求职申请详情。
     * 权限：application 必须通过 coaching 关系可被 mentorId 访问。
     */
    Map<String, Object> detailForMentor(Long applicationId, Long mentorId);

    /**
     * 导师视角：日历事件。
     */
    List<Map<String, Object>> calendarForMentor(Long mentorId);

    // ===== Lead-Mentor 专用业务操作 =====

    /**
     * 班主任分配导师（单个申请）。
     */
    Map<String, Object> assignMentors(Long applicationId, Map<String, Object> payload, Long leadMentorId, String operator);

    /**
     * 班主任确认阶段更新（消除 stageUpdated 标记）。
     */
    Map<String, Object> acknowledgeStageUpdate(Long applicationId, Long leadMentorId, String operator);

    // ===== Mentor 专用业务操作 =====

    /**
     * 导师确认收徒（confirm coaching）。
     */
    Map<String, Object> confirmCoaching(Long applicationId, Long mentorId, String operator);

    /**
     * §A.0.3 列出当前辅导者负责的活跃辅导对象（前端课程记录提交表单做下拉选择源）。
     * 返回 { coachings: [...], practices: [...] }：
     * - coachings：当前用户在 mentor_ids CSV 中、osg_coaching.status in ('coaching','assigned') 的辅导记录
     * - practices：当前用户在 mentor_ids CSV 中、osg_mock_practice.status in ('confirmed','scheduled') 的模拟应聘
     */
    Map<String, Object> listMyTargets(Long currentUserId);
}
