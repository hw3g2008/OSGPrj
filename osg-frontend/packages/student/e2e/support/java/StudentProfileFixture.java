import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;

public class StudentProfileFixture {
    private static final String JDBC_URL_ENV = "SPRING_DATASOURCE_DRUID_MASTER_URL";
    private static final String JDBC_USER_ENV = "SPRING_DATASOURCE_DRUID_MASTER_USERNAME";
    private static final String JDBC_PASSWORD_ENV = "SPRING_DATASOURCE_DRUID_MASTER_PASSWORD";
    private static final String PROFILE_TABLE = "osg_student_profile";
    private static final String CHANGE_TABLE = "osg_student_profile_change";

    public static void main(String[] args) throws Exception {
        if (args.length < 2) {
            throw new IllegalArgumentException("usage: StudentProfileFixture <reset|snapshot> <username>");
        }

        try (Connection connection = DriverManager.getConnection(jdbcUrl(), jdbcUser(), jdbcPassword())) {
            connection.setAutoCommit(false);
            try {
                if ("reset".equals(args[0])) {
                    resetScenario(connection, args[1]);
                } else if ("snapshot".equals(args[0])) {
                    System.out.println(snapshot(connection, args[1]));
                } else {
                    throw new IllegalArgumentException("unsupported command: " + args[0]);
                }
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

    private static void resetScenario(Connection connection, String username) throws Exception {
        ensureSchema(connection);
        long userId = requireUserId(connection, username);

        try (PreparedStatement deleteChanges = connection.prepareStatement(
                "delete from " + CHANGE_TABLE + " where user_id = ?")) {
            deleteChanges.setLong(1, userId);
            deleteChanges.executeUpdate();
        }

        try (PreparedStatement deleteProfile = connection.prepareStatement(
                "delete from " + PROFILE_TABLE + " where user_id = ?")) {
            deleteProfile.setLong(1, userId);
            deleteProfile.executeUpdate();
        }

        try (PreparedStatement statement = connection.prepareStatement(
                "insert into " + PROFILE_TABLE + " ("
                        + "user_id, student_code, full_name, english_name, email, sex_label, "
                        + "lead_mentor, assistant_name, school, major, graduation_year, high_school, "
                        + "postgraduate_plan, visa_status, target_region, recruitment_cycle, "
                        + "primary_direction, secondary_direction, phone, wechat_id"
                        + ") values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")) {
            statement.setLong(1, userId);
            statement.setString(2, "12766");
            statement.setString(3, "Emily Zhang");
            statement.setString(4, "Emily Zhang");
            statement.setString(5, "emily@example.com");
            statement.setString(6, "Female");
            statement.setString(7, "Test Lead Mentor");
            statement.setString(8, "-");
            statement.setString(9, "NYU");
            statement.setString(10, "Finance");
            statement.setString(11, "2025");
            statement.setString(12, "-");
            statement.setString(13, "否");
            statement.setString(14, "F1");
            statement.setString(15, "亚太 - 香港");
            statement.setString(16, "2025 Summer");
            statement.setString(17, "金融 Finance");
            statement.setString(18, "IB 投行");
            statement.setString(19, "+1 123-456-7890");
            statement.setString(20, "emily_zhang");
            statement.executeUpdate();
        }

        insertPending(connection, userId, "school", "学校", "NYU", "Columbia University");
        insertPending(connection, userId, "recruitmentCycle", "招聘周期", "2025 Summer", "2025 Full-time");
    }

    private static String snapshot(Connection connection, String username) throws Exception {
        ensureSchema(connection);
        long userId = requireUserId(connection, username);

        String profileJson = readProfile(connection, userId);
        String changesJson = readPendingChanges(connection, userId);
        return "{"
                + "\"profile\":" + profileJson + ","
                + "\"pendingChanges\":" + changesJson
                + "}";
    }

    private static String readProfile(Connection connection, long userId) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(
                "select student_code, full_name, english_name, email, sex_label, lead_mentor, assistant_name, "
                        + "school, major, graduation_year, high_school, postgraduate_plan, visa_status, "
                        + "target_region, recruitment_cycle, primary_direction, secondary_direction, phone, wechat_id "
                        + "from " + PROFILE_TABLE + " where user_id = ? limit 1")) {
            statement.setLong(1, userId);
            try (ResultSet resultSet = statement.executeQuery()) {
                if (!resultSet.next()) {
                    throw new IllegalStateException("profile row missing for user_id=" + userId);
                }
                return "{"
                        + "\"studentCode\":\"" + escape(resultSet.getString("student_code")) + "\","
                        + "\"fullName\":\"" + escape(resultSet.getString("full_name")) + "\","
                        + "\"englishName\":\"" + escape(resultSet.getString("english_name")) + "\","
                        + "\"email\":\"" + escape(resultSet.getString("email")) + "\","
                        + "\"sexLabel\":\"" + escape(resultSet.getString("sex_label")) + "\","
                        + "\"leadMentor\":\"" + escape(resultSet.getString("lead_mentor")) + "\","
                        + "\"assistantName\":\"" + escape(resultSet.getString("assistant_name")) + "\","
                        + "\"school\":\"" + escape(resultSet.getString("school")) + "\","
                        + "\"major\":\"" + escape(resultSet.getString("major")) + "\","
                        + "\"graduationYear\":\"" + escape(resultSet.getString("graduation_year")) + "\","
                        + "\"highSchool\":\"" + escape(resultSet.getString("high_school")) + "\","
                        + "\"postgraduatePlan\":\"" + escape(resultSet.getString("postgraduate_plan")) + "\","
                        + "\"visaStatus\":\"" + escape(resultSet.getString("visa_status")) + "\","
                        + "\"targetRegion\":\"" + escape(resultSet.getString("target_region")) + "\","
                        + "\"recruitmentCycle\":\"" + escape(resultSet.getString("recruitment_cycle")) + "\","
                        + "\"primaryDirection\":\"" + escape(resultSet.getString("primary_direction")) + "\","
                        + "\"secondaryDirection\":\"" + escape(resultSet.getString("secondary_direction")) + "\","
                        + "\"phone\":\"" + escape(resultSet.getString("phone")) + "\","
                        + "\"wechatId\":\"" + escape(resultSet.getString("wechat_id")) + "\""
                        + "}";
            }
        }
    }

    private static String readPendingChanges(Connection connection, long userId) throws Exception {
        List<String> rows = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement(
                "select field_key, field_label, old_value, new_value, status "
                        + "from " + CHANGE_TABLE + " where user_id = ? order by change_id asc")) {
            statement.setLong(1, userId);
            try (ResultSet resultSet = statement.executeQuery()) {
                while (resultSet.next()) {
                    rows.add("{"
                            + "\"fieldKey\":\"" + escape(resultSet.getString("field_key")) + "\","
                            + "\"fieldLabel\":\"" + escape(resultSet.getString("field_label")) + "\","
                            + "\"oldValue\":\"" + escape(resultSet.getString("old_value")) + "\","
                            + "\"newValue\":\"" + escape(resultSet.getString("new_value")) + "\","
                            + "\"status\":\"" + escape(resultSet.getString("status")) + "\""
                            + "}");
                }
            }
        }
        return "[" + String.join(",", rows) + "]";
    }

