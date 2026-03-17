package com.ruoyi.system.service.impl;

import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgPosition;
import com.ruoyi.system.mapper.OsgPositionMapper;
import com.ruoyi.system.service.IOsgPositionService;

@Service
public class OsgPositionServiceImpl implements IOsgPositionService
{
    private static final ZoneId ZONE_ID = ZoneId.systemDefault();

    @Autowired
    private OsgPositionMapper positionMapper;

    @Override
    public OsgPosition selectPositionByPositionId(Long positionId)
    {
        return positionMapper.selectPositionByPositionId(positionId);
    }

    @Override
    public List<OsgPosition> selectPositionList(OsgPosition position)
    {
        List<OsgPosition> rows = positionMapper.selectPositionList(position);
        return rows == null ? new ArrayList<>() : rows;
    }

    @Override
    public Map<String, Object> selectPositionStats(OsgPosition position)
    {
        List<OsgPosition> rows = selectPositionList(position);
        LocalDateTime now = LocalDateTime.now();
        int openPositions = 0;
        int closingSoonPositions = 0;
        int closedPositions = 0;
        int studentApplications = 0;
        for (OsgPosition row : rows)
        {
            String displayStatus = normalizeDisplayStatus(row.getDisplayStatus());
            if ("visible".equals(displayStatus))
            {
                openPositions++;
                if (row.getDeadline() != null)
                {
                    LocalDateTime deadline = LocalDateTime.ofInstant(row.getDeadline().toInstant(), ZONE_ID);
                    if (!deadline.isBefore(now) && !deadline.isAfter(now.plusDays(7)))
                    {
                        closingSoonPositions++;
                    }
                }
            }
            else
            {
                closedPositions++;
            }
            studentApplications += row.getStudentCount() == null ? 0 : row.getStudentCount();
        }

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalPositions", rows.size());
        stats.put("openPositions", openPositions);
        stats.put("closingSoonPositions", closingSoonPositions);
        stats.put("closedPositions", closedPositions);
        stats.put("studentApplications", studentApplications);
        return stats;
    }

    @Override
    public List<Map<String, Object>> selectPositionDrillDown(OsgPosition position)
    {
        List<OsgPosition> rows = selectPositionList(position);
        Map<String, List<OsgPosition>> industryGroups = rows.stream()
            .collect(Collectors.groupingBy(
                row -> defaultText(row.getIndustry(), "Other"),
                LinkedHashMap::new,
                Collectors.toList()
            ));

        List<Map<String, Object>> result = new ArrayList<>(industryGroups.size());
        for (Map.Entry<String, List<OsgPosition>> industryEntry : industryGroups.entrySet())
        {
            List<OsgPosition> industryRows = industryEntry.getValue();
            Map<String, List<OsgPosition>> companyGroups = industryRows.stream()
                .collect(Collectors.groupingBy(
                    row -> defaultText(row.getCompanyName(), "-"),
                    LinkedHashMap::new,
                    Collectors.toList()
                ));

            List<Map<String, Object>> companies = new ArrayList<>(companyGroups.size());
            int industryStudentCount = 0;
            int industryOpenCount = 0;
            for (Map.Entry<String, List<OsgPosition>> companyEntry : companyGroups.entrySet())
            {
                List<OsgPosition> companyRows = companyEntry.getValue();
                int companyStudentCount = companyRows.stream()
                    .mapToInt(row -> row.getStudentCount() == null ? 0 : row.getStudentCount())
                    .sum();
                int companyOpenCount = (int) companyRows.stream()
                    .filter(row -> "visible".equals(normalizeDisplayStatus(row.getDisplayStatus())))
                    .count();

                List<Map<String, Object>> positions = companyRows.stream()
                    .map(this::toPositionMap)
                    .toList();

                Map<String, Object> company = new LinkedHashMap<>();
                company.put("companyName", companyEntry.getKey());
                company.put("companyType", defaultText(companyRows.get(0).getCompanyType(), "-"));
                company.put("companyWebsite", defaultText(companyRows.get(0).getCompanyWebsite(), ""));
                company.put("positionCount", companyRows.size());
                company.put("openCount", companyOpenCount);
                company.put("studentCount", companyStudentCount);
                company.put("positions", positions);
                companies.add(company);

                industryStudentCount += companyStudentCount;
                industryOpenCount += companyOpenCount;
            }

            Map<String, Object> industry = new LinkedHashMap<>();
            industry.put("industry", industryEntry.getKey());
            industry.put("companyCount", companyGroups.size());
            industry.put("positionCount", industryRows.size());
            industry.put("openCount", industryOpenCount);
            industry.put("studentCount", industryStudentCount);
            industry.put("companies", companies);
            result.add(industry);
        }
        return result;
    }

