package com.ruoyi.web.controller.osg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;
import com.ruoyi.system.service.impl.OsgClassRecordServiceImpl;

class OsgClassRecordExportControllerTest
{
    @Test
    void exportShouldDelegateCurrentFiltersAndWriteWorkbook() throws Exception
    {
        CapturingClassRecordService service = new CapturingClassRecordService();
        service.exportRows = List.of(buildRow());

        OsgClassRecordController controller = new OsgClassRecordController();
        ReflectionTestUtils.setField(controller, "classRecordService", service);

        Date start = parseDate("2026-03-20");
        Date end = parseDate("2026-03-22");
        MockHttpServletResponse response = new MockHttpServletResponse();

        controller.export(response, "学员A", "position_coaching", "new_resume", "mentor", "pending", start, end);

        assertEquals("学员A", service.keyword);
        assertEquals("position_coaching", service.courseType);
        assertEquals("new_resume", service.classStatus);
        assertEquals("mentor", service.courseSource);
        assertEquals("pending", service.tab);
        assertEquals(start, service.classDateStart);
        assertEquals(end, service.classDateEnd);
        assertTrue(response.getContentType().startsWith("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));

        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(response.getContentAsByteArray())))
        {
            assertTrue(response.getContentAsByteArray().length > 0);
            assertEquals("学员A", workbook.getSheetAt(0).getRow(1).getCell(3).getStringCellValue());
            assertEquals("导师", workbook.getSheetAt(0).getRow(1).getCell(6).getStringCellValue());
            assertEquals("岗位辅导", workbook.getSheetAt(0).getRow(1).getCell(7).getStringCellValue());
            assertEquals("新简历", workbook.getSheetAt(0).getRow(1).getCell(8).getStringCellValue());
            assertEquals("待审核", workbook.getSheetAt(0).getRow(1).getCell(13).getStringCellValue());
        }
    }

    private static Map<String, Object> buildRow()
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("recordId", 11L);
        row.put("recordCode", "CR-20260321-001");
        row.put("studentId", 101L);
        row.put("studentName", "学员A");
        row.put("mentorId", 201L);
        row.put("mentorName", "导师A");
        row.put("reporterRole", "导师");
        row.put("coachingType", "岗位辅导");
        row.put("courseContent", "新简历");
        row.put("classDate", Timestamp.valueOf("2026-03-21 10:00:00"));
        row.put("durationHours", BigDecimal.valueOf(2));
        row.put("courseFee", "600.0");
        row.put("studentRating", "4.8");
        row.put("status", "待审核");
        row.put("reviewRemark", "待管理员审核");
        row.put("submittedAt", Timestamp.valueOf("2026-03-21 12:00:00"));
        return row;
    }

    private static Date parseDate(String value) throws Exception
    {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.CHINA).parse(value);
    }

    private static final class CapturingClassRecordService extends OsgClassRecordServiceImpl
    {
        private String keyword;
        private String courseType;
        private String classStatus;
        private String courseSource;
        private String tab;
        private Date classDateStart;
        private Date classDateEnd;
        private List<Map<String, Object>> exportRows = List.of();

        @Override
        public List<Map<String, Object>> selectClassRecordExportList(String keyword,
                                                                     String courseType,
                                                                     String classStatus,
                                                                     String courseSource,
                                                                     String tab,
                                                                     Date classDateStart,
                                                                     Date classDateEnd)
        {
            this.keyword = keyword;
            this.courseType = courseType;
            this.classStatus = classStatus;
            this.courseSource = courseSource;
            this.tab = tab;
            this.classDateStart = classDateStart;
            this.classDateEnd = classDateEnd;
            return exportRows;
        }
    }
}
