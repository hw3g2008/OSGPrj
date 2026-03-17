package com.ruoyi.web.controller.osg;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgFile;
import com.ruoyi.system.domain.OsgFileAuth;
import com.ruoyi.system.mapper.OsgFileMapper;

@RestController
@RequestMapping("/admin/file")
public class OsgFileController extends BaseController
{
    private static final String FILE_ACCESS = "@ss.hasPermi('admin:files:list')";

    @Autowired
    private OsgFileMapper fileMapper;

    @PreAuthorize(FILE_ACCESS)
    @GetMapping("/list")
    public AjaxResult list(@RequestParam(required = false) String keyword)
    {
        OsgFile query = new OsgFile();
        query.setKeyword(keyword);
        List<OsgFile> rows = fileMapper.selectFileList(query);
        rows.forEach(this::fillAuthorizedSummary);
        return AjaxResult.success().put("rows", rows);
    }

    @PreAuthorize(FILE_ACCESS)
    @PostMapping("/folder")
    public AjaxResult createFolder(@RequestBody Map<String, Object> body)
    {
        try
        {
            OsgFile folder = new OsgFile();
            folder.setFileName(resolveRequiredString(body, "folderName"));
            folder.setFileType("folder");
            folder.setClassName(resolveOptionalString(body, "className", "All"));
            folder.setFileSize("--");
            folder.setAuthType("all");
            folder.setAuthorizedTo("全部用户");
            folder.setCreateBy(resolveOperator());
            folder.setUpdateBy(resolveOperator());
            fileMapper.insertFile(folder);
            fillAuthorizedSummary(folder);
            return AjaxResult.success("文件夹创建成功", folder);
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    @PreAuthorize(FILE_ACCESS)
    @PutMapping("/auth")
    public AjaxResult updateAuth(@RequestBody Map<String, Object> body)
    {
        try
        {
            Long fileId = resolveRequiredLong(body, "fileId");
            OsgFile current = fileMapper.selectFileByFileId(fileId);
            if (current == null)
            {
                throw new ServiceException("文件不存在");
            }

            String authType = resolveRequiredString(body, "authType");
            current.setAuthType(authType);
            current.setUpdateBy(resolveOperator());
            fileMapper.updateFile(current);
            fileMapper.deleteFileAuthByFileId(fileId);

            List<OsgFileAuth> authList = buildAuthList(fileId, authType, body);
            if (!authList.isEmpty())
            {
                fileMapper.batchInsertFileAuth(authList);
            }

            fillAuthorizedSummary(current);
            return AjaxResult.success("文件授权已更新", current);
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    private void fillAuthorizedSummary(OsgFile file)
    {
        if (file == null)
        {
            return;
        }

        if ("all".equalsIgnoreCase(file.getAuthType()))
        {
            file.setAuthorizedTo("全部用户");
            return;
        }

        List<OsgFileAuth> authList = fileMapper.selectFileAuthListByFileId(file.getFileId());
        String summary = authList.stream()
            .map(OsgFileAuth::getTargetLabel)
            .filter(StringUtils::hasText)
            .collect(Collectors.joining(", "));
        file.setAuthorizedTo(StringUtils.hasText(summary) ? summary : "未授权");
    }

    private List<OsgFileAuth> buildAuthList(Long fileId, String authType, Map<String, Object> body)
    {
        if ("all".equalsIgnoreCase(authType))
        {
            return List.of();
        }

        List<String> labels = switch (authType) {
            case "class" -> resolveStringList(body.get("authorizedClasses"));
            case "user" -> resolveStringList(body.get("authorizedUsers"));
            default -> throw new ServiceException("不支持的授权类型");
        };

        if (labels.isEmpty())
        {
            throw new ServiceException("授权目标不能为空");
        }

        List<OsgFileAuth> authList = new ArrayList<>();
        for (String label : labels)
        {
            OsgFileAuth auth = new OsgFileAuth();
            auth.setFileId(fileId);
            auth.setAuthType(authType);
            auth.setTargetValue(label);
            auth.setTargetLabel(label);
            authList.add(auth);
        }
        return authList;
    }

    private Long resolveRequiredLong(Map<String, Object> body, String key)
    {
        Object value = body.get(key);
        if (value instanceof Number number)
        {
            return number.longValue();
        }
        if (value instanceof String text && StringUtils.hasText(text))
        {
            return Long.valueOf(text);
        }
        throw new ServiceException(key + " 不能为空");
    }

    private String resolveRequiredString(Map<String, Object> body, String key)
    {
        Object value = body.get(key);
        if (value instanceof String text && StringUtils.hasText(text))
        {
            return text.trim();
        }
        throw new ServiceException(key + " 不能为空");
    }

    private String resolveOptionalString(Map<String, Object> body, String key, String defaultValue)
    {
        Object value = body.get(key);
        if (value instanceof String text && StringUtils.hasText(text))
        {
            return text.trim();
        }
        return defaultValue;
    }

    private List<String> resolveStringList(Object value)
    {
        if (!(value instanceof List<?> rawList))
        {
            return List.of();
        }

        return rawList.stream()
            .filter(Objects::nonNull)
            .map(Object::toString)
            .map(String::trim)
            .filter(StringUtils::hasText)
            .toList();
    }

    private String resolveOperator()
    {
        try
        {
            return getUsername();
        }
        catch (ServiceException ex)
        {
            return "system";
        }
    }
}
