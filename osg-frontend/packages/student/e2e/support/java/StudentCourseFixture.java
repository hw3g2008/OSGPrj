import java.sql.Connection;
import java.sql.Date;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class StudentCourseFixture {
    private static final String JDBC_URL_ENV = "SPRING_DATASOURCE_DRUID_MASTER_URL";
    private static final String JDBC_USER_ENV = "SPRING_DATASOURCE_DRUID_MASTER_USERNAME";
    private static final String JDBC_PASSWORD_ENV = "SPRING_DATASOURCE_DRUID_MASTER_PASSWORD";
    private static final String COURSE_TABLE = "osg_student_course_record";

    public static void main(String[] args) throws Exception {
        if (args.length < 2) {
            throw new IllegalArgumentException("usage: StudentCourseFixture <reset|snapshot> <username>");
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

        try (PreparedStatement delete = connection.prepareStatement(
                "delete from " + COURSE_TABLE + " where user_id = ?")) {
            delete.setLong(1, userId);
            delete.executeUpdate();
        }

        insertRecord(connection, userId, "#R231785", "岗位辅导", "Goldman Sachs · IB Analyst", "Case准备", "Jerry Li", "导师",
                LocalDate.of(2026, 1, 26), "2h", true, null, "", "");
        insertRecord(connection, userId, "#R231784", "模拟应聘", "模拟面试 · First Round", "模拟面试", "Test Lead Mentor", "班主任",
                LocalDate.of(2026, 1, 25), "1.5h", true, null, "", "");
        insertRecord(connection, userId, "#R231780", "岗位辅导", "Goldman Sachs · IB Analyst", "新简历", "Jerry Li", "导师",
                LocalDate.of(2026, 1, 20), "2h", false, 5.0, "专业能力强,收获很大", "简历反馈很有帮助");
        insertRecord(connection, userId, "#R231778", "模拟应聘", "人际关系期中考试", "人际关系期中考试", "Mike Chen", "导师",
                LocalDate.of(2026, 1, 18), "1h", false, 4.5, "反馈及时,准时守约", "软技能点评到位");
        insertRecord(connection, userId, "#R231775", "岗位辅导", "Google · SWE", "简历更新", "Sarah Wang", "导师",
                LocalDate.of(2026, 1, 15), "1h", false, 4.8, "专业能力强", "更新建议可执行");
        insertRecord(connection, userId, "#R231772", "模拟应聘", "模拟期中考试", "模拟期中考试", "Test Lead Mentor", "班主任",
                LocalDate.of(2026, 1, 10), "1.5h", false, 5.0, "收获很大", "整体体验很好");
    }

    private static String snapshot(Connection connection, String username) throws Exception {
        ensureSchema(connection);
        long userId = requireUserId(connection, username);
        List<String> rows = new ArrayList<>();

        String sql = "select record_code, coaching_type, coaching_detail, course_content, mentor_name, mentor_role, "
                + "date_format(class_date, '%Y-%m-%d') as class_date, duration_label, is_new, "
                + "coalesce(cast(rating_score as char), '') as rating_score, coalesce(rating_tags, '') as rating_tags, "
                + "coalesce(rating_feedback, '') as rating_feedback "
                + "from " + COURSE_TABLE + " where user_id = ? order by class_date desc, course_record_id desc";

        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, userId);
            try (ResultSet resultSet = statement.executeQuery()) {
                while (resultSet.next()) {
                    rows.add("{"
                            + "\"recordId\":\"" + escape(resultSet.getString("record_code")) + "\","
                            + "\"coachingType\":\"" + escape(resultSet.getString("coaching_type")) + "\","
                            + "\"coachingDetail\":\"" + escape(resultSet.getString("coaching_detail")) + "\","
                            + "\"courseContent\":\"" + escape(resultSet.getString("course_content")) + "\","
                            + "\"mentor\":\"" + escape(resultSet.getString("mentor_name")) + "\","
                            + "\"mentorRole\":\"" + escape(resultSet.getString("mentor_role")) + "\","
                            + "\"classDate\":\"" + escape(resultSet.getString("class_date")) + "\","
                            + "\"duration\":\"" + escape(resultSet.getString("duration_label")) + "\","
                            + "\"isNew\":" + asBoolean(resultSet.getString("is_new")) + ","
                            + "\"ratingScore\":\"" + escape(resultSet.getString("rating_score")) + "\","
                            + "\"ratingTags\":\"" + escape(resultSet.getString("rating_tags")) + "\","
                            + "\"ratingFeedback\":\"" + escape(resultSet.getString("rating_feedback")) + "\""
                            + "}");
                }
            }
        }

        return "[" + String.join(",", rows) + "]";
    }

    private static void ensureSchema(Connection connection) throws Exception {
        execute(connection, """
            create table if not exists osg_student_course_record (
              course_record_id bigint not null auto_increment,
              user_id bigint not null,
              record_code varchar(32) not null,
              coaching_type varchar(32) not null,
              coaching_detail varchar(128) not null,
              course_content varchar(64) not null,
              mentor_name varchar(64) not null,
              mentor_role varchar(32) not null,
              class_date date not null,
              duration_label varchar(32) not null,
              is_new char(1) not null default '0',
              rating_score decimal(3,1) null,
              rating_tags varchar(255) null,
              rating_feedback varchar(1000) null,
              create_time datetime not null default current_timestamp,
              update_time datetime not null default current_timestamp on update current_timestamp,
              primary key (course_record_id),
              unique key uk_osg_student_course_record_user_code (user_id, record_code)
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

    private static void insertRecord(Connection connection, long userId, String recordCode, String coachingType,
            String coachingDetail, String courseContent, String mentorName, String mentorRole, LocalDate classDate,
            String durationLabel, boolean isNew, Double ratingScore, String ratingTags, String ratingFeedback) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(
                "insert into " + COURSE_TABLE + " (user_id, record_code, coaching_type, coaching_detail, course_content, mentor_name, mentor_role, class_date, duration_label, is_new, rating_score, rating_tags, rating_feedback) "
                        + "values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")) {
            statement.setLong(1, userId);
            statement.setString(2, recordCode);
            statement.setString(3, coachingType);
            statement.setString(4, coachingDetail);
            statement.setString(5, courseContent);
            statement.setString(6, mentorName);
            statement.setString(7, mentorRole);
            statement.setDate(8, Date.valueOf(classDate));
            statement.setString(9, durationLabel);
            statement.setString(10, isNew ? "1" : "0");
            if (ratingScore == null) {
                statement.setNull(11, java.sql.Types.DECIMAL);
            } else {
                statement.setDouble(11, ratingScore);
            }
            statement.setString(12, ratingTags);
            statement.setString(13, ratingFeedback);
            statement.executeUpdate();
        }
    }

    private static void execute(Connection connection, String sql) throws Exception {
        try (Statement statement = connection.createStatement()) {
            statement.execute(sql);
        }
    }

    private static boolean asBoolean(String flag) {
        return "1".equals(flag) || "true".equalsIgnoreCase(flag);
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
