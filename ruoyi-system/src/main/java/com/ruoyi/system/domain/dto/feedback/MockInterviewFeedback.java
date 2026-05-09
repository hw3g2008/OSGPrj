package com.ruoyi.system.domain.dto.feedback;

/**
 * 模拟面试课消反馈 DTO（§4.3 schemaVersion=1）。
 * <p>
 * 结构与 {@link JobCoachingFeedback} 完全一致（§3.5.2 同岗位辅导，5 项）。
 * 使用独立类型以便未来分化演进。
 */
public class MockInterviewFeedback
{
    private static final int SCHEMA_VERSION = 1;

    private int schemaVersion = SCHEMA_VERSION;

    /** 模拟面试的目的 */
    private String purpose;

    /** 涉及的概念和主题 */
    private String concept;

    /** 学员需要改进的方面 */
    private String improvement;

    /** 学员表现评价（4 档 emoji 文本） */
    private String performance;

    /** 你在这个模拟面试中希望做但没做的事情 */
    private String wishedButNotDone;

    public int getSchemaVersion()
    {
        return schemaVersion;
    }

    public void setSchemaVersion(int schemaVersion)
    {
        this.schemaVersion = schemaVersion;
    }

    public String getPurpose()
    {
        return purpose;
    }

    public void setPurpose(String purpose)
    {
        this.purpose = purpose;
    }

    public String getConcept()
    {
        return concept;
    }

    public void setConcept(String concept)
    {
        this.concept = concept;
    }

    public String getImprovement()
    {
        return improvement;
    }

    public void setImprovement(String improvement)
    {
        this.improvement = improvement;
    }

    public String getPerformance()
    {
        return performance;
    }

    public void setPerformance(String performance)
    {
        this.performance = performance;
    }

    public String getWishedButNotDone()
    {
        return wishedButNotDone;
    }

    public void setWishedButNotDone(String wishedButNotDone)
    {
        this.wishedButNotDone = wishedButNotDone;
    }
}
