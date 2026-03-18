<template>
  <div>
    <div class="page-header">
      <div><h1 class="page-title">我的排期 <span class="page-title-en">My Schedule</span></h1><p class="page-sub">设置您的可用时间，每周日前需更新下周排期</p></div>
    </div>

    <!-- 未填写警告 -->
    <div v-if="!hasFilled" class="warning-banner">
      <i class="mdi mdi-alert-circle" style="font-size:32px;color:#DC2626" />
      <div style="flex:1">
        <div class="warning-title"><i class="mdi mdi-alert" /> 您本周未填写排期，无法被安排课程！</div>
        <div class="warning-desc">请立即填写本周排期，否则将影响您的课时收入</div>
      </div>
      <button class="btn btn-danger" @click="scrollToForm"><i class="mdi mdi-calendar-edit" /> 立即填写</button>
    </div>

    <!-- 状态卡片 -->
    <div class="status-card" :class="{ 'border-danger': !hasFilled, 'border-success': hasFilled }">
      <div style="display:flex;align-items:center;gap:16px">
        <div class="user-avatar">{{ userName[0] || 'M' }}</div>
        <div><div style="font-weight:600">{{ userName }}</div><div class="text-muted text-sm">ID: {{ userId }} · 导师</div></div>
      </div>
      <div class="status-stats">
        <div><div class="stat-big" :style="{ color: hasFilled ? '#22C55E' : '#DC2626' }">{{ totalHours }}h</div><div class="text-muted text-sm">本周可用</div></div>
        <div><div class="stat-big" :style="{ color: hasFilled ? '#22C55E' : '#DC2626' }">{{ availableDays }}</div><div class="text-muted text-sm">可用天数</div></div>
        <div><div class="stat-big" :style="{ color: hasFilled ? '#22C55E' : '#DC2626' }">{{ hasFilled ? '✓' : '✗' }}</div><div class="text-muted text-sm">{{ hasFilled ? '已填写' : '未填写' }}</div></div>
      </div>
    </div>

    <!-- 排期表格 -->
    <div class="card" id="schedule-form">
      <div class="card-header"><span class="card-title">本周排期设置</span></div>
      <div class="card-body">
        <div class="schedule-grid">
          <div v-for="(day, idx) in days" :key="idx" class="schedule-day" :class="{ weekend: idx >= 5 }">
            <div class="day-label">{{ day.label }}</div>
            <select v-model="schedule[day.key]" class="day-select">
              <option value="unavailable">不可用</option>
              <option value="morning">上午</option>
              <option value="afternoon">下午</option>
              <option value="evening">晚上</option>
              <option value="all_day">全天</option>
            </select>
          </div>
        </div>
        <div class="form-group" style="margin-top:16px">
          <label class="form-label">本周可上课时长</label>
          <div style="display:flex;align-items:center;gap:8px">
            <input v-model.number="schedule.totalHours" type="number" class="form-input" min="0" max="40" style="width:100px;text-align:center" />
            <span class="text-muted">小时</span>
          </div>
        </div>
      </div>
      <div class="card-footer">
        <button class="btn btn-outline" @click="copyLastWeek"><i class="mdi mdi-content-copy" /> 复制上周排期</button>
        <button class="btn btn-primary" @click="saveSchedule"><i class="mdi mdi-check" /> 保存排期</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { http } from '@osg/shared/utils/request'
import { getUser } from '@osg/shared/utils'

const user = getUser<any>()
const userName = ref(user?.nickName || 'Mentor')
const userId = ref(user?.userId || '')

const days = [
  { label: '周一', key: 'monday' }, { label: '周二', key: 'tuesday' }, { label: '周三', key: 'wednesday' },
  { label: '周四', key: 'thursday' }, { label: '周五', key: 'friday' }, { label: '周六', key: 'saturday' }, { label: '周日', key: 'sunday' },
]

const schedule = ref<any>({
  monday: 'unavailable', tuesday: 'unavailable', wednesday: 'unavailable', thursday: 'unavailable',
  friday: 'unavailable', saturday: 'unavailable', sunday: 'unavailable', totalHours: 0,
})

