package com.ruoyi.web.controller.osg;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class OsgDynamicPermissionPermissionKeyStoryRegressionTest
{
    @Test
    void permissionServiceShouldKeepHasPermiAndWildcardParity() throws Exception
    {
        Path sourcePath = Path.of("../ruoyi-framework/src/main/java/com/ruoyi/framework/web/service/PermissionService.java");

        assertTrue(Files.exists(sourcePath));

        String source = Files.readString(sourcePath);
        assertTrue(source.contains("public boolean hasPermi(String permission)"));
        assertTrue(source.contains("PermissionContextHolder.setContext(permission)"));
        assertTrue(source.contains("permissions.contains(Constants.ALL_PERMISSION)"));
    }

    @Test
    void sysMenuAndSysRoleControllersShouldKeepPreAuthorizePermsKeys() throws Exception
    {
        Path menuController = Path.of("src/main/java/com/ruoyi/web/controller/system/SysMenuController.java");
        Path roleController = Path.of("src/main/java/com/ruoyi/web/controller/system/SysRoleController.java");

        assertTrue(Files.exists(menuController));
        assertTrue(Files.exists(roleController));

        String menuSource = Files.readString(menuController);
        String roleSource = Files.readString(roleController);

        assertTrue(menuSource.contains("@PreAuthorize(\"@ss.hasPermi('system:menu:add')\")"));
        assertTrue(menuSource.contains("@PreAuthorize(\"@ss.hasPermi('system:menu:edit')\")"));
        assertTrue(menuSource.contains("@PreAuthorize(\"@ss.hasPermi('system:menu:remove')\")"));
        assertTrue(roleSource.contains("@PreAuthorize(\"@ss.hasPermi('system:role:add')\")"));
        assertTrue(roleSource.contains("@PreAuthorize(\"@ss.hasPermi('system:role:edit')\")"));
        assertTrue(roleSource.contains("@PreAuthorize(\"@ss.hasPermi('system:role:remove')\")"));
    }
}
