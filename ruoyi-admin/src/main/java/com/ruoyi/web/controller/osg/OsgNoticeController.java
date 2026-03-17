package com.ruoyi.web.controller.osg;

import java.util.Date;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.domain.OsgNotice;
import com.ruoyi.system.mapper.OsgNoticeMapper;

@RestController
@RequestMapping("/admin/notice")
public class OsgNoticeController extends BaseController
{
    private static final String NOTICE_ACCESS = "@ss.hasPermi('admin:notice:list')";

    @Autowired
    private OsgNoticeMapper noticeMapper;

    @PreAuthorize(NOTICE_ACCESS)
    @GetMapping("/list")
    public AjaxResult list(@RequestParam(required = false) String keyword,
                           @RequestParam(required = false) String receiverType)
    {
        OsgNotice query = new OsgNotice();
        query.setNoticeTitle(keyword);
        query.setReceiverType(receiverType);

        List<Map<String, Object>> rows = noticeMapper.selectNoticeList(query);
        return AjaxResult.success().put("rows", rows);
    }

    @PreAuthorize(NOTICE_ACCESS)
    @PostMapping("/send")
    public AjaxResult send(@RequestBody OsgNotice notice)
    {
        if (StringUtils.isBlank(notice.getNoticeTitle()) || StringUtils.isBlank(notice.getNoticeContent()))
        {
            return AjaxResult.error("标题和内容不能为空");
        }
        if (notice.getCreateTime() == null)
        {
            notice.setCreateTime(new Date());
        }

        noticeMapper.insertNotice(notice);
        return AjaxResult.success().put("data", Map.of(
            "noticeId", notice.getNoticeId(),
            "receiverType", notice.getReceiverType(),
            "receiverLabel", notice.getReceiverLabel(),
            "noticeTitle", notice.getNoticeTitle()
        ));
    }
}
