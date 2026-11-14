<script setup>
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import axiosClient from '@/utils/axiosClient'
import AuthShell from '@/components/auth/AuthShell.vue'

const router = useRouter()
const route = useRoute()
const toast = useToast()

const email = ref('')
const password = ref('')
const show = ref(false)
const loading = ref(false)
const error = ref('')

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const googleEnabled = computed(() => !!GOOGLE_CLIENT_ID)
const canSubmit = computed(() => email.value.trim() && password.value && !loading.value)

function loginWithGoogle() {
  const redirect = new URL('/api/auth/google/oauth', axiosClient.defaults.baseURL || 'http://localhost:8000').toString()
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID, redirect_uri: redirect, response_type: 'code', scope: 'openid email profile', access_type: 'offline', prompt: 'consent',
  })
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

function goAfterLogin(accessToken) {
  let admin = false
  try { admin = JSON.parse(atob(accessToken.split('.')[1])).system_role === 'ADMIN' } catch { /* not a JWT we can read */ }
  const next = typeof route.query.next === 'string' && route.query.next.startsWith('/') ? route.query.next : null
  router.push(next || (admin ? '/admin' : '/dashboard'))
}

async function submit() {
  if (!canSubmit.value) return
  loading.value = true
  error.value = ''
  try {
    const { data: res } = await axiosClient.post('/api/auth/login', { email: email.value.trim(), password: password.value })
    const data = res?.data
    if (!data) throw new Error('Phản hồi đăng nhập không hợp lệ')
    if (data.isTwoFactorEnabled) {
      localStorage.setItem('otpToken', data.otpToken)
      localStorage.setItem('email', email.value.trim().toLowerCase())
      router.push('/verify-otp')
      return
    }
    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    localStorage.setItem('userId', data.sub)
    localStorage.setItem('email', email.value.trim().toLowerCase())
    toast.success('Đăng nhập thành công')
    goAfterLogin(data.accessToken)
  } catch (e) {
    error.value = e.response?.data?.message || e.message || 'Không đăng nhập được, hãy thử lại'
  } finally {
    loading.value = false
    password.value = ''
  }
}
</script>

<template>
  <AuthShell title="Đăng nhập" subtitle="Dùng chung một tài khoản cho SmartSpec và WorkHub.">
    <form class="auth-form" @submit.prevent="submit">
      <label class="auth-field">
        <span>Email</span>
        <input v-model="email" type="email" autocomplete="email" placeholder="ban@example.com" autofocus />
      </label>
      <label class="auth-field">
        <span>Mật khẩu</span>
        <span class="auth-password">
          <input v-model="password" :type="show ? 'text' : 'password'" autocomplete="current-password" />
          <button type="button" tabindex="-1" @click="show = !show">{{ show ? 'Ẩn' : 'Hiện' }}</button>
        </span>
      </label>
      <p v-if="error" class="auth-error" role="alert">{{ error }}</p>
      <button class="auth-btn" type="submit" :disabled="!canSubmit">{{ loading ? 'Đang đăng nhập…' : 'Đăng nhập' }}</button>
    </form>
    <template v-if="googleEnabled">
      <div class="auth-sep">hoặc</div>
      <button class="auth-btn secondary" type="button" @click="loginWithGoogle">Tiếp tục với Google</button>
    </template>
    <template #footer>
      <router-link to="/forgot-password">Quên mật khẩu?</router-link>
      <span>Chưa có tài khoản? <router-link to="/register">Đăng ký</router-link></span>
    </template>
  </AuthShell>
</template>
