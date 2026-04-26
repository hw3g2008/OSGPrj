package com.ruoyi.web.controller.osg;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.service.IPositionService;

/**
 * 岗位信息接口（S-004 岗位信息页）
 */
@RestController
@RequestMapping("/student/position")
public class StudentPositionController extends BaseController
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
        Long positionId = requireLong(params, "positionId", "请选择岗位");
        Boolean applied = requireBoolean(params, "applied", "请提供投递状态");
        String appliedDate = optionalString(params.get("date"));
        String method = optionalString(params.get("method"));
        String note = optionalString(params.get("note"));
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
        Long positionId = requireLong(params, "positionId", "请选择岗位");
        Boolean favorited = requireBoolean(params, "favorited", "请提供收藏状态");
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
        Long positionId = requireLong(params, "positionId", "请选择岗位");
        String stage = requireString(params, "stage", "请选择申请阶段");
        String notes = optionalString(params.get("notes"));
        Long userId = getUserId();
        positionService.insertProgress(positionId, stage, notes, userId);
        return success();
    }

    /**
     * 提交岗位辅导申请。
     *
     * 兼容两种请求体：
     * - 旧 4 字段：positionId / stage / mentorCount / note —— 现有 applications/index.vue 与冒烟脚本仍走此路径
     * - 新模板：在旧 4 字段基础上额外携带 hirevueType / viLink|otLink+otAccount+otPassword / hirevueDeadline /
     *   inviteScreenshotName / mentorHelp / interviewTime / preferMentor / excludeMentor —— 学生岗位列表"申请辅导"按钮使用
     */
    @PostMapping("/coaching")
    public AjaxResult coaching(@RequestBody Map<String, Object> params)
    {
        Long positionId = requireLong(params, "positionId", "请选择岗位");
        Long userId = getUserId();
        if (hasExtendedCoachingPayload(params))
        {
            positionService.requestCoaching(positionId, params, userId);
        }
        else
        {
            String stage = optionalString(params.get("stage"));
            String mentorCount = optionalString(params.get("mentorCount"));
            String note = optionalString(params.get("note"));
            positionService.requestCoaching(positionId, stage, mentorCount, note, userId);
        }
        return success();
    }

    /**
     * 判断是否为新模板请求：携带任一 HireVue / 常规模板独有字段即视为扩展请求，按新 overload 处理。
     */
    private static boolean hasExtendedCoachingPayload(Map<String, Object> params)
    {
        return hasNonBlank(params, "hirevueType")
                || hasNonBlank(params, "viLink")
                || hasNonBlank(params, "otLink")
                || hasNonBlank(params, "otAccount")
                || hasNonBlank(params, "otPassword")
                || hasNonBlank(params, "hirevueDeadline")
                || hasNonBlank(params, "inviteScreenshotName")
                || hasNonBlank(params, "mentorHelp")
                || hasNonBlank(params, "interviewTime")
                || hasNonBlank(params, "preferMentor")
                || hasNonBlank(params, "excludeMentor");
    }

    private static boolean hasNonBlank(Map<String, Object> params, String key)
    {
        Object value = params.get(key);
        if (value == null)
        {
            return false;
        }
        return StringUtils.hasText(value.toString());
    }

    /**
     * 手动添加岗位
     */
    @PostMapping("/manual")
    public AjaxResult manual(@RequestBody Map<String, Object> params)
    {
        Long userId = getUserId();
        Long positionId = positionService.createManualPosition(params, userId);
        return success(Map.of("positionId", positionId));
    }

    private static String optionalString(Object value)
    {
        return value == null ? null : value.toString();
    }

    private static String requireString(Map<String, Object> params, String key, String message)
    {
        Object value = params.get(key);
        if (value == null)
        {
            throw new ServiceException(message);
        }
        String text = value.toString();
        if (!StringUtils.hasText(text))
        {
            throw new ServiceException(message);
        }
        return text;
    }

    private static Long requireLong(Map<String, Object> params, String key, String message)
    {
        String text = requireString(params, key, message);
        try
        {
            return Long.valueOf(text.trim());
        }
        catch (NumberFormatException ex)
        {
            throw new ServiceException(message);
        }
    }

    private static Boolean requireBoolean(Map<String, Object> params, String key, String message)
    {
        Object value = params.get(key);
        if (value == null)
        {
            throw new ServiceException(message);
        }
        return Boolean.valueOf(value.toString());
    }
}
