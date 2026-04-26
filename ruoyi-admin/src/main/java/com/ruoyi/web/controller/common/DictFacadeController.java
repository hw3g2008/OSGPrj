package com.ruoyi.web.controller.common;

import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.entity.SysDictData;
import com.ruoyi.system.service.ISysDictTypeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 字典共享外观（方案 I / T3）
 *
 * <p>管理（写）仍在 /system/dict/*，admin 专属。本接口只开放"读"给所有登录用户，依靠：</p>
 * <ul>
 *   <li>白名单（类型级）：防止非业务字典被泄露（如 sys_normal_disable）</li>
 *   <li>DTO 裁剪（字段级）：防止泄露 createBy/updateBy 等管理元数据</li>
 * </ul>
 *
 * <p>设计依据：docs/plans/2026-04-19-shared-prerequisites-plan.md §5.5</p>
 *
 * @author OSG
 */
@RestController
@RequestMapping("/dict")
public class DictFacadeController extends BaseController
{
    /** 业务方批准的跨角色共享字典白名单 */
    private static final Set<String> SHARED_DICT_WHITELIST = Set.of(
        "osg_company_type",
        "osg_company_name",
        "osg_job_category",
        "osg_recruit_cycle",
        "osg_region",
        "osg_city",
        "osg_major_direction",
        "osg_sub_direction"
        // 未来新增示例（需业务方 review 后加入）：
        // "osg_school",
        // "osg_course_type"
    );

    @Autowired
    private ISysDictTypeService dictTypeService;

    /**
     * 查询共享字典
     * <p>不加方法级鉴权注解，依靠 SecurityConfig 的 anyRequest().authenticated() 校验登录。</p>
     *
     * @param typeCode 字典类型编码（如 osg_company_type）
     * @return 裁剪后的字典数据列表
     */
    @GetMapping("/{typeCode}")
    public AjaxResult getShared(@PathVariable String typeCode)
    {
        if (!SHARED_DICT_WHITELIST.contains(typeCode))
        {
            return AjaxResult.error("字典类型 [" + typeCode + "] 未开放跨角色共享");
        }
        List<SysDictData> raw = dictTypeService.selectDictDataByType(typeCode);
        List<Map<String, String>> trimmed = Optional.ofNullable(raw)
            .orElse(Collections.emptyList())
            .stream()
            .map(this::toSharedDto)
            .collect(Collectors.toList());
        return success(trimmed);
    }

    /**
     * 只返回前端展示需要的 5 个字段，避免泄露 admin 管理元数据
     */
    private Map<String, String> toSharedDto(SysDictData d)
    {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("dictValue", Optional.ofNullable(d.getDictValue()).orElse(""));
        m.put("dictLabel", Optional.ofNullable(d.getDictLabel()).orElse(""));
        m.put("cssClass",  Optional.ofNullable(d.getCssClass()).orElse(""));
        m.put("listClass", Optional.ofNullable(d.getListClass()).orElse(""));
        m.put("remark",    Optional.ofNullable(d.getRemark()).orElse(""));
        return m;
    }
}
