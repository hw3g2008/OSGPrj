<template>
  <div id="page-profile">
    <div class="page-header">
      <div><h1 class="page-title">基本信息 <span class="page-title-en">Profile</span></h1><p class="page-sub">查看和管理您的个人信息</p></div>
      <button class="btn btn-primary" @click="showEditModal = true"><i class="mdi mdi-pencil" /> 编辑信息</button>
    </div>

    <!-- 核心信息 -->
    <div class="section section-core">
      <div class="section-badge badge-primary">核心信息</div>
      <div class="info-grid grid-4">
        <div class="info-item"><span class="info-label">英文名</span><div class="info-value bold">{{ profile.nickName || '-' }}</div></div>
        <div class="info-item"><span class="info-label">性别</span><div class="info-value">{{ profile.sex === '0' ? 'Male' : 'Female' }}</div></div>
        <div class="info-item"><span class="info-label">类型</span><div><span class="tag info">导师</span></div></div>
        <div class="info-item"><span class="info-label">邮箱</span><div class="info-value">{{ profile.email || '-' }}</div></div>
      </div>
    </div>

    <!-- 联系方式 -->
    <div class="section">
      <div class="section-badge badge-green"><i class="mdi mdi-phone" /> 联系方式</div>
      <div class="info-grid grid-3">
        <div class="info-item bg-white"><span class="info-label">手机号</span><div class="info-value">{{ profile.phonenumber || '-' }}</div></div>
        <div class="info-item bg-white"><span class="info-label">微信号</span><div class="info-value">{{ profile.remark || '-' }}</div></div>
        <div class="info-item bg-white"><span class="info-label">所属地区</span><div class="info-value">{{ profile.loginIp || '-' }}</div></div>
      </div>
    </div>

    <!-- 专业方向 -->
    <div class="section">
      <div style="display:flex;align-items:center">
        <div class="section-badge badge-orange"><i class="mdi mdi-target" /> 专业方向</div>
        <span class="lock-hint"><i class="mdi mdi-lock" /> 如需修改请联系后台文员</span>
      </div>
      <div class="info-grid grid-2">
        <div class="info-item bg-white border-primary"><span class="info-label" style="color:#7399C6">主攻方向</span><div><span class="tag purple">咨询 Consulting</span></div></div>
        <div class="info-item bg-white border-primary"><span class="info-label" style="color:#7399C6">二级方向</span><div class="info-value">Strategy Consulting</div></div>
      </div>
    </div>

    <!-- 课程信息 -->
    <div class="section">
      <div class="section-badge badge-blue"><i class="mdi mdi-book-open-variant" /> 课程信息</div>
      <div class="info-grid grid-2">
        <div class="info-item bg-white"><span class="info-label">可授课程类型</span><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px"><span class="tag info">模拟面试</span><span class="tag info">简历修改</span><span class="tag info">案例分析</span></div></div>
        <div class="info-item bg-white"><span class="info-label">课单价 <span class="text-muted text-sm">(不可修改)</span></span><div class="fee-value">¥600/h</div></div>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <div v-if="showEditModal" id="modal-mentor-edit-profile" class="modal active" @click.self="showEditModal = false">
      <div class="modal-content" style="max-width:600px">
        <div class="modal-header"><span class="modal-title"><i class="mdi mdi-account-edit" /> 编辑个人信息</span><button class="modal-close" @click="showEditModal = false">×</button></div>
        <div class="modal-body">
          <div class="edit-notice"><i class="mdi mdi-information" /> 修改信息后，后台文员将收到提醒通知。<br/><span style="color:#EF4444">注意：主攻方向、二级方向和课单价不可自行修改。</span></div>
          <div class="edit-section">
            <div class="section-badge badge-green"><i class="mdi mdi-pencil" /> 可修改信息</div>
            <div class="form-grid">
              <div class="form-group"><label class="form-label">英文名 <span class="req">*</span></label><input v-model="editForm.nickName" class="form-input" /></div>
              <div class="form-group"><label class="form-label">性别 <span class="req">*</span></label><select v-model="editForm.sex" class="form-select full"><option value="0">Male</option><option value="1">Female</option></select></div>
              <div class="form-group"><label class="form-label">手机号 <span class="req">*</span></label><input v-model="editForm.phonenumber" class="form-input" /></div>
              <div class="form-group"><label class="form-label">微信号</label><input v-model="editForm.remark" class="form-input" /></div>
              <div class="form-group"><label class="form-label">邮箱 <span class="req">*</span></label><input v-model="editForm.email" type="email" class="form-input" /></div>
              <div class="form-group"><label class="form-label">所属地区 <span class="req">*</span></label>
                <div style="display:flex;gap:8px">
                  <select id="mentor-region-area" v-model="editForm.region" class="form-select" style="width:50%" @change="editForm.city = ''">
                    <option value="">选择大区</option><option value="north-america">🌎 北美</option><option value="europe">🌍 欧洲</option><option value="asia-pacific">🌏 亚太</option><option value="china">🇨🇳 中国大陆</option>
                  </select>
                  <select id="mentor-region-city" v-model="editForm.city" class="form-select" style="width:50%">
                    <option value="">选择城市</option><option v-for="c in cityOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer"><button class="btn btn-outline" @click="showEditModal = false">取消</button><button class="btn btn-primary" @click="saveProfile"><i class="mdi mdi-check" /> 保存修改</button></div>
      </div>
    </div>

    <div v-if="showSaveConfirmModal" id="modal-mentor-profile-save-confirm" class="modal active" @click.self="closeSaveConfirmModal">
      <div class="modal-content modal-content--confirm" style="max-width:560px">
        <div class="modal-header">
          <span class="modal-title"><i class="mdi mdi-check-decagram" /> 确认提交变更</span>
          <button class="modal-close" @click="closeSaveConfirmModal">×</button>
        </div>
        <div class="modal-body">
          <div class="save-summary">
            <div class="save-summary-title">本次提交将进入后台文员审核链路</div>
            <ul class="save-summary-list">
              <li>英文名：{{ editForm.nickName || '-' }}</li>
              <li>性别：{{ editForm.sex === '0' ? 'Male' : 'Female' }}</li>
              <li>手机号：{{ editForm.phonenumber || '-' }}</li>
              <li>邮箱：{{ editForm.email || '-' }}</li>
              <li>所属地区：{{ editForm.region || '-' }} / {{ editForm.city || '-' }}</li>
            </ul>
          </div>
          <div v-if="saveErrorMessage" class="save-error">{{ saveErrorMessage }}</div>
          <div class="save-hint">确认后，系统会真实创建一条变更请求，等待后台文员处理。</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="closeSaveConfirmModal">返回修改</button>
          <button class="btn btn-primary" @click="submitSaveProfile"><i class="mdi mdi-cloud-upload" /> 确认保存</button>
        </div>
      </div>
    </div>

    <div v-if="showSaveSuccessModal" id="modal-mentor-profile-save-success" class="modal active" @click.self="closeSaveSuccessModal">
      <div class="modal-content modal-content--success" style="max-width:480px">
        <div class="modal-header modal-header--success">
          <span class="modal-title"><i class="mdi mdi-check-circle" /> 保存成功</span>
          <button class="modal-close" @click="closeSaveSuccessModal">×</button>
        </div>
        <div class="modal-body">
          <div class="success-card">
            <div class="success-icon"><i class="mdi mdi-bell-ring" /></div>
            <div class="success-text">保存成功！后台文员已收到您的信息变更通知。</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" @click="closeSaveSuccessModal">知道了</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { http } from '@osg/shared/utils/request'

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
    saveErrorMessage.value = '保存失败，请稍后重试'
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
