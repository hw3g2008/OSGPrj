package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;
import org.springframework.web.multipart.MultipartFile;
import com.ruoyi.system.domain.OsgPosition;

public interface IOsgPositionService
{
    OsgPosition selectPositionByPositionId(Long positionId);

    List<OsgPosition> selectPositionList(OsgPosition position);

    Map<String, Object> selectPositionStats(OsgPosition position);

    List<Map<String, Object>> selectPositionDrillDown(OsgPosition position);

    Map<String, Object> selectPositionMeta();

    List<Map<String, Object>> selectPositionCompanyOptions(String keyword);

    List<Map<String, Object>> selectPositionStudents(Long positionId);

    Map<String, Object> createPosition(Map<String, Object> body, String username);

    Map<String, Object> updatePosition(Map<String, Object> body, String username);

    Map<String, Object> batchUploadPositions(MultipartFile file, String username);
}
