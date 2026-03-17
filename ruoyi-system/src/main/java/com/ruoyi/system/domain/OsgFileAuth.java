package com.ruoyi.system.domain;

import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;
import com.ruoyi.common.core.domain.BaseEntity;

public class OsgFileAuth extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    private Long authId;
    private Long fileId;
    private String authType;
    private String targetValue;
    private String targetLabel;

    public Long getAuthId()
    {
        return authId;
    }

    public void setAuthId(Long authId)
    {
        this.authId = authId;
    }

    public Long getFileId()
    {
        return fileId;
    }

    public void setFileId(Long fileId)
    {
        this.fileId = fileId;
    }

    public String getAuthType()
    {
        return authType;
    }

    public void setAuthType(String authType)
    {
        this.authType = authType;
    }

    public String getTargetValue()
    {
        return targetValue;
    }

    public void setTargetValue(String targetValue)
    {
        this.targetValue = targetValue;
    }

    public String getTargetLabel()
    {
        return targetLabel;
    }

    public void setTargetLabel(String targetLabel)
    {
        this.targetLabel = targetLabel;
    }

    @Override
    public String toString()
    {
        return new ToStringBuilder(this, ToStringStyle.MULTI_LINE_STYLE)
            .append("authId", getAuthId())
            .append("fileId", getFileId())
            .append("authType", getAuthType())
            .append("targetValue", getTargetValue())
            .append("targetLabel", getTargetLabel())
            .append("createTime", getCreateTime())
            .toString();
    }
}
