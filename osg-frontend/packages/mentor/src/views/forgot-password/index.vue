<template>
  <div class="login-page">
    <div class="login-decor login-decor--1" />
    <div class="login-decor login-decor--2" />
    <div class="login-left">
      <h1 class="login-left__title">OSG</h1>
      <p class="login-left__desc">One Strategy Group 求职辅导平台，助力您的职业发展</p>
    </div>
    <div class="login-right">
      <div class="login-box">
        <router-link to="/login" class="back-link"><i class="mdi mdi-arrow-left" /> 返回登录</router-link>
        <div class="login-logo">
          <div class="login-logo__icon"><i class="mdi mdi-key" /></div>
          <span class="login-logo__text">找回密码</span>
        </div>
        <h2 class="fp-title">重置密码</h2>
        <p class="fp-subtitle">{{ stepDescs[step - 1] }}</p>

        <!-- 步骤指示器 -->
        <div class="steps">
          <div v-for="i in 3" :key="i" class="step-dot" :class="{ active: i === step, done: i < step }" />
        </div>

        <!-- 错误/成功提示 -->
        <div v-if="alertMsg" class="alert" :class="alertType"><i :class="alertType === 'success' ? 'mdi mdi-check-circle' : 'mdi mdi-alert-circle'" /><span>{{ alertMsg }}</span></div>

        <!-- Step 1: 输入邮箱 -->
        <div v-if="step === 1">
          <div class="form-panel">
            <div class="form-group">
              <label class="form-label">邮箱地址</label>
              <input
                v-model="email"
                type="email"
                class="form-input"
                placeholder="请输入注册邮箱"
                :class="{ error: emailError }"
                @keydown.enter.prevent="sendCode"
              />
              <p v-if="emailError" class="field-error">请输入有效的邮箱地址</p>
            </div>
            <button type="button" class="fp-btn" :disabled="sending" @click="sendCode">{{ sending ? '发送中...' : '发送验证码' }}</button>
          </div>
        </div>

        <!-- Step 2: 输入验证码 -->
        <div v-if="step === 2">
          <p class="masked-email">验证码已发送至 <strong>{{ maskedEmail }}</strong></p>
          <div class="form-panel">
            <div class="form-group">
              <label class="form-label">验证码</label>
              <input
                v-model="code"
                type="text"
                class="form-input"
                placeholder="请输入6位验证码"
                maxlength="6"
                :class="{ error: codeError }"
                @keydown.enter.prevent="verifyCode"
              />
              <p v-if="codeError" class="field-error">验证码错误</p>
            </div>
            <button type="button" class="fp-btn" @click="verifyCode">验证</button>
            <p class="countdown">{{ countdown > 0 ? `${countdown}秒后可重新发送` : '' }}<a v-if="countdown <= 0" href="#" @click.prevent="sendCode">重新发送</a></p>
          </div>
        </div>

        <!-- Step 3: 设置新密码 -->
        <div v-if="step === 3">
          <div class="form-panel">
            <div class="form-group">
              <label class="form-label">新密码</label>
              <div class="pwd-wrapper">
                <input
                  v-model="newPwd"
                  :type="showPwd1 ? 'text' : 'password'"
                  class="form-input"
                  placeholder="请输入新密码"
                  minlength="8"
                  @input="checkStrength"
                  @keydown.enter.prevent="resetPassword"
                />
                <button type="button" class="pwd-toggle" @click="showPwd1 = !showPwd1"><i :class="showPwd1 ? 'mdi mdi-eye' : 'mdi mdi-eye-off'" /></button>
              </div>
              <div class="strength">
                <div class="strength-bar"><div class="strength-fill" :class="strengthClass" /></div>
                <p class="strength-text">{{ strengthLabel }}</p>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">确认密码</label>
              <div class="pwd-wrapper">
                <input
                  v-model="confirmPwd"
                  :type="showPwd2 ? 'text' : 'password'"
                  class="form-input"
                  placeholder="请再次输入新密码"
                  :class="{ error: confirmError }"
                  @keydown.enter.prevent="resetPassword"
                />
                <button type="button" class="pwd-toggle" @click="showPwd2 = !showPwd2"><i :class="showPwd2 ? 'mdi mdi-eye' : 'mdi mdi-eye-off'" /></button>
              </div>
              <p v-if="confirmError" class="field-error">两次输入的密码不一致</p>
            </div>
            <button type="button" class="fp-btn" @click="resetPassword">重置密码</button>
          </div>
        </div>

        <!-- Step 4: 完成 -->
        <div v-if="step === 4" class="success-view">
          <div class="success-icon"><i class="mdi mdi-check" /></div>
          <h3>密码重置成功</h3>
          <p>您的密码已成功重置，请使用新密码登录</p>
          <router-link to="/login" class="fp-btn" style="display:block;text-align:center;text-decoration:none;margin-top:24px">返回登录</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { sendResetCode, verifyResetCode as verifyResetCodeApi, resetPassword as resetPasswordApi } from '@/api/auth'

