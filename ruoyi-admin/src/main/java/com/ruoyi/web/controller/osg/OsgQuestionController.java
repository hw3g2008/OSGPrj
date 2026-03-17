package com.ruoyi.web.controller.osg;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgInterviewQuestion;
import com.ruoyi.system.mapper.OsgInterviewQuestionMapper;

@RestController
@RequestMapping("/admin/question")
public class OsgQuestionController extends BaseController
{
    private static final String QUESTION_REVIEW_ACCESS = "@ss.hasPermi('admin:questions:list')";

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private OsgInterviewQuestionMapper questionMapper;

    @PreAuthorize(QUESTION_REVIEW_ACCESS)
    @GetMapping("/list")
    public AjaxResult list(@RequestParam(required = false) String tab,
                           @RequestParam(required = false) String keyword,
                           @RequestParam(required = false) String companyName,
                           @RequestParam(required = false) String interviewRound,
                           @RequestParam(required = false) String beginDate,
                           @RequestParam(required = false) String endDate)
    {
        OsgInterviewQuestion query = new OsgInterviewQuestion();
        query.setTab(StringUtils.hasText(tab) ? tab.trim() : "pending");
        query.setKeyword(keyword);
        query.setCompanyName(companyName);
        query.setInterviewRound(interviewRound);
        query.setBeginDate(beginDate);
        query.setEndDate(endDate);

        List<OsgInterviewQuestion> rows = questionMapper.selectQuestionList(query);
        rows.forEach(this::normalizeQuestionRow);

        return AjaxResult.success()
            .put("rows", rows)
            .put("pendingCount", questionMapper.selectPendingQuestionCount());
    }

    @PreAuthorize(QUESTION_REVIEW_ACCESS)
    @PutMapping("/batch-approve")
    public AjaxResult batchApprove(@RequestBody Map<String, Object> body)
    {
        try
        {
            return AjaxResult.success("审核通过", reviewQuestions(body, "approved"));
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    @PreAuthorize(QUESTION_REVIEW_ACCESS)
    @PutMapping("/batch-reject")
    public AjaxResult batchReject(@RequestBody Map<String, Object> body)
    {
        try
        {
            return AjaxResult.success("审核驳回", reviewQuestions(body, "rejected"));
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    private Map<String, Object> reviewQuestions(Map<String, Object> body, String targetStatus)
    {
        List<Long> questionIds = resolveRequiredIdList(body);
        String reviewComment = resolveOptionalString(body, "reviewComment");
        List<OsgInterviewQuestion> updatedRows = new ArrayList<>();
        int eligibleStudentCount = 0;
        String operator = resolveOperator();

        for (Long questionId : questionIds)
        {
            OsgInterviewQuestion current = questionMapper.selectQuestionById(questionId);
            if (current == null)
            {
                throw new ServiceException("真题不存在");
            }
            if (!"pending".equals(current.getReviewStatus()))
            {
                throw new ServiceException("已审核真题不可重复审核");
            }

            current.setReviewStatus(targetStatus);
            current.setReviewComment(reviewComment);
            current.setReviewedBy(operator);
            current.setReviewedAt(new Date());
            current.setUpdateBy(operator);
            if ("approved".equals(targetStatus))
            {
                Integer currentEligible = current.getEligibleStudentCount();
                current.setEligibleStudentCount(currentEligible == null ? 0 : currentEligible);
                current.setSharePreview(buildSharePreview(current));
            }
            questionMapper.updateQuestionReview(current);
            normalizeQuestionRow(current);
            updatedRows.add(current);
            eligibleStudentCount += current.getEligibleStudentCount() == null ? 0 : current.getEligibleStudentCount();
        }

        return Map.of(
            "reviewedCount", updatedRows.size(),
            "eligibleStudentCount", eligibleStudentCount,
            "rows", updatedRows
        );
    }

    private void normalizeQuestionRow(OsgInterviewQuestion row)
    {
        if ((row.getQuestionItems() == null || row.getQuestionItems().isEmpty()) && StringUtils.hasText(row.getQuestionItemsJson()))
        {
            try
            {
                row.setQuestionItems(objectMapper.readValue(row.getQuestionItemsJson(), new TypeReference<List<String>>() { }));
            }
            catch (IOException ex)
            {
                row.setQuestionItems(List.of());
            }
        }
        if (row.getQuestionCount() == null && row.getQuestionItems() != null)
        {
            row.setQuestionCount(row.getQuestionItems().size());
        }
        if (!StringUtils.hasText(row.getSharePreview()))
        {
            row.setSharePreview(buildSharePreview(row));
        }
    }

    private String buildSharePreview(OsgInterviewQuestion row)
    {
        if (!StringUtils.hasText(row.getCompanyName())
            || !StringUtils.hasText(row.getDepartmentName())
            || !StringUtils.hasText(row.getOfficeLocation())
            || !StringUtils.hasText(row.getInterviewStatus()))
        {
            return row.getSharePreview();
        }
        return row.getCompanyName()
            + " / "
            + row.getDepartmentName()
            + " / "
            + row.getOfficeLocation()
            + " / "
            + row.getInterviewStatus();
    }

    private List<Long> resolveRequiredIdList(Map<String, Object> body)
    {
        Object value = body.get("questionIds");
        if (!(value instanceof List<?> rawList) || rawList.isEmpty())
        {
            throw new ServiceException("questionIds 不能为空");
        }

        List<Long> ids = new ArrayList<>();
        for (Object item : rawList)
        {
            if (item instanceof Number number)
            {
                ids.add(number.longValue());
            }
            else if (item instanceof String text && StringUtils.hasText(text))
            {
                ids.add(Long.valueOf(text));
            }
        }

        if (ids.isEmpty())
        {
            throw new ServiceException("questionIds 不能为空");
        }
        return ids;
    }

    private String resolveOptionalString(Map<String, Object> body, String key)
    {
        Object value = body.get(key);
        if (value instanceof String text)
        {
            return text.trim();
        }
        return null;
    }

    private String resolveOperator()
    {
        try
        {
            return getUsername();
        }
        catch (ServiceException ex)
        {
            return "system";
        }
    }
}
