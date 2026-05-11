package com.ruoyi.system.service.impl;

import java.math.BigDecimal;
import java.sql.Date;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.time.LocalDate;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.OsgIdGenerator;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.domain.OsgContract;
import com.ruoyi.system.domain.OsgStaff;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.OsgContractMapper;
import com.ruoyi.system.mapper.OsgStaffMapper;
import com.ruoyi.system.mapper.OsgStudentMapper;
import com.ruoyi.system.service.IOsgContractService;
import com.ruoyi.system.service.ISysUserService;
import com.ruoyi.system.service.IOsgStudentService;

@Service
public class OsgStudentServiceImpl implements IOsgStudentService
{
    private static final String DEFAULT_STUDENT_PASSWORD = "Osg@2026";
    private static final int SYS_USER_NICKNAME_MAX_LENGTH = 30;

    private static final String DEFAULT_CONTRACT_TYPE = "initial";

    private static final String DEFAULT_CONTRACT_STATUS = "active";

    @Autowired
    private OsgStudentMapper studentMapper;

    @Autowired
    private OsgContractMapper contractMapper;

    @Autowired
    private IOsgContractService contractService;

    @Autowired
    private ISysUserService sysUserService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private OsgIdentityResolver identityResolver;

    @Autowired
    private OsgStaffMapper staffMapper;

    @Override
    public OsgStudent selectStudentByStudentId(Long studentId)
    {
        return studentMapper.selectStudentByStudentId(studentId);
    }

    @Override
    public List<OsgStudent> selectStudentList(OsgStudent student)
    {
        return studentMapper.selectStudentList(student);
    }

    @Override
    public int insertStudent(OsgStudent student)
    {
        return studentMapper.insertStudent(student);
    }

    @Override
    public int updateStudent(OsgStudent student)
    {
        return studentMapper.updateStudent(student);
    }

    @Override
    public int updateStudentStatus(OsgStudent student)
    {
        return studentMapper.updateStudentStatus(student);
    }

    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> updateStudentProfile(Map<String, Object> payload, String operator)
    {
        Long studentId = asLong(payload.get("studentId"));
        if (studentId == null)
        {
            throw new ServiceException("studentId不能为空");
        }

        OsgStudent existing = studentMapper.selectStudentByStudentId(studentId);
        if (existing == null)
        {
            throw new ServiceException("学员不存在");
        }

        String nextEmail = defaultText(asText(payload.get("email")), existing.getEmail());
        validateAccountEmail(nextEmail);
        if (!Objects.equals(existing.getEmail(), nextEmail))
        {
            ensureEmailAvailable(nextEmail);
        }

        OsgStudent update = new OsgStudent();
        update.setStudentId(studentId);
        update.setStudentName(defaultText(asText(payload.get("studentName")), existing.getStudentName()));
        update.setEmail(nextEmail);
        update.setSchool(defaultText(asCsv(payload.get("school")), existing.getSchool()));
        update.setMajor(defaultText(asText(payload.get("major")), existing.getMajor()));
        Object updateGraduationRaw = firstPresent(payload, "graduationMonth", "graduationYear");
        String updateGraduationMonth = parseGraduationMonth(updateGraduationRaw);
        if (updateGraduationMonth == null)
        {
            updateGraduationMonth = existing.getGraduationMonth();
        }
        update.setGraduationMonth(updateGraduationMonth);
        Integer derivedYear = parseYearFromMonth(updateGraduationMonth);
        update.setGraduationYear(derivedYear != null ? derivedYear : existing.getGraduationYear());
        update.setMajorDirection(defaultText(asCsv(firstPresent(payload, "majorDirections", "majorDirection")), existing.getMajorDirection()));
        update.setSubDirection(defaultText(asCsv(firstPresent(payload, "subDirections", "subDirection")), existing.getSubDirection()));
        update.setTargetRegion(defaultText(asCsv(payload.get("targetRegion")), existing.getTargetRegion()));
        update.setRecruitmentCycle(defaultText(asCsv(firstPresent(payload, "recruitmentCycle", "recruitmentCycles")), existing.getRecruitmentCycle()));
        update.setRemark(mergeRemark(
            defaultText(asText(payload.get("remark")), existing.getRemark()),
            buildStudyRemark(payload)
        ));
        List<Long> leadMentorUserIds = resolveStaffIdsToUserIds(extractIdList(payload, "leadMentorIds", "leadMentorId"));
        List<Long> assistantUserIds = resolveStaffIdsToUserIds(extractIdList(payload, "assistantIds", "assistantId"));
        if (leadMentorUserIds.isEmpty() && existing.getLeadMentorId() != null)
        {
            leadMentorUserIds = List.of(existing.getLeadMentorId());
        }
        if (assistantUserIds.isEmpty() && existing.getAssistantId() != null)
        {
            assistantUserIds = List.of(existing.getAssistantId());
        }
        update.setLeadMentorId(leadMentorUserIds.isEmpty() ? null : leadMentorUserIds.get(0));
        update.setLeadMentorIds(joinLongs(leadMentorUserIds));
        update.setAssistantId(assistantUserIds.isEmpty() ? null : assistantUserIds.get(0));
        update.setAssistantIds(joinLongs(assistantUserIds));
        update.setGender(defaultText(normalizeGender(asText(payload.get("gender"))), existing.getGender()));
        update.setAccountStatus(defaultText(asText(payload.get("accountStatus")), existing.getAccountStatus()));
        update.setUpdateBy(operator);

        if (studentMapper.updateStudent(update) <= 0)
        {
            throw new ServiceException("学员信息更新失败");
        }

        syncStudentAccount(existing, update, operator);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("studentId", studentId);
        result.put("studentName", update.getStudentName());
        result.put("email", update.getEmail());
        result.put("school", update.getSchool());
        result.put("majorDirection", update.getMajorDirection());
        result.put("targetRegion", update.getTargetRegion());
        return result;
    }

