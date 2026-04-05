package com.ruoyi.web.controller.osg;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.system.service.IOsgAdminDictRegistryService;

/**
 * Admin dict registry controller.
 */
@RestController
@RequestMapping("/system/admin-dict")
public class OsgAdminDictRegistryController
{
    private final IOsgAdminDictRegistryService registryService;

    public OsgAdminDictRegistryController(IOsgAdminDictRegistryService registryService)
    {
        this.registryService = registryService;
    }

    @PreAuthorize("@ss.hasAnyPermi('system:dict:list,system:baseData:list')")
    @GetMapping("/registry")
    public AjaxResult registry()
    {
        return AjaxResult.success(registryService.loadRegistryGroups());
    }
}
