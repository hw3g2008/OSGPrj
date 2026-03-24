package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.lang.reflect.Field;
import org.junit.jupiter.api.Test;
import com.ruoyi.system.service.impl.OsgStaffServiceImpl;
import com.ruoyi.system.service.impl.OsgStudentServiceImpl;

class OsgDefaultPasswordContractTest
{
    @Test
    void studentDefaultPasswordShouldUseUnifiedValue() throws Exception
    {
        assertEquals("Osg@2026", readConstant(OsgStudentServiceImpl.class, "DEFAULT_STUDENT_PASSWORD"));
    }

    @Test
    void staffDefaultPasswordShouldUseUnifiedValue() throws Exception
    {
        assertEquals("Osg@2026", readConstant(OsgStaffServiceImpl.class, "DEFAULT_STAFF_PASSWORD"));
    }

    private String readConstant(Class<?> targetClass, String fieldName) throws Exception
    {
        Field field = targetClass.getDeclaredField(fieldName);
        field.setAccessible(true);
        return (String) field.get(null);
    }
}
