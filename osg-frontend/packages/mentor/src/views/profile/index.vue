<template>
  <div id="page-profile">
    <PageHeader
      :title-zh="$t('basic_info')"
      title-en="Profile"
      :description="$t('view_and_manage_your_personal_informatio')"
    >
      <template #actions>
        <a-button type="primary" @click="showEditModal = true">
          <i class="mdi mdi-pencil" style="margin-right:4px" />编辑信息
        </a-button>
      </template>
    </PageHeader>

    <!-- 核心信息 -->
    <div class="section section-core">
      <div class="section-badge badge-primary">{{ $t('core_information') }}</div>
      <div class="info-grid grid-4">
        <div class="info-item"><span class="info-label">{{ $t('english_name') }}</span><div class="info-value bold">{{ profile.nickName || '-' }}</div></div>
        <div class="info-item"><span class="info-label">{{ $t('gender') }}</span><div class="info-value">{{ profile.sex === '0' ? 'Male' : 'Female' }}</div></div>
        <div class="info-item"><span class="info-label">{{ $t('type') }}</span><div><a-tag color="blue">{{ $t('mentor') }}</a-tag></div></div>
        <div class="info-item"><span class="info-label">{{ $t('email') }}</span><div class="info-value">{{ profile.email || '-' }}</div></div>
      </div>
    </div>

    <!-- 联系方式 -->
    <div class="section">
      <div class="section-badge badge-green"><i class="mdi mdi-phone" /> {{ $t('contact_info') }}</div>
      <div class="info-grid grid-3">
        <div class="info-item bg-white"><span class="info-label">{{ $t('phone_number') }}</span><div class="info-value">{{ profile.phonenumber || '-' }}</div></div>
        <div class="info-item bg-white"><span class="info-label">{{ $t('wechat_id') }}</span><div class="info-value">{{ profile.remark || '-' }}</div></div>
        <div class="info-item bg-white"><span class="info-label">{{ $t('region_3') }}</span><div class="info-value">{{ profile.loginIp || '-' }}</div></div>
      </div>
    </div>

    <!-- 专业方向 -->
    <div class="section">
      <div style="display:flex;align-items:center">
        <div class="section-badge badge-orange"><i class="mdi mdi-target" /> {{ $t('specialization') }}</div>
        <span class="lock-hint"><i class="mdi mdi-lock" /> {{ $t('contact_backend_staff_for_modifications') }}</span>
      </div>
      <div class="info-grid grid-2">
        <div class="info-item bg-white border-primary"><span class="info-label" style="color:#7399C6">{{ $t('major_focus') }}</span><div><a-tag color="purple">{{ $t('consulting') }} Consulting</a-tag></div></div>
        <div class="info-item bg-white border-primary"><span class="info-label" style="color:#7399C6">{{ $t('secondary_focus') }}</span><div class="info-value">Strategy Consulting</div></div>
      </div>
    </div>

    <!-- 课程信息 -->
    <div class="section">
      <div class="section-badge badge-blue"><i class="mdi mdi-book-open-variant" /> {{ $t('session_information') }}</div>
      <div class="info-grid grid-2">
        <div class="info-item bg-white"><span class="info-label">{{ $t('teachable_course_types') }}</span><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px"><a-tag color="blue">{{ $t('mock_interview') }}</a-tag><a-tag color="blue">{{ $t('resume_revision') }}</a-tag><a-tag color="blue">{{ $t('case_analysis') }}</a-tag></div></div>
        <div class="info-item bg-white"><span class="info-label">{{ $t('hourly_rate') }} <span class="text-muted text-sm">({{ $t('not_editable') }})</span></span><div class="fee-value">¥600/h</div></div>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <a-modal
      v-model:open="showEditModal"
      :width="600"
      :footer="null"
      :title="null"
      :closable="false"
      :body-style="{ padding: 0 }"
      :get-container="false"
      :destroy-on-close="true"
      @cancel="showEditModal = false"
    >
      <div id="modal-mentor-edit-profile">
        <div class="modal-header"><span class="modal-title"><i class="mdi mdi-account-edit" /> {{ $t('edit_personal_information') }}</span><button class="modal-close" type="button" @click="showEditModal = false">×</button></div>
        <div class="modal-body">
          <div class="edit-notice"><i class="mdi mdi-information" /> {{ $t('after_updating_your_information_the_back') }}。<br/><span style="color:#EF4444">{{ $t('note_primary_focus_secondary_focus_and_s') }}。</span></div>
          <div class="edit-section">
            <div class="section-badge badge-green"><i class="mdi mdi-pencil" /> {{ $t('editable_information') }}</div>
            <div class="form-grid">
              <div class="form-group"><label class="form-label">{{ $t('english_name') }} <span class="req">*</span></label><a-input v-model:value="editForm.nickName" /></div>
              <div class="form-group"><label class="form-label">{{ $t('gender') }} <span class="req">*</span></label><select v-model="editForm.sex" class="form-select full"><option value="0">Male</option><option value="1">Female</option></select></div>
              <div class="form-group"><label class="form-label">{{ $t('phone_number') }} <span class="req">*</span></label><a-input v-model:value="editForm.phonenumber" /></div>
              <div class="form-group"><label class="form-label">{{ $t('wechat_id') }}</label><a-input v-model:value="editForm.remark" /></div>
              <div class="form-group"><label class="form-label">{{ $t('email') }} <span class="req">*</span></label><a-input v-model:value="editForm.email" type="email" /></div>
              <div class="form-group"><label class="form-label">{{ $t('region_3') }} <span class="req">*</span></label>
                <div style="display:flex;gap:8px">
                  <select id="mentor-region-area" v-model="editForm.region" class="form-select" style="width:50%" @change="editForm.city = ''">
                    <option value="">{{ $t('select_region') }}</option><option value="north-america">🌎 {{ $t('north_america') }}</option><option value="europe">🌍 {{ $t('europe') }}</option><option value="asia-pacific">🌏 {{ $t('asia_pacific') }}</option><option value="china">🇨🇳 {{ $t('mainland_china') }}</option>
                  </select>
                  <select id="mentor-region-city" v-model="editForm.city" class="form-select" style="width:50%">
                    <option value="">{{ $t('select_city') }}</option><option v-for="c in cityOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <a-button @click="showEditModal = false">{{ $t('cancel') }}</a-button>
          <a-button type="primary" class="btn-primary" style="margin-left:8px" @click="saveProfile">
            <i class="mdi mdi-check" style="margin-right:4px" />保存修改
          </a-button>
        </div>
      </div>
    </a-modal>

    <a-modal
      v-model:open="showSaveConfirmModal"
      :width="560"
      :footer="null"
      :title="null"
      :closable="false"
      :body-style="{ padding: 0 }"
      :get-container="false"
      :destroy-on-close="true"
      @cancel="closeSaveConfirmModal"
    >
      <div id="modal-mentor-profile-save-confirm" class="modal-content--confirm">
        <div class="modal-header">
          <span class="modal-title"><i class="mdi mdi-check-decagram" /> {{ $t('confirm_change_submission') }}</span>
          <button class="modal-close" type="button" @click="closeSaveConfirmModal">×</button>
        </div>
        <div class="modal-body">
          <div class="save-summary">
            <div class="save-summary-title">{{ $t('this_submission_will_enter_the_backend_s') }}</div>
            <ul class="save-summary-list">
              <li>英文名：{{ editForm.nickName || '-' }}</li>
              <li>性别：{{ editForm.sex === '0' ? 'Male' : 'Female' }}</li>
              <li>手机号：{{ editForm.phonenumber || '-' }}</li>
              <li>邮箱：{{ editForm.email || '-' }}</li>
              <li>所属地区：{{ editForm.region || '-' }} / {{ editForm.city || '-' }}</li>
            </ul>
          </div>
          <div v-if="saveErrorMessage" class="save-error">{{ saveErrorMessage }}</div>
          <div class="save-hint">{{ $t('upon_confirmation_the_system_will_create') }}。</div>
        </div>
        <div class="modal-footer">
          <a-button @click="closeSaveConfirmModal">{{ $t('back_to_edit') }}</a-button>
          <a-button type="primary" class="btn-primary" style="margin-left:8px" @click="submitSaveProfile">
            <i class="mdi mdi-cloud-upload" style="margin-right:4px" />确认保存
          </a-button>
        </div>
      </div>
    </a-modal>

    <a-modal
      v-model:open="showSaveSuccessModal"
      :width="480"
      :footer="null"
      :title="null"
      :closable="false"
      :body-style="{ padding: 0 }"
      :get-container="false"
      :destroy-on-close="true"
      @cancel="closeSaveSuccessModal"
    >
      <div id="modal-mentor-profile-save-success" class="modal-content--success">
        <div class="modal-header modal-header--success">
          <span class="modal-title"><i class="mdi mdi-check-circle" /> {{ $t('saved_successfully') }}</span>
          <button class="modal-close" type="button" @click="closeSaveSuccessModal">×</button>
        </div>
        <div class="modal-body">
          <div class="success-card">
            <div class="success-icon"><i class="mdi mdi-bell-ring" /></div>
            <div class="success-text">{{ $t('saved_successfully_backend_staff_have_be') }}。</div>
          </div>
        </div>
        <div class="modal-footer">
          <a-button type="primary" class="btn-primary" @click="closeSaveSuccessModal">{{ $t('got_it') }}</a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { http } from '@osg/shared/utils/request'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const profile = ref<any>({})
