package com.ruoyi.system.domain;

import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;
import com.ruoyi.common.core.domain.BaseEntity;

/**
 * 业务可编辑的 i18n 覆盖表 sys_i18n_override
 *
 * 用途：允许运营/业务通过后台覆盖前端 i18n 文案，前端启动时拉取 manifest
 * 并通过 vue-i18n 的 mergeLocaleMessage 合并到打包内置词条之上。
 *
 * @author osg
 */
public class SysI18nOverride extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 主键 */
    private Long id;

    /** 语言代码，例如 zh / en */
    private String lang;

    /** 点号路径，对应 i18n messages 树的 key，例如 dictText.coaching_type.interview */
    private String keyPath;

    /** 覆盖后的文案 */
    private String value;

    /** 顶层分组（可选，便于后台筛选），例如 admin / student / dictText */
    private String scope;

    public Long getId()
    {
        return id;
    }

    public void setId(Long id)
    {
        this.id = id;
    }

    public String getLang()
    {
        return lang;
    }

    public void setLang(String lang)
    {
        this.lang = lang;
    }

    public String getKeyPath()
    {
        return keyPath;
    }

    public void setKeyPath(String keyPath)
    {
        this.keyPath = keyPath;
    }

    public String getValue()
    {
        return value;
    }

    public void setValue(String value)
    {
        this.value = value;
    }

    public String getScope()
    {
        return scope;
    }

    public void setScope(String scope)
    {
        this.scope = scope;
    }

    @Override
    public String toString() {
        return new ToStringBuilder(this, ToStringStyle.MULTI_LINE_STYLE)
            .append("id", getId())
            .append("lang", getLang())
            .append("keyPath", getKeyPath())
            .append("value", getValue())
            .append("scope", getScope())
            .append("remark", getRemark())
            .append("createBy", getCreateBy())
            .append("createTime", getCreateTime())
            .append("updateBy", getUpdateBy())
            .append("updateTime", getUpdateTime())
            .toString();
    }
}
