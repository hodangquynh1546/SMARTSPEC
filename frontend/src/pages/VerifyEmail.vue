<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import axiosClient from '@/utils/axiosClient'
import AuthShell from '@/components/auth/AuthShell.vue'

const route = useRoute()
const state = ref('loading') // loading | ok | failed
const message = ref('')
let started = false // the effect can run twice in dev; a verification link is single-purpose

onMounted(async () => {
  if (started) return
  started = true
  const token = String(route.query.token || '')
  if (!token) { state.value = 'failed'; message.value = 'Liên kết xác thực không hợp lệ.'; return }
  try {
    await axiosClient.post('/api/auth/verify-email', { token })
    state.value = 'ok'
  } catch (e) {
    state.value = 'failed'
    message.value = e.response?.data?.message || 'Liên kết không hợp lệ hoặc đã hết hạn.'
  }
})
</script>

<template>
  <AuthShell title="Xác thực email">
    <p v-if="state === 'loading'" class="auth-muted">Đang xác thực…</p>
    <template v-else-if="state === 'ok'">
      <p class="auth-success" role="status">Email của bạn đã được xác thực.</p>
      <router-link class="auth-btn" to="/dashboard">Vào SmartSpec</router-link>
    </template>
    <template v-else>
      <p class="auth-error" role="alert">{{ message }}</p>
      <p class="auth-muted">Đăng nhập rồi chọn "Gửi lại email xác thực" ở thanh thông báo để nhận liên kết mới.</p>
      <router-link class="auth-btn secondary" to="/login">Đăng nhập</router-link>
    </template>
  </AuthShell>
</template>
