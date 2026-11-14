<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import axiosClient from '@/utils/axiosClient'
import AuthShell from '@/components/auth/AuthShell.vue'

const router = useRouter()
const toast = useToast()

const email = ref('')
const password = ref('')
const confirm = ref('')
const show = ref(false)
const loading = ref(false)
const error = ref('')
const touched = ref({ email: false, password: false, confirm: false })

const emailError = computed(() => (touched.value.email && !/^\S+@\S+\.\S+$/.test(email.value.trim()) ? 'Email không hợp lệ' : ''))
const passwordError = computed(() => {
  if (!touched.value.password) return ''
  if (password.value.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự'
  if (new TextEncoder().encode(password.value).length > 72) return 'Mật khẩu tối đa 72 byte'
  return ''
})
const confirmError = computed(() => (touched.value.confirm && confirm.value !== password.value ? 'Mật khẩu xác nhận không khớp' : ''))
const canSubmit = computed(() => /^\S+@\S+\.\S+$/.test(email.value.trim()) && password.value.length >= 8 && confirm.value === password.value && !loading.value)

async function submit() {
  touched.value = { email: true, password: true, confirm: true }
  if (!canSubmit.value) return
  loading.value = true
  error.value = ''
  try {
    const { data: res } = await axiosClient.post('/api/auth/register', {
      email: email.value.trim(), password: password.value, confirmPassword: confirm.value,
    })
    const data = res?.data
    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    localStorage.setItem('userId', data.sub)
    localStorage.setItem('email', email.value.trim().toLowerCase())
    toast.success(data.emailVerified ? 'Đăng ký thành công' : 'Đăng ký thành công. Hãy kiểm tra email để xác thực tài khoản.')
    router.push('/dashboard')
  } catch (e) {
    error.value = e.response?.data?.message || e.message || 'Không đăng ký được, hãy thử lại'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthShell title="Đăng ký" subtitle="Một tài khoản dùng được cho cả SmartSpec và WorkHub.">
    <form class="auth-form" @submit.prevent="submit">
      <label class="auth-field" :class="{ invalid: emailError }">
        <span>Email</span>
        <input v-model="email" type="email" autocomplete="email" placeholder="ban@example.com" autofocus @blur="touched.email = true" />
        <span v-if="emailError" class="auth-field-error">{{ emailError }}</span>
      </label>
      <label class="auth-field" :class="{ invalid: passwordError }">
        <span>Mật khẩu</span>
        <span class="auth-password">
          <input v-model="password" :type="show ? 'text' : 'password'" autocomplete="new-password" placeholder="Tối thiểu 8 ký tự" @blur="touched.password = true" />
          <button type="button" tabindex="-1" @click="show = !show">{{ show ? 'Ẩn' : 'Hiện' }}</button>
        </span>
        <span v-if="passwordError" class="auth-field-error">{{ passwordError }}</span>
      </label>
      <label class="auth-field" :class="{ invalid: confirmError }">
        <span>Xác nhận mật khẩu</span>
        <input v-model="confirm" :type="show ? 'text' : 'password'" autocomplete="new-password" @blur="touched.confirm = true" />
        <span v-if="confirmError" class="auth-field-error">{{ confirmError }}</span>
      </label>
      <p v-if="error" class="auth-error" role="alert">{{ error }}</p>
      <button class="auth-btn" type="submit" :disabled="!canSubmit">{{ loading ? 'Đang đăng ký…' : 'Đăng ký' }}</button>
    </form>
    <template #footer>
      <span>Đã có tài khoản? <router-link to="/login">Đăng nhập</router-link></span>
    </template>
  </AuthShell>
</template>
