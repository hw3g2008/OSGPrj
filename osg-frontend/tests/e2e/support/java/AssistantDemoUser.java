import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class AssistantDemoUser {
    private static final String JDBC_URL_ENV = "SPRING_DATASOURCE_DRUID_MASTER_URL";
    private static final String JDBC_USER_ENV = "SPRING_DATASOURCE_DRUID_MASTER_USERNAME";
    private static final String JDBC_PASSWORD_ENV = "SPRING_DATASOURCE_DRUID_MASTER_PASSWORD";

    private static final String USERNAME = "assistant_demo";
    private static final String EMAIL = "assistant_e2e@osg.local";
    private static final String NICK_NAME = "Assistant E2E";
    private static final String PHONE = "13900000001";

    public static void main(String[] args) throws Exception {
        String password = args.length > 0 ? args[0] : "Assist1234";

        try (Connection connection = DriverManager.getConnection(jdbcUrl(), jdbcUser(), jdbcPassword())) {
            connection.setAutoCommit(false);
            try {
                long userId = ensureUser(connection, password);
                ensureUserRole(connection, userId);
                ensureAssistantStaff(connection);
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
                statement.setLong(1, 103L);
                statement.setString(2, USERNAME);
                statement.setString(3, NICK_NAME);
                statement.setString(4, EMAIL);
                statement.setString(5, PHONE);
                statement.setString(6, encodedPassword);
                statement.setString(7, "assistant-e2e");
                statement.setString(8, "assistant-e2e");
                statement.setString(9, "assistant e2e seed");
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
                statement.setLong(1, 103L);
                statement.setString(2, NICK_NAME);
                statement.setString(3, EMAIL);
                statement.setString(4, PHONE);
                statement.setString(5, encodedPassword);
                statement.setString(6, "assistant-e2e");
                statement.setString(7, "assistant e2e seed");
                statement.setLong(8, userId);
                statement.executeUpdate();
            }
        }

        if (userId == null) {
            throw new IllegalStateException("failed to seed assistant demo user");
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
            statement.setLong(2, 2L);
            statement.executeUpdate();
        }
    }

    private static void ensureAssistantStaff(Connection connection) throws Exception {
        Long staffId = null;
        try (PreparedStatement statement = connection.prepareStatement(
                "select staff_id from osg_staff where email = ? limit 1")) {
            statement.setString(1, EMAIL);
            try (ResultSet resultSet = statement.executeQuery()) {
                if (resultSet.next()) {
                    staffId = resultSet.getLong("staff_id");
                }
            }
        }

        if (staffId == null) {
            try (PreparedStatement statement = connection.prepareStatement(
                    "insert into osg_staff ("
                            + "staff_name, email, phone, staff_type, major_direction, sub_direction, region, city, "
                            + "hourly_rate, account_status, create_by, create_time, update_by, update_time, remark"
                            + ") values (?, ?, ?, 'assistant', ?, ?, ?, ?, 0.00, 'active', ?, now(), ?, now(), ?)")) {
                statement.setString(1, NICK_NAME);
                statement.setString(2, EMAIL);
                statement.setString(3, PHONE);
                statement.setString(4, "career-support");
                statement.setString(5, "assistant-e2e");
                statement.setString(6, "Shanghai");
                statement.setString(7, "Shanghai");
                statement.setString(8, "assistant-e2e");
                statement.setString(9, "assistant-e2e");
                statement.setString(10, "assistant e2e seed");
                statement.executeUpdate();
            }
        } else {
            try (PreparedStatement statement = connection.prepareStatement(
                    "update osg_staff set staff_name = ?, phone = ?, staff_type = 'assistant', "
                            + "major_direction = ?, sub_direction = ?, region = ?, city = ?, hourly_rate = 0.00, "
                            + "account_status = 'active', update_by = ?, update_time = now(), remark = ? "
                            + "where staff_id = ?")) {
                statement.setString(1, NICK_NAME);
                statement.setString(2, PHONE);
                statement.setString(3, "career-support");
                statement.setString(4, "assistant-e2e");
                statement.setString(5, "Shanghai");
                statement.setString(6, "Shanghai");
                statement.setString(7, "assistant-e2e");
                statement.setString(8, "assistant e2e seed");
                statement.setLong(9, staffId);
                statement.executeUpdate();
            }
        }
    }
}
