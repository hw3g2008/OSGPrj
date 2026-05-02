package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;

/**
 * 助教岗位可见性聚合服务
 * <p>
 * 输入助教用户ID，返回该助教所带学生命中（三规则可见性）的岗位并集，
 * 每行附带 myStudentCount = 命中该岗位的所带学生数。
 * <p>
 * 关联文档:
 *   PRD: §1.2 + §四 Q12 / Q19b
 *   SRS: FR-CPV-002
 *   开发文档: §3.4
 */
public interface IOsgAssistantPositionVisibilityService
{
    List<Map<String, Object>> listForAssistant(Long assistantId);
}
