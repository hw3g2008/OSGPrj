package com.ruoyi.web.controller.osg;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.service.impl.OsgMentorProfileChangeRequestServiceImpl;

/**
 * A-AU-001 admin 端 — 导师资料变更审核入口。
 */
@RestController
@RequestMapping("/admin/mentor-profile-change")
public class OsgMentorProfileChangeReviewController extends BaseController
{
    @Autowired
    private OsgMentorProfileChangeRequestServiceImpl changeRequestService;

    @GetMapping("/list")
    @PreAuthorize("@ss.hasPermi('admin:staff:list')")
    public AjaxResult list(@RequestParam(value = "status", required = false) String status,
                           @RequestParam(value = "userId", required = false) Long userId)
    {
        List<Map<String, Object>> rows = changeRequestService.listChangeRequests(status, userId);
        return AjaxResult.success(rows);
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("@ss.hasPermi('admin:staff:list')")
    public AjaxResult approve(@PathVariable("id") Long requestId)
    {
        return AjaxResult.success(changeRequestService.approveChangeRequest(requestId, resolveOperator()));
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("@ss.hasPermi('admin:staff:list')")
    public AjaxResult reject(@PathVariable("id") Long requestId, @RequestBody Map<String, Object> payload)
    {
        String reason = payload == null ? null : asText(payload.get("reason"));
        return AjaxResult.success(changeRequestService.rejectChangeRequest(requestId, reason, resolveOperator()));
    }

    private String resolveOperator()
    {
        try
        {
            return getUsername();
        }
        catch (ServiceException | NullPointerException ex)
        {
            return "system";
        }
    }

    private String asText(Object value)
    {
        return value == null ? null : String.valueOf(value).trim();
    }
}
