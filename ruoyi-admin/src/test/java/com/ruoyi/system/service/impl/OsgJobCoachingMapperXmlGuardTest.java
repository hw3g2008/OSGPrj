package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class OsgJobCoachingMapperXmlGuardTest
{
    @Test
    void mapperShouldJoinStudentTableAndExposeStudentName() throws IOException
    {
        try (InputStream stream = Thread.currentThread()
            .getContextClassLoader()
            .getResourceAsStream("mapper/system/OsgJobCoachingMapper.xml"))
        {
            assertNotNull(stream);
            String xml = new String(stream.readAllBytes(), StandardCharsets.UTF_8);

            assertTrue(xml.contains("property=\"studentName\""));
            assertTrue(xml.contains("student_name"));
            assertTrue(xml.toLowerCase().contains("join osg_student"));
            assertTrue(!xml.contains("stu.del_flag"));
        }
    }
}
