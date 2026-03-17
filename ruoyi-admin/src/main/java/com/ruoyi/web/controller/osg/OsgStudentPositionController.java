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
import com.ruoyi.system.service.impl.OsgStudentPositionServiceImpl;

@RestController
@RequestMapping("/admin/student-position")
public class OsgStudentPositionController extends BaseController
{
    private static final String POSITION_ROLE_ACCESS = "@ss.hasPermi('admin:student-positions:list')";

    @Autowired
    private OsgStudentPositionServiceImpl studentPositionService;

    @PreAuthorize(POSITION_ROLE_ACCESS)
    @GetMapping("/list")
    public AjaxResult list(@RequestParam(required = false) String status,
                           @RequestParam(required = false) String positionCategory,
                           @RequestParam(required = false) String hasCoachingRequest,
                           @RequestParam(required = false) String keyword)
    {
        List<Map<String, Object>> rows = studentPositionService.selectStudentPositionList(status, positionCategory, hasCoachingRequest, keyword);
        return AjaxResult.success().put("rows", rows);
    }

    @PreAuthorize(POSITION_ROLE_ACCESS)
    @PutMapping("/{studentPositionId}/approve")
    public AjaxResult approve(@PathVariable Long studentPositionId,
                              @RequestBody(required = false) Map<String, Object> body)
    {
        try
        {
            Map<String, Object> result = studentPositionService.approveStudentPosition(studentPositionId, body, resolveOperator());
            return AjaxResult.success("学生自添岗位已通过", result)
                .put("status", result.get("status"))
                .put("positionId", result.get("positionId"));
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    @PreAuthorize(POSITION_ROLE_ACCESS)
    @PutMapping("/{studentPositionId}/reject")
    public AjaxResult reject(@PathVariable Long studentPositionId,
                             @RequestBody(required = false) Map<String, Object> body)
    {
        try
        {
            Map<String, Object> result = studentPositionService.rejectStudentPosition(studentPositionId, body, resolveOperator());
            return AjaxResult.success("学生自添岗位已拒绝", result)
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
