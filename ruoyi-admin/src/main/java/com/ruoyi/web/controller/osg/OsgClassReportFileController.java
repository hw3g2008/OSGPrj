package com.ruoyi.web.controller.osg;

import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.framework.config.ServerConfig;
import com.ruoyi.system.service.impl.OsgClassReportFileServiceImpl;

/**
 * 课消上报文件上传接口（T-527）。
 * <p>
 * 安全约束：
 * <ul>
 *   <li>{@code @PreAuthorize} 鉴权：mentor / lead_mentor / assistant 角色可访问，student 直接 403</li>
 *   <li>Spring Security 默认 CSRF 防护（cookie SameSite + CSRF token）</li>
 *   <li>服务层用 {@link Files#probeContentType} 校验真实 MIME</li>
 *   <li>存储文件名 = UUID + ext，原始 fileName 仅作展示返回</li>
 * </ul>
 */
@RestController
@RequestMapping("/class-report/file")
public class OsgClassReportFileController extends BaseController
{
    /**
     * 仅允许 mentor / lead_mentor / assistant 角色上传；student 直接被 @PreAuthorize 拒绝（403）。
     */
    private static final String UPLOAD_PERMISSION =
        "@ss.hasAnyRoles('mentor', 'lead_mentor', 'assistant', 'lead-mentor', 'admin')";

    @Autowired
    private OsgClassReportFileServiceImpl fileService;

    @Autowired
    private ServerConfig serverConfig;

    /**
     * 上传截图（人际关系反馈，§3.5.3）。
     * <p>
     * 支持 image/png, image/jpeg, application/pdf；单文件 ≤ 10 MB；总数量限制由前端控制（≤ 10 张）。
     *
     * @param file         上传的文件（multipart）
     * @param originalName 原始文件名（可选，若空则从 file 读取；仅作展示用）
     * @return 含 storedPath / originalFileName / url 的 AjaxResult
     */
    @PreAuthorize(UPLOAD_PERMISSION)
    @PostMapping("/screenshot")
    public AjaxResult uploadScreenshot(@RequestParam("file") MultipartFile file,
                                       @RequestParam(value = "originalName", required = false) String originalName)
    {
        Map<String, Object> result = fileService.uploadScreenshot(file, originalName);
        // Controller 层拼接访问 URL
        String storedPath = (String) result.get("storedPath");
        result.put("url", serverConfig.getUrl() + "/profile" + storedPath);
        return AjaxResult.success("截图上传成功", result);
    }

    /**
     * 上传简历（基础课 resume_update，§3.5.5）。
     * <p>
     * 支持 application/pdf, application/msword, docx；单文件 ≤ 10 MB。
     *
     * @param file         上传的文件（multipart）
     * @param originalName 原始文件名（可选；仅作展示用）
     * @return 含 storedPath / originalFileName / url 的 AjaxResult
     */
    @PreAuthorize(UPLOAD_PERMISSION)
    @PostMapping("/resume")
    public AjaxResult uploadResume(@RequestParam("file") MultipartFile file,
                                   @RequestParam(value = "originalName", required = false) String originalName)
    {
        Map<String, Object> result = fileService.uploadResume(file, originalName);
        String storedPath = (String) result.get("storedPath");
        result.put("url", serverConfig.getUrl() + "/profile" + storedPath);
        return AjaxResult.success("简历上传成功", result);
    }
}