const showEditModal = ref(false)
const showSaveConfirmModal = ref(false)
const showSaveSuccessModal = ref(false)
const saveErrorMessage = ref('')
const editForm = ref<any>({})

const regionCities: Record<string, Array<{ value: string; label: string }>> = {
  'north-america': [
    { value: 'new-york', label: 'New York 纽约' },
    { value: 'san-francisco', label: 'San Francisco 旧金山' },
    { value: 'chicago', label: 'Chicago 芝加哥' },
  ],
  'europe': [
    { value: 'london', label: 'London 伦敦' },
    { value: 'frankfurt', label: 'Frankfurt 法兰克福' },
  ],
  'asia-pacific': [
    { value: 'hong-kong', label: 'Hong Kong 香港' },
    { value: 'singapore', label: 'Singapore 新加坡' },
    { value: 'tokyo', label: 'Tokyo 东京' },
  ],
  'china': [
    { value: 'shanghai', label: 'Shanghai 上海' },
    { value: 'beijing', label: 'Beijing 北京' },
  ],
}
const cityOptions = computed(() => regionCities[editForm.value.region] || [])

async function fetchProfile() {
  try { profile.value = await http.get('/api/mentor/profile') } catch { profile.value = {} }
  editForm.value = { ...profile.value, region: '', city: '' }
  saveErrorMessage.value = ''
}

