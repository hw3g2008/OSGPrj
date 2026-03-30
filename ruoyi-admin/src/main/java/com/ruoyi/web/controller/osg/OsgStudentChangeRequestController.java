package com.ruoyi.web.controller.osg;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.service.impl.OsgStudentChangeRequestServiceImpl;

@RestController
@RequestMapping("/admin/student/change-request")
public class OsgStudentChangeRequestController extends BaseController
{
    private static final String STUDENT_ROLE_ACCESS = "@ss.hasPermi('admin:students:list')";

    @Autowired
    private OsgStudentChangeRequestServiceImpl changeRequestService;

    @PreAuthorize(STUDENT_ROLE_ACCESS)
    @GetMapping("/list")
    public AjaxResult list(@RequestParam(required = false) Long studentId, @RequestParam(required = false) String status)
    {
        List<Map<String, Object>> rows = changeRequestService.selectChangeRequestList(studentId, status);
        return AjaxResult.success().put("rows", rows);
    }

    @PreAuthorize(STUDENT_ROLE_ACCESS)
    @PostMapping
    public AjaxResult submit(@RequestBody Map<String, Object> body)
    {
        try
        {
            Map<String, Object> result = changeRequestService.submitChangeRequest(body, resolveOperator());
            return AjaxResult.success("变更申请已提交", result);
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    @PreAuthorize(STUDENT_ROLE_ACCESS)
    @PutMapping("/{requestId}/approve")
    public AjaxResult approve(@PathVariable Long requestId)
    {
        try
        {
            Map<String, Object> result = changeRequestService.approveChangeRequest(requestId, resolveOperator());
            return AjaxResult.success("变更申请已通过", result)
                .put("status", result.get("status"));
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    @PreAuthorize(STUDENT_ROLE_ACCESS)
    @PutMapping("/{requestId}/reject")
    public AjaxResult reject(@PathVariable Long requestId, @RequestBody(required = false) Map<String, Object> body)
    {
        try
        {
            String reason = body == null ? null : String.valueOf(body.getOrDefault("reason", ""));
            Map<String, Object> result = changeRequestService.rejectChangeRequest(requestId, resolveOperator(), reason);
            return AjaxResult.success("变更申请已驳回", result)
                .put("status", result.get("status"));
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
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
