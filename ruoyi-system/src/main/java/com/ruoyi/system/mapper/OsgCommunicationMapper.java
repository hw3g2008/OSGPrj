package com.ruoyi.system.mapper;

import java.util.List;
import java.util.Map;
import com.ruoyi.system.domain.OsgCommunication;

public interface OsgCommunicationMapper
{
    List<Map<String, Object>> selectCommunicationList(OsgCommunication query);
}
