<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import axiosClient from '@/utils/axiosClient'
import AuthShell from '@/components/auth/AuthShell.vue'

const router = useRouter()
const otp = ref('')
const loading = ref(false)
const error = ref('')
const canSubmit = computed(() => /^\d{6}$/.test(otp.value) && !loading.value)

async function submit() {
  if (!canSubmit.value) return
  const email = localStorage.getItem('email')
  const otpToken = localStorage.getItem('otpToken')
  if (!email || !otpToken) { error.value = 'Phiên xác thực đã hết hạn, hãy đăng nhập lại.'; setTimeout(() => router.push('/login'), 1500); return }
  loading.value = true
  error.value = ''
  try {
    const { data } = await axiosClient.post('/api/auth/verify-otp', { email, otp: otp.value, otpToken })
    localStorage.setItem('accessToken', data.data.accessToken)
    localStorage.setItem('refreshToken', data.data.refreshToken)
    localStorage.setItem('userId', data.data.sub)
    localStorage.removeItem('otpToken')
    let admin = false
    try { admin = JSON.parse(atob(data.data.accessToken.split('.')[1])).system_role === 'ADMIN' } catch { /* ignore */ }
    router.push(admin ? '/admin' : '/dashboard')
  } catch (e) {
    error.value = e.response?.data?.message || 'Mã OTP không đúng hoặc đã hết hạn'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthShell title="Xác thực 2 lớp" subtitle="Nhập mã gồm 6 chữ số vừa được gửi tới email của bạn (hiệu lực 5 phút).">
    <form class="auth-form" @submit.prevent="submit">
      <label class="auth-field">
        <span>Mã OTP</span>
        <input v-model="otp" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="123456" autofocus />
      </label>
      <p v-if="error" class="auth-error" role="alert">{{ error }}</p>
      <button class="auth-btn" type="submit" :disabled="!canSubmit">{{ loading ? 'Đang xác thực…' : 'Xác nhận' }}</button>
    </form>
    <template #footer><router-link to="/login">← Quay lại đăng nhập</router-link></template>
  </AuthShell>
</template>
