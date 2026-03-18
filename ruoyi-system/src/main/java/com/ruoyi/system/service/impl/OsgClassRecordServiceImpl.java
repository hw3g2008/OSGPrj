package com.ruoyi.system.service.impl;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.ruoyi.system.domain.OsgClassRecord;
import com.ruoyi.system.mapper.OsgClassRecordMapper;
import com.ruoyi.system.service.IOsgClassRecordService;

@Service
public class OsgClassRecordServiceImpl implements IOsgClassRecordService
{
    @Autowired
    private OsgClassRecordMapper mapper;

    @Override public List<OsgClassRecord> selectList(OsgClassRecord record) { return mapper.selectList(record); }
    @Override public OsgClassRecord selectById(Long id) { return mapper.selectById(id); }
    @Override public int insert(OsgClassRecord record) { return mapper.insert(record); }
    @Override public int update(OsgClassRecord record) { return mapper.update(record); }
}
