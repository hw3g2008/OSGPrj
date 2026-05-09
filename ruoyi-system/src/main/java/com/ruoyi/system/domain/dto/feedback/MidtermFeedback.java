package com.ruoyi.system.domain.dto.feedback;

/**
 * 模拟期中考试 / 通讯测试课消反馈 DTO（§4.3 schemaVersion=1）。
 * <p>
 * 结构：{schemaVersion, score, perItemAnalysis, progressAssessment}
 * <br>
 * progressAssessment 取值：level1-level5，对应「远低于预期」到「远高于预期」（§3.5.4）。
 */
public class MidtermFeedback
{
    private static final int SCHEMA_VERSION = 1;

    private int schemaVersion = SCHEMA_VERSION;

    /**
     * 得分（0-100）（§3.5.4）。
     */
    private Integer score;

    /**
     * 逐题分析（自由文本或 JSON 对象，以 Object 类型兼容）（§3.5.4）。
     */
    private String perItemAnalysis;

    /**
     * 进度评估（§3.5.4）：level1~level5。
     */
    private String progressAssessment;

    public int getSchemaVersion()
    {
        return schemaVersion;
    }

    public void setSchemaVersion(int schemaVersion)
    {
        this.schemaVersion = schemaVersion;
    }

    public Integer getScore()
    {
        return score;
    }

    public void setScore(Integer score)
    {
        this.score = score;
    }

    public String getPerItemAnalysis()
    {
        return perItemAnalysis;
    }

    public void setPerItemAnalysis(String perItemAnalysis)
    {
        this.perItemAnalysis = perItemAnalysis;
    }

    public String getProgressAssessment()
    {
        return progressAssessment;
    }

    public void setProgressAssessment(String progressAssessment)
    {
        this.progressAssessment = progressAssessment;
    }
}
