package com.ruoyi.system.mapper;

import java.util.List;
import com.ruoyi.system.domain.OsgFile;
import com.ruoyi.system.domain.OsgFileAuth;

public interface OsgFileMapper
{
    List<OsgFile> selectFileList(OsgFile file);

    OsgFile selectFileByFileId(Long fileId);

    int insertFile(OsgFile file);

    int updateFile(OsgFile file);

    int deleteFileAuthByFileId(Long fileId);

    int batchInsertFileAuth(List<OsgFileAuth> authList);

    List<OsgFileAuth> selectFileAuthListByFileId(Long fileId);
}
