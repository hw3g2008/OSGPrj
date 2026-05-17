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
 * Dict facade for cross-endpoint sharing (Scheme II: prefix allow + endpoint blacklist).
 *
 * <p>Write operations stay under /system/dict/* (admin-only). This facade exposes read-only
 * access to all authenticated users with three layers of protection:</p>
 * <ul>
 *   <li>Prefix allow: open all osg_* business dicts by default (sys_* system dicts blocked).</li>
 *   <li>Endpoint blacklist: block endpoint-private prefixes
 *       (osg_student_, osg_mentor_, osg_lead_mentor_, osg_assistant_).</li>
 *   <li>DTO trimming: only return 5 display fields, no createBy/updateBy admin metadata.</li>
 * </ul>
 *
 * <p>Benefit: when admin adds a new osg_* business dict, all endpoints can consume it
 * with zero java/restart change.</p>
 *
 * <p>Design ref: docs/plans/2026-04-19-shared-prerequisites-plan.md section 5.5</p>
 *
 * @author OSG
 */
@RestController
@RequestMapping("/dict")
public class DictFacadeController extends BaseController
{
    /** Business dict prefix (admin-managed business dicts all start with osg_). */
    private static final String BUSINESS_DICT_PREFIX = "osg_";

    /**
     * Endpoint-private dict prefixes: dicts under these prefixes hold a single endpoint's
     * UI copy and status enums; they are not shared cross-endpoint. Calls return error
     * and the client should use the endpoint-local business API instead.
     */
    private static final Set<String> ENDPOINT_PRIVATE_PREFIXES = Set.of(
        "osg_student_",
        "osg_mentor_",
        "osg_lead_mentor_",
        "osg_assistant_"
    );

    @Autowired
    private ISysDictTypeService dictTypeService;

    /**
     * Query a shared dict by typeCode.
     *
     * <p>No method-level auth annotation: relies on SecurityConfig anyRequest().authenticated().</p>
     *
     * @param typeCode dict type code (e.g. osg_company_type)
     * @return trimmed dict data list
     */
    @GetMapping("/{typeCode}")
    public AjaxResult getShared(@PathVariable String typeCode)
    {
        if (typeCode == null || !typeCode.startsWith(BUSINESS_DICT_PREFIX))
        {
            return AjaxResult.error("dict type [" + typeCode + "] is not a business dict and cannot be shared");
        }
        if (isEndpointPrivate(typeCode))
        {
            return AjaxResult.error("dict type [" + typeCode + "] is endpoint-private; use the endpoint-local business API");
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
     * Whether the dict type is endpoint-private (osg_student_/osg_mentor_/osg_lead_mentor_/osg_assistant_).
     * Such dicts hold endpoint-specific UI copy and state enums, unsuitable for cross-endpoint sharing.
     */
    private boolean isEndpointPrivate(String typeCode)
    {
        for (String prefix : ENDPOINT_PRIVATE_PREFIXES)
        {
            if (typeCode.startsWith(prefix))
            {
                return true;
            }
        }
        return false;
    }

    /**
     * Return only the 5 display fields needed by the frontend; do not leak admin management metadata.
     */
    private Map<String, String> toSharedDto(SysDictData d)
    {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("dictValue", Optional.ofNullable(d.getDictValue()).orElse(""));
        m.put("dictLabel", Optional.ofNullable(d.getDictLabel()).orElse(""));
        m.put("cssClass",  Optional.ofNullable(d.getCssClass()).orElse(""));
        m.put("listClass", Optional.ofNullable(d.getListClass()).orElse(""));
        m.put("remark",    Optional.ofNullable(d.getRemark()).orElse(""));
        m.put("i18nKey",   Optional.ofNullable(d.getI18nKey()).orElse(""));
        return m;
    }
}
