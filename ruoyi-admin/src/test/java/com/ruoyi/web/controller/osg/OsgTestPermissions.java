package com.ruoyi.web.controller.osg;

import java.util.Set;
import com.ruoyi.common.constant.Constants;

final class OsgTestPermissions
{
    private OsgTestPermissions()
    {
    }

    static Set<String> permissionsForRole(String roleKey)
    {
        return switch (roleKey)
        {
            case "super_admin" -> Set.of(Constants.ALL_PERMISSION);
            case "clerk" -> Set.of(
                "admin:students:list",
                "admin:contracts:list",
                "admin:staff:list");
            case "accountant" -> Set.of("admin:finance:list");
            case "expense_auditor" -> Set.of("admin:expense:list");
            case "position_admin" -> Set.of("admin:positions:list");
            case "quiz_admin" -> Set.of(
                "admin:questions:list",
                "admin:online-test-bank:list",
                "admin:interview-bank:list");
            case "qbank_admin" -> Set.of("admin:qbank:list");
            case "file_admin" -> Set.of("admin:files:list");
            case "course_auditor" -> Set.of("admin:class-records:list");
            default -> Set.of();
        };
    }
}
