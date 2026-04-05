package com.ruoyi.web.controller.osg;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class OsgDynamicPermissionRouterStoryRegressionTest
{
    @Test
    void sysLoginControllerShouldKeepGetRoutersEntryForDynamicSidebar() throws Exception
    {
        Path sourcePath = Path.of("src/main/java/com/ruoyi/web/controller/system/SysLoginController.java");

        assertTrue(Files.exists(sourcePath));

        String source = Files.readString(sourcePath);
        assertTrue(source.contains("@GetMapping(\"getRouters\")"));
        assertTrue(source.contains("selectMenuTreeByUserId"));
        assertTrue(source.contains("buildMenus(menus)"));
    }

    @Test
    void sysMenuServiceShouldKeepBuildMenusMetaPathAndComponentForRouterRuntime() throws Exception
    {
        Path sourcePath = Path.of("../ruoyi-system/src/main/java/com/ruoyi/system/service/impl/SysMenuServiceImpl.java");

        assertTrue(Files.exists(sourcePath));

        String source = Files.readString(sourcePath);
        assertTrue(source.contains("public List<RouterVo> buildMenus(List<SysMenu> menus)"));
        assertTrue(source.contains("router.setPath(getRouterPath(menu))"));
        assertTrue(source.contains("router.setComponent(getComponent(menu))"));
        assertTrue(source.contains("router.setMeta(new MetaVo("));
    }
}
