package com.ruoyi.system.service;
import java.util.List;
import com.ruoyi.system.domain.OsgSimPractice;
public interface IOsgSimPracticeService {
    List<OsgSimPractice> selectList(OsgSimPractice q);
    OsgSimPractice selectById(Long id);
    int update(OsgSimPractice r);
}
