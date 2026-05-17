package com.ruoyi.system.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Param;
import com.ruoyi.system.domain.SysI18nOverride;

/**
 * i18n 覆盖表 数据层
 *
 * @author osg
 */
public interface SysI18nOverrideMapper
{
    /**
     * 按语言查询所有启用的覆盖条目（用于前端 manifest 拉取）
     *
     * @param lang 语言代码
     * @return 该语言下的所有覆盖条目
     */
    List<SysI18nOverride> selectByLang(@Param("lang") String lang);
}