    @Override
    public Map<String, Object> createPosition(Map<String, Object> body, String username)
    {
        OsgPosition position = buildPosition(body, true);
        position.setCreateBy(username);
        position.setUpdateBy(username);
        if (positionMapper.insertPosition(position) <= 0)
        {
            throw new ServiceException("岗位新增失败");
        }

        OsgPosition persisted = positionMapper.selectPositionByPositionId(position.getPositionId());
        return toPositionMap(persisted == null ? position : persisted);
    }

    @Override
    public Map<String, Object> updatePosition(Map<String, Object> body, String username)
    {
        Long positionId = asLong(body.get("positionId"));
        if (positionId == null)
        {
            throw new ServiceException("岗位ID不能为空");
        }

        OsgPosition existing = positionMapper.selectPositionByPositionId(positionId);
        if (existing == null)
        {
            throw new ServiceException("岗位不存在");
        }

        OsgPosition position = buildPosition(body, false);
        position.setPositionId(positionId);
        position.setUpdateBy(username);
        if (positionMapper.updatePosition(position) <= 0)
        {
            throw new ServiceException("岗位更新失败");
        }

        OsgPosition persisted = positionMapper.selectPositionByPositionId(positionId);
        return toPositionMap(persisted == null ? mergeFallback(existing, position) : persisted);
    }