async function saveProfile() {
  saveErrorMessage.value = ''
  showSaveConfirmModal.value = true
}

function closeSaveConfirmModal() {
  showSaveConfirmModal.value = false
}

function closeSaveSuccessModal() {
  showSaveSuccessModal.value = false
}

async function submitSaveProfile() {
  try {
    await http.put('/api/mentor/profile', editForm.value)
    showSaveConfirmModal.value = false
    showEditModal.value = false
    showSaveSuccessModal.value = true
    fetchProfile()
  } catch {
    saveErrorMessage.value = t('save_failed_please_try_again_later')
  }
}

onMounted(fetchProfile)
</script>

<style scoped>
.page-header{margin-bottom:24px;display:flex;justify-content:space-between;align-items:flex-start}.page-title{font-size:26px;font-weight:700;color:#1E293B}.page-title-en{font-size:14px;color:#94A3B8;font-weight:400;margin-left:8px}.page-sub{font-size:14px;color:#64748B;margin-top:6px}
.section{background:#FAFAFA;border:1px solid #E2E8F0;border-radius:12px;padding:20px;margin-bottom:20px}
.section-core{background:#fff;border:2px solid #7399C6}
.section-badge{display:inline-flex;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;margin-bottom:16px;align-items:center;gap:4px}
.badge-primary{background:#7399C6;color:#fff}.badge-green{background:#DCFCE7;color:#166534}.badge-orange{background:#FEF3C7;color:#92400E}.badge-blue{background:#E8F0F8;color:#7399C6}
.lock-hint{margin-left:auto;font-size:12px;color:#94A3B8;display:flex;align-items:center;gap:4px}
.info-grid{display:grid;gap:16px}.grid-4{grid-template-columns:repeat(4,1fr)}.grid-3{grid-template-columns:repeat(3,1fr)}.grid-2{grid-template-columns:repeat(2,1fr)}
.info-item{background:#F8FAFC;padding:12px;border-radius:8px}.info-item.bg-white{background:#fff}.info-item.border-primary{border:1px solid #E8F0F8}
.info-label{color:#94A3B8;font-size:11px;display:block;margin-bottom:4px}.info-value{font-size:14px}.info-value.bold{font-size:15px;font-weight:600}
.fee-value{font-size:18px;font-weight:700;color:#7399C6}
.tag{display:inline-flex;padding:5px 12px;border-radius:20px;font-size:12px;font-weight:600}.tag.info{background:#DBEAFE;color:#1E40AF}.tag.purple{background:#E8F0F8;color:#5A7BA3}
.modal{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)}
.modal-content{background:#fff;border-radius:20px;max-height:90vh;overflow-y:auto}.modal-header{padding:22px 26px;background:linear-gradient(135deg,#7399C6,#5A7BA3);color:#fff;border-radius:20px 20px 0 0;display:flex;justify-content:space-between;align-items:center}
.modal-content--confirm{box-shadow:0 24px 64px rgba(15,23,42,.22)}
.modal-content--success{box-shadow:0 24px 64px rgba(15,23,42,.22)}
.modal-header--success{background:linear-gradient(135deg,#7399C6,#4F8B72)}
.modal-title{font-size:18px;font-weight:700;display:flex;align-items:center;gap:8px}.modal-close{width:36px;height:36px;border-radius:10px;border:none;background:rgba(255,255,255,0.2);cursor:pointer;font-size:20px;color:#fff}
.modal-body{padding:24px}.modal-footer{padding:18px 26px;border-top:1px solid #E2E8F0;display:flex;justify-content:flex-end;gap:12px;background:#F8FAFC;border-radius:0 0 20px 20px}
.edit-notice{padding:12px 16px;background:#E8F0F8;border-radius:8px;font-size:13px;color:#1E40AF;margin-bottom:20px}
.edit-section{background:#FAFAFA;border:1px solid #E2E8F0;border-radius:12px;padding:20px}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.form-group{margin:0}.form-label{display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:#64748B}.req{color:#EF4444}
.form-input,.form-select{width:100%;padding:12px 14px;border:2px solid #E2E8F0;border-radius:10px;font-size:14px;outline:none;box-sizing:border-box}
.form-input:focus,.form-select:focus{border-color:#7399C6;box-shadow:0 0 0 4px #E8F0F8}.form-select.full{width:100%}
.btn{padding:10px 20px;border-radius:10px;font-size:14px;font-weight:500;cursor:pointer;border:none;display:inline-flex;align-items:center;gap:6px}
.btn-primary{background:linear-gradient(135deg,#7399C6,#9BB8D9);color:#fff}.btn-outline{background:#fff;color:#64748B;border:1px solid #E2E8F0}
.save-summary{padding:16px;border:1px solid #E2E8F0;border-radius:12px;background:#F8FAFC}.save-summary-title{font-size:14px;font-weight:700;color:#1E293B;margin-bottom:10px}.save-summary-list{margin:0;padding-left:18px;color:#334155;font-size:13px;line-height:1.8}
.save-hint{margin-top:14px;font-size:13px;color:#64748B}.save-error{margin-bottom:12px;padding:10px 12px;border-radius:10px;background:#FEE2E2;color:#B91C1C;font-size:13px}
.success-card{display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center;padding:8px 0}.success-icon{width:56px;height:56px;border-radius:18px;background:#E8F0F8;color:#7399C6;display:flex;align-items:center;justify-content:center;font-size:28px}.success-text{font-size:15px;font-weight:600;color:#1E293B;line-height:1.6}
.text-muted{color:#94A3B8}.text-sm{font-size:11px}
</style>
