package com.ruoyi.system.service.impl;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.BeanPropertyRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.ruoyi.system.domain.OsgPosition;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.OsgPositionMapper;
import com.ruoyi.system.service.IOsgAssistantPositionVisibilityService;
import com.ruoyi.system.service.IOsgStudentPositionVisibilityService;

/**
 * 助教岗位可见性聚合服务实现
 *
 * 流程：
 *   1) 查 assistant_id 所带学生列表
 *   2) 拉所有 visible 岗位
 *   3) 对每个学生跑三规则匹配，按 positionId 聚合并集
 *   4) myStudentCount = 命中该岗位的所带学生数
 */
@Service
public class OsgAssistantPositionVisibilityServiceImpl implements IOsgAssistantPositionVisibilityService
{
    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private OsgPositionMapper positionMapper;

    @Autowired
    private IOsgStudentPositionVisibilityService studentVisibilityService;

    @Override
    public List<Map<String, Object>> listForAssistant(Long assistantId)
    {
        if (assistantId == null)
        {
            return new ArrayList<>();
        }

        List<OsgStudent> ownedStudents = loadOwnedStudents(assistantId);
        if (ownedStudents.isEmpty())
        {
            return new ArrayList<>();
        }

        OsgPosition visibleQuery = new OsgPosition();
        visibleQuery.setDisplayStatus("visible");
        List<OsgPosition> visiblePositions = positionMapper.selectVisiblePublicPositionList(visibleQuery);
        if (visiblePositions == null || visiblePositions.isEmpty())
        {
            return new ArrayList<>();
        }

        // 聚合：positionId → (position, count)，保持按 visiblePositions 顺序
        Map<Long, OsgPosition> hitPositions = new LinkedHashMap<>();
        Map<Long, Integer> hitCounts = new LinkedHashMap<>();

        for (OsgStudent student : ownedStudents)
        {
            for (OsgPosition position : visiblePositions)
            {
                if (!studentVisibilityService.isVisibleToStudent(position, student))
                {
                    continue;
                }
                Long pid = position.getPositionId();
                hitPositions.putIfAbsent(pid, position);
                hitCounts.merge(pid, 1, Integer::sum);
            }
        }

        List<Map<String, Object>> rows = new ArrayList<>(hitPositions.size());
        for (Map.Entry<Long, OsgPosition> entry : hitPositions.entrySet())
        {
            rows.add(toRow(entry.getValue(), hitCounts.get(entry.getKey())));
        }
        return rows;
    }

    private List<OsgStudent> loadOwnedStudents(Long assistantId)
    {
        try
        {
            return jdbcTemplate.query(
                "select student_id, student_name, email, major_direction, sub_direction,"
                    + " target_region, recruitment_cycle, lead_mentor_id, assistant_id, account_status"
                    + " from osg_student where assistant_id = ?",
                new BeanPropertyRowMapper<>(OsgStudent.class),
                assistantId
            );
        }
        catch (org.springframework.dao.EmptyResultDataAccessException ex)
        {
            return new ArrayList<>();
        }
    }

    private Map<String, Object> toRow(OsgPosition p, int myStudentCount)
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("positionId", p.getPositionId());
        row.put("positionCategory", p.getPositionCategory());
        row.put("industry", p.getIndustry());
        row.put("companyName", p.getCompanyName());
        row.put("companyType", p.getCompanyType());
        row.put("companyWebsite", p.getCompanyWebsite());
        row.put("positionName", p.getPositionName());
        row.put("department", p.getDepartment());
        row.put("region", p.getRegion());
        row.put("city", p.getCity());
        row.put("recruitmentCycle", p.getRecruitmentCycle());
        row.put("targetMajors", p.getTargetMajors());
        row.put("projectYear", p.getProjectYear());
        row.put("publishTime", p.getPublishTime());
        row.put("deadline", p.getDeadline());
        row.put("displayStatus", p.getDisplayStatus());
        row.put("positionUrl", p.getPositionUrl());
        row.put("applicationNote", p.getApplicationNote());
        row.put("myStudentCount", myStudentCount);
        return row;
    }
}