    @Override
    public Map<String, Object> batchUploadPositions(MultipartFile file, String username)
    {
        if (file == null || file.isEmpty())
        {
            throw new ServiceException("上传文件不能为空");
        }

        List<OsgPosition> existingRows = selectPositionList(new OsgPosition());
        Set<String> existingKeys = existingRows.stream()
            .map(this::buildDedupKey)
            .filter(Objects::nonNull)
            .collect(Collectors.toCollection(LinkedHashSet::new));

        int totalCount = 0;
        int successCount = 0;
        List<String> duplicates = new ArrayList<>();
        Set<String> seenInFile = new LinkedHashSet<>();
        DataFormatter formatter = new DataFormatter();

        try (InputStream inputStream = file.getInputStream(); XSSFWorkbook workbook = new XSSFWorkbook(inputStream))
        {
            XSSFSheet sheet = workbook.getSheetAt(0);
            Map<String, Integer> headerIndexes = readHeaderIndexes(sheet.getRow(0), formatter);
            for (int rowIndex = 1; rowIndex <= sheet.getLastRowNum(); rowIndex++)
            {
                Row row = sheet.getRow(rowIndex);
                if (row == null || isBlankRow(row, headerIndexes, formatter))
                {
                    continue;
                }

                totalCount++;
                OsgPosition position = buildPositionFromRow(row, headerIndexes, formatter);
                String dedupKey = buildDedupKey(position);
                String label = buildDuplicateLabel(position);
                if (existingKeys.contains(dedupKey) || seenInFile.contains(dedupKey))
                {
                    duplicates.add(label);
                    continue;
                }

                position.setCreateBy(username);
                position.setUpdateBy(username);
                positionMapper.insertPosition(position);
                successCount++;
                existingKeys.add(dedupKey);
                seenInFile.add(dedupKey);
            }
        }
        catch (ServiceException ex)
        {
            throw ex;
        }
        catch (Exception ex)
        {
            throw new ServiceException("岗位批量上传解析失败");
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalCount", totalCount);
        result.put("successCount", successCount);
        result.put("duplicateCount", duplicates.size());
        result.put("duplicates", duplicates);
        return result;
    }

    private OsgPosition buildPosition(Map<String, Object> body, boolean validateRequired)
    {
        OsgPosition position = new OsgPosition();
        position.setPositionCategory(asText(body.get("positionCategory")));
        position.setIndustry(asText(body.get("industry")));
        position.setCompanyName(asText(body.get("companyName")));
        position.setCompanyType(defaultText(asText(body.get("companyType")), position.getIndustry()));
        position.setCompanyWebsite(asText(body.get("companyWebsite")));
        position.setPositionName(asText(body.get("positionName")));
        position.setDepartment(asText(body.get("department")));
        position.setRegion(asText(body.get("region")));
        position.setCity(asText(body.get("city")));
        position.setRecruitmentCycle(asText(body.get("recruitmentCycle")));
        position.setProjectYear(asText(body.get("projectYear")));
        position.setPublishTime(asDate(body.get("publishTime")));
        position.setDeadline(asDate(body.get("deadline")));
        position.setDisplayStatus(normalizeDisplayStatus(asText(body.get("displayStatus"))));
        position.setDisplayStartTime(asDate(body.get("displayStartTime")));
        position.setDisplayEndTime(asDate(body.get("displayEndTime")));
        position.setPositionUrl(asText(body.get("positionUrl")));
        position.setApplicationNote(asText(body.get("applicationNote")));
        position.setKeyword(asText(body.get("keyword")));

        if (validateRequired)
        {
            require(position.getPositionCategory(), "岗位分类不能为空");
            require(position.getIndustry(), "行业不能为空");
            require(position.getCompanyName(), "公司名称不能为空");
            require(position.getPositionName(), "岗位名称不能为空");
            require(position.getRegion(), "大区不能为空");
            require(position.getCity(), "城市不能为空");
            require(position.getRecruitmentCycle(), "招聘周期不能为空");
            require(position.getProjectYear(), "项目时间不能为空");
        }

        if (position.getPublishTime() == null)
        {
            position.setPublishTime(new Date());
        }
        if (position.getDisplayStartTime() == null)
        {
            position.setDisplayStartTime(new Date());
        }
        if (position.getDisplayEndTime() == null)
        {
            position.setDisplayEndTime(Date.from(LocalDateTime.now().plusDays(90).atZone(ZONE_ID).toInstant()));
        }
        if (position.getDisplayStatus() == null)
        {
            position.setDisplayStatus("visible");
        }
        return position;
    }

    private OsgPosition buildPositionFromRow(Row row, Map<String, Integer> headerIndexes, DataFormatter formatter)
    {
        OsgPosition position = new OsgPosition();
        position.setCompanyName(readCell(row, headerIndexes, formatter, "company_name"));
        position.setPositionName(readCell(row, headerIndexes, formatter, "position_name"));
        position.setRegion(readCell(row, headerIndexes, formatter, "region"));
        position.setCity(readCell(row, headerIndexes, formatter, "city"));
        position.setProjectYear(readCell(row, headerIndexes, formatter, "project_year"));
        position.setIndustry(defaultText(readCell(row, headerIndexes, formatter, "industry"), "Other"));
        position.setPositionCategory(defaultText(readCell(row, headerIndexes, formatter, "position_category"), "summer"));
        position.setCompanyType(defaultText(readCell(row, headerIndexes, formatter, "company_type"), position.getIndustry()));
        position.setRecruitmentCycle(defaultText(readCell(row, headerIndexes, formatter, "recruitment_cycle"), position.getProjectYear()));
        position.setPublishTime(new Date());
        position.setDisplayStatus("visible");
        position.setDisplayStartTime(new Date());
        position.setDisplayEndTime(Date.from(LocalDateTime.now().plusDays(90).atZone(ZONE_ID).toInstant()));

        require(position.getCompanyName(), "公司名称不能为空");
        require(position.getPositionName(), "岗位名称不能为空");
        require(position.getRegion(), "大区不能为空");
        require(position.getCity(), "城市不能为空");
        require(position.getProjectYear(), "项目时间不能为空");
        return position;
    }

    private Map<String, Integer> readHeaderIndexes(Row headerRow, DataFormatter formatter)
    {
        if (headerRow == null)
        {
            throw new ServiceException("Excel表头不能为空");
        }

        Map<String, Integer> indexes = new LinkedHashMap<>();
        for (Cell cell : headerRow)
        {
            String name = formatter.formatCellValue(cell);
            if (name != null && !name.isBlank())
            {
                indexes.put(name.trim().toLowerCase(Locale.ROOT), cell.getColumnIndex());
            }
        }
        return indexes;
    }

    private boolean isBlankRow(Row row, Map<String, Integer> headerIndexes, DataFormatter formatter)
    {
        for (Integer columnIndex : headerIndexes.values())
        {
            String value = formatter.formatCellValue(row.getCell(columnIndex));
            if (value != null && !value.isBlank())
            {
                return false;
            }
        }
        return true;
    }

    private String readCell(Row row, Map<String, Integer> headerIndexes, DataFormatter formatter, String key)
    {
        Integer columnIndex = headerIndexes.get(key);
        if (columnIndex == null)
        {
            return null;
        }
        return asText(formatter.formatCellValue(row.getCell(columnIndex)));
    }

    private String buildDedupKey(OsgPosition position)
    {
        if (position == null)
        {
            return null;
        }
        return String.join("::",
            defaultText(position.getCompanyName(), ""),
            defaultText(position.getPositionName(), ""),
            defaultText(position.getRegion(), ""),
            defaultText(position.getCity(), ""),
            defaultText(position.getProjectYear(), "")
        ).toLowerCase(Locale.ROOT);
    }

    private String buildDuplicateLabel(OsgPosition position)
    {
        return "%s / %s / %s / %s".formatted(
            defaultText(position.getCompanyName(), "-"),
            defaultText(position.getPositionName(), "-"),
            defaultText(position.getCity(), "-"),
            defaultText(position.getProjectYear(), "-")
        );
    }

    private Map<String, Object> toPositionMap(OsgPosition position)
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("positionId", position.getPositionId());
        row.put("positionCategory", position.getPositionCategory());
        row.put("industry", position.getIndustry());
        row.put("companyName", position.getCompanyName());
        row.put("companyType", position.getCompanyType());
        row.put("companyWebsite", defaultText(position.getCompanyWebsite(), ""));
        row.put("positionName", position.getPositionName());
        row.put("department", defaultText(position.getDepartment(), ""));
        row.put("region", position.getRegion());
        row.put("city", position.getCity());
        row.put("recruitmentCycle", position.getRecruitmentCycle());
        row.put("projectYear", position.getProjectYear());
        row.put("publishTime", position.getPublishTime());
        row.put("deadline", position.getDeadline());
        row.put("displayStatus", normalizeDisplayStatus(position.getDisplayStatus()));
        row.put("displayStartTime", position.getDisplayStartTime());
        row.put("displayEndTime", position.getDisplayEndTime());
        row.put("positionUrl", defaultText(position.getPositionUrl(), ""));
        row.put("applicationNote", defaultText(position.getApplicationNote(), ""));
        row.put("studentCount", position.getStudentCount() == null ? 0 : position.getStudentCount());
        return row;
    }

