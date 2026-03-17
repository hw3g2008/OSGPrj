package com.ruoyi.web.controller.osg;

import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.system.service.IStudentMockPracticeService;

/**
 * 学生模拟应聘 / 课程申请接口（S-006）
 */
@RestController
@RequestMapping("/student/mock-practice")
public class OsgMockPracticeController extends BaseController
{
    @Autowired
    private IStudentMockPracticeService studentMockPracticeService;

    @GetMapping("/overview")
    public AjaxResult overview()
    {
        return success(studentMockPracticeService.selectOverview(getUserId()));
    }

    @GetMapping("/meta")
    public AjaxResult meta()
    {
        return success(studentMockPracticeService.selectMeta(getUserId()));
    }

    @PostMapping("/practice-request")
    public AjaxResult createPracticeRequest(@RequestBody Map<String, Object> params)
    {
        Long requestId = studentMockPracticeService.createPracticeRequest(
                valueOf(params.get("type")),
                valueOf(params.get("reason")),
                valueOf(params.get("mentorCount")),
                valueOf(params.get("preferredMentor")),
                valueOf(params.get("excludedMentor")),
                valueOf(params.get("remark")),
                getUserId());
        return success(Map.of("requestId", requestId));
    }

    @PostMapping("/class-request")
    public AjaxResult createClassRequest(@RequestBody Map<String, Object> params)
    {
        Long requestId = studentMockPracticeService.createClassRequest(
                valueOf(params.get("courseType")),
                valueOf(params.get("company")),
                valueOf(params.get("status")),
                valueOf(params.get("remark")),
                getUserId());
        return success(Map.of("requestId", requestId));
    }

    private String valueOf(Object value)
    {
        return value == null ? null : value.toString();
    }
}
