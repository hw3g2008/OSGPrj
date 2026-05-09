package com.ruoyi.system.service.impl;

import java.util.List;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.constant.OsgClassReportConstants;
import com.ruoyi.system.domain.OsgClassRecord;
import com.ruoyi.system.domain.OsgCoaching;
import com.ruoyi.system.domain.OsgMockPractice;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.domain.dto.feedback.BaseCourseFeedback;
import com.ruoyi.system.mapper.OsgCoachingMapper;
import com.ruoyi.system.mapper.OsgMockPracticeMapper;
import com.ruoyi.system.mapper.OsgStudentMapper;

/**
 * 课消提交统一校验器（§5.2）。
 * <p>
 * 集中实现以下规则：
 * <ol>
 *   <li>reference_type / course_type 一致性（T-520）</li>
 *   <li>基础课无 reference（T-520）</li>
 *   <li>学员归属（end + currentUserId）（T-521）</li>
 *   <li>reference 归属（属于该 student_id 且当前用户在辅导关系中）（T-521）</li>
 *   <li>字段级权限（student 端直接 403；rate 字段三端可写）（T-522）</li>
 *   <li>旷课分支：absentRemark 必填，rate 必须为 null（T-524）</li>
 *   <li>基础课 tech 正常上课时必修至少 1 项，behavior 至少 1 项（T-526）</li>
 * </ol>
 */
@Component
public class OsgClassReportValidator
{
    public static final String END_MENTOR = "mentor";
    public static final String END_LEAD_MENTOR = "lead-mentor";
    public static final String END_ASSISTANT = "assistant";
    public static final String END_STUDENT = "student";

    @Autowired
    private OsgStudentMapper studentMapper;

    @Autowired
    private OsgCoachingMapper coachingMapper;

    @Autowired
    private OsgMockPracticeMapper mockPracticeMapper;

    /**
     * 提交课消主校验。失败抛 {@link ServiceException}。
     *
     * @param record        课消记录
     * @param currentUserId 当前用户 ID（mentor/lead-mentor/assistant 的 user_id）
     * @param end           调用端：mentor / lead-mentor / assistant（student 直接 403）
     */
    public void validateSubmit(OsgClassRecord record, Long currentUserId, String end)
    {
        if (record == null)
        {
            throw new ServiceException("课程记录不能为空");
        }
        validateFieldPermission(end);
        validateReferenceTypeConsistency(record);
        validateBaseCourseNoReference(record);
        OsgStudent student = validateStudentAccess(record, currentUserId, end);
        validateReferenceOwnership(record, student, currentUserId, end);
    }

    /**
     * 提交课消主校验（含旷课与基础课联合校验）。
     *
     * @param record           课消记录
     * @param currentUserId    当前用户 ID
     * @param end              调用端
     * @param baseCourseFeedback 若为基础课则传入已解析的反馈 DTO，否则传 null
     */
    public void validateSubmit(OsgClassRecord record, Long currentUserId, String end,
                               BaseCourseFeedback baseCourseFeedback)
    {
        validateSubmit(record, currentUserId, end);
        boolean isAbsent = OsgClassReportConstants.MEMBER_STATUS_ABSENT.equalsIgnoreCase(record.getMemberStatus());
        validateAbsentBranch(record, isAbsent);
        if (!isAbsent && OsgClassReportConstants.COURSE_TYPE_BASE_COURSE.equals(record.getCourseType())
            && baseCourseFeedback != null)
        {
            validateBaseCourseFeedback(baseCourseFeedback);
        }
    }

    /**
     * §5.2 规则 5：student 端调用直接拒绝；其余三端均可写 rate 字段。（T-522）
     */
    void validateFieldPermission(String end)
    {
        if (END_STUDENT.equalsIgnoreCase(end))
        {
            throw new ServiceException("学员无权提交课消");
        }
        if (!END_MENTOR.equalsIgnoreCase(end)
            && !END_LEAD_MENTOR.equalsIgnoreCase(end)
            && !END_ASSISTANT.equalsIgnoreCase(end))
        {
            throw new ServiceException("调用端非法");
        }
    }