    private OsgPosition mergeFallback(OsgPosition current, OsgPosition payload)
    {
        if (payload.getDisplayStatus() != null)
        {
            current.setDisplayStatus(payload.getDisplayStatus());
        }
        if (payload.getApplicationNote() != null)
        {
            current.setApplicationNote(payload.getApplicationNote());
        }
        return current;
    }

    private Date asDate(Object value)
    {
        String text = asText(value);
        if (text == null)
        {
            return null;
        }
        try
        {
            return Date.from(LocalDateTime.parse(text).atZone(ZONE_ID).toInstant());
        }
        catch (Exception ignored)
        {
            return null;
        }
    }

    private Long asLong(Object value)
    {
        if (value instanceof Number number)
        {
            return number.longValue();
        }
        String text = asText(value);
        if (text == null)
        {
            return null;
        }
        try
        {
            return Long.parseLong(text);
        }
        catch (NumberFormatException ex)
        {
            return null;
        }
    }

    private String asText(Object value)
    {
        if (value == null)
        {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
    }

    private String defaultText(String value, String defaultValue)
    {
        return value == null || value.isBlank() ? defaultValue : value;
    }

    private String normalizeDisplayStatus(String displayStatus)
    {
        if (displayStatus == null || displayStatus.isBlank())
        {
            return null;
        }
        String normalized = displayStatus.trim().toLowerCase(Locale.ROOT);
        return switch (normalized)
        {
            case "visible", "hidden", "expired" -> normalized;
            case "0" -> "visible";
            case "1" -> "hidden";
            default -> normalized;
        };
    }

    private void require(String value, String message)
    {
        if (value == null || value.isBlank())
        {
            throw new ServiceException(message);
        }
    }
}
