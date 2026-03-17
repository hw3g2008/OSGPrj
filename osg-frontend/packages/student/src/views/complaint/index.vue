<template>
  <div id="page-complaint" class="complaint-page">
    <OsgPageContainer>
      <template #header>
        <div class="page-header">
          <div>
            <h1 class="page-title">投诉与建议 <span>OSG Feedback Form</span></h1>
            <p class="page-sub">请填写您对Mentor/RA/Lead Mentor的反馈</p>
          </div>
        </div>
      </template>

      <div class="form-grid">
        <a-form-item label="Email Address" class="form-item">
          <a-input value="test@example.com" disabled />
        </a-form-item>
        <a-form-item label="Full Name" class="form-item">
          <a-input value="Test Student" disabled />
        </a-form-item>
        <a-form-item label="School & Grad Year" class="form-item">
          <a-input value="北京大学 2025" disabled />
        </a-form-item>
        <a-form-item label="You are...?" class="form-item">
          <a-radio-group>
            <a-radio value="Student">Student</a-radio>
            <a-radio value="RA">RA</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="You are providing feedback for a" class="form-item full-span">
          <a-radio-group>
            <a-radio value="Mentor">Mentor</a-radio>
            <a-radio value="RA">RA</a-radio>
            <a-radio value="Lead Mentor">Lead Mentor</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="Who are you providing feedback on?" class="form-item full-span">
          <a-input placeholder="请输入对方姓名" />
        </a-form-item>
        <a-form-item label="How would you describe this person?" class="form-item full-span">
          <a-radio-group class="vertical-group">
            <a-radio value="amazing">AMAZING - EXCEEDS ALL EXPECTATIONS!</a-radio>
            <a-radio value="great">Great - overall no complaints</a-radio>
            <a-radio value="okay">Okay</a-radio>
            <a-radio value="not-great">Not Great</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="Please describe your experience with this person." class="form-item full-span">
          <a-textarea :rows="5" placeholder="请详细描述您的体验和反馈" />
        </a-form-item>
      </div>

      <div class="submit-row">
        <a-button type="primary" size="large">提交反馈 Submit</a-button>
      </div>
    </OsgPageContainer>
  </div>
</template>

<script setup lang="ts">
import { OsgPageContainer } from '@osg/shared/components'
</script>

<style scoped lang="scss">
.page-title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;

  span {
    color: #4f6b8a;
  }
}

.page-sub {
  margin: 10px 0 0;
  color: #64748b;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
}

.form-item {
  margin-bottom: 0;
}

.full-span {
  grid-column: 1 / -1;
}

.vertical-group {
  display: grid;
  gap: 10px;
}

.submit-row {
  margin-top: 20px;
}
</style>