const hasFilled = computed(() => days.some(d => schedule.value[d.key] !== 'unavailable'))
const totalHours = computed(() => schedule.value.totalHours || 0)
const availableDays = computed(() => days.filter(d => schedule.value[d.key] !== 'unavailable').length)

function scrollToForm() { document.getElementById('schedule-form')?.scrollIntoView({ behavior: 'smooth' }) }

async function saveSchedule() {
  if (!hasFilled.value) { window.alert('请至少选择一天可用时段'); return }
  try {
    await http.put('/api/mentor/schedule', schedule.value)
    window.alert('排期保存成功！')
  } catch {}
}

async function copyLastWeek() {
  try {
    const last = await http.get('/api/mentor/schedule/last-week')
    if (last) {
      days.forEach(d => { schedule.value[d.key] = last[d.key] || 'unavailable' })
      schedule.value.totalHours = last.totalHours || 0
    } else { window.alert('没有上周排期数据') }
  } catch {}
}

onMounted(async () => {
  try {
    const data = await http.get('/api/mentor/schedule')
    if (data) { Object.assign(schedule.value, data) }
  } catch {}
})
</script>

<style scoped>
.page-header{margin-bottom:24px}.page-title{font-size:26px;font-weight:700;color:#1E293B}.page-title-en{font-size:14px;color:#94A3B8;font-weight:400;margin-left:8px}.page-sub{font-size:14px;color:#64748B;margin-top:6px}
.warning-banner{padding:16px 20px;background:linear-gradient(135deg,#FEE2E2,#FECACA);border-radius:12px;margin-bottom:20px;display:flex;align-items:center;gap:16px;border:2px solid #DC2626}
.warning-title{font-weight:600;color:#991B1B;margin-bottom:4px;display:flex;align-items:center;gap:6px}.warning-desc{font-size:13px;color:#B91C1C}
.btn-danger{background:#DC2626;color:#fff;border:none;padding:10px 20px;border-radius:10px;cursor:pointer;font-weight:500;display:inline-flex;align-items:center;gap:6px;box-shadow:0 4px 12px rgba(220,38,38,0.3)}
.status-card{background:#fff;border-radius:12px;padding:20px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 4px 24px rgba(115,153,198,0.12)}
.status-card.border-danger{border:2px solid #DC2626}.status-card.border-success{border:2px solid #22C55E}
.user-avatar{width:50px;height:50px;background:linear-gradient(135deg,#7399C6,#9BB8D9);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:18px}
.status-stats{display:flex;gap:24px;text-align:center}.stat-big{font-size:24px;font-weight:700}
.card{background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(115,153,198,0.12);margin-bottom:20px}.card-header{padding:18px 22px;border-bottom:1px solid #E2E8F0}.card-title{font-size:16px;font-weight:600}.card-body{padding:22px}
.card-footer{padding:18px 22px;border-top:1px solid #E2E8F0;display:flex;justify-content:flex-end;gap:12px}
.schedule-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}
.schedule-day{text-align:center;padding:8px;background:#F8FAFC;border-radius:8px;border:1px solid #E2E8F0}.schedule-day.weekend{background:#DCFCE7;border-color:#22C55E}
.day-label{font-weight:600;font-size:12px;margin-bottom:4px}.day-select{width:100%;font-size:11px;padding:4px;border:1px solid #E2E8F0;border-radius:4px;background:#fff}
.form-group{margin-bottom:16px}.form-label{display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:#64748B}
.form-input{padding:12px 14px;border:2px solid #E2E8F0;border-radius:10px;font-size:14px;outline:none;box-sizing:border-box}
.btn{padding:10px 20px;border-radius:10px;font-size:14px;font-weight:500;cursor:pointer;border:none;display:inline-flex;align-items:center;gap:6px}
.btn-primary{background:linear-gradient(135deg,#7399C6,#9BB8D9);color:#fff}.btn-outline{background:#fff;color:#64748B;border:1px solid #E2E8F0}
.text-muted{color:#94A3B8}.text-sm{font-size:12px}
</style>
