import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDateTime;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class CreateAssistantCarrierSeed {
    private static final String JDBC_URL_ENV = "SPRING_DATASOURCE_DRUID_MASTER_URL";
    private static final String JDBC_USER_ENV = "SPRING_DATASOURCE_DRUID_MASTER_USERNAME";
    private static final String JDBC_PASSWORD_ENV = "SPRING_DATASOURCE_DRUID_MASTER_PASSWORD";

    private static final String ASSISTANT_USERNAME = "assistant_e_chain";
    private static final String ASSISTANT_EMAIL = "assistant-e-chain@osg.local";
    private static final String ASSISTANT_NICK_NAME = "E 助教验收账号";
    private static final String ASSISTANT_PHONE = "13900018444";
    private static final long DEFAULT_DEPT_ID = 103L;
    private static final long DEFAULT_ROLE_ID = 2L;

    private static final long OWNED_STUDENT_ID = 12766L;
    private static final String OWNED_STUDENT_EMAIL = "leadmentor-zhangsan-12766@osg.local";
    private static final String OWNED_STUDENT_NAME = "张三";
    private static final long DEFAULT_LEAD_MENTOR_ID = 101L;

    private static final String OWNED_COMPANY_NAME = "Assistant Carrier Capital";
    private static final String OWNED_POSITION_NAME = "Carrier Route Analyst";
    private static final String OWNED_POSITION_CITY = "Shanghai";
    private static final String OWNED_PRACTICE_CONTENT = "Assistant carrier ownership rehearsal";

    public static void main(String[] args) throws Exception {
        String assistantPassword = args.length > 0 ? args[0] : "assistant12766";

        try (Connection connection = DriverManager.getConnection(jdbcUrl(), jdbcUser(), jdbcPassword())) {
            connection.setAutoCommit(false);
            try {
                long assistantUserId = ensureAssistantUser(connection, assistantPassword);
                ensureAssistantUserRole(connection, assistantUserId);
                normalizeAssistantOwnership(connection, assistantUserId);
                ensureOwnedStudentMainData(connection, assistantUserId);
                ensureOwnedJobApplication(connection);
                ensureOwnedMockPractice(connection);
                connection.commit();
            } catch (Exception error) {
                connection.rollback();
                throw error;
            }
        }
    }

    private static String jdbcUrl() {
        return requireEnv(JDBC_URL_ENV);
    }

    private static String jdbcUser() {
        return requireEnv(JDBC_USER_ENV);
    }

    private static String jdbcPassword() {
        return requireEnv(JDBC_PASSWORD_ENV);
    }

    private static String requireEnv(String key) {
        String value = System.getenv(key);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("missing required env: " + key);
        }
        return value;
    }

    private static long ensureAssistantUser(Connection connection, String password) throws Exception {
        Long userId = findAssistantUserIdByUserName(connection);
        if (userId == null) {
            userId = findAssistantUserIdByEmail(connection);
        }

        String encodedPassword = new BCryptPasswordEncoder().encode(password);
        if (userId == null) {
            try (PreparedStatement statement = connection.prepareStatement(
                    "insert into sys_user ("
                            + "dept_id, user_name, nick_name, user_type, email, phonenumber, sex, avatar, password, "
                            + "status, del_flag, login_ip, login_date, pwd_update_date, create_by, create_time, "
                            + "update_by, update_time, remark"
                            + ") values (?, ?, ?, '00', ?, ?, '1', '', ?, '0', '0', '127.0.0.1', now(), now(), ?, now(), ?, now(), ?)",
                    Statement.RETURN_GENERATED_KEYS)) {
                statement.setLong(1, DEFAULT_DEPT_ID);
                statement.setString(2, ASSISTANT_USERNAME);
                statement.setString(3, ASSISTANT_NICK_NAME);
                statement.setString(4, ASSISTANT_EMAIL);
                statement.setString(5, ASSISTANT_PHONE);
                statement.setString(6, encodedPassword);
                statement.setString(7, "assistant-carrier-seed");
                statement.setString(8, "assistant-carrier-seed");
                statement.setString(9, "assistant carrier acceptance seed");
                statement.executeUpdate();
                try (ResultSet keys = statement.getGeneratedKeys()) {
                    if (keys.next()) {
                        userId = keys.getLong(1);
                    }
                }
            }
        } else {
            try (PreparedStatement statement = connection.prepareStatement(
                    "update sys_user set dept_id = ?, user_name = ?, nick_name = ?, email = ?, phonenumber = ?, password = ?, "
                            + "status = '0', del_flag = '0', login_ip = '127.0.0.1', pwd_update_date = now(), "
                            + "update_by = ?, update_time = now(), remark = ? where user_id = ?")) {
                statement.setLong(1, DEFAULT_DEPT_ID);
                statement.setString(2, ASSISTANT_USERNAME);
                statement.setString(3, ASSISTANT_NICK_NAME);
                statement.setString(4, ASSISTANT_EMAIL);
                statement.setString(5, ASSISTANT_PHONE);
                statement.setString(6, encodedPassword);
                statement.setString(7, "assistant-carrier-seed");
                statement.setString(8, "assistant carrier acceptance seed");
                statement.setLong(9, userId);
                statement.executeUpdate();
            }
        }

        if (userId == null) {
            throw new IllegalStateException("failed to seed assistant carrier portal user");
        }
        return userId;
    }

    private static void ensureAssistantUserRole(Connection connection, long userId) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(
                "insert ignore into sys_user_role (user_id, role_id) values (?, ?)")) {
            statement.setLong(1, userId);
            statement.setLong(2, DEFAULT_ROLE_ID);
            statement.executeUpdate();
        }
    }

    private static void normalizeAssistantOwnership(Connection connection, long assistantUserId) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(
                "update osg_student set assistant_id = null, update_by = ?, update_time = now(), remark = ? "
                        + "where assistant_id = ? and student_id <> ?")) {
            statement.setString(1, "assistant-carrier-seed");
            statement.setString(2, "clear stale assistant carrier ownership");
            statement.setLong(3, assistantUserId);
            statement.setLong(4, OWNED_STUDENT_ID);
            statement.executeUpdate();
        }
    }

    private static void ensureOwnedStudentMainData(Connection connection, long assistantUserId) throws Exception {
        Long studentId = findStudentIdByEmail(connection, OWNED_STUDENT_EMAIL);
        if (studentId == null || studentId.longValue() != OWNED_STUDENT_ID) {
            throw new IllegalStateException("assistant carrier owned student main data mismatch for " + OWNED_STUDENT_EMAIL);
        }

        try (PreparedStatement statement = connection.prepareStatement(
                "update osg_student set student_name = ?, account_status = '0', lead_mentor_id = ?, assistant_id = ?, "
                        + "update_by = ?, update_time = now(), remark = ? where student_id = ?")) {
            statement.setString(1, OWNED_STUDENT_NAME);
            statement.setLong(2, DEFAULT_LEAD_MENTOR_ID);
            statement.setLong(3, assistantUserId);
            statement.setString(4, "assistant-carrier-seed");
            statement.setString(5, "assistant carrier owned student");
            statement.setLong(6, OWNED_STUDENT_ID);
            statement.executeUpdate();
        }
    }

    private static void ensureOwnedJobApplication(Connection connection) throws Exception {
        Long applicationId = findJobApplicationId(connection);
        Timestamp interviewTime = Timestamp.valueOf(LocalDateTime.of(2026, 3, 29, 14, 30));
        Timestamp submittedAt = Timestamp.valueOf(LocalDateTime.of(2026, 3, 28, 9, 15));

        if (applicationId == null) {
            try (PreparedStatement statement = connection.prepareStatement(
                    "insert into osg_job_application ("
                            + "student_id, position_id, student_name, company_name, position_name, region, city, "
                            + "current_stage, interview_time, coaching_status, lead_mentor_id, lead_mentor_name, "
                            + "assign_status, requested_mentor_count, preferred_mentor_names, stage_updated, submitted_at, "
                            + "create_by, create_time, update_by, update_time, remark"
                            + ") values (?, null, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now(), ?, now(), ?)")) {
                statement.setLong(1, OWNED_STUDENT_ID);
                statement.setString(2, OWNED_STUDENT_NAME);
                statement.setString(3, OWNED_COMPANY_NAME);
                statement.setString(4, OWNED_POSITION_NAME);
                statement.setString(5, OWNED_POSITION_CITY);
                statement.setString(6, OWNED_POSITION_CITY);
                statement.setString(7, "First Round");
                statement.setTimestamp(8, interviewTime);
                statement.setString(9, "pending");
                statement.setLong(10, DEFAULT_LEAD_MENTOR_ID);
                statement.setString(11, "Lead Mentor 101");
                statement.setString(12, "assigned");
                statement.setInt(13, 1);
                statement.setString(14, "carrier mentor");
                statement.setBoolean(15, false);
                statement.setTimestamp(16, submittedAt);
                statement.setString(17, "assistant-carrier-seed");
                statement.setString(18, "assistant-carrier-seed");
                statement.setString(19, "assistant carrier owned application");
                statement.executeUpdate();
            }
            return;
        }

        try (PreparedStatement statement = connection.prepareStatement(
                "update osg_job_application set student_id = ?, student_name = ?, company_name = ?, position_name = ?, "
                        + "region = ?, city = ?, current_stage = ?, interview_time = ?, coaching_status = ?, "
                        + "lead_mentor_id = ?, lead_mentor_name = ?, assign_status = ?, requested_mentor_count = ?, "
                        + "preferred_mentor_names = ?, stage_updated = ?, submitted_at = ?, update_by = ?, update_time = now(), "
                        + "remark = ? where application_id = ?")) {
            statement.setLong(1, OWNED_STUDENT_ID);
            statement.setString(2, OWNED_STUDENT_NAME);
            statement.setString(3, OWNED_COMPANY_NAME);
            statement.setString(4, OWNED_POSITION_NAME);
            statement.setString(5, OWNED_POSITION_CITY);
            statement.setString(6, OWNED_POSITION_CITY);
            statement.setString(7, "First Round");
            statement.setTimestamp(8, interviewTime);
            statement.setString(9, "pending");
            statement.setLong(10, DEFAULT_LEAD_MENTOR_ID);
            statement.setString(11, "Lead Mentor 101");
            statement.setString(12, "assigned");
            statement.setInt(13, 1);
            statement.setString(14, "carrier mentor");
            statement.setBoolean(15, false);
            statement.setTimestamp(16, submittedAt);
            statement.setString(17, "assistant-carrier-seed");
            statement.setString(18, "assistant carrier owned application");
            statement.setLong(19, applicationId);
            statement.executeUpdate();
        }
    }

    private static void ensureOwnedMockPractice(Connection connection) throws Exception {
        Long practiceId = findMockPracticeId(connection);
        Timestamp scheduledAt = Timestamp.valueOf(LocalDateTime.of(2026, 3, 29, 16, 0));
        Timestamp submittedAt = Timestamp.valueOf(LocalDateTime.of(2026, 3, 28, 10, 0));

        if (practiceId == null) {
            try (PreparedStatement statement = connection.prepareStatement(
                    "insert into osg_mock_practice ("
                            + "student_id, student_name, practice_type, request_content, requested_mentor_count, "
                            + "preferred_mentor_names, status, mentor_ids, mentor_names, mentor_backgrounds, scheduled_at, "
                            + "completed_hours, feedback_rating, feedback_summary, submitted_at, del_flag, create_by, create_time, "
                            + "update_by, update_time, remark"
                            + ") values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '0', ?, now(), ?, now(), ?)")) {
                statement.setLong(1, OWNED_STUDENT_ID);
                statement.setString(2, OWNED_STUDENT_NAME);
                statement.setString(3, "mock_interview");
                statement.setString(4, OWNED_PRACTICE_CONTENT);
                statement.setInt(5, 1);
                statement.setString(6, "carrier mentor");
                statement.setString(7, "scheduled");
                statement.setString(8, null);
                statement.setString(9, "Carrier Route Coach");
                statement.setString(10, "Assistant Ownership Panel");
                statement.setTimestamp(11, scheduledAt);
                statement.setInt(12, 0);
                statement.setObject(13, null);
                statement.setString(14, "");
                statement.setTimestamp(15, submittedAt);
                statement.setString(16, "assistant-carrier-seed");
                statement.setString(17, "assistant-carrier-seed");
                statement.setString(18, "assistant carrier owned mock practice");
                statement.executeUpdate();
            }
            return;
        }

        try (PreparedStatement statement = connection.prepareStatement(
                "update osg_mock_practice set student_id = ?, student_name = ?, practice_type = ?, request_content = ?, "
                        + "requested_mentor_count = ?, preferred_mentor_names = ?, status = ?, mentor_ids = ?, mentor_names = ?, "
                        + "mentor_backgrounds = ?, scheduled_at = ?, completed_hours = ?, feedback_rating = ?, feedback_summary = ?, "
                        + "submitted_at = ?, del_flag = '0', update_by = ?, update_time = now(), remark = ? where practice_id = ?")) {
            statement.setLong(1, OWNED_STUDENT_ID);
            statement.setString(2, OWNED_STUDENT_NAME);
            statement.setString(3, "mock_interview");
            statement.setString(4, OWNED_PRACTICE_CONTENT);
            statement.setInt(5, 1);
            statement.setString(6, "carrier mentor");
            statement.setString(7, "scheduled");
            statement.setString(8, null);
            statement.setString(9, "Carrier Route Coach");
            statement.setString(10, "Assistant Ownership Panel");
            statement.setTimestamp(11, scheduledAt);
            statement.setInt(12, 0);
            statement.setObject(13, null);
            statement.setString(14, "");
            statement.setTimestamp(15, submittedAt);
            statement.setString(16, "assistant-carrier-seed");
            statement.setString(17, "assistant carrier owned mock practice");
            statement.setLong(18, practiceId);
            statement.executeUpdate();
        }
    }

    private static Long findAssistantUserIdByUserName(Connection connection) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(
                "select user_id from sys_user where user_name = ? limit 1")) {
            statement.setString(1, ASSISTANT_USERNAME);
            try (ResultSet resultSet = statement.executeQuery()) {
                if (resultSet.next()) {
                    return resultSet.getLong("user_id");
                }
            }
        }
        return null;
    }

    private static Long findAssistantUserIdByEmail(Connection connection) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(
                "select user_id from sys_user where email = ? limit 1")) {
            statement.setString(1, ASSISTANT_EMAIL);
            try (ResultSet resultSet = statement.executeQuery()) {
                if (resultSet.next()) {
                    return resultSet.getLong("user_id");
                }
            }
        }
        return null;
    }

    private static Long findStudentIdByEmail(Connection connection, String email) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(
                "select student_id from osg_student where email = ? limit 1")) {
            statement.setString(1, email);
            try (ResultSet resultSet = statement.executeQuery()) {
                if (resultSet.next()) {
                    return resultSet.getLong("student_id");
                }
            }
        }
        return null;
    }

    private static Long findJobApplicationId(Connection connection) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(
                "select application_id from osg_job_application "
                        + "where student_id = ? and company_name = ? and position_name = ? "
                        + "order by application_id desc limit 1")) {
            statement.setLong(1, OWNED_STUDENT_ID);
            statement.setString(2, OWNED_COMPANY_NAME);
            statement.setString(3, OWNED_POSITION_NAME);
            try (ResultSet resultSet = statement.executeQuery()) {
                if (resultSet.next()) {
                    return resultSet.getLong("application_id");
                }
            }
        }
        return null;
    }

    private static Long findMockPracticeId(Connection connection) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(
                "select practice_id from osg_mock_practice "
                        + "where student_id = ? and request_content = ? "
                        + "order by practice_id desc limit 1")) {
            statement.setLong(1, OWNED_STUDENT_ID);
            statement.setString(2, OWNED_PRACTICE_CONTENT);
            try (ResultSet resultSet = statement.executeQuery()) {
                if (resultSet.next()) {
                    return resultSet.getLong("practice_id");
                }
            }
        }
        return null;
    }
}
