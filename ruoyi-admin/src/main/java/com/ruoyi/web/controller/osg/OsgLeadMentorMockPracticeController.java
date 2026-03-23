package com.ruoyi.web.controller.osg;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ruoyi.common.constant.HttpStatus;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.service.IOsgLeadMentorMockPracticeService;
import com.ruoyi.system.service.impl.OsgLeadMentorAccessService;

@RestController
@RequestMapping("/lead-mentor/mock-practice")
public class OsgLeadMentorMockPracticeController extends BaseController
{
    private static final String ACCESS_DENIED_MESSAGE = "该账号无班主任端访问权限";

    @Autowired
    private IOsgLeadMentorMockPracticeService leadMentorMockPracticeService;

    @Autowired
    private OsgLeadMentorAccessService leadMentorAccessService;

    @GetMapping("/stats")
    public AjaxResult stats(String keyword, String practiceType, String status)
    {
        if (!hasLeadMentorAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }

        try
        {
            return AjaxResult.success(leadMentorMockPracticeService.selectScopedStats(keyword, practiceType, status, getUserId()));
        }
        catch (ServiceException ex)
        {
            return handleServiceException(ex);
        }
    }

    @GetMapping("/list")
    public AjaxResult list(String scope, String keyword, String practiceType, String status)
    {
        if (!hasLeadMentorAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }

        try
        {
            List<Map<String, Object>> rows = leadMentorMockPracticeService.selectPracticeList(scope, keyword, practiceType, status, getUserId());
            return AjaxResult.success()
                .put("rows", rows)
                .put("stats", leadMentorMockPracticeService.selectScopedStats(keyword, practiceType, status, getUserId()));
        }
        catch (ServiceException ex)
        {
            return handleServiceException(ex);
        }
    }

    @GetMapping("/{practiceId}")
    public AjaxResult detail(@PathVariable Long practiceId)
    {
        if (!hasLeadMentorAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }

        try
        {
            return AjaxResult.success(leadMentorMockPracticeService.selectPracticeDetail(practiceId, getUserId()));
        }
        catch (ServiceException ex)
        {
            return handleServiceException(ex);
        }
    }

    @PostMapping("/{practiceId}/assign")
    public AjaxResult assign(@PathVariable Long practiceId, @RequestBody Map<String, Object> body)
    {
        if (!hasLeadMentorAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }

        try
        {
            return AjaxResult.success(leadMentorMockPracticeService.assignPractice(practiceId, body, getUserId(), resolveOperator()));
        }
        catch (ServiceException ex)
        {
            return handleServiceException(ex);
        }
    }

    @PostMapping("/{practiceId}/ack-assignment")
    public AjaxResult acknowledgeAssignment(@PathVariable Long practiceId)
    {
        if (!hasLeadMentorAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }

        try
        {
            return AjaxResult.success(leadMentorMockPracticeService.acknowledgeAssignment(practiceId, getUserId(), resolveOperator()));
        }
        catch (ServiceException ex)
        {
            return handleServiceException(ex);
        }
    }

    private boolean hasLeadMentorAccess()
    {
        LoginUser loginUser = SecurityUtils.getLoginUser();
        SysUser user = loginUser == null ? null : loginUser.getUser();
        return leadMentorAccessService.hasLeadMentorAccess(user);
    }

    private AjaxResult handleServiceException(ServiceException ex)
    {
        String message = ex.getMessage();
        if (message != null && message.contains("无权"))
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, message);
        }
        return AjaxResult.error(HttpStatus.BAD_REQUEST, message);
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