    /**
     * §5.2 规则 1：course_type 与 reference_type 一致性。（T-520）
     * <ul>
     *   <li>job_coaching ↔ application</li>
     *   <li>mock_interview ↔ mock_interview</li>
     *   <li>relation_test ↔ relation_test</li>
     *   <li>communication_test ↔ communication_test</li>
     *   <li>base_course → reference_type 必须为空（由 validateBaseCourseNoReference 保证）</li>
     * </ul>
     */
    void validateReferenceTypeConsistency(OsgClassRecord record)
    {
        String courseType = record.getCourseType();
        String referenceType = record.getReferenceType();
        if (courseType == null || courseType.isBlank())
        {
            // absent 等场景允许 courseType 为空，跳过
            return;
        }
        if (OsgClassReportConstants.COURSE_TYPE_BASE_COURSE.equals(courseType))
        {
            // 基础课校验在 validateBaseCourseNoReference 中执行
            return;
        }
        String expected = expectedReferenceType(courseType);
        if (expected == null)
        {
            throw new ServiceException("课程类型非法：" + courseType);
        }
        if (referenceType == null || referenceType.isBlank())
        {
            throw new ServiceException("课程类型与关联类型不一致");
        }
        if (!expected.equals(referenceType))
        {
            throw new ServiceException("课程类型与关联类型不一致");
        }
    }

    /**
     * §5.2 规则 2：course_type=base_course 时 reference_type / reference_id 必须均为 null。（T-520）
     */
    void validateBaseCourseNoReference(OsgClassRecord record)
    {
        if (!OsgClassReportConstants.COURSE_TYPE_BASE_COURSE.equals(record.getCourseType()))
        {
            return;
        }
        if (record.getReferenceType() != null && !record.getReferenceType().isBlank())
        {
            throw new ServiceException("基础课不能携带关联类型");
        }
        if (record.getReferenceId() != null)
        {
            throw new ServiceException("基础课不能携带关联记录");
        }
    }

    /**
     * §5.2 规则 3：根据 end + currentUserId 校验当前用户对 student 的上报权限。（T-521）
     */
    OsgStudent validateStudentAccess(OsgClassRecord record, Long currentUserId, String end)
    {
        Long studentId = record.getStudentId();
        if (studentId == null)
        {
            throw new ServiceException("学员不能为空");
        }
        OsgStudent student = studentMapper.selectStudentByStudentId(studentId);
        if (student == null)
        {
            throw new ServiceException("学员不存在");
        }
        if (currentUserId == null)
        {
            throw new ServiceException("无权为该学员上报课消");
        }
        boolean ok;
        if (END_LEAD_MENTOR.equalsIgnoreCase(end))
        {
            ok = Objects.equals(student.getLeadMentorId(), currentUserId)
                || isUserInCsv(student.getLeadMentorIds(), currentUserId);
        }
        else if (END_ASSISTANT.equalsIgnoreCase(end))
        {
            ok = Objects.equals(student.getAssistantId(), currentUserId)
                || isUserInCsv(student.getAssistantIds(), currentUserId);
        }
        else
        {
            // mentor 端：通过 reference 上的 mentor_ids 校验在 validateReferenceOwnership 兜底；
            // 这里仅保留 student 必须存在与 currentUserId 不为空。
            ok = true;
        }
        if (!ok)
        {
            throw new ServiceException("无权为该学员上报课消");
        }
        return student;
    }

    /**
     * §5.2 规则 4：reference_id 必须属于 record.studentId，且 currentUserId 必须在该 reference 的辅导关系内。（T-521）
     */
    void validateReferenceOwnership(OsgClassRecord record, OsgStudent student, Long currentUserId, String end)
    {
        Long referenceId = record.getReferenceId();
        String referenceType = record.getReferenceType();
        if (referenceId == null || referenceType == null || referenceType.isBlank())
        {
            // 基础课或缺省场景已在前置校验中处理
            return;
        }
        if (OsgClassReportConstants.REFERENCE_TYPE_APPLICATION.equals(referenceType))
        {
            OsgCoaching coaching = coachingMapper.selectCoachingByApplicationId(referenceId);
            if (coaching == null)
            {
                throw new ServiceException("辅导记录不存在");
            }
            if (!Objects.equals(coaching.getStudentId(), student.getStudentId()))
            {
                throw new ServiceException("关联记录不属于该学员");
            }
            if (END_MENTOR.equalsIgnoreCase(end) && !isUserInCsv(coaching.getMentorIds(), currentUserId))
            {
                throw new ServiceException("无权为该辅导申请提交课消");
            }
        }
        else if (OsgClassReportConstants.REFERENCE_TYPE_MOCK_INTERVIEW.equals(referenceType)
            || OsgClassReportConstants.REFERENCE_TYPE_RELATION_TEST.equals(referenceType)
            || OsgClassReportConstants.REFERENCE_TYPE_COMMUNICATION_TEST.equals(referenceType))
        {
            OsgMockPractice practice = mockPracticeMapper.selectMockPracticeByPracticeId(referenceId);
            if (practice == null)
            {
                throw new ServiceException("模拟应聘记录不存在");
            }
            if (!Objects.equals(practice.getStudentId(), student.getStudentId()))
            {
                throw new ServiceException("关联记录不属于该学员");
            }
            if (END_MENTOR.equalsIgnoreCase(end) && !isUserInCsv(practice.getMentorIds(), currentUserId))
            {
                throw new ServiceException("无权为该模拟应聘提交课消");
            }
        }
        else
        {
            throw new ServiceException("关联类型非法：" + referenceType);
        }
    }

