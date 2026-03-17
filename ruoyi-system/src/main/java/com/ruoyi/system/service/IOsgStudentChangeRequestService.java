package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;

public interface IOsgStudentChangeRequestService
{
    public List<Map<String, Object>> selectChangeRequestList(Long studentId, String status);

    public Map<String, Object> submitChangeRequest(Map<String, Object> payload, String operator);

    public Map<String, Object> approveChangeRequest(Long requestId, String reviewer);

    public Map<String, Object> rejectChangeRequest(Long requestId, String reviewer, String reason);
}
