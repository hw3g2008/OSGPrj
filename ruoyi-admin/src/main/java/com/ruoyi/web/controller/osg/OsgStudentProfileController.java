package com.ruoyi.web.controller.osg;

import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.system.service.IStudentProfileService;

/**
 * 学生个人资料接口（S-012）
 */
@RestController
@RequestMapping("/student/profile")
public class OsgStudentProfileController extends BaseController
{
    @Autowired
    private IStudentProfileService studentProfileService;

    @GetMapping
    public AjaxResult profile()
    {
        return success(studentProfileService.selectProfileView(getUserId()));
    }

    @PutMapping
    public AjaxResult updateProfile(@RequestBody Map<String, Object> params)
    {
        return success(studentProfileService.updateProfile(getUserId(), params));
    }
}
