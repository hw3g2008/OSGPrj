package com.ruoyi.system.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.OsgStaff;
import com.ruoyi.system.domain.OsgStudent;
import com.ruoyi.system.mapper.OsgStaffMapper;
import com.ruoyi.system.mapper.OsgStudentMapper;
import com.ruoyi.system.service.ISysUserService;

@ExtendWith(MockitoExtension.class)
class OsgIdentityResolverTest
{
    @InjectMocks
    private OsgIdentityResolver resolver;

    @Mock
    private OsgStudentMapper studentMapper;

    @Mock
    private OsgStaffMapper staffMapper;

    @Mock
    private ISysUserService sysUserService;

    @Test
    void resolveStudentIdByUserIdPrefersAccountEmailWhenUserNameIsNotAnEmail()
    {
        SysUser account = new SysUser();
        account.setUserId(838L);
        account.setUserName("osg_student");
        account.setEmail("student@example.com");

        OsgStudent student = new OsgStudent();
        student.setStudentId(12766L);
        student.setEmail("student@example.com");

        when(sysUserService.selectUserById(838L)).thenReturn(account);
        when(studentMapper.selectStudentByEmail("student@example.com")).thenReturn(student);

        assertEquals(12766L, resolver.resolveStudentIdByUserId(838L));
        verify(sysUserService).selectUserById(838L);
        verify(studentMapper).selectStudentByEmail("student@example.com");
    }

    @Test
    void resolveStudentIdByUserIdFallsBackToUserNameWhenEmailIsBlank()
    {
        SysUser account = new SysUser();
        account.setUserId(838L);
        account.setUserName("student@example.com");
        account.setEmail("");

        OsgStudent student = new OsgStudent();
        student.setStudentId(12766L);
        student.setEmail("student@example.com");

        when(sysUserService.selectUserById(838L)).thenReturn(account);
        when(studentMapper.selectStudentByEmail("student@example.com")).thenReturn(student);

        assertEquals(12766L, resolver.resolveStudentIdByUserId(838L));
        verify(studentMapper).selectStudentByEmail("student@example.com");
    }

    @Test
    void resolveStudentIdByUserIdFailsWhenStudentBusinessRowMissing()
    {
        SysUser account = new SysUser();
        account.setUserId(838L);
        account.setUserName("student@example.com");

        when(sysUserService.selectUserById(838L)).thenReturn(account);
        when(studentMapper.selectStudentByEmail("student@example.com")).thenReturn(null);

        ServiceException error = assertThrows(ServiceException.class, () -> resolver.resolveStudentIdByUserId(838L));

        assertEquals("学员主数据不存在，无法建立五端主链", error.getMessage());
    }

    @Test
    void resolveUserIdByStaffIdFallsBackToAccountEmailLookupWhenUserNameDiffersFromStaffEmail()
    {
        OsgStaff staff = new OsgStaff();
        staff.setStaffId(9201L);
        staff.setEmail("mentor@example.com");

        SysUser account = new SysUser();
        account.setUserId(9001L);
        account.setUserName("osg_mentor");
        account.setEmail("mentor@example.com");

        when(staffMapper.selectStaffByStaffId(9201L)).thenReturn(staff);
        when(sysUserService.selectUserByUserName("mentor@example.com")).thenReturn(null);
        when(sysUserService.selectUserList(argThat(query -> "mentor@example.com".equals(query.getEmail()))))
            .thenReturn(List.of(account));

        assertEquals(9001L, resolver.resolveUserIdByStaffId(9201L));
        verify(staffMapper).selectStaffByStaffId(9201L);
        verify(sysUserService).selectUserByUserName("mentor@example.com");
        verify(sysUserService).selectUserList(argThat(query -> "mentor@example.com".equals(query.getEmail())));
    }

    @Test
    void resolveUserIdByStaffIdFailsWhenAccountMissing()
    {
        OsgStaff staff = new OsgStaff();
        staff.setStaffId(9201L);
        staff.setEmail("mentor@example.com");

        when(staffMapper.selectStaffByStaffId(9201L)).thenReturn(staff);
        when(sysUserService.selectUserByUserName("mentor@example.com")).thenReturn(null);
        when(sysUserService.selectUserList(argThat(query -> "mentor@example.com".equals(query.getEmail()))))
            .thenReturn(List.of());

        ServiceException error = assertThrows(ServiceException.class, () -> resolver.resolveUserIdByStaffId(9201L));

        assertEquals("员工账号不存在，无法完成导师分配", error.getMessage());
    }
}
