package com.ruoyi.web.controller.osg;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.service.impl.OsgMockPracticeServiceImpl;

@RestController
@RequestMapping("/admin/mock-practice")
public class OsgMockPracticeController extends BaseController
{
    private static final String MOCK_PRACTICE_ACCESS = "@ss.hasPermi('admin:mock-practice:list')";

    @Autowired
    private OsgMockPracticeServiceImpl mockPracticeService;

    @PreAuthorize(MOCK_PRACTICE_ACCESS)
    @GetMapping("/stats")
    public AjaxResult stats(@RequestParam(required = false) String keyword,
                            @RequestParam(required = false) String practiceType,
                            @RequestParam(required = false) String status)
    {
        return AjaxResult.success(mockPracticeService.selectMockPracticeStats(keyword, practiceType, status));
    }

    @PreAuthorize(MOCK_PRACTICE_ACCESS)
    @GetMapping("/list")
    public AjaxResult list(@RequestParam(required = false) String keyword,
                           @RequestParam(required = false) String practiceType,
                           @RequestParam(required = false) String status,
                           @RequestParam(required = false) String tab)
    {
        List<Map<String, Object>> rows = mockPracticeService.selectMockPracticeList(keyword, practiceType, status, tab);
        return AjaxResult.success()
            .put("rows", rows)
            .put("stats", mockPracticeService.selectMockPracticeStats(keyword, practiceType, status));
    }

    @PreAuthorize(MOCK_PRACTICE_ACCESS)
    @PostMapping("/assign")
    public AjaxResult assign(@RequestBody Map<String, Object> body)
    {
        try
        {
            Map<String, Object> result = mockPracticeService.assignMockPractice(body, resolveOperator());
            return AjaxResult.success("模拟应聘分配成功", result)
                .put("status", result.get("status"))
                .put("mentorNames", result.get("mentorNames"));
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
