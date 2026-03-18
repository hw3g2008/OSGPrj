package com.ruoyi.system.mapper;
import java.util.List;
import com.ruoyi.system.domain.OsgSimPractice;
public interface OsgSimPracticeMapper {
    List<OsgSimPractice> selectList(OsgSimPractice q);
    OsgSimPractice selectById(Long id);
    int update(OsgSimPractice r);
}
