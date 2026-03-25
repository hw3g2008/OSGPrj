import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class CreateStudentDemoUser {
    private static final String JDBC_URL_ENV = "SPRING_DATASOURCE_DRUID_MASTER_URL";
    private static final String JDBC_USER_ENV = "SPRING_DATASOURCE_DRUID_MASTER_USERNAME";
    private static final String JDBC_PASSWORD_ENV = "SPRING_DATASOURCE_DRUID_MASTER_PASSWORD";

    private static final String USERNAME = "student_demo";
    private static final String EMAIL = "student_demo@osg.local";
    private static final String STUDENT_MAIN_EMAIL = USERNAME;
    private static final String NICK_NAME = "Student Demo";
    private static final String PHONE = "13900000002";
    private static final long DEFAULT_DEPT_ID = 103L;
    private static final long DEFAULT_ROLE_ID = 2L;
    private static final String DEFAULT_GENDER = "0";
    private static final String DEFAULT_SCHOOL = "Runtime Backfill University";
    private static final String DEFAULT_MAJOR = "Business";
    private static final int DEFAULT_GRADUATION_YEAR = 2027;
    private static final String DEFAULT_MAJOR_DIRECTION = "Consulting";
    private static final String DEFAULT_SUB_DIRECTION = "Strategy";
    private static final String DEFAULT_TARGET_REGION = "Shanghai";
    private static final String DEFAULT_TARGET_POSITION = "Analyst";
    private static final String DEFAULT_RECRUITMENT_CYCLE = "2026 Spring";

    public static void main(String[] args) throws Exception {
        String password = args.length > 0 ? args[0] : "student123";

        try (Connection connection = DriverManager.getConnection(jdbcUrl(), jdbcUser(), jdbcPassword())) {
            connection.setAutoCommit(false);
            try {
                long userId = ensureUser(connection, password);
                ensureUserRole(connection, userId);
                ensureStudentMainData(connection);
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

    private static long ensureUser(Connection connection, String password) throws Exception {
        Long userId = findUserId(connection);
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
                statement.setString(2, USERNAME);
                statement.setString(3, NICK_NAME);
                statement.setString(4, EMAIL);
                statement.setString(5, PHONE);
                statement.setString(6, encodedPassword);
                statement.setString(7, "student-e2e");
                statement.setString(8, "student-e2e");
                statement.setString(9, "student e2e seed");
                statement.executeUpdate();
                try (ResultSet keys = statement.getGeneratedKeys()) {
                    if (keys.next()) {
                        userId = keys.getLong(1);
                    }
                }
            }
            if (userId == null) {
                userId = findUserId(connection);
            }
        } else {
            try (PreparedStatement statement = connection.prepareStatement(
                    "update sys_user set dept_id = ?, nick_name = ?, email = ?, phonenumber = ?, password = ?, "
                            + "status = '0', del_flag = '0', login_ip = '127.0.0.1', pwd_update_date = now(), "
                            + "update_by = ?, update_time = now(), remark = ? where user_id = ?")) {
                statement.setLong(1, DEFAULT_DEPT_ID);
                statement.setString(2, NICK_NAME);
                statement.setString(3, EMAIL);
                statement.setString(4, PHONE);
                statement.setString(5, encodedPassword);
                statement.setString(6, "student-e2e");
                statement.setString(7, "student e2e seed");
                statement.setLong(8, userId);
                statement.executeUpdate();
            }
        }

        if (userId == null) {
            throw new IllegalStateException("failed to seed student demo user");
        }
        return userId;
    }

    private static Long findUserId(Connection connection) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(
                "select user_id from sys_user where user_name = ? limit 1")) {
            statement.setString(1, USERNAME);
            try (ResultSet resultSet = statement.executeQuery()) {
                if (resultSet.next()) {
                    return resultSet.getLong("user_id");
                }
            }
        }
        return null;
    }

    private static void ensureUserRole(Connection connection, long userId) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(
                "insert ignore into sys_user_role (user_id, role_id) values (?, ?)")) {
            statement.setLong(1, userId);
            statement.setLong(2, DEFAULT_ROLE_ID);
            statement.executeUpdate();
        }
    }

    private static long ensureStudentMainData(Connection connection) throws Exception {
        Long studentId = findStudentIdByEmail(connection, STUDENT_MAIN_EMAIL);
        Long legacyStudentId = findStudentIdByEmail(connection, EMAIL);

        if (studentId == null && legacyStudentId != null) {
            studentId = legacyStudentId;
        }

        if (studentId == null) {
            try (PreparedStatement statement = connection.prepareStatement(
                    "insert into osg_student ("
                            + "student_name, email, gender, school, major, graduation_year, major_direction, "
                            + "sub_direction, target_region, target_position, recruitment_cycle, account_status, "
                            + "create_by, create_time, update_by, update_time, remark"
                            + ") values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '0', ?, now(), ?, now(), ?)",
                    Statement.RETURN_GENERATED_KEYS)) {
                statement.setString(1, NICK_NAME);
                statement.setString(2, STUDENT_MAIN_EMAIL);
                statement.setString(3, DEFAULT_GENDER);
                statement.setString(4, DEFAULT_SCHOOL);
                statement.setString(5, DEFAULT_MAJOR);
                statement.setInt(6, DEFAULT_GRADUATION_YEAR);
                statement.setString(7, DEFAULT_MAJOR_DIRECTION);
                statement.setString(8, DEFAULT_SUB_DIRECTION);
                statement.setString(9, DEFAULT_TARGET_REGION);
                statement.setString(10, DEFAULT_TARGET_POSITION);
                statement.setString(11, DEFAULT_RECRUITMENT_CYCLE);
                statement.setString(12, "student-e2e");
                statement.setString(13, "student-e2e");
                statement.setString(14, "student e2e main data seed");
                statement.executeUpdate();
                try (ResultSet keys = statement.getGeneratedKeys()) {
                    if (keys.next()) {
                        studentId = keys.getLong(1);
                    }
                }
            }
            if (studentId == null) {
                studentId = findStudentIdByEmail(connection, STUDENT_MAIN_EMAIL);
            }
        } else {
            try (PreparedStatement statement = connection.prepareStatement(
                    "update osg_student set student_name = ?, email = ?, gender = ?, account_status = '0', "
                            + "update_by = ?, update_time = now(), remark = ? where student_id = ?")) {
                statement.setString(1, NICK_NAME);
                statement.setString(2, STUDENT_MAIN_EMAIL);
                statement.setString(3, DEFAULT_GENDER);
                statement.setString(4, "student-e2e");
                statement.setString(5, "student e2e main data seed");
                statement.setLong(6, studentId);
                statement.executeUpdate();
            }
        }

        if (studentId == null) {
            throw new IllegalStateException("failed to seed student demo main data");
        }
        return studentId;
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
}
