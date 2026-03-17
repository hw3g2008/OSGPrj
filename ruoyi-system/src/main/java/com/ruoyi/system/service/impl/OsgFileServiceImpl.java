package com.ruoyi.system.service.impl;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgFile;
import com.ruoyi.system.domain.OsgFileAuth;
import com.ruoyi.system.mapper.OsgFileMapper;

@Service
public class OsgFileServiceImpl
{
    private static final String QBANK_FOLDER_TYPE = "qbank-folder";

    @Autowired
    private OsgFileMapper fileMapper;

    public List<Map<String, Object>> listQbankFolders(String keyword)
    {
        OsgFile query = new OsgFile();
        query.setKeyword(keyword);
        return fileMapper.selectFileList(query).stream()
            .filter(item -> QBANK_FOLDER_TYPE.equals(item.getFileType()))
            .map(this::toRowMap)
            .toList();
    }

    public Map<String, Object> createQbankFolder(String folderName, String operator)
    {
        OsgFile folder = new OsgFile();
        folder.setFileName(folderName);
        folder.setFileType(QBANK_FOLDER_TYPE);
        folder.setFileSize("--");
        folder.setAuthType("all");
        folder.setRemark("");
        folder.setCreateBy(operator);
        folder.setUpdateBy(operator);
        fileMapper.insertFile(folder);
        folder.setAuthorizedTo("全部用户");
        return toRowMap(folder);
    }

    public Map<String, Object> updateQbankAuth(Long fileId, String authType, List<String> labels, String operator)
    {
        OsgFile current = requireQbankFolder(fileId);
        current.setAuthType(authType);
        current.setUpdateBy(operator);
        fileMapper.updateFile(current);
        fileMapper.deleteFileAuthByFileId(fileId);

        List<OsgFileAuth> authList = buildAuthList(fileId, authType, labels);
        if (!authList.isEmpty())
        {
            fileMapper.batchInsertFileAuth(authList);
        }

        current.setAuthorizedTo(resolveAuthorizedTo(current.getAuthType(), authList));
        return toRowMap(current);
    }

    public Map<String, Object> updateQbankExpiry(Long fileId, String expiryAt, String operator)
    {
        OsgFile current = requireQbankFolder(fileId);
        current.setRemark(buildExpiryRemark(expiryAt));
        current.setUpdateBy(operator);
        fileMapper.updateFile(current);
        return toRowMap(current);
    }

    private OsgFile requireQbankFolder(Long fileId)
    {
        OsgFile current = fileMapper.selectFileByFileId(fileId);
        if (current == null || !QBANK_FOLDER_TYPE.equals(current.getFileType()))
        {
            throw new ServiceException("题库文件夹不存在");
        }
        return current;
    }

    private List<OsgFileAuth> buildAuthList(Long fileId, String authType, List<String> labels)
    {
        if ("all".equalsIgnoreCase(authType))
        {
            return List.of();
        }
        if (!"class".equalsIgnoreCase(authType) && !"user".equalsIgnoreCase(authType))
        {
            throw new ServiceException("不支持的授权类型");
        }
        if (labels == null || labels.isEmpty())
        {
            throw new ServiceException("授权目标不能为空");
        }

        List<OsgFileAuth> authList = new ArrayList<>();
        for (String label : labels)
        {
            if (!StringUtils.hasText(label))
            {
                continue;
            }
            OsgFileAuth auth = new OsgFileAuth();
            auth.setFileId(fileId);
            auth.setAuthType(authType);
            auth.setTargetValue(label.trim());
            auth.setTargetLabel(label.trim());
            authList.add(auth);
        }

        if (authList.isEmpty())
        {
            throw new ServiceException("授权目标不能为空");
        }
        return authList;
    }

    private Map<String, Object> toRowMap(OsgFile file)
    {
        List<OsgFileAuth> authList = file.getFileId() == null
            ? List.of()
            : fileMapper.selectFileAuthListByFileId(file.getFileId());

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("fileId", file.getFileId());
        row.put("fileName", file.getFileName());
        row.put("fileType", file.getFileType());
        row.put("fileSize", file.getFileSize());
        row.put("authType", file.getAuthType());
        row.put("authorizedTo", resolveAuthorizedTo(file.getAuthType(), authList));
        row.put("expiryAt", resolveExpiryAt(file.getRemark()));
        row.put("createTime", file.getCreateTime());
        row.put("updateTime", file.getUpdateTime());
        return row;
    }

    private String resolveAuthorizedTo(String authType, List<OsgFileAuth> authList)
    {
        if ("all".equalsIgnoreCase(authType))
        {
            return "全部用户";
        }

        String summary = authList.stream()
            .map(OsgFileAuth::getTargetLabel)
            .filter(StringUtils::hasText)
            .collect(java.util.stream.Collectors.joining(", "));
        return StringUtils.hasText(summary) ? summary : "未授权";
    }

    private String buildExpiryRemark(String expiryAt)
    {
        if (!StringUtils.hasText(expiryAt))
        {
            throw new ServiceException("expiryAt 不能为空");
        }
        return "expiryAt=" + expiryAt.trim().replace('T', ' ').replace(":00", "");
    }

    private String resolveExpiryAt(String remark)
    {
        if (!StringUtils.hasText(remark))
        {
            return null;
        }
        String prefix = "expiryAt=";
        int index = remark.indexOf(prefix);
        if (index < 0)
        {
            return null;
        }
        String value = remark.substring(index + prefix.length()).trim();
        return StringUtils.hasText(value) ? value : null;
    }
}
