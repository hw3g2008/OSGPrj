package com.ruoyi.web.controller.osg;

import java.util.List;
import java.util.Map;
import java.util.Objects;
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
import com.ruoyi.system.service.impl.OsgFileServiceImpl;

@RestController
@RequestMapping("/admin/qbank")
public class OsgQbankController extends BaseController
{
    private static final String QBANK_ACCESS = "@ss.hasPermi('admin:qbank:list')";

    @Autowired
    private OsgFileServiceImpl fileService;

    @PreAuthorize(QBANK_ACCESS)
    @GetMapping("/list")
    public AjaxResult list(@RequestParam(required = false) String keyword)
    {
        return AjaxResult.success().put("rows", fileService.listQbankFolders(keyword));
    }

    @PreAuthorize(QBANK_ACCESS)
    @PostMapping("/folder")
    public AjaxResult createFolder(@RequestBody Map<String, Object> body)
    {
        try
        {
            return AjaxResult.success("题库文件夹创建成功", fileService.createQbankFolder(resolveRequiredString(body, "folderName"), resolveOperator()));
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    @PreAuthorize(QBANK_ACCESS)
    @PutMapping("/auth")
    public AjaxResult updateAuth(@RequestBody Map<String, Object> body)
    {
        try
        {
            Long fileId = resolveRequiredLong(body, "fileId");
            String authType = resolveRequiredString(body, "authType");
            List<String> labels = switch (authType) {
                case "class" -> resolveStringList(body.get("authorizedClasses"));
                case "user" -> resolveStringList(body.get("authorizedUsers"));
                case "all" -> List.of();
                default -> throw new ServiceException("不支持的授权类型");
            };
            return AjaxResult.success("题库文件夹授权已更新", fileService.updateQbankAuth(fileId, authType, labels, resolveOperator()));
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
    }

    @PreAuthorize(QBANK_ACCESS)
    @PutMapping("/expiry")
    public AjaxResult updateExpiry(@RequestBody Map<String, Object> body)
    {
        try
        {
            return AjaxResult.success(
                "题库文件夹过期时间已更新",
                fileService.updateQbankExpiry(
                    resolveRequiredLong(body, "fileId"),
                    resolveRequiredString(body, "expiryAt"),
                    resolveOperator()
                )
            );
        }
        catch (ServiceException ex)
        {
            return AjaxResult.error(ex.getMessage());
        }
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
