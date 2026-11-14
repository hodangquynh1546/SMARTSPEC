<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axiosClient from '@/utils/axiosClient'
import AuthShell from '@/components/auth/AuthShell.vue'

const route = useRoute()
const router = useRouter()
const token = String(route.query.token || '')
const password = ref('')
const confirm = ref('')
const loading = ref(false)
const error = ref('')
const done = ref(false)
const mismatch = computed(() => confirm.value !== '' && confirm.value !== password.value)
const canSubmit = computed(() => token && password.value.length >= 8 && password.value === confirm.value && !loading.value)

async function submit() {
  if (!canSubmit.value) return
  loading.value = true
  error.value = ''
  try {
    await axiosClient.post(`/api/auth/reset-password?token=${encodeURIComponent(token)}`, { newPassword: password.value, confirmNewPassword: confirm.value })
    done.value = true
    setTimeout(() => router.push('/login'), 2000)
  } catch (e) {
    error.value = e.response?.data?.message || 'Không đặt lại được mật khẩu, hãy thử lại'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthShell title="Đặt lại mật khẩu">
    <p v-if="!token" class="auth-error">Liên kết không hợp lệ. Hãy yêu cầu liên kết mới.</p>
    <p v-else-if="done" class="auth-success" role="status">Đã đặt lại mật khẩu. Đang chuyển tới trang đăng nhập…</p>
    <form v-else class="auth-form" @submit.prevent="submit">
      <label class="auth-field">
        <span>Mật khẩu mới</span>
        <input v-model="password" type="password" autocomplete="new-password" placeholder="Tối thiểu 8 ký tự" autofocus />
      </label>
      <label class="auth-field" :class="{ invalid: mismatch }">
        <span>Xác nhận mật khẩu mới</span>
        <input v-model="confirm" type="password" autocomplete="new-password" />
        <span v-if="mismatch" class="auth-field-error">Mật khẩu xác nhận không khớp</span>
      </label>
      <p v-if="error" class="auth-error" role="alert">{{ error }}</p>
      <button class="auth-btn" type="submit" :disabled="!canSubmit">{{ loading ? 'Đang lưu…' : 'Đặt lại mật khẩu' }}</button>
    </form>
    <template #footer><router-link to="/forgot-password">Yêu cầu liên kết mới</router-link><router-link to="/login">Đăng nhập</router-link></template>
  </AuthShell>
</template>