const step = ref(1)
const email = ref('')
const code = ref('')
const resetToken = ref('')
const newPwd = ref('')
const confirmPwd = ref('')
const emailError = ref(false)
const codeError = ref(false)
const confirmError = ref(false)
const sending = ref(false)
const showPwd1 = ref(false)
const showPwd2 = ref(false)
const alertMsg = ref('')
const alertType = ref<'error' | 'success'>('error')
const countdown = ref(0)
const strengthLevel = ref(0)

const stepDescs = ['请输入您的注册邮箱', '请输入验证码', '请设置新密码']

const maskedEmail = computed(() => {
  if (!email.value) return ''
  const [local, domain] = email.value.split('@')
  return `${local[0]}***@${domain}`
})
const strengthClass = computed(() => ['', 'weak', 'medium', 'strong'][strengthLevel.value] || '')
const strengthLabel = computed(() => ['密码强度', '弱', '中', '强'][strengthLevel.value] || '密码强度')

function checkStrength() {
  const p = newPwd.value
  if (!p) { strengthLevel.value = 0; return }
  let score = 0
  if (p.length >= 8) score++
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score++
  strengthLevel.value = Math.min(score, 3)
}

let timer: ReturnType<typeof setInterval> | null = null
function startCountdown() {
  countdown.value = 60
  if (timer) clearInterval(timer)
  timer = setInterval(() => { if (--countdown.value <= 0 && timer) clearInterval(timer) }, 1000)
}

async function sendCode() {
  emailError.value = false; alertMsg.value = ''
  if (!email.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) { emailError.value = true; return }
  sending.value = true
  try {
    await sendResetCode(email.value)
    resetToken.value = ''
    alertMsg.value = '验证码已发送'; alertType.value = 'success'
    step.value = 2; startCountdown()
  } catch (error: any) { alertMsg.value = error?.message || '发送失败，请重试'; alertType.value = 'error' }
  finally { sending.value = false }
}

async function verifyCode() {
  codeError.value = false; alertMsg.value = ''
  if (code.value.length !== 6) { codeError.value = true; return }
  try {
    const data = await verifyResetCodeApi(email.value, code.value)
    if (!data?.resetToken) throw new Error('reset token missing')
    resetToken.value = data.resetToken
    step.value = 3
  } catch (error: any) {
    codeError.value = true
    alertMsg.value = error?.message || '验证失败'
    alertType.value = 'error'
  }
}

async function resetPassword() {
  confirmError.value = false; alertMsg.value = ''
  if (newPwd.value !== confirmPwd.value) { confirmError.value = true; return }
  if (newPwd.value.length < 8) { alertMsg.value = '密码至少8位'; alertType.value = 'error'; return }
  if (!resetToken.value) { alertMsg.value = '重置令牌不能为空'; alertType.value = 'error'; return }
  try {
    await resetPasswordApi(email.value, resetToken.value, newPwd.value)
    step.value = 4
  } catch (error: any) { alertMsg.value = error?.message || '重置失败，请重试'; alertType.value = 'error' }
}
</script>

