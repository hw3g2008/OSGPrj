package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.ruoyi.common.core.domain.entity.SysDictData;
import com.ruoyi.system.domain.OsgPosition;
import com.ruoyi.system.mapper.OsgCoachingMapper;
import com.ruoyi.system.mapper.OsgJobApplicationMapper;
import com.ruoyi.system.mapper.OsgPositionMapper;
import com.ruoyi.system.mapper.SysDictDataMapper;

@ExtendWith(MockitoExtension.class)
class OsgPositionServiceImplTest
{
    @InjectMocks
    private OsgPositionServiceImpl service;

    @Mock
    private OsgPositionMapper positionMapper;

    @Mock
    private SysDictDataMapper sysDictDataMapper;

    @Mock
    private OsgJobApplicationMapper jobApplicationMapper;

    @Mock
    private OsgCoachingMapper coachingMapper;

    @Test
    void selectPositionMetaDoesNotRewriteNormalizedReferenceData()
    {
        when(positionMapper.selectPositionList(any(OsgPosition.class))).thenReturn(List.of(
            position(201L, "Investment Bank", "Goldman Sachs", "Summer Analyst", "na", "New York", "2026 Summer", "2026"),
            position(202L, "Consulting", "McKinsey", "Business Analyst", "eu", "London", "2025 Full-time", "2025")
        ));
        Map<String, List<SysDictData>> dictRows = normalizedDictRows();
        when(sysDictDataMapper.selectDictDataByType(anyString())).thenAnswer(invocation ->
            dictRows.getOrDefault(invocation.getArgument(0), List.of()));

        Map<String, Object> meta = service.selectPositionMeta();

        assertEquals("summer", valueAt(meta, "categories", 0));
        assertEquals("2026 Summer", valueAt(meta, "recruitmentCycles", 7));
        verify(sysDictDataMapper, never()).updateDictData(any(SysDictData.class));
        verify(sysDictDataMapper, never()).insertDictData(any(SysDictData.class));
        verify(sysDictDataMapper, never()).deleteDictDataById(any());
        verify(positionMapper, never()).updatePosition(any(OsgPosition.class));
    }

    @SuppressWarnings("unchecked")
    private String valueAt(Map<String, Object> meta, String key, int index)
    {
        List<Map<String, Object>> options = (List<Map<String, Object>>) meta.get(key);
        return String.valueOf(options.get(index).get("value"));
    }

    private OsgPosition position(Long positionId, String industry, String companyName, String positionName,
                                 String region, String city, String recruitmentCycle, String projectYear)
    {
        OsgPosition position = new OsgPosition();
        position.setPositionId(positionId);
        position.setPositionCategory("summer");
        position.setIndustry(industry);
        position.setCompanyName(companyName);
        position.setCompanyType(industry);
        position.setPositionName(positionName);
        position.setRegion(region);
        position.setCity(city);
        position.setRecruitmentCycle(recruitmentCycle);
        position.setProjectYear(projectYear);
        position.setDisplayStatus("visible");
        position.setPublishTime(Timestamp.valueOf(LocalDateTime.of(2026, 3, 20, 10, 0)));
        return position;
    }

