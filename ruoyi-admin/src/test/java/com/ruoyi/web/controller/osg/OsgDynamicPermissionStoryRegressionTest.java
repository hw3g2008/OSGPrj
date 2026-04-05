package com.ruoyi.web.controller.osg;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class OsgDynamicPermissionStoryRegressionTest
{
    @Test
    void sysLoginControllerShouldKeepDynamicRouterEntry() throws Exception
    {
        Path sourcePath = Path.of("src/main/java/com/ruoyi/web/controller/system/SysLoginController.java");

        assertTrue(Files.exists(sourcePath));

        String source = Files.readString(sourcePath);
        assertTrue(source.contains("@GetMapping(\"getRouters\")"));
        assertTrue(source.contains("selectMenuTreeByUserId"));
        assertTrue(source.contains("buildMenus"));
    }

    @Test
    void sysMenuControllerShouldKeepProtectedMenuCrudAndRoleTreeEndpoints() throws Exception
    {
        Path sourcePath = Path.of("src/main/java/com/ruoyi/web/controller/system/SysMenuController.java");

        assertTrue(Files.exists(sourcePath));

        String source = Files.readString(sourcePath);
        assertTrue(source.contains("@RequestMapping(\"/system/menu\")"));
        assertTrue(source.contains("@GetMapping(\"/list\")"));
        assertTrue(source.contains("@GetMapping(value = \"/roleMenuTreeselect/{roleId}\")"));
        assertTrue(source.contains("@ss.hasPermi('system:menu:list')"));
        assertTrue(source.contains("@ss.hasPermi('system:menu:add')"));
        assertTrue(source.contains("@ss.hasPermi('system:menu:edit')"));
        assertTrue(source.contains("@ss.hasPermi('system:menu:remove')"));
        assertTrue(source.contains("checkRouteConfigUnique"));
    }
}
