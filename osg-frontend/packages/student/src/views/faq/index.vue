<template>
  <div id="page-faq" class="faq-page">
    <OsgPageContainer>
      <template #header>
        <div class="page-header">
          <div>
            <h1 class="page-title">常见问题 <span>FAQ</span></h1>
            <p class="page-sub">关于OSG学习平台的常见问题解答</p>
          </div>
        </div>
      </template>

      <div class="faq-list">
        <article v-for="item in faqItems" :key="item.question" class="faq-item">
          <button type="button" class="faq-question" @click="toggle(item.question)">
            {{ item.question }}
          </button>
          <div v-show="openQuestion === item.question" class="faq-answer">
            {{ item.answer }}
          </div>
        </article>
      </div>
    </OsgPageContainer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { OsgPageContainer } from '@osg/shared/components'

const faqItems = [
  {
    question: '如何申请课程/Staffing Request？',
    answer: '点击左侧菜单中的相关入口，选择对应学生类型并填写信息，提交后 Lead Mentor 会安排课程。'
  },
  {
    question: '如何更新我的简历？',
    answer: '进入“我的简历 Resume”页面，点击右上角“上传新简历”按钮，选择 PDF 或 Word 文件上传。'
  },
  {
    question: 'Mock Interview后多久能收到反馈？',
    answer: '通常在 Mock Interview 结束后 24-48 小时内，Mentor 会在课程反馈页面提交反馈。'
  },
  {
    question: '如何填写面试真题？',
    answer: '完成真实面试后，请进入“面试真题 Questions”页面，点击“填写真题”按钮提交公司、岗位和问题信息。'
  },
  {
    question: 'Networking Log有什么用？',
    answer: '记录 Networking 沟通可以帮助 Lead Mentor 了解您的求职进度，并提供更有针对性的指导。'
  },
  {
    question: '如何联系我的Lead Mentor？',
    answer: '您可以通过微信群、邮件或在课程申请备注中提出问题，紧急情况也可以联系 RA 助教协助处理。'
  },
  {
    question: '题库资料可以下载吗？',
    answer: '可以。请优先使用最新资料，部分过期材料仅作为参考。'
  }
]

const openQuestion = ref('如何申请课程/Staffing Request？')

const toggle = (question: string) => {
  openQuestion.value = openQuestion.value === question ? '' : question
}
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

.faq-list {
  display: grid;
  gap: 12px;
}

.faq-item {
  border: 1px solid #dbe5f0;
  border-radius: 16px;
  overflow: hidden;
}

.faq-question {
  width: 100%;
  border: 0;
  background: #f8fafc;
  padding: 18px 20px;
  text-align: left;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  cursor: pointer;
}

.faq-answer {
  padding: 18px 20px;
  color: #475569;
  line-height: 1.8;
}
</style>
