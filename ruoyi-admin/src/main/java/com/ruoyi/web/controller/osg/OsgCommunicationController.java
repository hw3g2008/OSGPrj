package com.ruoyi.web.controller.osg;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.system.domain.OsgCommunication;
import com.ruoyi.system.mapper.OsgCommunicationMapper;

@RestController
@RequestMapping("/admin/communication")
public class OsgCommunicationController extends BaseController
{
    private static final String COMMUNICATION_ACCESS = "@ss.hasPermi('admin:communication:list')";

    @Autowired
    private OsgCommunicationMapper communicationMapper;

    @PreAuthorize(COMMUNICATION_ACCESS)
    @GetMapping("/list")
    public AjaxResult list(@RequestParam(required = false) String tab,
                           @RequestParam(required = false) String keyword)
    {
        OsgCommunication query = new OsgCommunication();
        query.setTab(tab == null || tab.isBlank() ? "record" : tab);
        query.setKeyword(keyword);

        List<Map<String, Object>> rows = communicationMapper.selectCommunicationList(query);
        return AjaxResult.success()
            .put("rows", rows);
    }
}
