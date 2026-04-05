package com.ruoyi.web.controller.osg;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.system.service.IOsgAdminDictRegistryService;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;

class OsgAdminDictRegistryControllerTest
{
    @Test
    void registryShouldReturnServicePayload()
    {
        IOsgAdminDictRegistryService service = () -> List.of(Map.of(
            "group_key", "job",
            "group_label", "求职相关",
            "dict_types", List.of(Map.of("dict_type", "osg_job_category", "dict_name", "岗位分类"))
        ));

        OsgAdminDictRegistryController controller = new OsgAdminDictRegistryController(service);
        AjaxResult result = controller.registry();

        assertEquals(200, result.get("code"));
        assertInstanceOf(List.class, result.get("data"));
    }
}
