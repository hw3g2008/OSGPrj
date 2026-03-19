package com.ruoyi.web.controller.osg;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.system.service.IStudentCourseRecordService;

/**
 * 学生课程记录接口（S-007）
 */
@RestController
@RequestMapping("/student/class-records")
public class OsgStudentClassRecordController extends BaseController
{
    @Autowired
    private IStudentCourseRecordService studentCourseRecordService;

    @GetMapping("/meta")
    public AjaxResult meta()
    {
        return success(studentCourseRecordService.selectCourseRecordMeta(getUserId()));
    }

    @GetMapping("/list")
    public AjaxResult list()
    {
        return success(Map.of("records", studentCourseRecordService.selectCourseRecordList(getUserId())));
    }

    @PostMapping("/rate")
    public AjaxResult rate(@RequestBody Map<String, Object> params)
    {
        Object tagsRaw = params.get("tags");
        List<String> tags = tagsRaw instanceof List ? (List<String>) tagsRaw : Collections.emptyList();
        studentCourseRecordService.rateCourseRecord(
                valueOf(params.get("recordId")),
                integerValueOf(params.get("rating")),
                tags,
                valueOf(params.get("feedback")),
                getUserId());
        return success();
    }

    private String valueOf(Object value)
    {
        return value == null ? null : value.toString();
    }

    private Integer integerValueOf(Object value)
    {
        return value == null ? null : Integer.valueOf(value.toString());
    }
}
