<template>
  <div id="page-home" class="page active dashboard-page">
    <div class="card student-profile-card">
      <div class="card-header">
        <span class="card-title">学员信息 Student Profile</span>
      </div>
      <div class="card-body">
        <div class="profile-grid">
          <div class="profile-avatar">TS</div>
          <div>
            <h2 class="student-name">
              Test Student
              <span class="student-id">ID: 12766</span>
            </h2>
            <div class="student-meta-grid">
              <div><i class="mdi mdi-school" aria-hidden="true"></i>北京大学 · 光华管理学院</div>
              <div><i class="mdi mdi-calendar" aria-hidden="true"></i>2025届毕业</div>
              <div><i class="mdi mdi-target" aria-hidden="true"></i><strong>主攻方向：</strong>Finance · IB</div>
              <div><i class="mdi mdi-email" aria-hidden="true"></i>test@example.com</div>
            </div>
          </div>
          <div class="mentor-section">
            <div class="mentor-label">
              <i class="mdi mdi-account-tie" aria-hidden="true"></i>
              我的导师团队 My Mentors
            </div>
            <div class="mentor-stack">
              <div>
                <div class="mentor-role">班主任 Lead Mentor</div>
                <div class="mentor-primary-card">
                  <div class="mentor-avatar">TL</div>
                  <div>
                    <div class="mentor-name">Test Lead Mentor</div>
                    <div class="mentor-area">金融 Finance</div>
                  </div>
                </div>
              </div>
              <div>
                <div class="mentor-role">辅导导师 Tutors</div>
                <div class="mentor-tags">
                  <span class="tag purple">Jerry Li</span>
                  <span class="tag purple">Mike Chen</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <section class="analysis-hero">
      <div class="analysis-bar"></div>
      <div class="analysis-orb analysis-orb-lg"></div>
      <div class="analysis-orb analysis-orb-sm"></div>
      <div class="analysis-orb analysis-orb-bottom"></div>
      <div class="analysis-dot analysis-dot-1"></div>
      <div class="analysis-dot analysis-dot-2"></div>
      <div class="analysis-dot analysis-dot-3"></div>
      <div class="analysis-line analysis-line-left"></div>
      <div class="analysis-line analysis-line-bottom"></div>

      <div class="analysis-shell">
        <div class="analysis-header">
          <div>
            <div class="analysis-eyebrow">Learning Analysis Report</div>
            <h2>学情分析报告</h2>
          </div>
          <div class="analysis-updated">
            <i class="mdi mdi-clock-outline" aria-hidden="true"></i>
            Updated Dec 17, 2025
          </div>
        </div>

        <div class="analysis-grid">
          <div class="grade-card">
            <div class="grade-circle">
              <span>B+</span>
            </div>
            <div class="grade-label">Overall Grade</div>
            <div class="grade-trend">
              <i class="mdi mdi-trending-up" aria-hidden="true"></i>
              Improving
            </div>
          </div>

          <div class="analysis-copy">
            <p>
              Completed <strong>12 mock interviews</strong> with an average score of
              <strong>75</strong>. Great performance rate at 42% with an upward trend.
              Foundation courses progressing well (Technical 60%, Interview Skills 70%).
              Active in networking with <strong class="positive">8 connections</strong>.
              Currently have <strong class="warning">5 real interviews</strong>, 2 advancing
              to final rounds.
            </p>
            <div class="analysis-tags">
              <div class="focus-tag warning-tag">
                <div>Needs Work</div>
                <span>Behavioral &amp; Leadership</span>
              </div>
              <div class="focus-tag success-tag">
                <div>Strengths</div>
                <span>Case Study &amp; Technical</span>
              </div>
            </div>
          </div>
        </div>

        <div class="analysis-focus">
          <span class="focus-label">
            <i class="mdi mdi-target" aria-hidden="true"></i>
            Focus Areas
          </span>
          <div class="focus-pills">
            <span class="focus-pill focus-pill-success">🎯 Goldman Sachs - Superday</span>
            <span class="focus-pill focus-pill-warning">📋 Morgan Stanley - R2</span>
          </div>
        </div>

        <div class="rating-criteria">
          <div class="criteria-trigger">
            <i class="mdi mdi-information-outline" aria-hidden="true"></i>
            <span>View grading criteria</span>
            <i class="mdi mdi-chevron-down" aria-hidden="true"></i>
          </div>
          <div class="criteria-grid">
            <div class="criteria-card criteria-a">
              <div>A</div>
              <span>Great≥60% · Course≥80%</span>
            </div>
            <div class="criteria-card criteria-b">
              <div>B</div>
              <span>Great≥40% · Course≥60%</span>
            </div>
            <div class="criteria-card criteria-c">
              <div>C</div>
              <span>Great≥20% · Course≥40%</span>
            </div>
            <div class="criteria-card criteria-d">
              <div>D</div>
              <span>Below C standards</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="stats-grid">
      <div v-for="stat in summaryCards" :key="stat.label" class="summary-card" :class="stat.tone">
        <div class="summary-glow"></div>
        <div class="summary-glow summary-glow-bottom"></div>
        <div class="summary-icon">
          <i class="mdi" :class="stat.iconClass" aria-hidden="true"></i>
        </div>
        <div class="summary-value">{{ stat.value }}</div>
        <div class="summary-label">{{ stat.label }}</div>
        <div class="summary-progress">
          <div class="summary-progress-fill" :style="{ width: stat.progress }"></div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">模拟面试得分 Mock Interview Scores</span>
        <span class="card-inline-hint">
          平均分 <strong>75.0</strong>
        </span>
        <button type="button" class="header-link" @click="$router.push('/feedback')">查看全部 →</button>
      </div>
      <div class="card-body card-body-no-padding">
        <table class="table">
          <thead>
            <tr>
              <th>日期</th>
              <th>Mentor</th>
              <th>类型</th>
              <th>得分</th>
              <th>Performance</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in mockScores" :key="`${row.date}-${row.mentor}`">
              <td>{{ row.date }}</td>
              <td>{{ row.mentor }}</td>
              <td>{{ row.type }}</td>
              <td class="score-cell" :class="row.scoreTone">{{ row.score }}</td>
              <td><span class="tag" :class="row.tagTone">{{ row.tag }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">基础课进度 Foundation Progress</span>
      </div>
      <div class="card-body">
        <div class="progress-grid">
          <div v-for="item in foundationProgress" :key="item.label" class="progress-card">
            <div class="progress-row">
              <span class="progress-label">
                <i class="mdi" :class="item.iconClass" aria-hidden="true"></i>
                {{ item.label }}
              </span>
              <span class="progress-value">{{ item.progressText }}</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: item.width }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">简历详情 Resume Details</span>
        <span class="card-inline-hint">
          共 <strong>3</strong> 份
        </span>
        <button type="button" class="header-link" @click="$router.push('/resume')">管理简历 →</button>
      </div>
      <div class="card-body card-body-no-padding">
        <table class="table">
          <thead>
            <tr>
              <th>版本</th>
              <th>文件名</th>
              <th>指导导师</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="resume in resumes" :key="resume.fileName">
              <td>
                <span v-if="resume.versionTone" class="tag" :class="resume.versionTone">
                  {{ resume.version }}
                </span>
                <span v-else>{{ resume.version }}</span>
              </td>
              <td>{{ resume.fileName }}</td>
              <td>{{ resume.mentor }}</td>
              <td>{{ resume.updatedAt }}</td>
              <td><button type="button" class="btn btn-text btn-sm">查看</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">真实面试记录 Real Interviews</span>
        <span class="card-inline-hint">
          累计 <strong>5</strong> 次
        </span>
        <button type="button" class="header-link" @click="$router.push('/questions')">查看全部 →</button>
      </div>
      <div class="card-body card-body-no-padding">
        <table class="table">
          <thead>
            <tr>
              <th>日期</th>
              <th>公司</th>
              <th>办公室</th>
              <th>岗位</th>
              <th>项目</th>
              <th>轮次</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="interview in realInterviews" :key="`${interview.date}-${interview.company}`">
              <td>{{ interview.date }}</td>
              <td class="company-cell">{{ interview.company }}</td>
              <td>{{ interview.office }}</td>
              <td>{{ interview.role }}</td>
              <td>{{ interview.program }}</td>
              <td>{{ interview.round }}</td>
              <td><button type="button" class="btn btn-text btn-sm">详情</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="mentor-notes-grid">
      <div v-for="note in mentorNotes" :key="note.title" class="card">
        <div class="card-header">
          <span class="card-title">{{ note.title }}</span>
          <span class="tag" :class="note.tagTone">Latest</span>
        </div>
        <div class="card-body">
          <div class="quote-box">
            <p>{{ note.copy }}</p>
          </div>
          <div class="note-meta">
            <span><i class="mdi mdi-account" aria-hidden="true"></i>{{ note.author }}</span>
            <span><i class="mdi mdi-calendar" aria-hidden="true"></i>{{ note.date }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">快捷操作 Quick Actions</span>
      </div>
      <div class="card-body">
        <div class="quick-actions">
          <button type="button" class="btn btn-primary" @click="$router.push('/courses')">
            <i class="mdi mdi-book-open-variant" aria-hidden="true"></i>
            我的课程
          </button>
          <button type="button" class="btn btn-outline" @click="$router.push('/questions')">
            <i class="mdi mdi-file-document-edit" aria-hidden="true"></i>
            填写面试真题
          </button>
          <button type="button" class="btn btn-outline" @click="$router.push('/netlog')">
            <i class="mdi mdi-account-group" aria-hidden="true"></i>
            填写沟通记录
          </button>
          <button type="button" class="btn btn-outline" @click="$router.push('/positions')">
            <i class="mdi mdi-briefcase-search" aria-hidden="true"></i>
            岗位信息
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const summaryCards = [
  { label: 'Mock Interviews', value: '12', iconClass: 'mdi-microphone', progress: '75%', tone: 'tone-blue' },
  { label: 'Networking', value: '8', iconClass: 'mdi-account-group', progress: '80%', tone: 'tone-green' },
  { label: 'Resumes', value: '3', iconClass: 'mdi-file-document-multiple', progress: '100%', tone: 'tone-sky' },
  { label: 'Real Interviews', value: '5', iconClass: 'mdi-briefcase-check', progress: '50%', tone: 'tone-amber' },
  { label: 'Skill Courses', value: '6', iconClass: 'mdi-book-open-page-variant', progress: '60%', tone: 'tone-purple' }
]

const mockScores = [
  { date: '03/05/2025', mentor: 'Jess', type: 'Behavioral', score: '85', scoreTone: 'score-primary', tag: 'Great', tagTone: 'success' },
  { date: '03/02/2025', mentor: 'Jeremy', type: 'Technical', score: '62', scoreTone: 'score-warning', tag: 'Disappointing', tagTone: 'danger' },
  { date: '02/28/2025', mentor: 'Mike', type: 'Case', score: '78', scoreTone: 'score-primary', tag: 'Okay', tagTone: 'warning' }
]

const foundationProgress = [
  {
    label: '技术技巧 Technical Skills',
    iconClass: 'mdi-cog',
    progressText: '60% (6/10节)',
    width: '60%'
  },
  {
    label: '面试技巧 Interview Skills',
    iconClass: 'mdi-account-voice',
    progressText: '70% (7/10节)',
    width: '70%'
  }
]

const resumes = [
  { version: 'Latest', versionTone: 'purple', fileName: 'Resume_TestStudent_v3_final.pdf', mentor: 'Jess', updatedAt: '12/10/2025' },
  { version: 'v2', versionTone: '', fileName: 'Resume_TestStudent_v2.pdf', mentor: 'Jeremy', updatedAt: '12/01/2025' },
  { version: 'v1 (原始)', versionTone: '', fileName: 'Resume_TestStudent_v1.pdf', mentor: '-', updatedAt: '11/20/2025' }
]

const realInterviews = [
  { date: '12/15/2025', company: 'Goldman Sachs', office: 'Hong Kong', role: 'Investment Banking', program: 'Summer Analyst', round: 'Superday' },
  { date: '12/10/2025', company: 'Morgan Stanley', office: 'New York', role: 'S&T', program: 'Summer Analyst', round: 'R2' },
  { date: '12/05/2025', company: 'JP Morgan', office: 'London', role: 'Asset Management', program: 'Off-Cycle', round: 'R1' }
]

const mentorNotes = [
  {
    title: 'Lead Mentor Call',
    tagTone: 'purple',
    author: 'Jess (Lead Mentor)',
    date: '12/10/2025',
    copy: '"该学员学习态度积极，技术面试掌握较好，Case分析能力提升明显。建议加强Behavioral准备，尤其是Leadership相关问题。整体进度符合预期。"'
  },
  {
    title: 'RA Session',
    tagTone: 'info',
    author: 'Alex (RA)',
    date: '12/12/2025',
    copy: '"本周完成了3次模拟面试练习，Valuation部分有明显进步。建议多复习DCF和LBO模型的细节问题。下周重点跟进Goldman Sachs Superday准备。"'
  }
]
</script>

<style scoped lang="scss">
.dashboard-page {
  .student-profile-card {
    margin-bottom: 20px;
  }

  .profile-grid {
    display: grid;
    grid-template-columns: auto 1fr 1fr;
    gap: 24px;
    align-items: start;
  }

  .profile-avatar {
    width: 80px;
    height: 80px;
    background: var(--primary-gradient);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 28px;
    font-weight: 700;
  }

  .student-name {
    font-size: 20px;
    margin-bottom: 8px;
  }

  .student-id {
    color: var(--muted);
    font-size: 14px;
    font-weight: 400;
  }

  .student-meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    font-size: 14px;
    color: var(--text2);

    .mdi {
      color: var(--primary);
      margin-right: 6px;
    }
  }

  .mentor-section {
    background: var(--bg);
    border-radius: 12px;
    padding: 16px;
  }

  .mentor-label {
    font-size: 13px;
    color: var(--muted);
    margin-bottom: 8px;

    .mdi {
      margin-right: 4px;
    }
  }

  .mentor-stack {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .mentor-role {
    font-size: 11px;
    color: var(--muted);
    margin-bottom: 6px;
  }

  .mentor-primary-card {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #fff;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid var(--border);
  }

  .mentor-avatar {
    width: 32px;
    height: 32px;
    background: var(--primary-gradient);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 12px;
    font-weight: 600;
  }

  .mentor-name {
    font-size: 13px;
    font-weight: 600;
  }

  .mentor-area {
    font-size: 11px;
    color: var(--muted);
  }

  .mentor-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .analysis-hero {
    margin-bottom: 24px;
    background: #fff;
    border-radius: 24px;
    padding: 32px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(115, 153, 198, 0.12);
    border: 1px solid rgba(115, 153, 198, 0.15);
  }

  .analysis-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 6px;
    background: linear-gradient(90deg, #7399c6, #9bb8d9, #b8d4ed, #7399c6);
    background-size: 200% 100%;
    animation: gradient-move 3s ease infinite;
  }

  .analysis-orb {
    position: absolute;
    border-radius: 50%;
  }

  .analysis-orb-lg {
    top: -40px;
    right: -40px;
    width: 180px;
    height: 180px;
    background: linear-gradient(135deg, rgba(115, 153, 198, 0.08), rgba(155, 184, 217, 0.05));
  }

  .analysis-orb-sm {
    top: 20px;
    right: 60px;
    width: 80px;
    height: 80px;
    background: linear-gradient(135deg, rgba(115, 153, 198, 0.06), transparent);
  }

  .analysis-orb-bottom {
    bottom: -30px;
    left: -30px;
    width: 120px;
    height: 120px;
    background: linear-gradient(135deg, rgba(115, 153, 198, 0.06), transparent);
  }

  .analysis-dot {
    position: absolute;
    border-radius: 50%;
    background: var(--primary);
  }

  .analysis-dot-1 {
    top: 40px;
    right: 20%;
    width: 8px;
    height: 8px;
    opacity: 0.3;
  }

  .analysis-dot-2 {
    top: 70px;
    right: 12%;
    width: 5px;
    height: 5px;
    background: #9bb8d9;
    opacity: 0.4;
  }

  .analysis-dot-3 {
    bottom: 60px;
    left: 15%;
    width: 6px;
    height: 6px;
    opacity: 0.25;
  }

  .analysis-line {
    position: absolute;
    border-radius: 2px;
  }

  .analysis-line-left {
    top: 50px;
    left: 0;
    width: 3px;
    height: 60px;
    background: linear-gradient(180deg, #7399c6, transparent);
  }

  .analysis-line-bottom {
    bottom: 0;
    right: 100px;
    width: 80px;
    height: 3px;
    background: linear-gradient(90deg, transparent, rgba(115, 153, 198, 0.2), transparent);
  }

  .analysis-shell {
    position: relative;
    z-index: 1;
  }

  .analysis-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 28px;

    h2 {
      font-size: 26px;
      font-weight: 700;
      color: var(--text);
      margin: 0;
    }
  }

  .analysis-eyebrow {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: var(--muted);
    margin-bottom: 6px;
  }

  .analysis-updated {
    background: var(--primary-gradient);
    padding: 8px 16px;
    border-radius: 30px;
    font-size: 12px;
    color: #fff;

    .mdi {
      margin-right: 6px;
    }
  }

  .analysis-grid {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 32px;
  }

  .grade-card {
    background: linear-gradient(135deg, #e8f0f8, #f0f6fb);
    border-radius: 20px;
    padding: 28px;
    text-align: center;
    border: 1px solid rgba(115, 153, 198, 0.2);
  }

  .grade-circle {
    width: 100px;
    height: 100px;
    margin: 0 auto 16px;
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 32px rgba(34, 197, 94, 0.3);

    span {
      font-size: 36px;
      font-weight: 800;
      color: #fff;
    }
  }

  .grade-label {
    font-size: 14px;
    color: var(--text2);
    margin-bottom: 8px;
  }

  .grade-trend {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #dcfce7;
    color: #16a34a;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
  }

  .analysis-copy {
    p {
      font-size: 15px;
      line-height: 1.9;
      color: #475569;
      margin: 0 0 20px;
    }

    strong {
      color: var(--primary);
    }
  }

  .positive {
    color: var(--success);
  }

  .warning {
    color: var(--warning);
  }

  .analysis-tags {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .focus-tag {
    flex: 1;
    min-width: 180px;
    border-radius: 12px;
    padding: 12px 16px;
    border: 1px solid;

    div {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }

    span {
      font-size: 13px;
    }
  }

  .warning-tag {
    background: #fef3c7;
    border-color: #fcd34d;

    div {
      color: #d97706;
    }

    span {
      color: #78350f;
    }
  }

  .success-tag {
    background: #dcfce7;
    border-color: #86efac;

    div {
      color: #16a34a;
    }

    span {
      color: #14532d;
    }
  }

  .analysis-focus {
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .focus-label {
    font-size: 12px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 1px;

    .mdi {
      margin-right: 6px;
    }
  }

  .focus-pills {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .focus-pill {
    padding: 8px 16px;
    border-radius: 25px;
    font-size: 13px;
    font-weight: 500;
    border: 1px solid;
  }

  .focus-pill-success {
    background: #dcfce7;
    color: #16a34a;
    border-color: #86efac;
  }

  .focus-pill-warning {
    background: #fef3c7;
    color: #d97706;
    border-color: #fcd34d;
  }

  .rating-criteria {
    margin-top: 16px;
  }

  .criteria-trigger {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--muted);
    font-size: 12px;
  }

  .criteria-grid {
    margin-top: 16px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }

  .criteria-card {
    border-radius: 12px;
    padding: 14px;
    text-align: center;

    div {
      font-size: 20px;
      font-weight: 700;
    }

    span {
      display: block;
      font-size: 11px;
      margin-top: 4px;
    }
  }

  .criteria-a {
    background: #dcfce7;
    color: #16a34a;
  }

  .criteria-b {
    background: #dbeafe;
    color: #2563eb;
  }

  .criteria-c {
    background: #fef3c7;
    color: #d97706;
  }

  .criteria-d {
    background: #fee2e2;
    color: #dc2626;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 16px;
    margin-bottom: 24px;
  }

  .summary-card {
    background: #fff;
    border-radius: 20px;
    padding: 24px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(115, 153, 198, 0.1);
  }

  .summary-glow {
    position: absolute;
    top: -30px;
    right: -30px;
    width: 100px;
    height: 100px;
    border-radius: 50%;
    opacity: 0.08;
  }

  .summary-glow-bottom {
    top: auto;
    right: 10px;
    bottom: 10px;
    width: 40px;
    height: 40px;
    opacity: 0.05;
  }

  .summary-icon {
    width: 52px;
    height: 52px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
    box-shadow: 0 4px 12px rgba(115, 153, 198, 0.3);

    .mdi {
      font-size: 26px;
      color: #fff;
    }
  }

  .summary-value {
    font-size: 36px;
    font-weight: 800;
    color: var(--text);
    margin-bottom: 4px;
    letter-spacing: -1px;
  }

  .summary-label {
    font-size: 12px;
    color: var(--text2);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .summary-progress {
    margin-top: 12px;
    height: 4px;
    background: var(--border);
    border-radius: 2px;
    overflow: hidden;
  }

  .summary-progress-fill {
    height: 100%;
    border-radius: 2px;
  }

  .tone-blue .summary-glow,
  .tone-blue .summary-glow-bottom,
  .tone-blue .summary-icon,
  .tone-blue .summary-progress-fill {
    background: linear-gradient(135deg, #7399c6 0%, #9bb8d9 100%);
  }

  .tone-green .summary-glow,
  .tone-green .summary-glow-bottom,
  .tone-green .summary-icon,
  .tone-green .summary-progress-fill {
    background: linear-gradient(135deg, #22c55e 0%, #4ade80 100%);
  }

  .tone-sky .summary-glow,
  .tone-sky .summary-glow-bottom,
  .tone-sky .summary-icon,
  .tone-sky .summary-progress-fill {
    background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
  }

  .tone-amber .summary-glow,
  .tone-amber .summary-glow-bottom,
  .tone-amber .summary-icon,
  .tone-amber .summary-progress-fill {
    background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
  }

  .tone-purple .summary-glow,
  .tone-purple .summary-glow-bottom,
  .tone-purple .summary-icon,
  .tone-purple .summary-progress-fill {
    background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
  }

  .card-inline-hint {
    margin-left: auto;
    margin-right: 16px;
    font-size: 13px;
    color: var(--muted);

    strong {
      color: var(--primary);
      font-size: 16px;
    }
  }

  .header-link {
    border: none;
    background: transparent;
    color: var(--primary);
    font-size: 13px;
    cursor: pointer;
  }

  .card-body-no-padding {
    padding: 0;
  }

  .score-cell {
    font-weight: 600;
  }

  .score-primary {
    color: var(--primary);
  }

  .score-warning {
    color: #d97706;
  }

  .progress-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }

  .progress-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .progress-label {
    font-weight: 500;

    .mdi {
      color: var(--primary);
      margin-right: 6px;
    }
  }

  .progress-value {
    color: var(--primary);
    font-weight: 600;
  }

  .progress-track {
    background: var(--bg);
    border-radius: 8px;
    height: 12px;
  }

  .progress-fill {
    background: var(--primary-gradient);
    height: 100%;
    border-radius: 8px;
  }

  .company-cell {
    color: var(--primary);
    font-weight: 500;
  }

  .mentor-notes-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 20px;
  }

  .quote-box {
    background: var(--bg);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;

    p {
      color: var(--text);
      line-height: 1.7;
    }
  }

  .note-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    color: var(--muted);

    .mdi {
      margin-right: 4px;
    }
  }

  .quick-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
}

@keyframes gradient-move {
  0% {
    background-position: 0 50%;
  }

  50% {
    background-position: 100% 50%;
  }

  100% {
    background-position: 0 50%;
  }
}
</style>
