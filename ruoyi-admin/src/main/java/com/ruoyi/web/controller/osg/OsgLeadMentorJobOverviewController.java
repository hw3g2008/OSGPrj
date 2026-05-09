package com.ruoyi.web.controller.osg;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
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
import com.ruoyi.system.domain.OsgJobApplication;
import com.ruoyi.system.service.IOsgUserJobOverviewService;
import com.ruoyi.system.service.impl.OsgLeadMentorAccessService;

@RestController
@RequestMapping("/lead-mentor/job-overview")
public class OsgLeadMentorJobOverviewController extends BaseController
{
    private static final String ACCESS_DENIED_MESSAGE = "该账号无班主任端访问权限";

    @Autowired
    private IOsgUserJobOverviewService userJobOverviewService;

    @Autowired
    private OsgLeadMentorAccessService leadMentorAccessService;

    /**
     * 求职申请列表。②栏新增 interviewTimeStart/interviewTimeEnd/lessonReported（true=已上报，false=未上报）透传到 service 过滤。
     */
    @GetMapping("/list")
    public AjaxResult list(String scope, OsgJobApplication query)
    {
        if (!hasLeadMentorAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }

        try
        {
            List<Map<String, Object>> rows = userJobOverviewService.listByLeadMentor(scope, query, getUserId());
            return AjaxResult.success().put("rows", rows);
        }
        catch (ServiceException ex)
        {
            return handleServiceException(ex);
        }
    }

    @GetMapping("/calendar")
    public AjaxResult calendar()
    {
        if (!hasLeadMentorAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }

        try
        {
            List<Map<String, Object>> rows = userJobOverviewService.calendarForLeadMentor(getUserId());
            return success(rows);
        }
        catch (ServiceException ex)
        {
            return handleServiceException(ex);
        }
    }

    @GetMapping("/{applicationId}")
    public AjaxResult detail(@PathVariable Long applicationId)
    {
        if (!hasLeadMentorAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }

        try
        {
            return AjaxResult.success(userJobOverviewService.detailForLeadMentor(applicationId, getUserId()));
        }
        catch (ServiceException ex)
        {
            return handleServiceException(ex);
        }
    }

    @PostMapping("/{applicationId}/assign-mentor")
    public AjaxResult assignMentor(@PathVariable Long applicationId, @RequestBody Map<String, Object> body)
    {
        if (!hasLeadMentorAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }

        try
        {
            Map<String, Object> result = userJobOverviewService.assignMentors(applicationId, body, getUserId(), resolveOperator());
            return AjaxResult.success(result);
        }
        catch (ServiceException ex)
        {
            return handleServiceException(ex);
        }
    }

    @PostMapping("/{applicationId}/ack-stage-update")
    public AjaxResult acknowledgeStageUpdate(@PathVariable Long applicationId)
    {
        if (!hasLeadMentorAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }

        try
        {
            return AjaxResult.success(userJobOverviewService.acknowledgeStageUpdate(applicationId, getUserId(), resolveOperator()));
        }
        catch (ServiceException ex)
        {
            return handleServiceException(ex);
        }
    }

    /**
     * §C.5 LM 端确认收徒（confirm coaching）。
     * 设计：LM 自己也可被分配为辅导者，故需要 confirm 入口。复用 mentor 端 confirmCoaching 共用 service 方法。
     */
    @PutMapping("/{applicationId}/confirm-coaching")
    public AjaxResult confirmCoaching(@PathVariable Long applicationId)
    {
        if (!hasLeadMentorAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }

        try
        {
            return AjaxResult.success(userJobOverviewService.confirmCoaching(applicationId, getUserId(), resolveOperator()));
        }
        catch (ServiceException ex)
        {
            return handleServiceException(ex);
        }
    }

    /**
     * §A.0.3 LM 端列出当前活跃的辅导对象（前端课程记录提交表单做下拉源）。
     */
    @GetMapping("/my-targets")
    public AjaxResult myTargets()
    {
        if (!hasLeadMentorAccess())
        {
            return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }
        try
        {
            return AjaxResult.success(userJobOverviewService.listMyTargets(getUserId()));
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
