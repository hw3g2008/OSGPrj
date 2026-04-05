package com.ruoyi.web.controller.osg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;
import com.ruoyi.system.domain.OsgStaff;
import com.ruoyi.system.service.impl.OsgStaffServiceImpl;

class OsgStaffExportControllerTest
{
    @Test
    void exportShouldNormalizeVisibleFiltersAndWriteWorkbook() throws Exception
    {
        CapturingStaffService service = new CapturingStaffService();
        service.exportRows = List.of(buildRow());

        OsgStaffController controller = new OsgStaffController();
        ReflectionTestUtils.setField(controller, "staffService", service);

        OsgStaff filter = new OsgStaff();
        filter.setStaffName("Diana");
        filter.setStaffType("lead_mentor");
        filter.setAccountStatus("1");

        MockHttpServletResponse response = new MockHttpServletResponse();
        controller.export(response, filter, "blacklist");

        assertEquals("Diana", service.capturedFilter.getStaffName());
        assertEquals("lead_mentor", service.capturedFilter.getStaffType());
        assertEquals("frozen", service.capturedFilter.getAccountStatus());
        assertEquals("blacklist", service.tab);
        assertTrue(response.getContentType().startsWith("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        assertTrue(response.getHeader("Content-disposition").contains(".xlsx"));
        assertTrue(response.getHeader("download-filename").contains(".xlsx"));

        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(response.getContentAsByteArray())))
        {
            assertTrue(response.getContentAsByteArray().length > 0);
            assertEquals("Diana", workbook.getSheetAt(0).getRow(1).getCell(1).getStringCellValue());
            assertEquals("组长导师", workbook.getSheetAt(0).getRow(1).getCell(2).getStringCellValue());
            assertEquals("冻结", workbook.getSheetAt(0).getRow(1).getCell(11).getStringCellValue());
            assertEquals("黑名单", workbook.getSheetAt(0).getRow(1).getCell(12).getStringCellValue());
        }
    }

    private static Map<String, Object> buildRow()
    {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("staffId", 1L);
        row.put("staffName", "Diana");
        row.put("staffTypeLabel", "组长导师");
        row.put("majorDirection", "科技");
        row.put("subDirection", "AI Product");
        row.put("email", "diana@example.com");
        row.put("phone", "13800000000");
        row.put("region", "北美");
        row.put("city", "San Francisco");
        row.put("hourlyRate", BigDecimal.valueOf(720));
        row.put("studentCount", 3);
        row.put("accountStatusLabel", "冻结");
        row.put("blacklistStatus", "黑名单");
        return row;
    }

    private static final class CapturingStaffService extends OsgStaffServiceImpl
    {
        private OsgStaff capturedFilter;
        private String tab;
        private List<Map<String, Object>> exportRows = List.of();

        @Override
        public List<Map<String, Object>> selectStaffExportList(OsgStaff staff, String tab)
        {
            this.capturedFilter = copyFilter(staff);
            this.tab = tab;
            return exportRows;
        }

        private OsgStaff copyFilter(OsgStaff source)
        {
            OsgStaff target = new OsgStaff();
            target.setStaffName(source.getStaffName());
            target.setStaffType(source.getStaffType());
            target.setAccountStatus(source.getAccountStatus());
            return target;
        }
    }
}