    private Map<String, List<SysDictData>> normalizedDictRows()
    {
        Map<String, List<SysDictData>> rows = new LinkedHashMap<>();
        rows.put("osg_position_category", List.of(
                dict("osg_position_category", "summer", "暑期实习", 1L, null, null, null),
                dict("osg_position_category", "fulltime", "全职招聘", 2L, null, null, null),
                dict("osg_position_category", "offcycle", "非常规周期", 3L, null, null, null),
                dict("osg_position_category", "spring", "春季实习", 4L, null, null, null),
                dict("osg_position_category", "events", "招聘活动", 5L, null, null, null)
            ));
        rows.put("osg_position_display_status", List.of(
                dict("osg_position_display_status", "visible", "展示中", 1L, "success", null, null),
                dict("osg_position_display_status", "hidden", "已隐藏", 2L, "muted", null, null),
                dict("osg_position_display_status", "expired", "已过期", 3L, "danger", null, null)
            ));
        rows.put("osg_position_industry", List.of(
                dict("osg_position_industry", "Investment Bank", "Investment Bank", 1L, "gold", "mdi-star", null),
                dict("osg_position_industry", "Consulting", "Consulting", 2L, "violet", "mdi-lightbulb", null),
                dict("osg_position_industry", "Tech", "Tech", 3L, "blue", "mdi-laptop", null),
                dict("osg_position_industry", "PE/VC", "PE/VC", 4L, "amber", "mdi-chart-line", null)
            ));
        rows.put("osg_company_type", List.of(
                dict("osg_company_type", "Investment Bank", "Investment Bank", 1L, null, null, null),
                dict("osg_company_type", "Consulting", "Consulting", 2L, null, null, null),
                dict("osg_company_type", "Tech", "Tech", 3L, null, null, null),
                dict("osg_company_type", "PE/VC", "PE/VC", 4L, null, null, null),
                dict("osg_company_type", "PE", "PE", 5L, null, null, null),
                dict("osg_company_type", "VC", "VC", 6L, null, null, null),
                dict("osg_company_type", "Other", "Other", 7L, null, null, null)
            ));
        rows.put("osg_recruitment_cycle", List.of(
                dict("osg_recruitment_cycle", "Spring Week", "Spring Week", 1L, null, null, null),
                dict("osg_recruitment_cycle", "2024 Spring", "2024 Spring", 2L, null, null, null),
                dict("osg_recruitment_cycle", "2025 Spring", "2025 Spring", 3L, null, null, null),
                dict("osg_recruitment_cycle", "2026 Spring", "2026 Spring", 4L, null, null, null),
                dict("osg_recruitment_cycle", "2027 Spring", "2027 Spring", 5L, null, null, null),
                dict("osg_recruitment_cycle", "2024 Summer", "2024 Summer", 6L, null, null, null),
                dict("osg_recruitment_cycle", "2025 Summer", "2025 Summer", 7L, null, null, null),
                dict("osg_recruitment_cycle", "2026 Summer", "2026 Summer", 8L, null, null, null),
                dict("osg_recruitment_cycle", "2027 Summer", "2027 Summer", 9L, null, null, null),
                dict("osg_recruitment_cycle", "2024 Autumn", "2024 Autumn", 10L, null, null, null),
                dict("osg_recruitment_cycle", "2025 Autumn", "2025 Autumn", 11L, null, null, null),
                dict("osg_recruitment_cycle", "2026 Autumn", "2026 Autumn", 12L, null, null, null),
                dict("osg_recruitment_cycle", "2027 Autumn", "2027 Autumn", 13L, null, null, null),
                dict("osg_recruitment_cycle", "2024 Full-time", "2024 Full-time", 14L, null, null, null),
                dict("osg_recruitment_cycle", "2025 Full-time", "2025 Full-time", 15L, null, null, null),
                dict("osg_recruitment_cycle", "2026 Full-time", "2026 Full-time", 16L, null, null, null),
                dict("osg_recruitment_cycle", "2027 Full-time", "2027 Full-time", 17L, null, null, null),
                dict("osg_recruitment_cycle", "Off-cycle", "Off-cycle", 18L, null, null, null)
            ));
        rows.put("osg_project_year", List.of(
                dict("osg_project_year", "2024", "2024", 1L, null, null, null),
                dict("osg_project_year", "2025", "2025", 2L, null, null, null),
                dict("osg_project_year", "2026", "2026", 3L, null, null, null),
                dict("osg_project_year", "2027", "2027", 4L, null, null, null)
            ));
        rows.put("osg_position_region", List.of(
                dict("osg_position_region", "na", "北美", 1L, null, null, null),
                dict("osg_position_region", "eu", "欧洲", 2L, null, null, null),
                dict("osg_position_region", "ap", "亚太", 3L, null, null, null),
                dict("osg_position_region", "cn", "中国大陆", 4L, null, null, null)
            ));
        rows.put("osg_position_city", List.of(
                dict("osg_position_city", "New York", "New York", 1L, null, "na", null),
                dict("osg_position_city", "San Francisco", "San Francisco", 2L, null, "na", null),
                dict("osg_position_city", "Chicago", "Chicago", 3L, null, "na", null),
                dict("osg_position_city", "Boston", "Boston", 4L, null, "na", null),
                dict("osg_position_city", "London", "London", 5L, null, "eu", null),
                dict("osg_position_city", "Frankfurt", "Frankfurt", 6L, null, "eu", null),
                dict("osg_position_city", "Hong Kong", "Hong Kong", 7L, null, "ap", null),
                dict("osg_position_city", "Singapore", "Singapore", 8L, null, "ap", null),
                dict("osg_position_city", "Tokyo", "Tokyo", 9L, null, "ap", null),
                dict("osg_position_city", "Shanghai", "Shanghai", 10L, null, "cn", null),
                dict("osg_position_city", "Beijing", "Beijing", 11L, null, "cn", null)
            ));
        rows.put("osg_position_publish_preset", List.of(
                dict("osg_position_publish_preset", "week", "本周", 1L, null, null, null),
                dict("osg_position_publish_preset", "month", "本月", 2L, null, null, null),
                dict("osg_position_publish_preset", "quarter", "近三个月", 3L, null, null, null)
            ));
        rows.put("osg_position_process_glossary", List.of(
                dict("osg_position_process_glossary", "OA", "Online Assessment", 1L, null, null, null),
                dict("osg_position_process_glossary", "VI", "Video Interview", 2L, null, null, null),
                dict("osg_position_process_glossary", "HV", "Hirevue", 3L, null, null, null),
                dict("osg_position_process_glossary", "AC", "Assessment Centre", 4L, null, null, null),
                dict("osg_position_process_glossary", "SD", "Super Day", 5L, null, null, null),
                dict("osg_position_process_glossary", "Case", "Case Interview", 6L, null, null, null)
            ));
        rows.put("osg_position_ui_copy", List.of(
                dict("osg_position_ui_copy", "upload_rule", "银行名称 + 岗位名称 + 地区 + 项目时间；当前系统按公司名称 + 岗位名称 + 地区 + 项目时间 相同视为重复，将跳过导入", 1L, null, null, null),
                dict("osg_position_ui_copy", "upload_step_1", "点击上方\"下载模板\"按钮获取Excel模板", 2L, null, null, null),
                dict("osg_position_ui_copy", "upload_step_2", "按模板格式填写岗位信息（所有字段必填）", 3L, null, null, null),
                dict("osg_position_ui_copy", "upload_step_3", "上传填写好的文件", 4L, null, null, null)
            ));
        return rows;
    }

    private SysDictData dict(String dictType, String dictValue, String dictLabel, Long dictSort,
                             String cssClass, String listClass, String remark)
    {
        SysDictData dict = new SysDictData();
        dict.setDictType(dictType);
        dict.setDictValue(dictValue);
        dict.setDictLabel(dictLabel);
        dict.setDictSort(dictSort);
        dict.setCssClass(cssClass);
        dict.setListClass(listClass);
        dict.setRemark(remark);
        dict.setStatus("0");
        return dict;
    }
}
