package com.ruoyi.common.core.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ruoyi.common.core.domain.entity.SysMenu;

/**
 * Guard test for TreeSelect: verifies i18nKey is carried through from SysMenu into the
 * serialized payload that {@code /system/menu/roleMenuTreeselect/{roleId}} returns to the
 * admin frontend. Without this, role page pills render raw menu_name (Chinese).
 */
class TreeSelectTest
{
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Test
    void constructorCarriesI18nKeyFromSysMenu() throws Exception
    {
        SysMenu menu = new SysMenu();
        menu.setMenuId(2010L);
        menu.setMenuName("权限管理");
        menu.setI18nKey("permission_management");
        menu.setChildren(new ArrayList<>());

        TreeSelect node = new TreeSelect(menu);

        assertEquals(2010L, node.getId());
        assertEquals("权限管理", node.getLabel());
        assertEquals("permission_management", node.getI18nKey());

        // Jackson serialization must emit the field, so the admin frontend can translate.
        String json = MAPPER.writeValueAsString(node);
        assertTrue(json.contains("\"i18nKey\":\"permission_management\""),
                "serialized JSON must include i18nKey field, got: " + json);
    }

    @Test
    void constructorAllowsNullI18nKeyAndOmitsFromJson() throws Exception
    {
        SysMenu menu = new SysMenu();
        menu.setMenuId(99L);
        menu.setMenuName("自定义菜单");
        menu.setI18nKey(null);
        menu.setChildren(new ArrayList<>());

        TreeSelect node = new TreeSelect(menu);

        assertNull(node.getI18nKey());

        // JsonInclude.NON_NULL: absent key preserves the legacy payload shape exactly.
        String json = MAPPER.writeValueAsString(node);
        assertTrue(!json.contains("i18nKey"),
                "null i18nKey must be omitted from JSON, got: " + json);
    }

    @Test
    void constructorPropagatesI18nKeyThroughChildren()
    {
        SysMenu leaf = new SysMenu();
        leaf.setMenuId(1001L);
        leaf.setMenuName("菜单管理");
        leaf.setI18nKey("menu_management");
        leaf.setChildren(new ArrayList<>());

        SysMenu parent = new SysMenu();
        parent.setMenuId(1L);
        parent.setMenuName("权限管理");
        parent.setI18nKey("permission_management");
        List<SysMenu> kids = new ArrayList<>();
        kids.add(leaf);
        parent.setChildren(kids);

        TreeSelect tree = new TreeSelect(parent);

        assertEquals("permission_management", tree.getI18nKey());
        assertEquals(1, tree.getChildren().size());
        assertEquals("menu_management", tree.getChildren().get(0).getI18nKey());
    }
}
