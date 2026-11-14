<script setup>
import { computed, ref } from 'vue'
import axiosClient from '@/utils/axiosClient'
import AuthShell from '@/components/auth/AuthShell.vue'

const email = ref('')
const loading = ref(false)
const error = ref('')
const done = ref('')
const canSubmit = computed(() => /^\S+@\S+\.\S+$/.test(email.value.trim()) && !loading.value)

async function submit() {
  if (!canSubmit.value) return
  loading.value = true
  error.value = ''
  try {
    const { data } = await axiosClient.post('/api/auth/forgot-password', { email: email.value.trim() })
    done.value = data?.message || 'Nếu email tồn tại, chúng tôi đã gửi liên kết đặt lại mật khẩu.'
  } catch (e) {
    error.value = e.response?.data?.message || 'Không gửi được yêu cầu, hãy thử lại'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthShell title="Quên mật khẩu" subtitle="Nhập email, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.">
    <p v-if="done" class="auth-success" role="status">{{ done }}</p>
    <form v-else class="auth-form" @submit.prevent="submit">
      <label class="auth-field">
        <span>Email</span>
        <input v-model="email" type="email" autocomplete="email" placeholder="ban@example.com" autofocus />
      </label>
      <p v-if="error" class="auth-error" role="alert">{{ error }}</p>
      <button class="auth-btn" type="submit" :disabled="!canSubmit">{{ loading ? 'Đang gửi…' : 'Gửi liên kết' }}</button>
    </form>
    <template #footer><router-link to="/login">← Quay lại đăng nhập</router-link></template>
  </AuthShell>
</template>
