package com.ruoyi.web.controller.system;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.annotation.Anonymous;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.system.domain.SysI18nOverride;
import com.ruoyi.system.service.ISysI18nOverrideService;

/**
 * i18n 覆盖 manifest 拉取入口
 *
 * 前端启动时调用 GET /system/i18n/manifest?lang=zh|en，返回该语言下所有覆盖条目，
 * 然后用 vue-i18n#mergeLocaleMessage 把 keyPath 按点号拆开合入打包内置词条。
 *
 * 该接口必须允许匿名访问，因为登录页也需要使用覆盖后的文案。
 *
 * @author osg
 */
@RestController
@RequestMapping("/system/i18n")
public class SysI18nManifestController
{
    @Autowired
    private ISysI18nOverrideService overrideService;

    /**
     * 获取指定语言的 i18n 覆盖清单
     *
     * @param lang 语言代码（zh / en）
     * @return { lang, items: [{ keyPath, value }, ...] }
     */
    @Anonymous
    @GetMapping("/manifest")
    public AjaxResult getManifest(@RequestParam(value = "lang", required = false, defaultValue = "zh") String lang)
    {
        List<SysI18nOverride> rows = overrideService.listByLang(lang);
        List<Map<String, String>> items = new ArrayList<>(rows.size());
        for (SysI18nOverride row : rows)
        {
            Map<String, String> item = new HashMap<>(2);
            item.put("keyPath", row.getKeyPath());
            item.put("value", row.getValue());
            items.add(item);
        }
        AjaxResult result = AjaxResult.success();
        result.put("lang", lang);
        result.put("items", items);
        return result;
    }
}
