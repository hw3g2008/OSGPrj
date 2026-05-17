package com.ruoyi.system.service.impl;

import java.util.Collections;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import com.ruoyi.system.domain.SysI18nOverride;
import com.ruoyi.system.mapper.SysI18nOverrideMapper;
import com.ruoyi.system.service.ISysI18nOverrideService;

/**
 * i18n 覆盖业务实现
 *
 * @author osg
 */
@Service
public class SysI18nOverrideServiceImpl implements ISysI18nOverrideService
{
    @Autowired
    private SysI18nOverrideMapper mapper;

    @Override
    public List<SysI18nOverride> listByLang(String lang)
    {
        if (!StringUtils.hasText(lang))
        {
            return Collections.emptyList();
        }
        return mapper.selectByLang(lang.trim());
    }
}