    @Override
    public int deleteStudentByStudentIds(Long[] studentIds)
    {
        return studentMapper.deleteStudentByStudentIds(studentIds);
    }

    @Override
    public int deleteStudentByStudentId(Long studentId)
    {
        return studentMapper.deleteStudentByStudentId(studentId);
    }

    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> createStudentWithContract(Map<String, Object> payload, String operator)
    {
        Map<String, Object> requestBody = payload == null ? Collections.emptyMap() : payload;
        Map<String, Object> studentPayload = firstNestedMap(requestBody, "student", "basicInfo");
        Map<String, Object> contractPayload = firstNestedMap(requestBody, "contract", "contractInfo");

        OsgStudent student = buildStudent(studentPayload.isEmpty() ? requestBody : studentPayload);
        OsgContract contract = buildContract(contractPayload.isEmpty() ? requestBody : contractPayload);

        validateStudent(student);
        validateContract(contract);
        ensureEmailAvailable(student.getEmail());

        student.setAccountStatus(defaultText(student.getAccountStatus(), "0"));
        student.setCreateBy(operator);
        student.setUpdateBy(operator);
        student.setStudentId(OsgIdGenerator.generateUniqueId(jdbcTemplate, "osg_student", "student_id"));
        if (studentMapper.insertStudent(student) <= 0 || student.getStudentId() == null)
        {
            throw new ServiceException("学员创建失败");
        }

        createStudentAccount(student, operator);

        contract.setStudentId(student.getStudentId());
        contract.setContractNo(generateContractNo(student.getStudentId()));
        contract.setContractType(defaultText(contract.getContractType(), DEFAULT_CONTRACT_TYPE));
        contract.setContractStatus(defaultText(contract.getContractStatus(), DEFAULT_CONTRACT_STATUS));
        contract.setCreateBy(operator);
        contract.setUpdateBy(operator);
        if (contractMapper.insertContract(contract) <= 0 || contract.getContractId() == null)
        {
            throw new ServiceException("首份合同创建失败");
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("studentId", student.getStudentId());
        result.put("contractId", contract.getContractId());
        result.put("contractNo", contract.getContractNo());
        result.put("loginAccount", student.getEmail());
        result.put("defaultPassword", DEFAULT_STUDENT_PASSWORD);
        result.put("firstLoginRequired", true);
        return result;
    }

    public int changeStudentStatus(Long studentId, String accountStatus, String updateBy)
    {
        OsgStudent student = new OsgStudent();
        student.setStudentId(studentId);
        student.setAccountStatus(accountStatus);
        student.setUpdateBy(updateBy);
        return studentMapper.updateStudentStatus(student);
    }

    public int updateStudentBlacklist(Long studentId, String action, String reason, Long operatorId)
    {
        if ("remove".equals(action))
        {
            return jdbcTemplate.update("delete from osg_student_blacklist where student_id = ?", studentId);
        }

        return jdbcTemplate.update(
            """
                insert into osg_student_blacklist (student_id, blacklist_reason, operator_id, added_at)
                values (?, ?, ?, now())
                on duplicate key update
                    blacklist_reason = values(blacklist_reason),
                    operator_id = values(operator_id),
                    added_at = values(added_at)
                """,
            studentId,
            reason,
            operatorId
        );
    }

    public Map<String, Object> resetStudentPassword(Long studentId, String operator)
    {
        OsgStudent student = studentMapper.selectStudentByStudentId(studentId);
        if (student == null)
        {
            throw new ServiceException("学员不存在");
        }

        SysUser account = ensureStudentAccount(student, operator);
        if (sysUserService.resetUserPwd(account.getUserId(), SecurityUtils.encryptPassword(DEFAULT_STUDENT_PASSWORD)) <= 0)
        {
            throw new ServiceException("学员密码重置失败");
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("studentId", studentId);
        result.put("loginAccount", student.getEmail());
        result.put("defaultPassword", DEFAULT_STUDENT_PASSWORD);
        return result;
    }

    public List<Long> selectBlacklistedStudentIds(List<Long> studentIds)
    {
        if (studentIds == null || studentIds.isEmpty())
        {
            return Collections.emptyList();
        }

        List<Long> nonNullStudentIds = studentIds.stream()
            .filter(id -> id != null)
            .distinct()
            .collect(Collectors.toList());
        if (nonNullStudentIds.isEmpty())
        {
            return Collections.emptyList();
        }

        String placeholders = nonNullStudentIds.stream().map(id -> "?").collect(Collectors.joining(", "));
        String sql = "select student_id from osg_student_blacklist where student_id in (" + placeholders + ")";
        List<Long> blacklistedIds = jdbcTemplate.queryForList(sql, Long.class, nonNullStudentIds.toArray());
        return blacklistedIds == null ? new ArrayList<>() : blacklistedIds;
    }

    public Map<Long, Map<String, Integer>> selectStudentActivityCounts(List<Long> studentIds)
    {
        if (studentIds == null || studentIds.isEmpty())
        {
            return Collections.emptyMap();
        }

        List<Long> uniqueIds = studentIds.stream()
            .filter(Objects::nonNull)
            .distinct()
            .collect(Collectors.toList());
        if (uniqueIds.isEmpty())
        {
            return Collections.emptyMap();
        }

        Map<Long, Map<String, Integer>> counters = new LinkedHashMap<>();
        mergeStudentCounts(counters, uniqueIds, "osg_coaching", "jobCoachingCount");
        mergeStudentCounts(counters, uniqueIds, "osg_class_record", "basicCourseCount");
        mergeStudentCounts(counters, uniqueIds, "osg_mock_practice", "mockInterviewCount");
        return counters;
    }

    public Map<String, Object> selectStudentDetail(Long studentId)
    {
        OsgStudent student = studentMapper.selectStudentByStudentId(studentId);
        if (student == null)
        {
            return Collections.emptyMap();
        }

        Map<String, String> remarkFields = parseRemarkFields(student.getRemark());
        Map<String, Object> detail = new LinkedHashMap<>();
        detail.put("studentId", student.getStudentId());
        detail.put("studentName", student.getStudentName());
        detail.put("email", student.getEmail());
        detail.put("gender", student.getGender());
        detail.put("school", student.getSchool());
        detail.put("schools", splitCsv(student.getSchool()));
        detail.put("major", student.getMajor());
        detail.put("graduationYear", student.getGraduationYear());
        detail.put("graduationMonth", student.getGraduationMonth());
        detail.put("targetRegion", student.getTargetRegion());
        detail.put("subDirection", student.getSubDirection());
        detail.put("accountStatus", student.getAccountStatus());
        detail.put("recruitmentCycles", splitCsv(student.getRecruitmentCycle()));
        detail.put("majorDirections", splitCsv(student.getMajorDirection()));
        detail.put("highSchool", firstNonBlank(remarkFields.get("highSchool")));
        detail.put("visaStatus", firstNonBlank(remarkFields.get("visaStatus")));
        detail.put("remark", extractUserRemark(student.getRemark()));
        detail.put("mentor", buildMentorBlock(student));
        detail.put("academic", buildAcademicBlock(student, remarkFields));
        detail.put("jobDirection", buildJobDirectionBlock(student));
        detail.put("contact", buildContactBlock(student, remarkFields));
        return detail;
    }

    public Map<String, Object> selectStudentContracts(Long studentId)
    {
        OsgStudent student = studentMapper.selectStudentByStudentId(studentId);
        if (student == null)
        {
            return Collections.emptyMap();
        }

        OsgContract query = new OsgContract();
        query.setStudentId(studentId);
        List<OsgContract> contractRows = contractService.selectContractList(query);
        List<Map<String, Object>> contracts = new ArrayList<>(contractRows.size());

        BigDecimal totalAmount = BigDecimal.ZERO;
        int totalHours = 0;
        BigDecimal usedHours = BigDecimal.ZERO;
        BigDecimal remainingHours = BigDecimal.ZERO;
        for (OsgContract contract : contractRows)
        {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("contractId", contract.getContractId());
            row.put("contractNo", contract.getContractNo());
            row.put("contractType", contract.getContractType());
            row.put("currency", contract.getCurrency());
            row.put("amountUsd", contract.getAmountUsd());
            row.put("amountGbp", contract.getAmountGbp());
            row.put("contractAmount", contract.getContractAmount());
            row.put("totalHours", contract.getTotalHours());
            row.put("usedHours", contract.getUsedHours());
            row.put("remainingHours", contract.getRemainingHours());
            row.put("startDate", contract.getStartDate());
            row.put("endDate", contract.getEndDate());
            row.put("contractStatus", contract.getContractStatus());
            row.put("renewalReason", contract.getRenewalReason());
            row.put("attachmentPath", contract.getAttachmentPath());
            row.put("remark", contract.getRemark());
            row.put("updateTime", contract.getUpdateTime());
            contracts.add(row);

            totalAmount = totalAmount.add(contract.getContractAmount() == null ? BigDecimal.ZERO : contract.getContractAmount());
            totalHours += contract.getTotalHours() == null ? 0 : contract.getTotalHours();
            usedHours = usedHours.add(contract.getUsedHours() == null ? BigDecimal.ZERO : contract.getUsedHours());
            remainingHours = remainingHours.add(contract.getRemainingHours() == null ? BigDecimal.ZERO : contract.getRemainingHours());
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalAmount", totalAmount);
        summary.put("usedHours", usedHours);
        summary.put("remainingHours", remainingHours);
        summary.put("totalHours", totalHours);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("studentId", studentId);
        result.put("summary", summary);
        result.put("contracts", contracts);
        return result;
    }

    private OsgStudent buildStudent(Map<String, Object> source)
    {
        OsgStudent student = new OsgStudent();
        student.setStudentName(asText(firstPresent(source, "studentName", "englishName", "name")));
        student.setEmail(asText(firstPresent(source, "email", "loginEmail")));
        student.setGender(normalizeGender(asText(firstPresent(source, "gender", "sex"))));
        student.setSchool(asCsv(firstPresent(source, "school")));
        student.setMajor(asText(firstPresent(source, "major")));
        Object graduationRaw = firstPresent(source, "graduationMonth", "graduationYear");
        String graduationMonth = parseGraduationMonth(graduationRaw);
        student.setGraduationMonth(graduationMonth);
        student.setGraduationYear(parseYearFromMonth(graduationMonth));
        student.setTargetRegion(asCsv(firstPresent(source, "targetRegion", "jobRegion")));
        student.setRecruitmentCycle(asCsv(firstPresent(source, "recruitmentCycle", "recruitmentCycles")));
        student.setMajorDirection(asCsv(firstPresent(source, "majorDirection", "majorDirections")));
        student.setSubDirection(asCsv(firstPresent(source, "subDirection", "subDirections")));
        List<Long> leadMentorUserIds = resolveStaffIdsToUserIds(extractIdList(source, "leadMentorIds", "leadMentorId"));
        List<Long> assistantUserIds = resolveStaffIdsToUserIds(extractIdList(source, "assistantIds", "assistantId"));
        student.setLeadMentorId(leadMentorUserIds.isEmpty() ? null : leadMentorUserIds.get(0));
        student.setLeadMentorIds(joinLongs(leadMentorUserIds));
        student.setAssistantId(assistantUserIds.isEmpty() ? null : assistantUserIds.get(0));
        student.setAssistantIds(joinLongs(assistantUserIds));
        student.setAccountStatus(asText(firstPresent(source, "accountStatus")));
        student.setRemark(mergeRemark(asText(firstPresent(source, "remark")), buildStudyRemark(source)));
        return student;
    }

    private OsgContract buildContract(Map<String, Object> source)
    {
        OsgContract contract = new OsgContract();
        contract.setContractType(asText(firstPresent(source, "contractType")));
        contract.setCurrency(asText(firstPresent(source, "currency")));
        contract.setAmountUsd(asBigDecimal(firstPresent(source, "amountUsd")));
        contract.setAmountGbp(asBigDecimal(firstPresent(source, "amountGbp")));
        BigDecimal explicitAmount = asBigDecimal(firstPresent(source, "contractAmount", "amount"));
        if (explicitAmount != null)
        {
            contract.setContractAmount(explicitAmount);
        }
        else
        {
            contract.setContractAmount(contract.getAmountUsd() == null ? BigDecimal.ZERO : contract.getAmountUsd());
        }
        contract.setTotalHours(asInteger(firstPresent(source, "totalHours", "studyHours")));
        contract.setUsedHours(BigDecimal.ZERO);
        contract.setRemainingHours(contract.getTotalHours() == null
            ? BigDecimal.ZERO
            : BigDecimal.valueOf(contract.getTotalHours()));
        contract.setStartDate(asDate(firstPresent(source, "startDate")));
        contract.setEndDate(asDate(firstPresent(source, "endDate")));
        contract.setRenewalReason(asText(firstPresent(source, "renewalReason")));
        contract.setContractStatus(asText(firstPresent(source, "contractStatus")));
        contract.setAttachmentPath(asText(firstPresent(source, "attachmentPath", "contractAttachmentPath", "contractAttachment")));
        contract.setRemark(asText(firstPresent(source, "remark")));
        return contract;
    }

    private BigDecimal normalizeHours(BigDecimal value)
    {
        if (value == null)
        {
            return BigDecimal.ZERO;
        }
        return value.stripTrailingZeros();
    }

    private void createStudentAccount(OsgStudent student, String operator)
    {
        SysUser user = new SysUser();
        user.setUserName(student.getEmail());
        user.setNickName(normalizeAccountNickname(student.getStudentName(), "新学员"));
        user.setEmail(student.getEmail());
        user.setSex(normalizeUserSex(student.getGender()));
        user.setPassword(SecurityUtils.encryptPassword(DEFAULT_STUDENT_PASSWORD));
        user.setStatus("0");
        user.setCreateBy(operator);
        user.setRemark("OSG student auto-created account");
        if (sysUserService.insertUser(user) <= 0)
        {
            throw new ServiceException("学生账号创建失败");
        }
    }

    private SysUser ensureStudentAccount(OsgStudent student, String operator)
    {
        SysUser account = sysUserService.selectUserByUserName(student.getEmail());
        if (account != null)
        {
            return account;
        }

        createStudentAccount(student, operator);
        account = sysUserService.selectUserByUserName(student.getEmail());
        if (account == null)
        {
            throw new ServiceException("学生账号创建失败");
        }
        return account;
    }

    private void syncStudentAccount(OsgStudent existing, OsgStudent update, String operator)
    {
        SysUser account = sysUserService.selectUserByUserName(existing.getEmail());
        if (account == null)
        {
            if (!Objects.equals(existing.getEmail(), update.getEmail()))
            {
                ensureStudentAccount(update, operator);
            }
            return;
        }

        String nextEmail = defaultText(update.getEmail(), existing.getEmail());
        jdbcTemplate.update(
            """
                update sys_user
                set user_name = ?,
                    nick_name = ?,
                    email = ?,
                    sex = ?,
                    update_by = ?,
                    update_time = sysdate()
                where user_id = ?
            """,
            nextEmail,
            normalizeAccountNickname(defaultText(update.getStudentName(), existing.getStudentName()), "新学员"),
            nextEmail,
            normalizeUserSex(defaultText(update.getGender(), existing.getGender())),
            operator,
            account.getUserId()
        );
    }

    private void validateStudent(OsgStudent student)
    {
        if (isBlank(student.getStudentName()) || isBlank(student.getEmail()) || isBlank(student.getGender()))
        {
            throw new ServiceException("学员基本信息不完整");
        }
        validateAccountEmail(student.getEmail());
        if (isBlank(student.getTargetRegion()) || isBlank(student.getRecruitmentCycle())
            || isBlank(student.getMajorDirection()) || isBlank(student.getSubDirection()))
        {
            throw new ServiceException("求职方向信息不完整");
        }
    }

    private void validateContract(OsgContract contract)
    {
        if (contract.getContractAmount() == null || contract.getTotalHours() == null
            || contract.getStartDate() == null || contract.getEndDate() == null)
        {
            throw new ServiceException("合同信息不完整");
        }
        if (isBlank(contract.getAttachmentPath()))
        {
            throw new ServiceException("合同附件必传（PDF / PNG / JPG / JPEG）");
        }
    }

    private void ensureEmailAvailable(String email)
    {
        OsgStudent query = new OsgStudent();
        query.setEmail(email);
        if (!studentMapper.selectStudentList(query).isEmpty())
        {
            throw new ServiceException("邮箱已存在");
        }

        SysUser user = new SysUser();
        user.setUserName(email);
        user.setEmail(email);
        if (!sysUserService.checkUserNameUnique(user) || !sysUserService.checkEmailUnique(user))
        {
            throw new ServiceException("邮箱已存在");
        }
    }

    private void mergeStudentCounts(Map<Long, Map<String, Integer>> counters, List<Long> studentIds, String tableName, String metricKey)
    {
        String placeholders = studentIds.stream().map(id -> "?").collect(Collectors.joining(", "));
        String sql = "select student_id, count(1) as total from " + tableName + " where student_id in (" + placeholders + ") group by student_id";
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, studentIds.toArray());
        for (Map<String, Object> row : rows)
        {
            Object studentIdValue = row.get("student_id");
            if (!(studentIdValue instanceof Number studentIdNumber))
            {
                continue;
            }
            Long studentId = studentIdNumber.longValue();
            Map<String, Integer> metric = counters.computeIfAbsent(studentId, key -> new LinkedHashMap<>());
            metric.put(metricKey, row.get("total") instanceof Number totalNumber ? totalNumber.intValue() : 0);
        }
    }

    private Map<String, Object> firstNestedMap(Map<String, Object> source, String... keys)
    {
        for (String key : keys)
        {
            Object value = source.get(key);
            if (value instanceof Map<?, ?> map)
            {
                Map<String, Object> nested = new LinkedHashMap<>();
                for (Map.Entry<?, ?> entry : map.entrySet())
                {
                    Object nestedKey = entry.getKey();
                    if (nestedKey != null)
                    {
                        nested.put(String.valueOf(nestedKey), entry.getValue());
                    }
                }
                return nested;
            }
        }
        return Collections.emptyMap();
    }

    private Object firstPresent(Map<String, Object> source, String... keys)
    {
        for (String key : keys)
        {
            if (source.containsKey(key))
            {
                Object value = source.get(key);
                if (value != null)
                {
                    return value;
                }
            }
        }
        return null;
    }

    private Long asLong(Object value)
    {
        Object normalized = unwrapSingleValue(value);
        if (normalized == null)
        {
            return null;
        }
        if (normalized instanceof Number number)
        {
            return number.longValue();
        }
        try
        {
            return Long.parseLong(String.valueOf(normalized));
        }
        catch (NumberFormatException ex)
        {
            return null;
        }
    }

    private Integer asInteger(Object value)
    {
        Object normalized = unwrapSingleValue(value);
        if (normalized == null)
        {
            return null;
        }
        if (normalized instanceof Number number)
        {
            return number.intValue();
        }
        try
        {
            return Integer.parseInt(String.valueOf(normalized));
        }
        catch (NumberFormatException ex)
        {
            return null;
        }
    }

    private BigDecimal asBigDecimal(Object value)
    {
        Object normalized = unwrapSingleValue(value);
        if (normalized == null)
        {
            return null;
        }
        try
        {
            return new BigDecimal(String.valueOf(normalized));
        }
        catch (NumberFormatException ex)
        {
            return null;
        }
    }

    private Date asDate(Object value)
    {
        Object normalized = unwrapSingleValue(value);
        if (normalized == null)
        {
            return null;
        }
        String text = asText(normalized);
        if (text == null)
        {
            return null;
        }
        String dateText = text.length() >= 10 ? text.substring(0, 10) : text;
        try
        {
            return Date.valueOf(LocalDate.parse(dateText));
        }
        catch (RuntimeException ex)
        {
            return null;
        }
    }

    private Object unwrapSingleValue(Object value)
    {
        if (value instanceof Collection<?> collection)
        {
            for (Object item : collection)
            {
                if (item != null)
                {
                    return item;
                }
            }
            return null;
        }
        if (value instanceof Object[] array)
        {
            for (Object item : array)
            {
                if (item != null)
                {
                    return item;
                }
            }
            return null;
        }
        return value;
    }

    private String asCsv(Object value)
    {
        if (value == null)
        {
            return null;
        }
        if (value instanceof Collection<?> collection)
        {
            return collection.stream()
                .filter(Objects::nonNull)
                .map(String::valueOf)
                .map(String::trim)
                .filter(item -> !item.isEmpty())
                .collect(Collectors.joining(","));
        }
        if (value instanceof Object[] array)
        {
            return java.util.Arrays.stream(array)
                .filter(Objects::nonNull)
                .map(String::valueOf)
                .map(String::trim)
                .filter(item -> !item.isEmpty())
                .collect(Collectors.joining(","));
        }
        return asText(value);
    }

    private String asText(Object value)
    {
        if (value == null)
        {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
    }

    private String normalizeGender(String gender)
    {
        if (gender == null)
        {
            return null;
        }
        return switch (gender.trim().toLowerCase())
        {
            case "male", "m", "0", "男" -> "0";
            case "female", "f", "1", "女" -> "1";
            default -> "2";
        };
    }

    private String normalizeUserSex(String gender)
    {
        return defaultText(normalizeGender(gender), "2");
    }

    private String buildStudyRemark(Map<String, Object> source)
    {
        List<String> segments = new ArrayList<>();
        String studyPlan = asText(firstPresent(source, "studyPlan"));
        if (studyPlan != null)
        {
            segments.add("studyPlan=" + studyPlan);
        }
        String postgraduate = asText(firstPresent(source, "postgraduateStatus", "isPostgraduate", "postgraduate"));
        if (postgraduate != null)
        {
            segments.add("postgraduate=" + postgraduate);
        }
        String deferred = asText(firstPresent(source, "deferredGraduation", "isDeferredGraduation", "graduationExtension"));
        if (deferred != null)
        {
            segments.add("deferredGraduation=" + deferred);
        }
        String highSchool = asText(firstPresent(source, "highSchool"));
        if (highSchool != null)
        {
            segments.add("highSchool=" + highSchool);
        }
        String visaStatus = asText(firstPresent(source, "visaStatus"));
        if (visaStatus != null)
        {
            segments.add("visaStatus=" + visaStatus);
        }
        String wechat = asText(firstPresent(source, "wechat"));
        if (wechat != null)
        {
            segments.add("wechat=" + wechat);
        }
        String phone = asText(firstPresent(source, "phone"));
        if (phone != null)
        {
            segments.add("phone=" + phone);
        }
        if (segments.isEmpty())
        {
            return null;
        }
        return String.join("; ", segments);
    }

    private String mergeRemark(String primary, String extra)
    {
        if (isBlank(primary))
        {
            return extra;
        }
        if (isBlank(extra))
        {
            return primary;
        }
        return primary + " | " + extra;
    }

    private Map<String, Object> buildMentorBlock(OsgStudent student)
    {
        // 数据库 osg_student.lead_mentor_ids / assistant_ids 存的是 sys_user.user_id；
        // 但前端 admin 学员表单的下拉选项 (/admin/staff/list) 使用 osg_staff.staff_id。
        // 此处反向解析 user_id -> staff_id，保证编辑回显与下拉选项 ID 体系一致；
        // 同时用 osg_staff.staff_name 渲染名字，与下拉显示一致。
        List<Long> leadUserIds = mergeIdList(student.getLeadMentorIds(), student.getLeadMentorId());
        List<Long> assistUserIds = mergeIdList(student.getAssistantIds(), student.getAssistantId());

        List<Long> leadStaffIds = leadUserIds.stream()
            .map(identityResolver::resolveStaffIdByUserId)
            .filter(Objects::nonNull)
            .collect(Collectors.toList());
        List<Long> assistStaffIds = assistUserIds.stream()
            .map(identityResolver::resolveStaffIdByUserId)
            .filter(Objects::nonNull)
            .collect(Collectors.toList());

        Map<String, Object> mentor = new LinkedHashMap<>();
        mentor.put("leadMentorId", leadStaffIds.isEmpty() ? null : leadStaffIds.get(0));
        mentor.put("leadMentorName", leadStaffIds.isEmpty() ? null : resolveStaffDisplayName(leadStaffIds.get(0)));
        mentor.put("leadMentorIds", leadStaffIds);
        mentor.put("leadMentorNames", leadStaffIds.stream().map(this::resolveStaffDisplayName).collect(Collectors.toList()));
        mentor.put("assistantId", assistStaffIds.isEmpty() ? null : assistStaffIds.get(0));
        mentor.put("assistantName", assistStaffIds.isEmpty() ? null : resolveStaffDisplayName(assistStaffIds.get(0)));
        mentor.put("assistantIds", assistStaffIds);
        mentor.put("assistantNames", assistStaffIds.stream().map(this::resolveStaffDisplayName).collect(Collectors.toList()));
        return mentor;
    }

    private String resolveStaffDisplayName(Long staffId)
    {
        if (staffId == null)
        {
            return null;
        }
        OsgStaff staff = staffMapper.selectStaffByStaffId(staffId);
        if (staff == null)
        {
            return String.valueOf(staffId);
        }
        return staff.getStaffName() == null || staff.getStaffName().isBlank()
            ? String.valueOf(staffId)
            : staff.getStaffName();
    }

    private List<Long> extractIdList(Map<String, Object> source, String arrayKey, String singleKey)
    {
        List<Long> result = new ArrayList<>();
        Object arrayValue = source == null ? null : source.get(arrayKey);
        if (arrayValue instanceof Collection<?> collection)
        {
            for (Object item : collection)
            {
                Long id = asLong(item);
                if (id != null && !result.contains(id))
                {
                    result.add(id);
                }
            }
        }
        else if (arrayValue instanceof Object[] array)
        {
            for (Object item : array)
            {
                Long id = asLong(item);
                if (id != null && !result.contains(id))
                {
                    result.add(id);
                }
            }
        }
        if (result.isEmpty())
        {
            Long single = asLong(source == null ? null : source.get(singleKey));
            if (single != null)
            {
                result.add(single);
            }
        }
        return result;
    }

    private List<Long> resolveStaffIdsToUserIds(List<Long> staffIds)
    {
        if (staffIds == null || staffIds.isEmpty())
        {
            return Collections.emptyList();
        }
        List<Long> userIds = new ArrayList<>(staffIds.size());
        for (Long id : staffIds)
        {
            Long resolved = resolveStaffToUserId(id, null);
            if (resolved == null && sysUserService.selectUserById(id) != null)
            {
                // 兼容期: list/detail 返回 user_id 数组, 前端原样回传时直接当 user_id
                resolved = id;
            }
            if (resolved != null && !userIds.contains(resolved))
            {
                userIds.add(resolved);
            }
        }
        return userIds;
    }

    /**
     * 解析毕业年月：接受 "YYYY-MM" / "YYYY-MM-DD" 字符串、Integer 年份；返回 "YYYY-MM"（年份输入默认 -06）。
     */
    private String parseGraduationMonth(Object raw)
    {
        if (raw == null) return null;
        if (raw instanceof Number n)
        {
            return n.intValue() + "-06";
        }
        String text = String.valueOf(raw).trim();
        if (text.isEmpty()) return null;
        if (text.matches("^\\d{4}-\\d{2}.*"))
        {
            return text.substring(0, 7);
        }
        if (text.matches("^\\d{4}$"))
        {
            return text + "-06";
        }
        return null;
    }

    private Integer parseYearFromMonth(String yyyyMm)
    {
        if (yyyyMm == null || yyyyMm.length() < 4) return null;
        try
        {
            return Integer.parseInt(yyyyMm.substring(0, 4));
        }
        catch (NumberFormatException ex)
        {
            return null;
        }
    }

    private String joinLongs(List<Long> ids)
    {
        if (ids == null || ids.isEmpty())
        {
            return null;
        }
        return ids.stream().filter(Objects::nonNull).map(String::valueOf).collect(Collectors.joining(","));
    }

    private List<Long> mergeIdList(String csv, Long fallback)
    {
        List<Long> result = new ArrayList<>();
        if (!isBlank(csv))
        {
            for (String token : csv.split(","))
            {
                String trimmed = token.trim();
                if (trimmed.isEmpty())
                {
                    continue;
                }
                try
                {
                    Long id = Long.parseLong(trimmed);
                    if (!result.contains(id))
                    {
                        result.add(id);
                    }
                }
                catch (NumberFormatException ignore)
                {
                    // skip malformed token
                }
            }
        }
        if (result.isEmpty() && fallback != null)
        {
            result.add(fallback);
        }
        return result;
    }

    private Map<String, Object> buildAcademicBlock(OsgStudent student, Map<String, String> remarkFields)
    {
        Map<String, Object> academic = new LinkedHashMap<>();
        academic.put("school", student.getSchool());
        academic.put("schools", splitCsv(student.getSchool()));
        academic.put("major", student.getMajor());
        academic.put("graduationYear", student.getGraduationYear());
        academic.put("graduationMonth", student.getGraduationMonth());
        academic.put("studyPlan", defaultText(remarkFields.get("studyPlan"), remarkFields.get("postgraduate")));
        academic.put("deferredGraduation", remarkFields.get("deferredGraduation"));
        academic.put("highSchool", firstNonBlank(remarkFields.get("highSchool")));
        academic.put("visaStatus", firstNonBlank(remarkFields.get("visaStatus")));
        academic.put("postgraduatePlan", firstNonBlank(
            remarkFields.get("postgraduatePlan"),
            remarkFields.get("postgraduate"),
            remarkFields.get("studyPlan")
        ));
        return academic;
    }

    private Map<String, Object> buildJobDirectionBlock(OsgStudent student)
    {
        Map<String, Object> jobDirection = new LinkedHashMap<>();
        jobDirection.put("targetRegion", student.getTargetRegion());
        jobDirection.put("recruitmentCycles", splitCsv(student.getRecruitmentCycle()));
        jobDirection.put("majorDirections", splitCsv(student.getMajorDirection()));
        jobDirection.put("subDirection", student.getSubDirection());
        return jobDirection;
    }

    private Map<String, Object> buildContactBlock(OsgStudent student, Map<String, String> remarkFields)
    {
        Map<String, Object> contact = new LinkedHashMap<>();
        contact.put("email", student.getEmail());
        contact.put("wechat", firstNonBlank(remarkFields.get("wechat"), remarkFields.get("wechatId")));
        contact.put("phone", remarkFields.get("phone"));
        return contact;
    }

    private Long resolveStaffToUserId(Long staffId, Long fallback)
    {
        if (staffId == null)
        {
            return fallback;
        }
        try
        {
            return identityResolver.resolveUserIdByStaffId(staffId);
        }
        catch (ServiceException ex)
        {
            return fallback;
        }
    }

    private String resolveUserDisplayName(Long userId)
    {
        if (userId == null)
        {
            return null;
        }
        SysUser user = sysUserService.selectUserById(userId);
        if (user == null)
        {
            return String.valueOf(userId);
        }
        return firstNonBlank(user.getNickName(), user.getUserName(), String.valueOf(userId));
    }

    /**
     * 暴露给 controller list 行使用：从 student 实体抽取用户备注
     */
    public String extractUserRemarkFromEntity(OsgStudent student)
    {
        return student == null ? null : extractUserRemark(student.getRemark());
    }

    /**
     * 从合并 remark 中抽取纯用户备注（剔除 key=value 元数据段）
     */
    private String extractUserRemark(String remark)
    {
        if (isBlank(remark))
        {
            return null;
        }
        String normalized = remark.replace(" | ", ";");
        List<String> userParts = new ArrayList<>();
        for (String segment : normalized.split(";"))
        {
            String trimmed = segment.trim();
            if (trimmed.isEmpty() || trimmed.contains("="))
            {
                continue;
            }
            userParts.add(trimmed);
        }
        return userParts.isEmpty() ? null : String.join("; ", userParts);
    }

    private Map<String, String> parseRemarkFields(String remark)
    {
        if (isBlank(remark))
        {
            return Collections.emptyMap();
        }

        Map<String, String> fields = new LinkedHashMap<>();
        String normalized = remark.replace(" | ", ";");
        for (String segment : normalized.split(";"))
        {
            String trimmed = segment.trim();
            if (trimmed.isEmpty() || !trimmed.contains("="))
            {
                continue;
            }
            String[] parts = trimmed.split("=", 2);
            fields.put(parts[0].trim(), parts[1].trim());
        }
        return fields;
    }

    private List<String> splitCsv(String value)
    {
        if (isBlank(value))
        {
            return Collections.emptyList();
        }
        return java.util.Arrays.stream(value.split(","))
            .map(String::trim)
            .filter(item -> !item.isEmpty())
            .collect(Collectors.toList());
    }

    private String defaultText(String value, String fallback)
    {
        return isBlank(value) ? fallback : value;
    }

    private String firstNonBlank(String... values)
    {
        if (values == null)
        {
            return null;
        }
        for (String value : values)
        {
            if (!isBlank(value))
            {
                return value;
            }
        }
        return null;
    }

    private String normalizeAccountNickname(String value, String fallback)
    {
        String nickname = defaultText(value, fallback);
        if (nickname.length() <= SYS_USER_NICKNAME_MAX_LENGTH)
        {
            return nickname;
        }
        return nickname.substring(0, SYS_USER_NICKNAME_MAX_LENGTH);
    }

    private void validateAccountEmail(String email)
    {
        if (isBlank(email))
        {
            return;
        }
        if (email.length() > 30)
        {
            throw new ServiceException("登录邮箱长度不能超过30个字符");
        }
    }

    private Integer defaultInteger(Integer value, Integer fallback)
    {
        return value == null ? fallback : value;
    }

    private Long defaultLong(Long value, Long fallback)
    {
        return value == null ? fallback : value;
    }

    private boolean isBlank(String value)
    {
        return value == null || value.isBlank();
    }

    private String generateContractNo(Long studentId)
    {
        return "CT" + studentId + System.currentTimeMillis();
    }
}
