package com.ruoyi.system.mapper;

import java.util.List;
import java.util.Map;
import com.ruoyi.system.domain.OsgNotice;

public interface OsgNoticeMapper
{
    List<Map<String, Object>> selectNoticeList(OsgNotice query);

    int insertNotice(OsgNotice notice);
}
