import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class CreateManagedStudentPortalUser {
    private static final String JDBC_URL_ENV = "SPRING_DATASOURCE_DRUID_MASTER_URL";
    private static final String JDBC_USER_ENV = "SPRING_DATASOURCE_DRUID_MASTER_USERNAME";
    private static final String JDBC_PASSWORD_ENV = "SPRING_DATASOURCE_DRUID_MASTER_PASSWORD";

    private static final String USERNAME = "student_c3_chain";
    private static final String EMAIL = "leadmentor-zhangsan-12766@osg.local";
    private static final long EXPECTED_STUDENT_ID = 12766L;
    private static final String NICK_NAME = "张三";
    private static final String PHONE = "13900012766";
    private static final long DEFAULT_DEPT_ID = 103L;
    private static final long DEFAULT_ROLE_ID = 2L;
    private static final long DEFAULT_LEAD_MENTOR_ID = 101L;
    private static final long DEFAULT_ASSISTANT_ID = 844L;

    public static void main(String[] args) throws Exception {
        String password = args.length > 0 ? args[0] : "student12766";

        try (Connection connection = DriverManager.getConnection(jdbcUrl(), jdbcUser(), jdbcPassword())) {
            connection.setAutoCommit(false);
            try {
                ensureManagedStudentMainData(connection);
                long userId = ensureUser(connection, password);
                ensureUserRole(connection, userId);
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
        Long userId = findUserIdByUserName(connection);
        if (userId == null) {
            userId = findUserIdByEmail(connection);
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
                statement.setString(2, USERNAME);
                statement.setString(3, NICK_NAME);
                statement.setString(4, EMAIL);
                statement.setString(5, PHONE);
                statement.setString(6, encodedPassword);
                statement.setString(7, "student-chain-e2e");
                statement.setString(8, "student-chain-e2e");
                statement.setString(9, "managed student portal seed");
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
                statement.setString(2, USERNAME);
                statement.setString(3, NICK_NAME);
                statement.setString(4, EMAIL);
                statement.setString(5, PHONE);
                statement.setString(6, encodedPassword);
                statement.setString(7, "student-chain-e2e");
                statement.setString(8, "managed student portal seed");
                statement.setLong(9, userId);
                statement.executeUpdate();
            }
        }

        if (userId == null) {
            throw new IllegalStateException("failed to seed managed student portal user");
        }
        return userId;
    }

    private static void ensureUserRole(Connection connection, long userId) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(
                "insert ignore into sys_user_role (user_id, role_id) values (?, ?)")) {
            statement.setLong(1, userId);
            statement.setLong(2, DEFAULT_ROLE_ID);
            statement.executeUpdate();
        }
    }

    private static void ensureManagedStudentMainData(Connection connection) throws Exception {
        Long studentId = findStudentIdByEmail(connection);
        if (studentId == null || studentId.longValue() != EXPECTED_STUDENT_ID) {
            throw new IllegalStateException("managed student main data mismatch for " + EMAIL);
        }

        try (PreparedStatement statement = connection.prepareStatement(
                "update osg_student set student_name = ?, account_status = '0', lead_mentor_id = ?, assistant_id = ?, "
                        + "update_by = ?, update_time = now(), remark = ? where student_id = ?")) {
            statement.setString(1, NICK_NAME);
            statement.setLong(2, DEFAULT_LEAD_MENTOR_ID);
            statement.setLong(3, DEFAULT_ASSISTANT_ID);
            statement.setString(4, "student-chain-e2e");
            statement.setString(5, "managed student portal seed");
            statement.setLong(6, EXPECTED_STUDENT_ID);
            statement.executeUpdate();
        }
    }

    private static Long findUserIdByUserName(Connection connection) throws Exception {
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

    private static Long findUserIdByEmail(Connection connection) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(
                "select user_id from sys_user where email = ? limit 1")) {
            statement.setString(1, EMAIL);
            try (ResultSet resultSet = statement.executeQuery()) {
                if (resultSet.next()) {
                    return resultSet.getLong("user_id");
                }
            }
        }
        return null;
    }

    private static Long findStudentIdByEmail(Connection connection) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(
                "select student_id from osg_student where email = ? limit 1")) {
            statement.setString(1, EMAIL);
            try (ResultSet resultSet = statement.executeQuery()) {
                if (resultSet.next()) {
                    return resultSet.getLong("student_id");
                }
            }
        }
        return null;
    }
}
