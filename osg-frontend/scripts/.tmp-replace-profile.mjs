import fs from 'fs';
const f = 'packages/assistant/src/views/profile/index.vue';
let s = fs.readFileSync(f, 'utf8');

const tplPairs = [
  [`title-zh="基本信息"`, `:title-zh="t('assistant.profile.title')"`],
  [`title-en="Profile"`, `:title-en="t('assistant.profile.titleEn')"`],
  [`<span class="status-pill">资料概览</span>`, `<span class="status-pill">{{ t('assistant.profile.overviewBadge') }}</span>`],
  [`          编辑资料\n`, `          {{ t('assistant.profile.actions.edit') }}\n`],
  [`<h2>资料加载失败</h2>`, `<h2>{{ t('assistant.profile.states.loadFailedTitle') }}</h2>`],
  [`<button type="button" class="ghost-button" @click="loadProfile">重新加载</button>`, `<button type="button" class="ghost-button" @click="loadProfile">{{ t('assistant.profile.actions.reload') }}</button>`],
  [`<h2>资料加载中</h2>`, `<h2>{{ t('assistant.profile.states.loadingTitle') }}</h2>`],
  [`<p>正在读取当前账号的基本信息与联系方式，请稍候。</p>`, `<p>{{ t('assistant.profile.states.loadingHint') }}</p>`],
  [`<div class="hero-card__meta">{{ profile.userName || '-' }} · Assistant</div>`, `<div class="hero-card__meta">{{ (profile.userName || '-') + ' · ' + t('assistant.profile.identity.metaSuffix') }}</div>`],
  [`<button type="button" class="ghost-button" @click="loadProfile">刷新资料</button>`, `<button type="button" class="ghost-button" @click="loadProfile">{{ t('assistant.profile.actions.refresh') }}</button>`],
  [`<span class="summary-card__label">账号状态</span>`, `<span class="summary-card__label">{{ t('assistant.profile.summary.statusLabel') }}</span>`],
  [`<span class="summary-card__hint">当前登录账号的可用状态</span>`, `<span class="summary-card__hint">{{ t('assistant.profile.summary.statusHint') }}</span>`],
  [`<span class="summary-card__label">联系方式</span>`, `<span class="summary-card__label">{{ t('assistant.profile.summary.contactLabel') }}</span>`],
  [`<span class="summary-card__hint">邮箱与手机号的填写完整度</span>`, `<span class="summary-card__hint">{{ t('assistant.profile.summary.contactHint') }}</span>`],
  [`<span class="summary-card__label">最近登录</span>`, `<span class="summary-card__label">{{ t('assistant.profile.summary.loginDateLabel') }}</span>`],
  [`<span class="summary-card__hint">最近一次登录时间</span>`, `<span class="summary-card__hint">{{ t('assistant.profile.summary.loginDateHint') }}</span>`],
  [`<span class="summary-card__label">登录地址</span>`, `<span class="summary-card__label">{{ t('assistant.profile.summary.loginIpLabel') }}</span>`],
  [`<span class="summary-card__hint">最近一次登录 IP 信息</span>`, `<span class="summary-card__hint">{{ t('assistant.profile.summary.loginIpHint') }}</span>`],
  [`<h2>资料详情</h2>`, `<h2>{{ t('assistant.profile.detail.title') }}</h2>`],
  [`<p>以下信息会用于账号展示、联系确认与内部协作识别。</p>`, `<p>{{ t('assistant.profile.detail.subtitle') }}</p>`],
  [`<span class="info-item__label">英文名</span>`, `<span class="info-item__label">{{ t('assistant.profile.detail.nickName') }}</span>`],
  [`{{ profile.nickName || '未填写' }}`, `{{ profile.nickName || t('assistant.common.notFilled') }}`],
  [`<span class="info-item__label">性别</span>`, `<span class="info-item__label">{{ t('assistant.profile.detail.sex') }}</span>`],
  [`<span class="info-item__label">邮箱</span>`, `<span class="info-item__label">{{ t('assistant.profile.detail.email') }}</span>`],
  [`{{ profile.email || '未填写' }}`, `{{ profile.email || t('assistant.common.notFilled') }}`],
  [`<span class="info-item__label">手机号</span>`, `<span class="info-item__label">{{ t('assistant.profile.detail.phone') }}</span>`],
  [`{{ profile.phonenumber || '未填写' }}`, `{{ profile.phonenumber || t('assistant.common.notFilled') }}`],
  [`<span class="info-item__label">账号</span>`, `<span class="info-item__label">{{ t('assistant.profile.detail.account') }}</span>`],
  [`{{ profile.userName || '未填写' }}`, `{{ profile.userName || t('assistant.common.notFilled') }}`],
  [`<span class="info-item__label">备注</span>`, `<span class="info-item__label">{{ t('assistant.profile.detail.remark') }}</span>`],
  [`{{ profile.remark || '未填写' }}`, `{{ profile.remark || t('assistant.common.notFilled') }}`],
  [`<h2>更新说明</h2>`, `<h2>{{ t('assistant.profile.tips.title') }}</h2>`],
  [`<p>可直接修改常用联系字段。保存成功后，页面会自动同步最新结果。</p>`, `<p>{{ t('assistant.profile.tips.subtitle') }}</p>`],
  [`<div class="tip-chip">姓名展示</div>`, `<div class="tip-chip">{{ t('assistant.profile.tips.chip1') }}</div>`],
  [`<div class="tip-chip">联系方式</div>`, `<div class="tip-chip">{{ t('assistant.profile.tips.chip2') }}</div>`],
  [`<div class="tip-chip">登录信息</div>`, `<div class="tip-chip">{{ t('assistant.profile.tips.chip3') }}</div>`],
  [`若资料提交失败，可先检查邮箱格式与手机号是否正确，再重新保存。`, `{{ t('assistant.profile.tips.copy') }}`],
  [`<h2>编辑资料</h2>`, `<h2>{{ t('assistant.profile.editor.title') }}</h2>`],
  [`<p>修改后将立即提交到当前账号资料中。</p>`, `<p>{{ t('assistant.profile.editor.subtitle') }}</p>`],
  [`<span class="form-field__label">英文名</span>`, `<span class="form-field__label">{{ t('assistant.profile.detail.nickName') }}</span>`],
  [`placeholder="请输入英文名"`, `:placeholder="t('assistant.profile.editor.nickNamePlaceholder')"`],
  [`<span class="form-field__label">性别</span>`, `<span class="form-field__label">{{ t('assistant.profile.detail.sex') }}</span>`],
  [`<option value="0">男</option>`, `<option value="0">{{ t('assistant.profile.sex.male') }}</option>`],
  [`<option value="1">女</option>`, `<option value="1">{{ t('assistant.profile.sex.female') }}</option>`],
  [`<option value="2">未设置</option>`, `<option value="2">{{ t('assistant.profile.sex.unset') }}</option>`],
  [`<span class="form-field__label">邮箱</span>`, `<span class="form-field__label">{{ t('assistant.profile.detail.email') }}</span>`],
  [`placeholder="请输入邮箱"`, `:placeholder="t('assistant.profile.editor.emailPlaceholder')"`],
  [`<span class="form-field__label">手机号</span>`, `<span class="form-field__label">{{ t('assistant.profile.detail.phone') }}</span>`],
  [`placeholder="请输入 11 位手机号"`, `:placeholder="t('assistant.profile.editor.phonePlaceholder')"`],
  [`              取消\n`, `              {{ t('assistant.profile.actions.cancel') }}\n`],
  [`{{ saving ? '保存中...' : '保存修改' }}`, `{{ saving ? t('assistant.profile.actions.saving') : t('assistant.profile.actions.save') }}`],
];

