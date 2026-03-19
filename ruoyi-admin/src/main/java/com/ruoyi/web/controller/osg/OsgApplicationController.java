package com.ruoyi.web.controller.osg;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.system.service.IPositionService;

/**
 * 学员申请追踪接口（S-005 我的求职页）
 */
@RestController
@RequestMapping("/student/application")
public class OsgApplicationController extends BaseController
{
    @Autowired
    private IPositionService positionService;

    /**
     * 获取我的求职列表
     */
    @GetMapping("/list")
    public AjaxResult list()
    {
        Long userId = getUserId();
        List<Map<String, Object>> applications = positionService.selectApplicationList(userId);
        return success(Map.of("applications", applications));
    }

    /**
     * 获取我的求职页元数据
     */
    @GetMapping("/meta")
    public AjaxResult meta()
    {
        Long userId = getUserId();
        return success(positionService.selectApplicationMeta(userId));
    }
}
