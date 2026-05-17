package com.ruoyi.system.service;

import java.util.List;
import com.ruoyi.system.domain.SysI18nOverride;

/**
 * i18n 覆盖业务层
 *
 * @author osg
 */
public interface ISysI18nOverrideService
{
    /**
     * 按语言查询所有覆盖条目（manifest 拉取）
     *
     * @param lang 语言代码
     * @return 该语言的覆盖条目集合
     */
    List<SysI18nOverride> listByLang(String lang);
}
