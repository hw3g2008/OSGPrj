package com.ruoyi.system.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Param;
import com.ruoyi.system.domain.OsgClassRecordAttachment;

public interface OsgClassRecordAttachmentMapper
{
    List<OsgClassRecordAttachment> selectByRecordId(Long recordId);

    List<OsgClassRecordAttachment> selectByRecordIds(@Param("recordIds") List<Long> recordIds);

    int insertAttachment(OsgClassRecordAttachment attachment);

    int insertBatch(@Param("list") List<OsgClassRecordAttachment> list);

    int deleteById(Long attachmentId);
}
