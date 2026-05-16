<template>
  <div id="page-faq" class="faq-page">
    <OsgPageContainer>
      <template #header>
        <div class="page-header">
          <div>
            <h1 class="page-title">{{ t('student.faq.k1') }} <span>FAQ</span></h1>
          </div>
        </div>
      </template>

      <a-collapse v-model:activeKey="openQuestion" accordion class="faq-list">
        <a-collapse-panel
          v-for="item in faqItems"
          :key="item.question"
          :header="item.question"
          class="faq-item"
        >
          <p class="faq-answer">{{ item.answer }}</p>
        </a-collapse-panel>
      </a-collapse>
    </OsgPageContainer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { OsgPageContainer } from '@osg/shared/components'

const { t } = useI18n()

const faqItems = [
  {
    question: t('student.faq.k2'),
    answer: t('student.faq.k3')
  },
  {
    question: t('student.faq.k4'),
    answer: t('student.faq.k5')
  },
  {
    question: t('student.faq.k6'),
    answer: t('student.faq.k7')
  },
  {
    question: t('student.faq.k8'),
    answer: t('student.faq.k9')
  },
  {
    question: t('student.faq.k10'),
    answer: t('student.faq.k11')
  },
  {
    question: t('student.faq.k12'),
    answer: t('student.faq.k13')
  },
  {
    question: t('student.faq.k14'),
    answer: t('student.faq.k15')
  }
]

const openQuestion = ref<string | undefined>(t('student.faq.k2'))
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
  // a-collapse 增强：取消默认外边框，让 .faq-item 独立圈边
  background: transparent !important;
  border: 0 !important;
}

.faq-item {
  margin-bottom: 12px;
  background: #f8fafc !important;
  border: 1px solid #dbe5f0 !important;
  border-radius: 16px !important;
  overflow: hidden;

  :deep(.ant-collapse-header) {
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
    padding: 18px 20px;
  }

  :deep(.ant-collapse-content) {
    background: #fff;
    border-top: 1px solid #dbe5f0;
  }

  :deep(.ant-collapse-content-box) {
    padding: 18px 20px;
  }
}

.faq-answer {
  margin: 0;
  color: #475569;
  line-height: 1.8;
}
</style>