for (const [from, to] of tplPairs) {
  if (!s.includes(from)) {
    console.warn('MISSING:', JSON.stringify(from.slice(0, 50)));
    continue;
  }
  s = s.split(from).join(to);
}

// Script
s = s.replace(
  `import { computed, onMounted, reactive, ref } from 'vue'`,
  `import { computed, onMounted, reactive, ref } from 'vue'\nimport { useI18n } from 'vue-i18n'`
);
s = s.replace(
  `const emailPattern =`,
  `const { t } = useI18n()\n\nconst emailPattern =`
);

s = s.replace(
  `const displayName = computed(() => profile.value?.nickName?.trim() || profile.value?.userName || 'Assistant')`,
  `const displayName = computed(() => profile.value?.nickName?.trim() || profile.value?.userName || t('assistant.profile.identity.fallbackName'))`
);

s = s.replace(
  `const sexLabel = computed(() => {
  if (profile.value?.sex === '1') {
    return '女'
  }
  if (profile.value?.sex === '2') {
    return '未设置'
  }
  return '男'
})`,
  `const sexLabel = computed(() => {
  if (profile.value?.sex === '1') {
    return t('assistant.profile.sex.female')
  }
  if (profile.value?.sex === '2') {
    return t('assistant.profile.sex.unset')
  }
  return t('assistant.profile.sex.male')
})`
);

