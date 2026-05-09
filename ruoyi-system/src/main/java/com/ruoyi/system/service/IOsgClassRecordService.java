package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;
import com.ruoyi.system.domain.OsgClassRecord;

public interface IOsgClassRecordService
{
    Map<String, Object> selectReportSummary(String keyword, String courseType, String courseSource, String tab);

    List<Map<String, Object>> selectReportList(String keyword, String courseType, String courseSource, String tab);

    Map<String, Object> selectReportDetail(Long recordId);

    Map<String, Object> approveRecord(Long recordId, Map<String, Object> payload, String operator);

    Map<String, Object> rejectRecord(Long recordId, Map<String, Object> payload, String operator);

    Map<String, Object> batchApprove(Map<String, Object> payload, String operator);

    Map<String, Object> batchReject(Map<String, Object> payload, String operator);

    List<OsgClassRecord> selectMentorClassRecordList(OsgClassRecord record);

    OsgClassRecord selectMentorClassRecordById(Long id);

    Map<String, Object> createLeadMentorClassRecord(OsgClassRecord record);

    Map<String, Object> createAssistantClassRecord(OsgClassRecord record);

    int createMentorClassRecord(OsgClassRecord record);

    int updateMentorClassRecord(OsgClassRecord record);

    /**
     * 课消上报：根据当前调用端 + 当前用户，返回该端可上报的学员候选下拉源（S-055 §3.1）。
     * <p>
     * end 仅允许：
     * <ul>
     *   <li>{@code mentor}      — 通过 osg_coaching.mentor_ids / osg_mock_practice.mentor_ids 含当前 userId</li>
     *   <li>{@code lead-mentor} — osg_student.lead_mentor_id=currentUserId 或 lead_mentor_ids CSV 含 currentUserId
     *       或对应 osg_job_application.lead_mentor_id=currentUserId</li>
     *   <li>{@code assistant}   — osg_student.assistant_id=currentUserId 或 assistant_ids CSV 含 currentUserId</li>
     * </ul>
     * Controller 严禁直接写 SQL 选学员；统一走此接口。
     *
     * @param currentUserId 当前用户 ID
     * @param end           调用端 mentor/lead-mentor/assistant，其它值抛 ServiceException
     * @return List of {studentId, studentName}，按 studentName 升序去重，无候选返回空列表
     */
    List<Map<String, Object>> listReportableStudents(Long currentUserId, String end);

    /**
     * 课消上报：根据 studentId + refType 返回可关联的"申请/模拟/沟通/关系测试"候选下拉源（S-055 §3.3）。
     * <p>
     * refType 取值：
     * <ul>
     *   <li>{@code application}        — 该 studentId 的求职申请（osg_job_application），且当前用户被分配（mentor: coaching.mentor_ids 含 currentUserId；lead-mentor: leadMentorId 匹配；assistant: 学员归属当前 assistant）</li>
     *   <li>{@code mock_interview}     — osg_mock_practice.practice_type=mock_interview 且当前用户被分配</li>
     *   <li>{@code relation_test}      — osg_mock_practice.practice_type=relation_test 且当前用户被分配</li>
     *   <li>{@code communication_test} — osg_mock_practice.practice_type=communication_test 且当前用户被分配</li>
     *   <li>其它 / base_course → []</li>
     * </ul>
     * 若 studentId 不在当前 end 可上报范围内，必须返回 [] 而不能泄露跨学员候选（S-055 §5.2 规则 4）。
     * <p>
     * 返回字段约定：
     * <ul>
     *   <li>application       label = {@code 公司 / 岗位 / 阶段 / 面试时间}</li>
     *   <li>mock 系列         label = {@code 类型 / 提交时间 / 状态}</li>
     * </ul>
     * 列表按时间降序，去重。
     *
     * @param currentUserId 当前用户 ID
     * @param end           调用端 mentor/lead-mentor/assistant
     * @param studentId     学员 ID
     * @param refType       application / mock_interview / relation_test / communication_test / base_course
     * @return List of {referenceType, referenceId, label, raw}
     */
    List<Map<String, Object>> listReferenceCandidates(Long currentUserId, String end, Long studentId, String refType);
}