<style scoped>
.login-page { min-height:100vh; display:flex; background:linear-gradient(135deg,#5A7BA3 0%,#7399C6 50%,#9BB8D9 100%); position:relative; overflow:hidden; font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif; }
.login-decor { position:absolute; border-radius:50%; pointer-events:none; }
.login-decor--1 { top:-100px; left:-100px; width:300px; height:300px; background:rgba(255,255,255,0.05); }
.login-decor--2 { bottom:-80px; left:30%; width:250px; height:250px; background:rgba(255,255,255,0.04); }
.login-left { flex:1; display:flex; flex-direction:column; justify-content:center; padding:60px; color:#fff; z-index:1; }
.login-left__title { font-size:48px; font-weight:800; margin-bottom:16px; }
.login-left__desc { font-size:18px; opacity:0.9; max-width:400px; }
.login-right { width:480px; background:#fff; display:flex; align-items:center; justify-content:center; border-radius:24px 0 0 24px; z-index:1; }
.login-box { width:100%; max-width:360px; padding:40px; }
.back-link { display:inline-flex; align-items:center; gap:6px; color:#7399C6; font-size:13px; text-decoration:none; margin-bottom:24px; }
.login-logo { display:flex; align-items:center; gap:10px; margin-bottom:32px; }
.login-logo__icon { width:48px; height:48px; background:linear-gradient(135deg,#7399C6,#9BB8D9); border-radius:14px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:24px; }
.login-logo__text { font-size:22px; font-weight:700; }
.fp-title { font-size:26px; font-weight:700; margin-bottom:8px; color:#1E293B; }
.fp-subtitle { color:#94A3B8; margin-bottom:24px; font-size:14px; }
.steps { display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:28px; }
.step-dot { width:10px; height:10px; border-radius:50%; background:#E2E8F0; }
.step-dot.active { background:#7399C6; width:24px; border-radius:5px; }
.step-dot.done { background:#22C55E; }
.alert { display:flex; align-items:center; gap:8px; padding:12px 16px; border-radius:10px; font-size:13px; margin-bottom:16px; }
.alert.error { background:#FEF2F2; color:#991B1B; border:1px solid #FECACA; }
.alert.success { background:#F0FDF4; color:#166534; border:1px solid #BBF7D0; }
.form-group { margin-bottom:18px; }
.form-label { display:block; font-size:13px; font-weight:600; margin-bottom:6px; color:#64748B; }
.form-input { width:100%; padding:14px 16px; border:2px solid #E2E8F0; border-radius:12px; font-size:15px; box-sizing:border-box; outline:none; }
.form-input:focus { border-color:#7399C6; box-shadow:0 0 0 4px #E8F0F8; }
.form-input.error { border-color:#EF4444; }
.field-error { color:#EF4444; font-size:12px; margin-top:4px; }
.pwd-wrapper { position:relative; }
.pwd-wrapper .form-input { padding-right:52px; }
.pwd-toggle { position:absolute; right:14px; top:50%; transform:translateY(-50%); display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; padding:0; background:none; border:none; color:#94A3B8; cursor:pointer; font-size:18px; }
.fp-btn { width:100%; padding:16px; background:linear-gradient(135deg,#7399C6,#9BB8D9); color:#fff; border:none; border-radius:12px; font-size:16px; font-weight:600; cursor:pointer; box-shadow:0 4px 15px rgba(115,153,198,0.4); margin-top:8px; }
.fp-btn:hover:not(:disabled) { transform:translateY(-2px); }
.fp-btn:disabled { opacity:0.7; cursor:not-allowed; }
.masked-email { text-align:center; font-size:13px; color:#64748B; margin-bottom:16px; }
.countdown { text-align:center; font-size:13px; color:#94A3B8; margin-top:16px; }
.countdown a { color:#7399C6; text-decoration:none; font-weight:500; }
.strength { margin-top:8px; }
.strength-bar { height:4px; background:#E2E8F0; border-radius:2px; overflow:hidden; }
.strength-fill { height:100%; transition:all 0.3s; }
.strength-fill.weak { width:33%; background:#EF4444; }
.strength-fill.medium { width:66%; background:#F59E0B; }
.strength-fill.strong { width:100%; background:#22C55E; }
.strength-text { font-size:12px; color:#94A3B8; margin-top:4px; }
.success-view { text-align:center; }
.success-icon { width:80px; height:80px; background:#D1FAE5; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px; }
.success-icon i { font-size:40px; color:#22C55E; }
.success-view h3 { font-size:20px; font-weight:700; margin-bottom:8px; }
.success-view p { font-size:14px; color:#94A3B8; }
</style>
