import java.sql.Connection;
import java.sql.Date;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class StudentPositionFixture {
    private static final String JDBC_URL_ENV = "SPRING_DATASOURCE_DRUID_MASTER_URL";
    private static final String JDBC_USER_ENV = "SPRING_DATASOURCE_DRUID_MASTER_USERNAME";
    private static final String JDBC_PASSWORD_ENV = "SPRING_DATASOURCE_DRUID_MASTER_PASSWORD";
    private static final String POSITION_TABLE = "osg_student_job_position";
    private static final String STATE_TABLE = "osg_student_job_position_state";
    private static final String MOCK_REQUEST_TABLE = "osg_student_mock_request";
    private static final String PROFILE_TABLE = "osg_student_profile";
    private static final String DICT_DATA_TABLE = "sys_dict_data";
    private static final String DICT_TYPE_POSITION_CATEGORY = "osg_student_position_category";
    private static final String DICT_TYPE_POSITION_INDUSTRY = "osg_student_position_industry";
    private static final String DICT_TYPE_POSITION_LOCATION = "osg_student_position_location";
    private static final String DICT_TYPE_POSITION_COMPANY = "osg_student_position_company_brand";
    private static final String DICT_TYPE_POSITION_APPLY_METHOD = "osg_student_position_apply_method";
    private static final String DICT_TYPE_POSITION_PROGRESS_STAGE = "osg_student_position_progress_stage";
    private static final String DICT_TYPE_POSITION_COACHING_STAGE = "osg_student_position_coaching_stage";
    private static final String DICT_TYPE_POSITION_MENTOR_COUNT = "osg_student_position_mentor_count";

    public static void main(String[] args) throws Exception {
        if (args.length < 2) {
            throw new IllegalArgumentException("usage: StudentPositionFixture <reset|reset-applications|reset-mock-practice|snapshot|snapshot-mock-practice> <username>");
        }

        String command = args[0];
        String username = args[1];

        try (Connection connection = DriverManager.getConnection(jdbcUrl(), jdbcUser(), jdbcPassword())) {
            connection.setAutoCommit(false);
            try {
                ensureSchema(connection);
                if ("reset".equals(command)) {
                    resetScenario(connection, username);
                } else if ("reset-applications".equals(command)) {
                    resetApplicationsScenario(connection, username);
                } else if ("reset-mock-practice".equals(command)) {
                    resetMockPracticeScenario(connection, username);
                } else if ("snapshot".equals(command)) {
                    System.out.println(snapshot(connection, username));
                } else if ("snapshot-mock-practice".equals(command)) {
                    System.out.println(snapshotMockPractice(connection, username));
                } else {
                    throw new IllegalArgumentException("unsupported command: " + command);
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

    private static void ensureSchema(Connection connection) throws Exception {
        execute(connection, """
            create table if not exists osg_student_job_position (
              position_id bigint not null auto_increment,
              business_key varchar(128) not null,
              title varchar(128) not null,
              company varchar(128) not null,
              category varchar(32) not null,
              department varchar(64) not null,
              location varchar(64) not null,
              recruit_cycle varchar(64) not null,
              publish_date date null,
              deadline date null,
              position_url varchar(255) not null default '#',
              career_url varchar(255) not null default '#',
              company_key varchar(32) not null,
              company_code varchar(32) not null,
              industry varchar(32) not null,
              requirements varchar(255) null,
              source_type varchar(16) not null default 'global',
              owner_user_id bigint null,
              create_time datetime not null default current_timestamp,
              update_time datetime not null default current_timestamp on update current_timestamp,
              primary key (position_id),
              unique key uk_osg_student_job_position_business_key (business_key)
            ) engine=InnoDB default charset=utf8mb4
            """);
        ensureColumn(connection, POSITION_TABLE, "business_key", "alter table " + POSITION_TABLE + " add column business_key varchar(128) not null default ''");
        ensureColumn(connection, POSITION_TABLE, "company", "alter table " + POSITION_TABLE + " add column company varchar(128) not null default ''");
        ensureColumn(connection, POSITION_TABLE, "category", "alter table " + POSITION_TABLE + " add column category varchar(32) not null default 'summer'");
        ensureColumn(connection, POSITION_TABLE, "department", "alter table " + POSITION_TABLE + " add column department varchar(64) not null default ''");
        ensureColumn(connection, POSITION_TABLE, "location", "alter table " + POSITION_TABLE + " add column location varchar(64) not null default ''");
        ensureColumn(connection, POSITION_TABLE, "recruit_cycle", "alter table " + POSITION_TABLE + " add column recruit_cycle varchar(64) not null default ''");
        ensureColumn(connection, POSITION_TABLE, "publish_date", "alter table " + POSITION_TABLE + " add column publish_date date null");
        ensureColumn(connection, POSITION_TABLE, "deadline", "alter table " + POSITION_TABLE + " add column deadline date null");
        ensureColumn(connection, POSITION_TABLE, "position_url", "alter table " + POSITION_TABLE + " add column position_url varchar(255) not null default '#'");
        ensureColumn(connection, POSITION_TABLE, "career_url", "alter table " + POSITION_TABLE + " add column career_url varchar(255) not null default '#'");
        ensureColumn(connection, POSITION_TABLE, "company_key", "alter table " + POSITION_TABLE + " add column company_key varchar(32) not null default ''");
        ensureColumn(connection, POSITION_TABLE, "company_code", "alter table " + POSITION_TABLE + " add column company_code varchar(32) not null default ''");
        ensureColumn(connection, POSITION_TABLE, "industry", "alter table " + POSITION_TABLE + " add column industry varchar(32) not null default 'ib'");
        ensureColumn(connection, POSITION_TABLE, "requirements", "alter table " + POSITION_TABLE + " add column requirements varchar(255) null");
        ensureColumn(connection, POSITION_TABLE, "source_type", "alter table " + POSITION_TABLE + " add column source_type varchar(16) not null default 'global'");
        ensureColumn(connection, POSITION_TABLE, "owner_user_id", "alter table " + POSITION_TABLE + " add column owner_user_id bigint null");
        ensureColumn(connection, POSITION_TABLE, "create_time", "alter table " + POSITION_TABLE + " add column create_time datetime not null default current_timestamp");
        ensureColumn(connection, POSITION_TABLE, "update_time", "alter table " + POSITION_TABLE + " add column update_time datetime not null default current_timestamp on update current_timestamp");
        execute(connection, "update " + POSITION_TABLE + " set business_key = concat('legacy:', position_id) where business_key = '' or business_key is null");
        ensureUniqueKey(connection, POSITION_TABLE, "uk_osg_student_job_position_business_key", "alter table " + POSITION_TABLE + " add unique key uk_osg_student_job_position_business_key (business_key)");

        execute(connection, """
            create table if not exists osg_student_job_position_state (
              state_id bigint not null auto_increment,
              user_id bigint not null,
              position_id bigint not null,
              favorited char(1) not null default '0',
              applied char(1) not null default '0',
              applied_at datetime null,
              apply_method varchar(64) null,
              apply_note varchar(500) null,
              progress_stage varchar(32) not null default 'applied',
              progress_note varchar(500) null,
              coaching_requested char(1) not null default '0',
              coaching_stage varchar(32) null,
              coaching_mentor_count varchar(32) null,
              coaching_note varchar(500) null,
              create_time datetime not null default current_timestamp,
              update_time datetime not null default current_timestamp on update current_timestamp,
              primary key (state_id),
              unique key uk_osg_student_job_position_state_user_position (user_id, position_id)
            ) engine=InnoDB default charset=utf8mb4
            """);
        ensurePrimaryKeyColumn(connection, STATE_TABLE, "state_id",
                "alter table " + STATE_TABLE + " add column state_id bigint not null auto_increment primary key first");
        ensureColumn(connection, STATE_TABLE, "user_id", "alter table " + STATE_TABLE + " add column user_id bigint not null");
        ensureColumn(connection, STATE_TABLE, "position_id", "alter table " + STATE_TABLE + " add column position_id bigint not null");
        ensureColumn(connection, STATE_TABLE, "favorited", "alter table " + STATE_TABLE + " add column favorited char(1) not null default '0'");
        ensureColumn(connection, STATE_TABLE, "applied", "alter table " + STATE_TABLE + " add column applied char(1) not null default '0'");
        ensureColumn(connection, STATE_TABLE, "applied_at", "alter table " + STATE_TABLE + " add column applied_at datetime null");
        ensureColumn(connection, STATE_TABLE, "apply_method", "alter table " + STATE_TABLE + " add column apply_method varchar(64) null");
        ensureColumn(connection, STATE_TABLE, "apply_note", "alter table " + STATE_TABLE + " add column apply_note varchar(500) null");
        ensureColumn(connection, STATE_TABLE, "progress_stage", "alter table " + STATE_TABLE + " add column progress_stage varchar(32) not null default 'applied'");
        ensureColumn(connection, STATE_TABLE, "progress_note", "alter table " + STATE_TABLE + " add column progress_note varchar(500) null");
        ensureColumn(connection, STATE_TABLE, "coaching_requested", "alter table " + STATE_TABLE + " add column coaching_requested char(1) not null default '0'");
        ensureColumn(connection, STATE_TABLE, "coaching_status", "alter table " + STATE_TABLE + " add column coaching_status varchar(16) null");
        ensureColumn(connection, STATE_TABLE, "coaching_stage", "alter table " + STATE_TABLE + " add column coaching_stage varchar(32) null");
        ensureColumn(connection, STATE_TABLE, "coaching_mentor_count", "alter table " + STATE_TABLE + " add column coaching_mentor_count varchar(32) null");
        ensureColumn(connection, STATE_TABLE, "mentor_name", "alter table " + STATE_TABLE + " add column mentor_name varchar(64) null");
        ensureColumn(connection, STATE_TABLE, "mentor_meta", "alter table " + STATE_TABLE + " add column mentor_meta varchar(128) null");
        ensureColumn(connection, STATE_TABLE, "hours_feedback", "alter table " + STATE_TABLE + " add column hours_feedback varchar(32) null");
        ensureColumn(connection, STATE_TABLE, "feedback_summary", "alter table " + STATE_TABLE + " add column feedback_summary varchar(255) null");
        ensureColumn(connection, STATE_TABLE, "interview_at", "alter table " + STATE_TABLE + " add column interview_at datetime null");
        ensureColumn(connection, STATE_TABLE, "coaching_note", "alter table " + STATE_TABLE + " add column coaching_note varchar(500) null");
        ensureColumn(connection, STATE_TABLE, "create_time", "alter table " + STATE_TABLE + " add column create_time datetime not null default current_timestamp");
        ensureColumn(connection, STATE_TABLE, "update_time", "alter table " + STATE_TABLE + " add column update_time datetime not null default current_timestamp on update current_timestamp");
        ensureUniqueKey(connection, STATE_TABLE, "uk_osg_student_job_position_state_user_position", "alter table " + STATE_TABLE + " add unique key uk_osg_student_job_position_state_user_position (user_id, position_id)");

        execute(connection, """
            create table if not exists osg_student_mock_request (
              request_id bigint not null auto_increment,
              user_id bigint not null,
              request_group varchar(16) not null,
              request_type varchar(32) not null,
              course_type varchar(32) null,
              company varchar(128) null,
              job_status varchar(32) null,
              request_status varchar(32) not null,
              request_content varchar(128) null,
              request_reason varchar(1000) null,
              mentor_count varchar(32) null,
              preferred_mentor varchar(64) null,
              excluded_mentor varchar(64) null,
              mentor_name varchar(64) null,
              mentor_meta varchar(128) null,
              hours_feedback varchar(32) null,
              feedback_summary varchar(255) null,
              feedback_hint varchar(255) null,
              remark varchar(500) null,
              submitted_at datetime not null default current_timestamp,
              completed_at datetime null,
              create_time datetime not null default current_timestamp,
              update_time datetime not null default current_timestamp on update current_timestamp,
              primary key (request_id),
              key idx_osg_student_mock_request_user_group (user_id, request_group, submitted_at)
            ) engine=InnoDB default charset=utf8mb4
            """);
        ensurePrimaryKeyColumn(connection, MOCK_REQUEST_TABLE, "request_id",
                "alter table " + MOCK_REQUEST_TABLE + " add column request_id bigint not null auto_increment primary key first");
        ensureColumn(connection, MOCK_REQUEST_TABLE, "user_id", "alter table " + MOCK_REQUEST_TABLE + " add column user_id bigint not null");
        ensureColumn(connection, MOCK_REQUEST_TABLE, "request_group", "alter table " + MOCK_REQUEST_TABLE + " add column request_group varchar(16) not null default 'practice'");
        ensureColumn(connection, MOCK_REQUEST_TABLE, "request_type", "alter table " + MOCK_REQUEST_TABLE + " add column request_type varchar(32) not null default 'Staffing'");
        ensureColumn(connection, MOCK_REQUEST_TABLE, "course_type", "alter table " + MOCK_REQUEST_TABLE + " add column course_type varchar(32) null");
        ensureColumn(connection, MOCK_REQUEST_TABLE, "company", "alter table " + MOCK_REQUEST_TABLE + " add column company varchar(128) null");
        ensureColumn(connection, MOCK_REQUEST_TABLE, "job_status", "alter table " + MOCK_REQUEST_TABLE + " add column job_status varchar(32) null");
        ensureColumn(connection, MOCK_REQUEST_TABLE, "request_status", "alter table " + MOCK_REQUEST_TABLE + " add column request_status varchar(32) not null default 'Processing'");
        ensureColumn(connection, MOCK_REQUEST_TABLE, "request_content", "alter table " + MOCK_REQUEST_TABLE + " add column request_content varchar(128) null");
        ensureColumn(connection, MOCK_REQUEST_TABLE, "request_reason", "alter table " + MOCK_REQUEST_TABLE + " add column request_reason varchar(1000) null");
        ensureColumn(connection, MOCK_REQUEST_TABLE, "mentor_count", "alter table " + MOCK_REQUEST_TABLE + " add column mentor_count varchar(32) null");
        ensureColumn(connection, MOCK_REQUEST_TABLE, "preferred_mentor", "alter table " + MOCK_REQUEST_TABLE + " add column preferred_mentor varchar(64) null");
        ensureColumn(connection, MOCK_REQUEST_TABLE, "excluded_mentor", "alter table " + MOCK_REQUEST_TABLE + " add column excluded_mentor varchar(64) null");
        ensureColumn(connection, MOCK_REQUEST_TABLE, "mentor_name", "alter table " + MOCK_REQUEST_TABLE + " add column mentor_name varchar(64) null");
        ensureColumn(connection, MOCK_REQUEST_TABLE, "mentor_meta", "alter table " + MOCK_REQUEST_TABLE + " add column mentor_meta varchar(128) null");
        ensureColumn(connection, MOCK_REQUEST_TABLE, "hours_feedback", "alter table " + MOCK_REQUEST_TABLE + " add column hours_feedback varchar(32) null");
        ensureColumn(connection, MOCK_REQUEST_TABLE, "feedback_summary", "alter table " + MOCK_REQUEST_TABLE + " add column feedback_summary varchar(255) null");
        ensureColumn(connection, MOCK_REQUEST_TABLE, "feedback_hint", "alter table " + MOCK_REQUEST_TABLE + " add column feedback_hint varchar(255) null");
        ensureColumn(connection, MOCK_REQUEST_TABLE, "remark", "alter table " + MOCK_REQUEST_TABLE + " add column remark varchar(500) null");
        ensureColumn(connection, MOCK_REQUEST_TABLE, "submitted_at", "alter table " + MOCK_REQUEST_TABLE + " add column submitted_at datetime not null default current_timestamp");
        ensureColumn(connection, MOCK_REQUEST_TABLE, "completed_at", "alter table " + MOCK_REQUEST_TABLE + " add column completed_at datetime null");
        ensureColumn(connection, MOCK_REQUEST_TABLE, "create_time", "alter table " + MOCK_REQUEST_TABLE + " add column create_time datetime not null default current_timestamp");
        ensureColumn(connection, MOCK_REQUEST_TABLE, "update_time", "alter table " + MOCK_REQUEST_TABLE + " add column update_time datetime not null default current_timestamp on update current_timestamp");
    }

    private static void ensureColumn(Connection connection, String tableName, String columnName, String ddl) throws Exception {
        if (hasColumn(connection, tableName, columnName)) {
            return;
        }
        execute(connection, ddl);
    }

    private static void ensurePrimaryKeyColumn(Connection connection, String tableName, String columnName, String ddl) throws Exception {
        if (hasColumn(connection, tableName, columnName)) {
            return;
        }
        if (hasPrimaryKey(connection, tableName)) {
            execute(connection, "alter table " + tableName + " add column " + columnName + " bigint null");
            return;
        }
        execute(connection, ddl);
    }

    private static void ensureUniqueKey(Connection connection, String tableName, String indexName, String ddl) throws Exception {
        if (hasIndex(connection, tableName, indexName)) {
            return;
        }
        execute(connection, ddl);
    }

    private static void resetScenario(Connection connection, String username) throws Exception {
        long userId = requireUserId(connection, username);

        seedPositionMetaDicts(connection);
        upsertStudentProfile(connection, userId, "2026 Spring", "Shanghai", "Consulting");

        try (PreparedStatement deleteState = connection.prepareStatement(
                "delete from " + STATE_TABLE + " where user_id = ?")) {
            deleteState.setLong(1, userId);
            deleteState.executeUpdate();
        }

        try (PreparedStatement deleteManualPositions = connection.prepareStatement(
                "delete from " + POSITION_TABLE + " where source_type = 'manual' and owner_user_id = ?")) {
            deleteManualPositions.setLong(1, userId);
            deleteManualPositions.executeUpdate();
        }

        long gsId = upsertPosition(
                connection,
                "global:gs:ib-analyst",
                "IB Analyst",
                "Goldman Sachs",
                "summer",
                "IBD",
                "Hong Kong",
                "2025 Summer",
                LocalDate.of(2025, 9, 15),
                LocalDate.of(2025, 12, 31),
                "https://www.goldmansachs.com/careers/students/programs-and-internships",
                "https://www.goldmansachs.com/careers/students/programs-and-internships",
                "gs",
                "GS",
                "ib",
                "需PDF简历+Cover Letter",
                "global",
                null
        );

        long jpmId = upsertPosition(
                connection,
                "global:jpm:st-analyst",
                "S&T Analyst",
                "JP Morgan",
                "fulltime",
                "S&T",
                "New York",
                "2025 Full-time",
                LocalDate.of(2025, 10, 1),
                LocalDate.of(2026, 1, 15),
                "https://careers.jpmorgan.com/global/en/students/programs",
                "https://careers.jpmorgan.com/global/en/students/programs",
                "jpm",
                "JPM",
                "ib",
                "",
                "global",
                null
        );

        long mckId = upsertPosition(
                connection,
                "global:mck:business-analyst",
                "Business Analyst",
                "McKinsey",
                "summer",
                "Strategy",
                "Shanghai",
                "2025 Summer",
                LocalDate.of(2025, 7, 1),
                LocalDate.of(2025, 10, 31),
                "https://www.mckinsey.com/careers/search-jobs/jobs/businessanalyst-15136",
                "https://www.mckinsey.com/careers",
                "mck",
                "MCK",
                "consulting",
                "需推荐信+案例分析准备",
                "global",
                null
        );

        upsertState(connection, userId, gsId, false, true, "2026-03-01 09:00:00", "官网投递", "", "first", "等待第一轮面试反馈");
        upsertState(connection, userId, jpmId, true, false, null, null, null, "applied", "");
        upsertState(connection, userId, mckId, true, false, null, null, null, "screening", "");
    }

    private static void resetApplicationsScenario(Connection connection, String username) throws Exception {
        long userId = requireUserId(connection, username);

        resetScenario(connection, username);

        long gsId = requirePositionId(connection, "global:gs:ib-analyst");
        long jpmId = requirePositionId(connection, "global:jpm:st-analyst");
        long mckId = requirePositionId(connection, "global:mck:business-analyst");

        upsertState(
                connection,
                userId,
                gsId,
                false,
                true,
                "2026-03-01 09:00:00",
                "官网投递",
                "",
                "first",
                "等待第一轮面试反馈",
                "coaching",
                "Jerry Li",
                "GS Ex-VP",
                "8h",
                "表现优秀",
                "2026-03-18 14:00:00");

        upsertState(
                connection,
                userId,
                jpmId,
                true,
                true,
                "2026-03-15 10:30:00",
                "官网投递",
                "已完成在线申请",
                "applied",
                "",
                "coaching",
                "Sarah K.",
                "JPM S&T",
                "2h",
                "-",
                null);

        upsertState(
                connection,
                userId,
                mckId,
                true,
                true,
                "2026-03-14 16:00:00",
                "内推",
                "顾问内推已提交",
                "case",
                "准备 case 结构化表达",
                "pending",
                "分配中...",
                "班主任处理中",
                "12h",
                "-",
                "2026-03-22 10:00:00");
    }

    private static void resetMockPracticeScenario(Connection connection, String username) throws Exception {
        long userId = requireUserId(connection, username);

        try (PreparedStatement deleteRequests = connection.prepareStatement(
                "delete from " + MOCK_REQUEST_TABLE + " where user_id = ?")) {
            deleteRequests.setLong(1, userId);
            deleteRequests.executeUpdate();
        }

        insertMockRequest(
                connection,
                userId,
                "practice",
                "模拟面试",
                null,
                null,
                null,
                "已完成",
                "Case Study Round",
                "希望强化 case 结构化表达",
                "2位导师",
                "Sarah Chen",
                null,
                "Sarah Chen",
                "MBB 顾问",
                "3h",
                "优秀",
                "Case分析到位",
                "",
                "2025-12-05 15:30:00",
                "2025-12-08 18:00:00");

        insertMockRequest(
                connection,
                userId,
                "practice",
                "人际关系测试",
                null,
                null,
                null,
                "待分配",
                "人际关系测试",
                "",
                null,
                null,
                null,
                "待分配",
                "班主任分配中",
                "-",
                "-",
                "-",
                "",
                "2026-01-10 14:00:00",
                null);

        insertMockRequest(
                connection,
                userId,
                "practice",
                "期中考试",
                null,
                null,
                null,
                "已完成",
                "期中考试测试",
                "",
                null,
                null,
                null,
                "Mike Wang",
                "MS 顾问",
                "1.5h",
                "良好",
                "DCF需加强",
                "",
                "2025-12-20 10:00:00",
                "2025-12-22 18:00:00");

        insertMockRequest(
                connection,
                userId,
                "course",
                "Staffing",
                "interview",
                "Goldman Sachs",
                "已申请",
                "Processing",
                "我有一个入职面试",
                "",
                null,
                null,
                null,
                null,
                null,
                "",
                "",
                "",
                "需要一轮 staffing 辅导",
                "2025-12-10 09:00:00",
                null);

        insertMockRequest(
                connection,
                userId,
                "course",
                "Hirevue",
                "mock",
                "JP Morgan",
                "面试中",
                "Completed",
                "我需要模拟面试",
                "",
                null,
                null,
                null,
                null,
                null,
                "",
                "",
                "",
                "已完成 hirevue 辅导",
                "2025-12-08 16:00:00",
                "2025-12-09 20:00:00");
    }

    private static void upsertStudentProfile(
            Connection connection,
            long userId,
            String recruitmentCycle,
            String targetRegion,
            String primaryDirection
    ) throws Exception {
        String updateSql = """
            update osg_student_profile
               set recruitment_cycle = ?,
                   target_region = ?,
                   primary_direction = ?,
                   secondary_direction = ?,
                   update_time = current_timestamp
             where user_id = ?
            """;

        try (PreparedStatement statement = connection.prepareStatement(updateSql)) {
            statement.setString(1, recruitmentCycle);
            statement.setString(2, targetRegion);
            statement.setString(3, primaryDirection);
            statement.setString(4, "-");
            statement.setLong(5, userId);
            if (statement.executeUpdate() > 0) {
                return;
            }
        }

        String insertSql = """
            insert into osg_student_profile (
              user_id, student_code, full_name, english_name, email, sex_label, lead_mentor, assistant_name,
              school, major, graduation_year, high_school, postgraduate_plan, visa_status, target_region,
              recruitment_cycle, primary_direction, secondary_direction, phone, wechat_id, create_time, update_time
            )
            select user_id,
                   concat('STU-', user_id),
                   coalesce(nullif(nick_name, ''), user_name),
                   coalesce(nullif(nick_name, ''), user_name),
                   coalesce(nullif(email, ''), '-'),
                   case sex when '1' then 'Female' when '0' then 'Male' else 'Unknown' end,
                   '-', '-', '-', '-', '-', '-', '否', '-', ?, ?, ?, '-', coalesce(nullif(phonenumber, ''), '-'), '-',
                   current_timestamp, current_timestamp
              from sys_user
             where user_id = ?
            """;

        try (PreparedStatement statement = connection.prepareStatement(insertSql)) {
            statement.setString(1, targetRegion);
            statement.setString(2, recruitmentCycle);
            statement.setString(3, primaryDirection);
            statement.setLong(4, userId);
            statement.executeUpdate();
        }
    }

    private static void seedPositionMetaDicts(Connection connection) throws Exception {
        upsertDict(connection, DICT_TYPE_POSITION_CATEGORY, 1L, "暑期实习", "summer", "blue", null, "岗位分类");
        upsertDict(connection, DICT_TYPE_POSITION_CATEGORY, 2L, "全职招聘", "fulltime", "green", null, "岗位分类");
        upsertDict(connection, DICT_TYPE_POSITION_CATEGORY, 3L, "非常规周期", "offcycle", "orange", null, "岗位分类");
        upsertDict(connection, DICT_TYPE_POSITION_CATEGORY, 4L, "春季实习", "spring", "purple", null, "岗位分类");
        upsertDict(connection, DICT_TYPE_POSITION_CATEGORY, 5L, "招聘活动", "events", "red", null, "岗位分类");

        upsertDict(connection, DICT_TYPE_POSITION_INDUSTRY, 1L, "Investment Bank", "ib", "bank", null, "行业展示");
        upsertDict(connection, DICT_TYPE_POSITION_INDUSTRY, 2L, "Consulting", "consulting", "bulb", null, "行业展示");
        upsertDict(connection, DICT_TYPE_POSITION_INDUSTRY, 3L, "Tech", "tech", "code", null, "行业展示");
        upsertDict(connection, DICT_TYPE_POSITION_INDUSTRY, 4L, "PE / VC", "pevc", "fund", null, "行业展示");

        upsertDict(connection, DICT_TYPE_POSITION_LOCATION, 1L, "Hong Kong", "Hong Kong", "hk", null, "地区展示");
        upsertDict(connection, DICT_TYPE_POSITION_LOCATION, 2L, "New York", "New York", "ny", null, "地区展示");
        upsertDict(connection, DICT_TYPE_POSITION_LOCATION, 3L, "Shanghai", "Shanghai", "sh", null, "地区展示");
        upsertDict(connection, DICT_TYPE_POSITION_LOCATION, 4L, "San Francisco", "San Francisco", "sf", null, "地区展示");

        upsertDict(connection, DICT_TYPE_POSITION_COMPANY, 1L, "Goldman Sachs", "gs", "#4F46E5", "GS", "公司品牌");
        upsertDict(connection, DICT_TYPE_POSITION_COMPANY, 2L, "JP Morgan", "jpm", "#0369A1", "JPM", "公司品牌");
        upsertDict(connection, DICT_TYPE_POSITION_COMPANY, 3L, "McKinsey", "mck", "#7C3AED", "MCK", "公司品牌");

        upsertDict(connection, DICT_TYPE_POSITION_APPLY_METHOD, 1L, "官网投递", "官网投递", null, null, "投递方式");
        upsertDict(connection, DICT_TYPE_POSITION_APPLY_METHOD, 2L, "内推", "内推", null, null, "投递方式");
        upsertDict(connection, DICT_TYPE_POSITION_APPLY_METHOD, 3L, "邮件投递", "邮件投递", null, null, "投递方式");

        upsertDict(connection, DICT_TYPE_POSITION_PROGRESS_STAGE, 1L, "已投递", "applied", "blue", null, "岗位进度");
        upsertDict(connection, DICT_TYPE_POSITION_PROGRESS_STAGE, 2L, "HireVue / OT", "hirevue", "blue", null, "岗位进度");
        upsertDict(connection, DICT_TYPE_POSITION_PROGRESS_STAGE, 3L, "First Round", "first", "orange", null, "岗位进度");
        upsertDict(connection, DICT_TYPE_POSITION_PROGRESS_STAGE, 4L, "Second Round", "second", "orange", null, "岗位进度");
        upsertDict(connection, DICT_TYPE_POSITION_PROGRESS_STAGE, 5L, "Case Study", "case", "gold", null, "岗位进度");
        upsertDict(connection, DICT_TYPE_POSITION_PROGRESS_STAGE, 6L, "Offer", "offer", "green", null, "岗位进度");

        upsertDict(connection, DICT_TYPE_POSITION_COACHING_STAGE, 1L, "HireVue / Online Test", "hirevue", null, null, "辅导阶段");
        upsertDict(connection, DICT_TYPE_POSITION_COACHING_STAGE, 2L, "Screening", "screening", null, null, "辅导阶段");
        upsertDict(connection, DICT_TYPE_POSITION_COACHING_STAGE, 3L, "First Round", "first", null, null, "辅导阶段");
        upsertDict(connection, DICT_TYPE_POSITION_COACHING_STAGE, 4L, "Second Round", "second", null, null, "辅导阶段");
        upsertDict(connection, DICT_TYPE_POSITION_COACHING_STAGE, 5L, "Third Round+", "third", null, null, "辅导阶段");
        upsertDict(connection, DICT_TYPE_POSITION_COACHING_STAGE, 6L, "Case Study", "case", null, null, "辅导阶段");
        upsertDict(connection, DICT_TYPE_POSITION_COACHING_STAGE, 7L, "Superday / AC", "superday", null, null, "辅导阶段");

        upsertDict(connection, DICT_TYPE_POSITION_MENTOR_COUNT, 1L, "0 位（仅资料）", "0", null, null, "导师数量");
        upsertDict(connection, DICT_TYPE_POSITION_MENTOR_COUNT, 2L, "1 位导师", "1", null, null, "导师数量");
        upsertDict(connection, DICT_TYPE_POSITION_MENTOR_COUNT, 3L, "2 位导师", "2", null, null, "导师数量");
        upsertDict(connection, DICT_TYPE_POSITION_MENTOR_COUNT, 4L, "3 位导师", "3", null, null, "导师数量");
    }

    private static void upsertDict(
            Connection connection,
            String dictType,
            long sort,
            String label,
            String value,
            String cssClass,
            String listClass,
            String remark
    ) throws Exception {
        String updateSql = """
            update sys_dict_data
               set dict_sort = ?,
                   dict_label = ?,
                   css_class = ?,
                   list_class = ?,
                   status = '0',
                   remark = ?,
                   update_by = 'codex',
                   update_time = current_timestamp
             where dict_type = ?
               and dict_value = ?
            """;

        try (PreparedStatement statement = connection.prepareStatement(updateSql)) {
            statement.setLong(1, sort);
            statement.setString(2, label);
            statement.setString(3, cssClass);
            statement.setString(4, listClass);
            statement.setString(5, remark);
            statement.setString(6, dictType);
            statement.setString(7, value);
            if (statement.executeUpdate() > 0) {
                return;
            }
        }

        String insertSql = """
            insert into sys_dict_data (
              dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time
            ) values (?, ?, ?, ?, ?, ?, 'N', '0', ?, 'codex', current_timestamp)
            """;

        try (PreparedStatement statement = connection.prepareStatement(insertSql)) {
            statement.setLong(1, sort);
            statement.setString(2, label);
            statement.setString(3, value);
            statement.setString(4, dictType);
            statement.setString(5, cssClass);
            statement.setString(6, listClass);
            statement.setString(7, remark);
            statement.executeUpdate();
        }
    }

    private static String snapshot(Connection connection, String username) throws Exception {
        long userId = requireUserId(connection, username);
        List<String> rows = new ArrayList<>();
        String sql =
                "select "
                        + "p.title, "
                        + "p.company, "
                        + "p.source_type, "
                        + "coalesce(s.favorited, '0') as favorited, "
                        + "coalesce(s.applied, '0') as applied, "
                        + "coalesce(date_format(s.applied_at, '%Y-%m-%d'), '') as applied_date, "
                        + "coalesce(s.apply_method, '') as apply_method, "
                        + "coalesce(s.progress_stage, 'applied') as progress_stage, "
                        + "coalesce(s.progress_note, '') as progress_note, "
                        + "coalesce(s.coaching_status, '') as coaching_status, "
                        + "coalesce(s.coaching_stage, '') as coaching_stage, "
                        + "coalesce(s.coaching_mentor_count, '') as coaching_mentor_count, "
                        + "coalesce(s.coaching_note, '') as coaching_note, "
                        + "coalesce(s.mentor_name, '') as mentor_name, "
                        + "coalesce(s.mentor_meta, '') as mentor_meta, "
                        + "coalesce(s.hours_feedback, '') as hours_feedback, "
                        + "coalesce(s.feedback_summary, '') as feedback_summary, "
                        + "coalesce(date_format(s.interview_at, '%Y-%m-%d %H:%i:%s'), '') as interview_at "
                        + "from " + POSITION_TABLE + " p "
                        + "left join " + STATE_TABLE + " s "
                        + "on s.position_id = p.position_id and s.user_id = ? "
                        + "where p.source_type = 'global' or p.owner_user_id = ? "
                        + "order by case when p.owner_user_id = ? then 0 else 1 end, p.position_id asc";

        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, userId);
            statement.setLong(2, userId);
            statement.setLong(3, userId);
            try (ResultSet resultSet = statement.executeQuery()) {
                while (resultSet.next()) {
                    rows.add("{"
                            + "\"title\":\"" + escape(resultSet.getString("title")) + "\","
                            + "\"company\":\"" + escape(resultSet.getString("company")) + "\","
                            + "\"sourceType\":\"" + escape(resultSet.getString("source_type")) + "\","
                            + "\"favorited\":" + asBoolean(resultSet.getString("favorited")) + ","
                            + "\"applied\":" + asBoolean(resultSet.getString("applied")) + ","
                            + "\"appliedDate\":\"" + escape(resultSet.getString("applied_date")) + "\","
                            + "\"applyMethod\":\"" + escape(resultSet.getString("apply_method")) + "\","
                        + "\"progressStage\":\"" + escape(resultSet.getString("progress_stage")) + "\","
                        + "\"progressNote\":\"" + escape(resultSet.getString("progress_note")) + "\","
                        + "\"coachingStatus\":\"" + escape(resultSet.getString("coaching_status")) + "\","
                        + "\"coachingStage\":\"" + escape(resultSet.getString("coaching_stage")) + "\","
                        + "\"coachingMentorCount\":\"" + escape(resultSet.getString("coaching_mentor_count")) + "\","
                        + "\"coachingNote\":\"" + escape(resultSet.getString("coaching_note")) + "\","
                        + "\"mentorName\":\"" + escape(resultSet.getString("mentor_name")) + "\","
                        + "\"mentorMeta\":\"" + escape(resultSet.getString("mentor_meta")) + "\","
                        + "\"hoursFeedback\":\"" + escape(resultSet.getString("hours_feedback")) + "\","
                            + "\"feedbackSummary\":\"" + escape(resultSet.getString("feedback_summary")) + "\","
                            + "\"interviewAt\":\"" + escape(resultSet.getString("interview_at")) + "\""
                            + "}");
                }
            }
        }

        return "[" + String.join(",", rows) + "]";
    }

    private static String snapshotMockPractice(Connection connection, String username) throws Exception {
        long userId = requireUserId(connection, username);
        List<String> rows = new ArrayList<>();
        String sql =
                "select "
                        + "request_group, "
                        + "request_type, "
                        + "course_type, "
                        + "company, "
                        + "job_status, "
                        + "request_status, "
                        + "request_content, "
                        + "request_reason, "
                        + "mentor_count, "
                        + "preferred_mentor, "
                        + "excluded_mentor, "
                        + "mentor_name, "
                        + "mentor_meta, "
                        + "hours_feedback, "
                        + "feedback_summary, "
                        + "feedback_hint, "
                        + "remark, "
                        + "coalesce(date_format(submitted_at, '%Y-%m-%d %H:%i:%s'), '') as submitted_at, "
                        + "coalesce(date_format(completed_at, '%Y-%m-%d %H:%i:%s'), '') as completed_at "
                        + "from " + MOCK_REQUEST_TABLE + " "
                        + "where user_id = ? "
                        + "order by submitted_at asc, request_id asc";

        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, userId);
            try (ResultSet resultSet = statement.executeQuery()) {
                while (resultSet.next()) {
                    rows.add("{"
                            + "\"requestGroup\":\"" + escape(resultSet.getString("request_group")) + "\","
                            + "\"requestType\":\"" + escape(resultSet.getString("request_type")) + "\","
                            + "\"courseType\":\"" + escape(resultSet.getString("course_type")) + "\","
                            + "\"company\":\"" + escape(resultSet.getString("company")) + "\","
                            + "\"jobStatus\":\"" + escape(resultSet.getString("job_status")) + "\","
                            + "\"requestStatus\":\"" + escape(resultSet.getString("request_status")) + "\","
                            + "\"requestContent\":\"" + escape(resultSet.getString("request_content")) + "\","
                            + "\"requestReason\":\"" + escape(resultSet.getString("request_reason")) + "\","
                            + "\"mentorCount\":\"" + escape(resultSet.getString("mentor_count")) + "\","
                            + "\"preferredMentor\":\"" + escape(resultSet.getString("preferred_mentor")) + "\","
                            + "\"excludedMentor\":\"" + escape(resultSet.getString("excluded_mentor")) + "\","
                            + "\"mentorName\":\"" + escape(resultSet.getString("mentor_name")) + "\","
                            + "\"mentorMeta\":\"" + escape(resultSet.getString("mentor_meta")) + "\","
                            + "\"hoursFeedback\":\"" + escape(resultSet.getString("hours_feedback")) + "\","
                            + "\"feedbackSummary\":\"" + escape(resultSet.getString("feedback_summary")) + "\","
                            + "\"feedbackHint\":\"" + escape(resultSet.getString("feedback_hint")) + "\","
                            + "\"remark\":\"" + escape(resultSet.getString("remark")) + "\","
                            + "\"submittedAt\":\"" + escape(resultSet.getString("submitted_at")) + "\","
                            + "\"completedAt\":\"" + escape(resultSet.getString("completed_at")) + "\""
                            + "}");
                }
            }
        }

        return "[" + String.join(",", rows) + "]";
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

    private static long upsertPosition(
            Connection connection,
            String businessKey,
            String title,
            String company,
            String category,
            String department,
            String location,
            String recruitCycle,
            LocalDate publishDate,
            LocalDate deadline,
            String positionUrl,
            String careerUrl,
            String companyKey,
            String companyCode,
            String industry,
            String requirements,
            String sourceType,
            Long ownerUserId
    ) throws Exception {
        String updateSql = """
            update osg_student_job_position
               set title = ?,
                   company = ?,
                   category = ?,
                   department = ?,
                   location = ?,
                   recruit_cycle = ?,
                   publish_date = ?,
                   deadline = ?,
                   position_url = ?,
                   career_url = ?,
                   company_key = ?,
                   company_code = ?,
                   industry = ?,
                   requirements = ?,
                   source_type = ?,
                   owner_user_id = ?
             where business_key = ?
            """;

        try (PreparedStatement update = connection.prepareStatement(updateSql)) {
            bindPosition(
                    update,
                    title,
                    company,
                    category,
                    department,
                    location,
                    recruitCycle,
                    publishDate,
                    deadline,
                    positionUrl,
                    careerUrl,
                    companyKey,
                    companyCode,
                    industry,
                    requirements,
                    sourceType,
                    ownerUserId,
                    businessKey
            );
            if (update.executeUpdate() == 0) {
                String insertSql = """
                    insert into osg_student_job_position (
                      business_key, title, company, category, department, location, recruit_cycle,
                      publish_date, deadline, position_url, career_url, company_key, company_code,
                      industry, requirements, source_type, owner_user_id
                    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """;
                try (PreparedStatement insert = connection.prepareStatement(insertSql, Statement.RETURN_GENERATED_KEYS)) {
                    insert.setString(1, businessKey);
                    insert.setString(2, title);
                    insert.setString(3, company);
                    insert.setString(4, category);
                    insert.setString(5, department);
                    insert.setString(6, location);
                    insert.setString(7, recruitCycle);
                    insert.setDate(8, publishDate == null ? null : Date.valueOf(publishDate));
                    insert.setDate(9, deadline == null ? null : Date.valueOf(deadline));
                    insert.setString(10, positionUrl);
                    insert.setString(11, careerUrl);
                    insert.setString(12, companyKey);
                    insert.setString(13, companyCode);
                    insert.setString(14, industry);
                    insert.setString(15, requirements);
                    insert.setString(16, sourceType);
                    if (ownerUserId == null) {
                        insert.setNull(17, java.sql.Types.BIGINT);
                    } else {
                        insert.setLong(17, ownerUserId);
                    }
                    insert.executeUpdate();
                    try (ResultSet generatedKeys = insert.getGeneratedKeys()) {
                        if (generatedKeys.next()) {
                            return generatedKeys.getLong(1);
                        }
                    }
                }
            }
        }

        try (PreparedStatement select = connection.prepareStatement(
                "select position_id from osg_student_job_position where business_key = ? limit 1")) {
            select.setString(1, businessKey);
            try (ResultSet resultSet = select.executeQuery()) {
                if (resultSet.next()) {
                    return resultSet.getLong("position_id");
                }
            }
        }
        throw new IllegalStateException("position not found after upsert: " + businessKey);
    }

    private static long requirePositionId(Connection connection, String businessKey) throws Exception {
        try (PreparedStatement select = connection.prepareStatement(
                "select position_id from osg_student_job_position where business_key = ? limit 1")) {
            select.setString(1, businessKey);
            try (ResultSet resultSet = select.executeQuery()) {
                if (resultSet.next()) {
                    return resultSet.getLong("position_id");
                }
            }
        }
        throw new IllegalStateException("position not found: " + businessKey);
    }

    private static void insertMockRequest(
            Connection connection,
            long userId,
            String requestGroup,
            String requestType,
            String courseType,
            String company,
            String jobStatus,
            String requestStatus,
            String requestContent,
            String requestReason,
            String mentorCount,
            String preferredMentor,
            String excludedMentor,
            String mentorName,
            String mentorMeta,
            String hoursFeedback,
            String feedbackSummary,
            String feedbackHint,
            String remark,
            String submittedAt,
            String completedAt
    ) throws Exception {
        String sql = """
            insert into osg_student_mock_request (
              user_id, request_group, request_type, course_type, company, job_status, request_status,
              request_content, request_reason, mentor_count, preferred_mentor, excluded_mentor,
              mentor_name, mentor_meta, hours_feedback, feedback_summary, feedback_hint, remark,
              submitted_at, completed_at
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;

        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, userId);
            statement.setString(2, requestGroup);
            statement.setString(3, requestType);
            statement.setString(4, courseType);
            statement.setString(5, company);
            statement.setString(6, jobStatus);
            statement.setString(7, requestStatus);
            statement.setString(8, requestContent);
            statement.setString(9, requestReason);
            statement.setString(10, mentorCount);
            statement.setString(11, preferredMentor);
            statement.setString(12, excludedMentor);
            statement.setString(13, mentorName);
            statement.setString(14, mentorMeta);
            statement.setString(15, hoursFeedback);
            statement.setString(16, feedbackSummary);
            statement.setString(17, feedbackHint);
            statement.setString(18, remark);
            statement.setTimestamp(19, submittedAt == null ? null : Timestamp.valueOf(submittedAt));
            statement.setTimestamp(20, completedAt == null ? null : Timestamp.valueOf(completedAt));
            statement.executeUpdate();
        }
    }

    private static void bindPosition(
            PreparedStatement statement,
            String title,
            String company,
            String category,
            String department,
            String location,
            String recruitCycle,
            LocalDate publishDate,
            LocalDate deadline,
            String positionUrl,
            String careerUrl,
            String companyKey,
            String companyCode,
            String industry,
            String requirements,
            String sourceType,
            Long ownerUserId,
            String businessKey
    ) throws Exception {
        statement.setString(1, title);
        statement.setString(2, company);
        statement.setString(3, category);
        statement.setString(4, department);
        statement.setString(5, location);
        statement.setString(6, recruitCycle);
        statement.setDate(7, publishDate == null ? null : Date.valueOf(publishDate));
        statement.setDate(8, deadline == null ? null : Date.valueOf(deadline));
        statement.setString(9, positionUrl);
        statement.setString(10, careerUrl);
        statement.setString(11, companyKey);
        statement.setString(12, companyCode);
        statement.setString(13, industry);
        statement.setString(14, requirements);
        statement.setString(15, sourceType);
        if (ownerUserId == null) {
            statement.setNull(16, java.sql.Types.BIGINT);
        } else {
            statement.setLong(16, ownerUserId);
        }
        statement.setString(17, businessKey);
    }

    private static void upsertState(
            Connection connection,
            long userId,
            long positionId,
            boolean favorited,
            boolean applied,
            String appliedAt,
            String applyMethod,
            String applyNote,
            String progressStage,
            String progressNote
    ) throws Exception {
        upsertState(
                connection,
                userId,
                positionId,
                favorited,
                applied,
                appliedAt,
                applyMethod,
                applyNote,
                progressStage,
                progressNote,
                null,
                null,
                null,
                null,
                null,
                null);
    }

    private static void upsertState(
            Connection connection,
            long userId,
            long positionId,
            boolean favorited,
            boolean applied,
            String appliedAt,
            String applyMethod,
            String applyNote,
            String progressStage,
            String progressNote,
            String coachingStatus,
            String mentorName,
            String mentorMeta,
            String hoursFeedback,
            String feedbackSummary,
            String interviewAt
    ) throws Exception {
        String sql = """
            insert into osg_student_job_position_state (
              user_id, position_id, favorited, applied, applied_at, apply_method, apply_note,
              progress_stage, progress_note, coaching_status, mentor_name, mentor_meta,
              hours_feedback, feedback_summary, interview_at
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            on duplicate key update
              favorited = values(favorited),
              applied = values(applied),
              applied_at = values(applied_at),
              apply_method = values(apply_method),
              apply_note = values(apply_note),
              progress_stage = values(progress_stage),
              progress_note = values(progress_note),
              coaching_status = values(coaching_status),
              mentor_name = values(mentor_name),
              mentor_meta = values(mentor_meta),
              hours_feedback = values(hours_feedback),
              feedback_summary = values(feedback_summary),
              interview_at = values(interview_at)
            """;

        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, userId);
            statement.setLong(2, positionId);
            statement.setString(3, favorited ? "1" : "0");
            statement.setString(4, applied ? "1" : "0");
            if (appliedAt == null || appliedAt.isBlank()) {
                statement.setNull(5, java.sql.Types.TIMESTAMP);
            } else {
                statement.setTimestamp(5, Timestamp.valueOf(appliedAt));
            }
            statement.setString(6, applyMethod);
            statement.setString(7, applyNote);
            statement.setString(8, progressStage);
            statement.setString(9, progressNote);
            statement.setString(10, coachingStatus);
            statement.setString(11, mentorName);
            statement.setString(12, mentorMeta);
            statement.setString(13, hoursFeedback);
            statement.setString(14, feedbackSummary);
            if (interviewAt == null || interviewAt.isBlank()) {
                statement.setNull(15, java.sql.Types.TIMESTAMP);
            } else {
                statement.setTimestamp(15, Timestamp.valueOf(interviewAt));
            }
            statement.executeUpdate();
        }
    }

    private static void execute(Connection connection, String sql) throws Exception {
        try (Statement statement = connection.createStatement()) {
            statement.execute(sql);
        }
    }

    private static boolean hasColumn(Connection connection, String tableName, String columnName) throws Exception {
        String sql = """
            select count(*)
              from information_schema.columns
             where table_schema = database()
               and table_name = ?
               and column_name = ?
            """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, tableName);
            statement.setString(2, columnName);
            try (ResultSet resultSet = statement.executeQuery()) {
                resultSet.next();
                return resultSet.getInt(1) > 0;
            }
        }
    }

    private static boolean hasPrimaryKey(Connection connection, String tableName) throws Exception {
        String sql = """
            select count(*)
              from information_schema.table_constraints
             where table_schema = database()
               and table_name = ?
               and constraint_type = 'PRIMARY KEY'
            """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, tableName);
            try (ResultSet resultSet = statement.executeQuery()) {
                resultSet.next();
                return resultSet.getInt(1) > 0;
            }
        }
    }

    private static boolean hasIndex(Connection connection, String tableName, String indexName) throws Exception {
        String sql = """
            select count(*)
              from information_schema.statistics
             where table_schema = database()
               and table_name = ?
               and index_name = ?
            """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, tableName);
            statement.setString(2, indexName);
            try (ResultSet resultSet = statement.executeQuery()) {
                resultSet.next();
                return resultSet.getInt(1) > 0;
            }
        }
    }

    private static String escape(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }

    private static boolean asBoolean(String bitValue) {
        return "1".equals(bitValue) || "true".equalsIgnoreCase(bitValue);
    }
}
