package com.ruoyi.system.domain.dto.feedback;

import java.util.List;

/**
 * 基础课程课消反馈 DTO（§4.3 schemaVersion=1）。
 * <p>
 * 结构：{schemaVersion, subType, topicIds?, requiredTopicIds?, electiveTopicIds?,
 *        originalResumeUrl?, updatedResumeUrl?, narrative?}
 * <br>
 * subType 对应六个二级类型（§3.5.5）：
 * <ul>
 *   <li>tech — 技术：必修 T01-T19 / 选修 T20-T24</li>
 *   <li>behavior — 行为训练：B0-B7</li>
 *   <li>new_resume — 新简历制作</li>
 *   <li>resume_update — 简历更新（含 originalResumeUrl / updatedResumeUrl）</li>
 *   <li>case_study — 咨询案例准备</li>
 *   <li>other — 其它</li>
 * </ul>
 */
public class BaseCourseFeedback
{
    private static final int SCHEMA_VERSION = 1;

    private int schemaVersion = SCHEMA_VERSION;

    /**
     * 基础课二级类型（§3.5.5）。
     */
    private String subType;

    /**
     * 行为训练（behavior）时选中的题目 ID 列表（B0-B7）。
     */
    private List<String> topicIds;

    /**
     * 技术（tech）必修题目 ID 列表（T01-T19）。
     * 正常上课时至少 1 项（§3.5.5 校验规则）。
     */
    private List<String> requiredTopicIds;

    /**
     * 技术（tech）选修题目 ID 列表（T20-T24，可为空）。
     */
    private List<String> electiveTopicIds;

    /**
     * 简历更新（resume_update）时原简历文件存储 URL（§3.5.5）。
     */
    private String originalResumeUrl;

    /**
     * 简历更新（resume_update）时修改后简历文件存储 URL（§3.5.5）。
     */
    private String updatedResumeUrl;

    /**
     * 通用反馈文本框（new_resume / case_study / other / resume_update 时使用）。
     */
    private String narrative;

    public int getSchemaVersion()
    {
        return schemaVersion;
    }

    public void setSchemaVersion(int schemaVersion)
    {
        this.schemaVersion = schemaVersion;
    }

    public String getSubType()
    {
        return subType;
    }

    public void setSubType(String subType)
    {
        this.subType = subType;
    }

    public List<String> getTopicIds()
    {
        return topicIds;
    }

    public void setTopicIds(List<String> topicIds)
    {
        this.topicIds = topicIds;
    }

    public List<String> getRequiredTopicIds()
    {
        return requiredTopicIds;
    }

    public void setRequiredTopicIds(List<String> requiredTopicIds)
    {
        this.requiredTopicIds = requiredTopicIds;
    }

    public List<String> getElectiveTopicIds()
    {
        return electiveTopicIds;
    }

    public void setElectiveTopicIds(List<String> electiveTopicIds)
    {
        this.electiveTopicIds = electiveTopicIds;
    }

    public String getOriginalResumeUrl()
    {
        return originalResumeUrl;
    }

    public void setOriginalResumeUrl(String originalResumeUrl)
    {
        this.originalResumeUrl = originalResumeUrl;
    }

    public String getUpdatedResumeUrl()
    {
        return updatedResumeUrl;
    }

    public void setUpdatedResumeUrl(String updatedResumeUrl)
    {
        this.updatedResumeUrl = updatedResumeUrl;
    }

    public String getNarrative()
    {
        return narrative;
    }

    public void setNarrative(String narrative)
    {
        this.narrative = narrative;
    }
}
