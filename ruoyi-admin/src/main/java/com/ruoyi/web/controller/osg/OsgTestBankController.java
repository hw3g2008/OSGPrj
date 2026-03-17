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
import com.ruoyi.system.domain.OsgTestBank;
import com.ruoyi.system.mapper.OsgTestBankMapper;

@RestController
@RequestMapping("/admin/test-bank")
public class OsgTestBankController extends BaseController
{
    private static final String TEST_BANK_ACCESS = "@ss.hasPermi('admin:online-test-bank:list')";

    @Autowired
    private OsgTestBankMapper testBankMapper;

    @PreAuthorize(TEST_BANK_ACCESS)
    @GetMapping("/list")
    public AjaxResult list(@RequestParam(required = false) String tab,
                           @RequestParam(required = false) String keyword,
                           @RequestParam(required = false) String companyName,
                           @RequestParam(required = false) String testType)
    {
        OsgTestBank query = new OsgTestBank();
        query.setKeyword(keyword);
        query.setCompanyName(companyName);
        query.setTestType(testType);

        List<OsgTestBank> rows;
        if ("applications".equalsIgnoreCase(tab))
        {
            rows = testBankMapper.selectTestBankApplicationList(query);
        }
        else
        {
            rows = testBankMapper.selectTestBankList(query);
        }
        return AjaxResult.success().put("rows", rows).put("pendingCount", testBankMapper.selectTestBankPendingCount());
    }

    @PreAuthorize(TEST_BANK_ACCESS)
    @PostMapping
    public AjaxResult create(@RequestBody Map<String, Object> body)
    {
        try
        {
            OsgTestBank row = new OsgTestBank();
            row.setRecordType("bank");
            row.setTestBankName(resolveRequiredString(body, "testBankName"));
            row.setCompanyName(resolveRequiredString(body, "companyName"));
            row.setTestType(resolveRequiredString(body, "testType"));
            row.setQuestionCount(resolveRequiredInteger(body, "questionCount"));
            row.setStatus(resolveRequiredString(body, "status"));
            row.setPendingFlag("0");
            row.setCreateBy(resolveOperator());
            row.setUpdateBy(resolveOperator());
            testBankMapper.insertTestBank(row);
            return AjaxResult.success("题库创建成功", testBankMapper.selectTestBankByBankId(row.getBankId()));
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    @PreAuthorize(TEST_BANK_ACCESS)
    @PutMapping
    public AjaxResult update(@RequestBody Map<String, Object> body)
    {
        try
        {
            Long bankId = resolveRequiredLong(body, "bankId");
            OsgTestBank current = testBankMapper.selectTestBankByBankId(bankId);
            if (current == null)
            {
                throw new ServiceException("题库不存在");
            }

            String testBankName = resolveOptionalString(body, "testBankName");
            String companyName = resolveOptionalString(body, "companyName");
            String testType = resolveOptionalString(body, "testType");
            Integer questionCount = resolveOptionalInteger(body, "questionCount");
            String status = resolveOptionalString(body, "status");

            if (StringUtils.hasText(testBankName)) current.setTestBankName(testBankName);
            if (StringUtils.hasText(companyName)) current.setCompanyName(companyName);
            if (StringUtils.hasText(testType)) current.setTestType(testType);
            if (questionCount != null) current.setQuestionCount(questionCount);
            if (StringUtils.hasText(status)) current.setStatus(status);
            current.setUpdateBy(resolveOperator());
            testBankMapper.updateTestBank(current);
            return AjaxResult.success("题库更新成功", testBankMapper.selectTestBankByBankId(bankId));
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
