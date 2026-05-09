package com.ruoyi.system.domain.dto.feedback;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 人际关系课消反馈 DTO（§4.3 schemaVersion=1）。
 * <p>
 * 结构：{schemaVersion, metrics:{emailQuality, etiquette, smallTalk, callQuality, thankYouEmail},
 *        recommendation, narrative}
 * <br>
 * screenshotUrls 不落在 JSON 里，而是落在独立列 {@code osg_class_record.screenshot_urls}（§4.3）。
 */
public class RelationFeedback
{
    private static final int SCHEMA_VERSION = 1;

    private int schemaVersion = SCHEMA_VERSION;

    /**
     * 5 项评分指标（§3.5.3）。
     * <ul>
     *   <li>emailQuality：电子邮件质量 1-5</li>
     *   <li>etiquette：礼仪 1-5</li>
     *   <li>smallTalk：闲聊 1-10</li>
     *   <li>callQuality：通话 1-10</li>
     *   <li>thankYouEmail：感谢邮件 1-3</li>
     * </ul>
     */
    private Map<String, Object> metrics = new LinkedHashMap<>();

    /**
     * 是否推荐：yes / no / maybe（§3.5.3）。
     */
    private String recommendation;

    /**
     * 通用反馈文本框（§3.5.3）。
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

    public Map<String, Object> getMetrics()
    {
        return metrics;
    }

    public void setMetrics(Map<String, Object> metrics)
    {
        this.metrics = metrics;
    }

    public String getRecommendation()
    {
        return recommendation;
    }

    public void setRecommendation(String recommendation)
    {
        this.recommendation = recommendation;
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