    /**
     * §3.4 旷课分支校验（T-524）：
     * <ul>
     *   <li>isAbsent=true 时 absentRemark 必须非空</li>
     *   <li>isAbsent=true 时 rate 必须为 null（旷课不评分）</li>
     *   <li>isAbsent=true 且 courseType=base_course 时 referenceId 必须为 null</li>
     *   <li>isAbsent=true 且 courseType!=base_course 时 referenceId 必须非 null</li>
     * </ul>
     */
    void validateAbsentBranch(OsgClassRecord record, boolean isAbsent)
    {
        if (!isAbsent)
        {
            return;
        }
        // 旷课 absentRemark 必填
        if (record.getAbsentRemark() == null || record.getAbsentRemark().isBlank())
        {
            throw new ServiceException("旷课备注不能为空");
        }
        // 旷课不评分
        if (record.getRate() != null && !record.getRate().isBlank())
        {
            throw new ServiceException("旷课记录不能填写评分");
        }
        // 基础课旷课 referenceId 必须为 null
        if (OsgClassReportConstants.COURSE_TYPE_BASE_COURSE.equals(record.getCourseType()))
        {
            if (record.getReferenceId() != null)
            {
                throw new ServiceException("基础课旷课记录不能携带关联记录");
            }
        }
        else if (record.getCourseType() != null && !record.getCourseType().isBlank())
        {
            // 非基础课旷课 referenceId 必须存在（旷课仍需关联具体申请，用于 ②栏统计）
            if (record.getReferenceId() == null)
            {
                throw new ServiceException("非基础课旷课记录必须填写关联申请");
            }
        }
    }

    /**
     * §3.5.5 基础课程服务端校验（T-526）：
     * <ul>
     *   <li>subType=tech：requiredTopicIds 至少 1 项</li>
     *   <li>subType=behavior：topicIds 至少 1 项</li>
     * </ul>
     * 旷课时不调用此方法（全可不选）。
     */
    void validateBaseCourseFeedback(BaseCourseFeedback feedback)
    {
        if (feedback == null)
        {
            return;
        }
        String subType = feedback.getSubType();
        if (OsgClassReportConstants.BASE_CATEGORY_TECH.equals(subType))
        {
            List<String> required = feedback.getRequiredTopicIds();
            if (required == null || required.isEmpty())
            {
                throw new ServiceException("技术类基础课必修题目至少选 1 项");
            }
        }
        else if (OsgClassReportConstants.BASE_CATEGORY_BEHAVIOR.equals(subType))
        {
            List<String> topics = feedback.getTopicIds();
            if (topics == null || topics.isEmpty())
            {
                throw new ServiceException("行为训练类基础课题目至少选 1 项");
            }
        }
    }

    private String expectedReferenceType(String courseType)
    {
        if (OsgClassReportConstants.COURSE_TYPE_JOB_COACHING.equals(courseType))
        {
            return OsgClassReportConstants.REFERENCE_TYPE_APPLICATION;
        }
        if (OsgClassReportConstants.COURSE_TYPE_MOCK_INTERVIEW.equals(courseType))
        {
            return OsgClassReportConstants.REFERENCE_TYPE_MOCK_INTERVIEW;
        }
        if (OsgClassReportConstants.COURSE_TYPE_RELATION_TEST.equals(courseType))
        {
            return OsgClassReportConstants.REFERENCE_TYPE_RELATION_TEST;
        }
        if (OsgClassReportConstants.COURSE_TYPE_COMMUNICATION_TEST.equals(courseType))
        {
            return OsgClassReportConstants.REFERENCE_TYPE_COMMUNICATION_TEST;
        }
        return null;
    }

    private boolean isUserInCsv(String csv, Long userId)
    {
        if (csv == null || csv.isBlank() || userId == null)
        {
            return false;
        }
        String target = String.valueOf(userId);
        for (String token : csv.split(","))
        {
            if (target.equals(token.trim()))
            {
                return true;
            }
        }
        return false;
    }
}