    private static void ensureSchema(Connection connection) throws Exception {
        execute(connection, """
            create table if not exists osg_student_profile (
              student_profile_id bigint not null auto_increment,
              user_id bigint not null,
              student_code varchar(32) not null,
              full_name varchar(64) not null,
              english_name varchar(64) not null,
              email varchar(128) not null,
              sex_label varchar(32) not null,
              lead_mentor varchar(64) not null,
              assistant_name varchar(64) not null,
              school varchar(128) not null,
              major varchar(128) not null,
              graduation_year varchar(16) not null,
              high_school varchar(128) not null,
              postgraduate_plan varchar(32) not null,
              visa_status varchar(32) not null,
              target_region varchar(128) not null,
              recruitment_cycle varchar(64) not null,
              primary_direction varchar(128) not null,
              secondary_direction varchar(128) not null,
              phone varchar(64) not null,
              wechat_id varchar(128) not null,
              create_time datetime not null default current_timestamp,
              update_time datetime not null default current_timestamp on update current_timestamp,
              primary key (student_profile_id),
              unique key uk_osg_student_profile_user (user_id)
            ) engine=InnoDB default charset=utf8mb4
            """);

        execute(connection, """
            create table if not exists osg_student_profile_change (
              change_id bigint not null auto_increment,
              user_id bigint not null,
              field_key varchar(64) not null,
              field_label varchar(64) not null,
              old_value varchar(255) not null,
              new_value varchar(255) not null,
              status varchar(32) not null default 'pending',
              submitted_at datetime not null default current_timestamp,
              create_time datetime not null default current_timestamp,
              update_time datetime not null default current_timestamp on update current_timestamp,
              primary key (change_id),
              key idx_osg_student_profile_change_user (user_id, status, submitted_at)
            ) engine=InnoDB default charset=utf8mb4
            """);
    }

    private static long requireUserId(Connection connection, String username) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(
                "select user_id from sys_user where user_name = ? limit 1")) {
            statement.setString(1, username);
            try (ResultSet resultSet = statement.executeQuery()) {
                if (resultSet.next()) {
                    return resultSet.getLong("user_id");
                }
            }
        }
        throw new IllegalStateException("user not found: " + username);
    }

    private static void insertPending(Connection connection, long userId, String fieldKey, String fieldLabel,
            String oldValue, String newValue) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(
                "insert into " + CHANGE_TABLE + " (user_id, field_key, field_label, old_value, new_value, status, submitted_at) "
                        + "values (?, ?, ?, ?, ?, 'pending', ?)")) {
            statement.setLong(1, userId);
            statement.setString(2, fieldKey);
            statement.setString(3, fieldLabel);
            statement.setString(4, oldValue);
            statement.setString(5, newValue);
            statement.setTimestamp(6, new Timestamp(System.currentTimeMillis()));
            statement.executeUpdate();
        }
    }

    private static void execute(Connection connection, String sql) throws Exception {
        try (Statement statement = connection.createStatement()) {
            statement.execute(sql);
        }
    }

    private static String escape(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n");
    }
}
