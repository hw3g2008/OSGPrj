package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;

/**
 * Admin dict registry service.
 */
public interface IOsgAdminDictRegistryService
{
    /**
     * Load grouped admin dict registry payload from runtime dict truth.
     *
     * @return grouped registry payload
     */
    List<Map<String, Object>> loadRegistryGroups();
}