s = s.replace(
  `const statusLabel = computed(() => (profile.value?.status === '1' ? '停用' : '正常'))`,
  `const statusLabel = computed(() => (profile.value?.status === '1' ? t('assistant.profile.status.disabled') : t('assistant.profile.status.active')))`
);

s = s.replace(
  `const loginIpLabel = computed(() => profile.value?.loginIp || '未记录')`,
  `const loginIpLabel = computed(() => profile.value?.loginIp || t('assistant.common.notRecorded'))`
);

s = s.replace(
  `function formatDateTime(value?: string) {
  if (!value) {
    return '未记录'
  }`,
  `function formatDateTime(value?: string) {
  if (!value) {
    return t('assistant.common.notRecorded')
  }`
);

s = s.replace(`fieldErrors.nickName = '请输入至少 2 个字符的英文名。'`, `fieldErrors.nickName = t('assistant.profile.errors.nickNameTooShort')`);
s = s.replace(`fieldErrors.email = '请输入正确的邮箱格式。'`, `fieldErrors.email = t('assistant.profile.errors.emailInvalid')`);
s = s.replace(`fieldErrors.phonenumber = '手机号需为 11 位数字。'`, `fieldErrors.phonenumber = t('assistant.profile.errors.phoneInvalid')`);
s = s.replace(`fieldErrors.sex = '请选择有效的性别。'`, `fieldErrors.sex = t('assistant.profile.errors.sexInvalid')`);

s = s.replace(
  `    editorNotice.value = {
      type: 'error',
      title: '无法保存',
      text: '请先修正表单中的错误信息。',
    }`,
  `    editorNotice.value = {
      type: 'error',
      title: t('assistant.profile.errors.cannotSaveTitle'),
      text: t('assistant.profile.errors.cannotSaveText'),
    }`
);

s = s.replace(
  `errorMessage.value = error?.message || '资料暂时无法加载，请稍后重试。'`,
  `errorMessage.value = error?.message || t('assistant.profile.states.loadFailedFallback')`
);

s = s.replace(
  `    pageNotice.value = {
      type: 'success',
      title: '保存成功',
      text: '基本信息已更新，并同步显示最新内容。',
    }`,
  `    pageNotice.value = {
      type: 'success',
      title: t('assistant.profile.success.title'),
      text: t('assistant.profile.success.text'),
    }`
);

s = s.replace(
  `    editorNotice.value = {
      type: 'error',
      title: '保存失败',
      text: error?.message || '资料暂时无法保存，请稍后重试。',
    }`,
  `    editorNotice.value = {
      type: 'error',
      title: t('assistant.profile.errors.saveFailedTitle'),
      text: error?.message || t('assistant.profile.errors.saveFailedFallback'),
    }`
);

fs.writeFileSync(f, s);
console.log('profile.vue updated');
