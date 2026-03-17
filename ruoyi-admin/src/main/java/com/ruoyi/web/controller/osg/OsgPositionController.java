package com.ruoyi.web.controller.osg;

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
import com.ruoyi.system.service.IPositionService;

/**
 * 岗位信息接口（S-004 岗位信息页）
 */
@RestController
@RequestMapping("/student/position")
public class OsgPositionController extends BaseController
{
    @Autowired
    private IPositionService positionService;

    /**
     * 获取岗位列表
     */
    @GetMapping("/list")
    public AjaxResult list()
    {
        Long userId = getUserId();
        List<Map<String, Object>> positions = positionService.selectPositionList(userId);
        return success(positions);
    }

    /**
     * 获取岗位页元数据
     */
    @GetMapping("/meta")
    public AjaxResult meta()
    {
        return success(positionService.selectPositionMeta(getUserId()));
    }

    /**
     * 标记投递状态
     */
    @PostMapping("/apply")
    public AjaxResult apply(@RequestBody Map<String, Object> params)
    {
        Long positionId = Long.valueOf(params.get("positionId").toString());
        Boolean applied = Boolean.valueOf(params.get("applied").toString());
        String appliedDate = params.get("date") == null ? null : params.get("date").toString();
        String method = params.get("method") == null ? null : params.get("method").toString();
        String note = params.get("note") == null ? null : params.get("note").toString();
        Long userId = getUserId();
        positionService.updateApplyStatus(positionId, applied, appliedDate, method, note, userId);
        return success();
    }

    /**
     * 收藏岗位
     */
    @PostMapping("/favorite")
    public AjaxResult favorite(@RequestBody Map<String, Object> params)
    {
        Long positionId = Long.valueOf(params.get("positionId").toString());
        Boolean favorited = Boolean.valueOf(params.get("favorited").toString());
        Long userId = getUserId();
        positionService.updateFavoriteStatus(positionId, favorited, userId);
        return success();
    }

    /**
     * 记录进度
     */
    @PostMapping("/progress")
    public AjaxResult progress(@RequestBody Map<String, Object> params)
    {
        Long positionId = Long.valueOf(params.get("positionId").toString());
        String stage = params.get("stage").toString();
        String notes = params.get("notes").toString();
        Long userId = getUserId();
        positionService.insertProgress(positionId, stage, notes, userId);
        return success();
    }

    /**
     * 提交岗位辅导申请
     */
    @PostMapping("/coaching")
    public AjaxResult coaching(@RequestBody Map<String, Object> params)
    {
        Long positionId = Long.valueOf(params.get("positionId").toString());
        String stage = params.get("stage") == null ? null : params.get("stage").toString();
        String mentorCount = params.get("mentorCount") == null ? null : params.get("mentorCount").toString();
        String note = params.get("note") == null ? null : params.get("note").toString();
        Long userId = getUserId();
        positionService.requestCoaching(positionId, stage, mentorCount, note, userId);
        return success();
    }

    /**
     * 手动添加岗位
     */
    @PostMapping("/manual")
    public AjaxResult manual(@RequestBody Map<String, Object> params)
    {
        String category = params.get("category").toString();
        String title = params.get("title").toString();
        String company = params.get("company").toString();
        String location = params.get("location").toString();
        Long userId = getUserId();
        Long positionId = positionService.createManualPosition(category, title, company, location, userId);
        return success(Map.of("positionId", positionId));
    }
}
