import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class CreateMentorChainSeed {
    private static final String JDBC_URL_ENV = "SPRING_DATASOURCE_DRUID_MASTER_URL";
    private static final String JDBC_USER_ENV = "SPRING_DATASOURCE_DRUID_MASTER_USERNAME";
    private static final String JDBC_PASSWORD_ENV = "SPRING_DATASOURCE_DRUID_MASTER_PASSWORD";

    private static final long EXPECTED_STUDENT_ID = 12766L;
    private static final String STUDENT_MAIN_EMAIL = "leadmentor-zhangsan-12766@osg.local";
    private static final String STUDENT_NAME = "张三";
    private static final long DEFAULT_LEAD_MENTOR_ID = 101L;
    private static final long DEFAULT_ASSISTANT_ID = 844L;

    private static final long STUDENT_PORTAL_USER_ID = 12766L;
    private static final String STUDENT_PORTAL_USERNAME = "student_d_chain";
    private static final String STUDENT_PORTAL_EMAIL = STUDENT_MAIN_EMAIL;
    private static final String STUDENT_PHONE = "13900012766";

    private static final long MENTOR_USER_ID = 12767L;
    private static final String MENTOR_USERNAME = "mentor_d_chain";
    private static final String MENTOR_EMAIL = "mentor-d-chain@osg.local";
    private static final String MENTOR_NICK_NAME = "Mentor D Chain";
    private static final String MENTOR_PHONE = "13900012767";

    private static final long DEFAULT_DEPT_ID = 103L;
    private static final long STUDENT_ROLE_ID = 2L;
    private static final long MENTOR_ROLE_ID = 10L;

    private static final String COACHING_COMPANY = "Goldman Sachs";
    private static final String COACHING_POSITION = "IB Analyst";
    private static final String COACHING_LOCATION = "Hong Kong";
    private static final String COACHING_STAGE = "First Round";
    private static final String COACHING_STATUS = "coaching";

    public static void main(String[] args) throws Exception {
        String mentorPassword = args.length > 0 ? args[0] : "mentor12767";
        String studentPassword = args.length > 1 ? args[1] : "student12766";

        try (Connection connection = DriverManager.getConnection(jdbcUrl(), jdbcUser(), jdbcPassword())) {
            connection.setAutoCommit(false);
            try {
                ensureManagedStudentMainData(connection);
                ensureStudentPortalUser(connection, studentPassword);
                ensureMentorPortalUser(connection, mentorPassword);
                ensureUserRole(connection, STUDENT_PORTAL_USER_ID, STUDENT_ROLE_ID);
                ensureUserRole(connection, MENTOR_USER_ID, MENTOR_ROLE_ID);
                ensureJobCoachingAssignment(connection);
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

    private static void ensureManagedStudentMainData(Connection connection) throws Exception {
        Long studentId = findStudentIdByEmail(connection, STUDENT_MAIN_EMAIL);
        if (studentId == null || studentId.longValue() != EXPECTED_STUDENT_ID) {
            throw new IllegalStateException("managed student main data mismatch for " + STUDENT_MAIN_EMAIL);
        }

        try (PreparedStatement statement = connection.prepareStatement(
                "update osg_student set student_name = ?, account_status = '0', lead_mentor_id = ?, assistant_id = ?, "
                        + "update_by = ?, update_time = now(), remark = ? where student_id = ?")) {
            statement.setString(1, STUDENT_NAME);
            statement.setLong(2, DEFAULT_LEAD_MENTOR_ID);
            statement.setLong(3, DEFAULT_ASSISTANT_ID);
            statement.setString(4, "mentor-chain-e2e");
            statement.setString(5, "mentor submit/admin review chain seed");
            statement.setLong(6, EXPECTED_STUDENT_ID);
            statement.executeUpdate();
        }
    }

    private static void ensureStudentPortalUser(Connection connection, String password) throws Exception {
        String encodedPassword = new BCryptPasswordEncoder().encode(password);
        try (PreparedStatement statement = connection.prepareStatement(
                "insert into sys_user ("
                        + "user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, avatar, password, "
                        + "status, del_flag, login_ip, login_date, pwd_update_date, create_by, create_time, "
                        + "update_by, update_time, remark, first_login"
                        + ") values (?, ?, ?, ?, '00', ?, ?, '1', '', ?, '0', '0', '127.0.0.1', now(), now(), ?, now(), ?, now(), ?, '0') "
                        + "on duplicate key update dept_id = values(dept_id), user_name = values(user_name), nick_name = values(nick_name), "
                        + "email = values(email), phonenumber = values(phonenumber), password = values(password), status = '0', "
                        + "del_flag = '0', login_ip = '127.0.0.1', pwd_update_date = now(), update_by = values(update_by), "
                        + "update_time = now(), remark = values(remark), first_login = '0'")) {
            statement.setLong(1, STUDENT_PORTAL_USER_ID);
            statement.setLong(2, DEFAULT_DEPT_ID);
            statement.setString(3, STUDENT_PORTAL_USERNAME);
            statement.setString(4, STUDENT_NAME);
            statement.setString(5, STUDENT_PORTAL_EMAIL);
            statement.setString(6, STUDENT_PHONE);
            statement.setString(7, encodedPassword);
            statement.setString(8, "mentor-chain-e2e");
            statement.setString(9, "mentor-chain-e2e");
            statement.setString(10, "mentor submit/admin review chain seed");
            statement.executeUpdate();
        }
    }

    private static void ensureMentorPortalUser(Connection connection, String password) throws Exception {
        String encodedPassword = new BCryptPasswordEncoder().encode(password);
        try (PreparedStatement statement = connection.prepareStatement(
                "insert into sys_user ("
                        + "user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, avatar, password, "
                        + "status, del_flag, login_ip, login_date, pwd_update_date, create_by, create_time, "
                        + "update_by, update_time, remark, first_login"
                        + ") values (?, ?, ?, ?, '00', ?, ?, '1', '', ?, '0', '0', '127.0.0.1', now(), now(), ?, now(), ?, now(), ?, '0') "
                        + "on duplicate key update dept_id = values(dept_id), user_name = values(user_name), nick_name = values(nick_name), "
                        + "email = values(email), phonenumber = values(phonenumber), password = values(password), status = '0', "
                        + "del_flag = '0', login_ip = '127.0.0.1', pwd_update_date = now(), update_by = values(update_by), "
                        + "update_time = now(), remark = values(remark), first_login = '0'")) {
            statement.setLong(1, MENTOR_USER_ID);
            statement.setLong(2, DEFAULT_DEPT_ID);
            statement.setString(3, MENTOR_USERNAME);
            statement.setString(4, MENTOR_NICK_NAME);
            statement.setString(5, MENTOR_EMAIL);
            statement.setString(6, MENTOR_PHONE);
            statement.setString(7, encodedPassword);
            statement.setString(8, "mentor-chain-e2e");
            statement.setString(9, "mentor-chain-e2e");
            statement.setString(10, "mentor submit/admin review chain seed");
            statement.executeUpdate();
        }
    }

    private static void ensureUserRole(Connection connection, long userId, long roleId) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(
                "insert ignore into sys_user_role (user_id, role_id) values (?, ?)")) {
            statement.setLong(1, userId);
            statement.setLong(2, roleId);
            statement.executeUpdate();
        }
    }

    private static void ensureJobCoachingAssignment(Connection connection) throws Exception {
        try (PreparedStatement deactivate = connection.prepareStatement(
                "update osg_job_coaching set del_flag = '1', update_by = ?, update_time = now() where student_id = ?")) {
            deactivate.setString(1, "mentor-chain-e2e");
            deactivate.setLong(2, EXPECTED_STUDENT_ID);
            deactivate.executeUpdate();
        }

        Long coachingId = findExistingJobCoachingId(connection);
        if (coachingId == null) {
            try (PreparedStatement statement = connection.prepareStatement(
                    "insert into osg_job_coaching ("
                            + "student_id, mentor_id, company, position, location, interview_stage, interview_time, "
                            + "coaching_status, result, create_by, create_time, update_by, update_time, del_flag"
                            + ") values (?, ?, ?, ?, ?, ?, null, ?, null, ?, now(), ?, now(), '0')")) {
                statement.setLong(1, EXPECTED_STUDENT_ID);
                statement.setLong(2, MENTOR_USER_ID);
                statement.setString(3, COACHING_COMPANY);
                statement.setString(4, COACHING_POSITION);
                statement.setString(5, COACHING_LOCATION);
                statement.setString(6, COACHING_STAGE);
                statement.setString(7, COACHING_STATUS);
                statement.setString(8, "mentor-chain-e2e");
                statement.setString(9, "mentor-chain-e2e");
                statement.executeUpdate();
            }
            return;
        }

        try (PreparedStatement statement = connection.prepareStatement(
                "update osg_job_coaching set mentor_id = ?, company = ?, position = ?, location = ?, interview_stage = ?, "
                        + "coaching_status = ?, result = null, del_flag = '0', update_by = ?, update_time = now() where id = ?")) {
            statement.setLong(1, MENTOR_USER_ID);
            statement.setString(2, COACHING_COMPANY);
            statement.setString(3, COACHING_POSITION);
            statement.setString(4, COACHING_LOCATION);
            statement.setString(5, COACHING_STAGE);
            statement.setString(6, COACHING_STATUS);
            statement.setString(7, "mentor-chain-e2e");
            statement.setLong(8, coachingId);
            statement.executeUpdate();
        }
    }

    private static Long findExistingJobCoachingId(Connection connection) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(
                "select id from osg_job_coaching where student_id = ? and mentor_id = ? order by id asc limit 1")) {
            statement.setLong(1, EXPECTED_STUDENT_ID);
            statement.setLong(2, MENTOR_USER_ID);
            try (ResultSet resultSet = statement.executeQuery()) {
                if (resultSet.next()) {
                    return resultSet.getLong("id");
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
}
