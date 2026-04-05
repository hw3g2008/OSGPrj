package com.ruoyi.web.controller.osg;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class OsgDynamicPermissionRoleStoryRegressionTest
{
    @Test
    void sysRoleControllerShouldKeepRoleEditEndpointForMenuBinding() throws Exception
    {
        Path sourcePath = Path.of("src/main/java/com/ruoyi/web/controller/system/SysRoleController.java");

        assertTrue(Files.exists(sourcePath));

        String source = Files.readString(sourcePath);
        assertTrue(source.contains("@RequestMapping(\"/system/role\")"));
        assertTrue(source.contains("@PutMapping"));
        assertTrue(source.contains("@ss.hasPermi('system:role:edit')"));
        assertTrue(source.contains("updateRole(role)"));
    }

    @Test
    void sysMenuControllerShouldKeepRoleMenuTreeEndpointForRoleBinding() throws Exception
    {
        Path sourcePath = Path.of("src/main/java/com/ruoyi/web/controller/system/SysMenuController.java");

        assertTrue(Files.exists(sourcePath));

        String source = Files.readString(sourcePath);
        assertTrue(source.contains("@GetMapping(value = \"/roleMenuTreeselect/{roleId}\")"));
        assertTrue(source.contains("selectMenuListByRoleId(roleId)"));
        assertTrue(source.contains("buildMenuTreeSelect"));
    }
}
