package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;

public interface IOsgLeadMentorStudentService
{
    List<Map<String, Object>> selectStudentList(String keyword, String relation, String school,
        String majorDirection, String accountStatus, Long currentUserId);

    Map<String, Object> selectStudentMeta(Long currentUserId);
}
