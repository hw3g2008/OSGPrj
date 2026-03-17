package com.ruoyi.web.controller.osg;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgInterviewBank;
import com.ruoyi.system.mapper.OsgInterviewBankMapper;

@RestController
@RequestMapping("/admin/interview-bank")
public class OsgInterviewBankController extends BaseController
{
    private static final String INTERVIEW_BANK_ACCESS = "@ss.hasPermi('admin:interview-bank:list')";

    @Autowired
    private OsgInterviewBankMapper interviewBankMapper;

    @PreAuthorize(INTERVIEW_BANK_ACCESS)
    @GetMapping("/list")
    public AjaxResult list(@RequestParam(required = false) String tab,
                           @RequestParam(required = false) String keyword,
                           @RequestParam(required = false) String interviewStage,
                           @RequestParam(required = false) String interviewType,
                           @RequestParam(required = false) String industryName)
    {
        OsgInterviewBank query = new OsgInterviewBank();
        query.setKeyword(keyword);
        query.setInterviewStage(interviewStage);
        query.setInterviewType(interviewType);
        query.setIndustryName(industryName);

        List<OsgInterviewBank> rows;
        if ("applications".equalsIgnoreCase(tab))
        {
            rows = interviewBankMapper.selectInterviewBankApplicationList(query);
        }
        else
        {
            rows = interviewBankMapper.selectInterviewBankList(query);
        }

        return AjaxResult.success()
            .put("rows", rows)
            .put("pendingCount", interviewBankMapper.selectInterviewBankPendingCount());
    }

    @PreAuthorize(INTERVIEW_BANK_ACCESS)
    @PostMapping
    public AjaxResult create(@RequestBody Map<String, Object> body)
    {
        try
        {
            OsgInterviewBank row = new OsgInterviewBank();
            row.setRecordType("bank");
            row.setInterviewBankName(resolveRequiredString(body, "interviewBankName"));
            row.setInterviewStage(resolveRequiredString(body, "interviewStage"));
            row.setInterviewType(resolveRequiredString(body, "interviewType"));
            row.setIndustryName(resolveRequiredString(body, "industryName"));
            row.setQuestionCount(resolveRequiredInteger(body, "questionCount"));
            row.setStatus(resolveRequiredString(body, "status"));
            row.setPendingFlag("0");
            row.setCreateBy(resolveOperator());
            row.setUpdateBy(resolveOperator());
            interviewBankMapper.insertInterviewBank(row);
            return AjaxResult.success("题库创建成功", interviewBankMapper.selectInterviewBankByBankId(row.getBankId()));
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    @PreAuthorize(INTERVIEW_BANK_ACCESS)
    @PutMapping
    public AjaxResult update(@RequestBody Map<String, Object> body)
    {
        try
        {
            Long bankId = resolveRequiredLong(body, "bankId");
            OsgInterviewBank current = interviewBankMapper.selectInterviewBankByBankId(bankId);
            if (current == null)
            {
                throw new ServiceException("题库不存在");
            }

            String interviewBankName = resolveOptionalString(body, "interviewBankName");
            String interviewStage = resolveOptionalString(body, "interviewStage");
            String interviewType = resolveOptionalString(body, "interviewType");
            String industryName = resolveOptionalString(body, "industryName");
            Integer questionCount = resolveOptionalInteger(body, "questionCount");
            String status = resolveOptionalString(body, "status");

            if (StringUtils.hasText(interviewBankName)) current.setInterviewBankName(interviewBankName);
            if (StringUtils.hasText(interviewStage)) current.setInterviewStage(interviewStage);
            if (StringUtils.hasText(interviewType)) current.setInterviewType(interviewType);
            if (StringUtils.hasText(industryName)) current.setIndustryName(industryName);
            if (questionCount != null) current.setQuestionCount(questionCount);
            if (StringUtils.hasText(status)) current.setStatus(status);
            current.setUpdateBy(resolveOperator());
            interviewBankMapper.updateInterviewBank(current);
            return AjaxResult.success("题库更新成功", interviewBankMapper.selectInterviewBankByBankId(bankId));
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    private Long resolveRequiredLong(Map<String, Object> body, String key)
    {
        Object value = body.get(key);
        if (value instanceof Number number)
        {
            return number.longValue();
        }
        if (value instanceof String text && StringUtils.hasText(text))
        {
            return Long.valueOf(text);
        }
        throw new ServiceException(key + " 不能为空");
    }

    private Integer resolveRequiredInteger(Map<String, Object> body, String key)
    {
        Integer value = resolveOptionalInteger(body, key);
        if (value == null)
        {
            throw new ServiceException(key + " 不能为空");
        }
        return value;
    }

    private Integer resolveOptionalInteger(Map<String, Object> body, String key)
    {
        Object value = body.get(key);
        if (value instanceof Number number)
        {
            return number.intValue();
        }
        if (value instanceof String text && StringUtils.hasText(text))
        {
            return Integer.valueOf(text);
        }
        return null;
    }

    private String resolveRequiredString(Map<String, Object> body, String key)
    {
        String value = resolveOptionalString(body, key);
        if (!StringUtils.hasText(value))
        {
            throw new ServiceException(key + " 不能为空");
        }
        return value;
    }

    private String resolveOptionalString(Map<String, Object> body, String key)
    {
        Object value = body.get(key);
        if (value instanceof String text && StringUtils.hasText(text))
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
