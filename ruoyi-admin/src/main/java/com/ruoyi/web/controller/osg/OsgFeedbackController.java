package com.ruoyi.web.controller.osg;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.system.domain.OsgClassFeedback;
import com.ruoyi.system.mapper.OsgClassFeedbackMapper;

@RestController
@RequestMapping("/admin/feedback")
public class OsgFeedbackController extends BaseController
{
    private static final String FEEDBACK_ACCESS = "@ss.hasPermi('admin:feedback:list')";

    @Autowired
    private OsgClassFeedbackMapper feedbackMapper;

    @PreAuthorize(FEEDBACK_ACCESS)
    @GetMapping("/list")
    public AjaxResult list(@RequestParam(required = false) String type,
                           @RequestParam(required = false) String keyword)
    {
        OsgClassFeedback query = new OsgClassFeedback();
        query.setType(type == null || type.isBlank() ? "prep" : type);
        query.setKeyword(keyword);

        List<Map<String, Object>> rows = feedbackMapper.selectFeedbackList(query);
        Map<String, Object> stats = feedbackMapper.selectFeedbackStats();

        return AjaxResult.success()
            .put("rows", rows)
            .put("stats", stats);
    }
}
