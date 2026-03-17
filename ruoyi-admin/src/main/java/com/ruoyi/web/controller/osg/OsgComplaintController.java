package com.ruoyi.web.controller.osg;

import java.util.Date;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.domain.OsgComplaint;
import com.ruoyi.system.mapper.OsgComplaintMapper;

@RestController
@RequestMapping("/admin/complaint")
public class OsgComplaintController extends BaseController
{
    private static final String COMPLAINT_ACCESS = "@ss.hasPermi('admin:complaints:list')";

    @Autowired
    private OsgComplaintMapper complaintMapper;

    @PreAuthorize(COMPLAINT_ACCESS)
    @GetMapping("/list")
    public AjaxResult list()
    {
        List<OsgComplaint> rows = complaintMapper.selectComplaintList(new OsgComplaint());
        return AjaxResult.success().put("rows", rows);
    }

    @PreAuthorize(COMPLAINT_ACCESS)
    @PutMapping("/{complaintId}/status")
    public AjaxResult changeStatus(@PathVariable Long complaintId, @RequestParam String processStatus)
    {
        OsgComplaint complaint = complaintMapper.selectComplaintById(complaintId);
        if (complaint == null)
        {
            return AjaxResult.error("投诉建议不存在");
        }
        if (StringUtils.equals("completed", complaint.getProcessStatus()) && StringUtils.equals("pending", processStatus))
        {
            return AjaxResult.error("已完成的投诉不可回退到待处理");
        }

        complaint.setProcessStatus(processStatus);
        complaint.setHandleTime(StringUtils.equals("completed", processStatus) ? new Date() : null);
        complaintMapper.updateComplaintStatus(complaint);
        return AjaxResult.success().put("data", complaint);
    }
}
