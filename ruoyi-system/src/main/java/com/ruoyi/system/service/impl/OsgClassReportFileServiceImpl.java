package com.ruoyi.system.service.impl;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.apache.commons.io.FilenameUtils;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import com.ruoyi.common.config.RuoYiConfig;
import com.ruoyi.common.exception.ServiceException;

/**
 * 课消上报文件上传服务（§5.2 / §3.5.3 / §3.5.5）。
 * <p>
 * 安全约束（CLAUDE.md §7 强约束）：
 * <ul>
 *   <li>用 {@link Files#probeContentType(Path)} 校验真实 MIME，不信任 Content-Type header</li>
 *   <li>存储文件名 = UUID + ext，防 path traversal；原始 fileName 仅作展示返回</li>
 *   <li>上传接口由 Controller 层 {@code @PreAuthorize} 鉴权 + Spring Security 默认 CSRF</li>
 * </ul>
 */
@Service
public class OsgClassReportFileServiceImpl
{
    /** 截图（人际关系反馈）允许的 MIME 类型（§3.5.3）。 */
    public static final Set<String> SCREENSHOT_ALLOWED_MIME = Set.of(
        "image/png",
        "image/jpeg",
        "application/pdf"
    );

    /** 简历允许的 MIME 类型（§3.5.5 resume_update）。 */
    public static final Set<String> RESUME_ALLOWED_MIME = Set.of(
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    /** 单文件大小上限：10 MB（§3.5.3 / §3.5.5）。 */
    public static final long MAX_FILE_SIZE = 10L * 1024 * 1024;

    /** 截图最多张数（§3.5.3）。 */
    public static final int MAX_SCREENSHOT_COUNT = 10;

    /**
     * 上传截图文件（人际关系反馈，§3.5.3）。
     * <p>
     * 允许类型：image/png, image/jpeg, application/pdf。
     *
     * @param file         上传的文件
     * @param originalName 前端传入的原始文件名（仅作展示用，若 null 则读 file.getOriginalFilename()）
     * @return 包含 storedName / storedPath / originalFileName 的结果 Map（url 由 Controller 拼接）
     */
    public Map<String, Object> uploadScreenshot(MultipartFile file, String originalName)
    {
        validateFileSize(file);
        String displayName = resolveDisplayName(file, originalName);
        String ext = resolveExtension(displayName);
        String storedName = UUID.randomUUID().toString().replace("-", "") + "." + ext;
        Path destDir = resolveUploadDir("class-report/screenshot");
        Path destPath = destDir.resolve(storedName);
        writeAndValidateMime(file, destPath, SCREENSHOT_ALLOWED_MIME, "截图");
        return buildResult(storedName, displayName, destPath);
    }

    /**
     * 上传简历文件（基础课 resume_update，§3.5.5）。
     * <p>
     * 允许类型：application/pdf, application/msword, docx。
     *
     * @param file         上传的文件
     * @param originalName 前端传入的原始文件名（仅作展示用）
     * @return 包含 storedName / storedPath / originalFileName 的结果 Map
     */
    public Map<String, Object> uploadResume(MultipartFile file, String originalName)
    {
        validateFileSize(file);
        String displayName = resolveDisplayName(file, originalName);
        String ext = resolveExtension(displayName);
        String storedName = UUID.randomUUID().toString().replace("-", "") + "." + ext;
        Path destDir = resolveUploadDir("class-report/resume");
        Path destPath = destDir.resolve(storedName);
        writeAndValidateMime(file, destPath, RESUME_ALLOWED_MIME, "简历");
        return buildResult(storedName, displayName, destPath);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // private helpers
    // ─────────────────────────────────────────────────────────────────────────

    private void validateFileSize(MultipartFile file)
    {
        if (file == null || file.isEmpty())
        {
            throw new ServiceException("上传文件不能为空");
        }
        if (file.getSize() > MAX_FILE_SIZE)
        {
            throw new ServiceException("文件大小超过限制（最大 10 MB）");
        }
    }

    /**
     * 将文件写入目标路径，然后用 {@link Files#probeContentType(Path)} 探测真实 MIME。
     * 若 MIME 不合法，删除已写文件并抛异常。
     */
    private void writeAndValidateMime(MultipartFile file, Path destPath, Set<String> allowedMime, String fileLabel)
    {
        try
        {
            Files.createDirectories(destPath.getParent());
            try (InputStream in = file.getInputStream())
            {
                Files.copy(in, destPath, StandardCopyOption.REPLACE_EXISTING);
            }
            String probed = Files.probeContentType(destPath);
            if (probed == null || !allowedMime.contains(probed))
            {
                silentDelete(destPath);
                throw new ServiceException(
                    fileLabel + "文件格式不支持（真实 MIME: " + probed + "），允许：" + allowedMime);
            }
        }
        catch (ServiceException ex)
        {
            throw ex;
        }
        catch (IOException ex)
        {
            silentDelete(destPath);
            throw new ServiceException("文件上传失败：" + ex.getMessage());
        }
    }

    private Path resolveUploadDir(String subDir)
    {
        String profile = RuoYiConfig.getProfile();
        Path dir = Paths.get(profile, "upload", subDir);
        try
        {
            Files.createDirectories(dir);
        }
        catch (IOException ex)
        {
            throw new ServiceException("无法创建上传目录：" + ex.getMessage());
        }
        return dir;
    }

    private String resolveDisplayName(MultipartFile file, String originalName)
    {
        if (originalName != null && !originalName.isBlank())
        {
            return originalName.trim();
        }
        String name = file.getOriginalFilename();
        return (name != null && !name.isBlank()) ? name : "upload";
    }

    private String resolveExtension(String filename)
    {
        if (filename == null || filename.isBlank())
        {
            return "bin";
        }
        String ext = FilenameUtils.getExtension(filename);
        return (ext == null || ext.isBlank()) ? "bin" : ext.toLowerCase();
    }

    /**
     * 构建返回结果。url 字段由 Controller 层拼接（需要 ServerConfig），此处只返回 storedPath。
     */
    private Map<String, Object> buildResult(String storedName, String originalFileName, Path destPath)
    {
        String profile = RuoYiConfig.getProfile();
        String absolutePath = destPath.toAbsolutePath().toString();
        // 计算相对于 profile 的路径（供 Controller 拼 URL 用）
        String relativePath = absolutePath;
        if (relativePath.startsWith(profile))
        {
            relativePath = relativePath.substring(profile.length()).replace('\\', '/');
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("storedName", storedName);
        result.put("storedPath", relativePath);
        result.put("originalFileName", originalFileName);
        return result;
    }

    private static void silentDelete(Path path)
    {
        try
        {
            if (path != null)
            {
                Files.deleteIfExists(path);
            }
        }
        catch (IOException ignored)
        {
            // best effort cleanup
        }
    }
}
