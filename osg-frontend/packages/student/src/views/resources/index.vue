<template>
  <div class="resources-page">
    <OsgPageContainer title="学习资源">
      <a-tabs v-model:activeKey="activeTab">
        <a-tab-pane key="docs" :tab="$t('study_documents')">
          <a-list :data-source="docs" :loading="loading">
            <template #renderItem="{ item }">
              <a-list-item>
                <a-list-item-meta :title="item.title" :description="item.description" />
                <template #actions>
                  <a-button type="link">{{ $t('download') }}</a-button>
                </template>
              </a-list-item>
            </template>
          </a-list>
        </a-tab-pane>
        <a-tab-pane key="questions" :tab="$t('question_bank')">
          <a-empty description="题库功能开发中" />
        </a-tab-pane>
        <a-tab-pane key="interviews" :tab="$t('real_interview_questions')">
          <a-empty description="面试真题功能开发中" />
        </a-tab-pane>
      </a-tabs>
    </OsgPageContainer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { OsgPageContainer } from '@osg/shared/components'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const activeTab = ref('docs')
const loading = ref(false)

const docs = ref([
  { id: 1, title: 'Java 核心知识点总结', description: 'PDF 文档，包含 Java 基础、集合、多线程等' },
  { id: 2, title: 'Spring Boot 最佳实践', description: 'Spring Boot 项目开发规范与最佳实践' },
  { id: 3, title: t('resume_template'), description: t('resume_template_and_writing_guide_for_te') }
])
</script>
