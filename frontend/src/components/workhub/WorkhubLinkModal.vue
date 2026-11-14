<script setup>
import { computed, ref, watch } from 'vue'
import { useToast } from 'vue-toastification'
import { workhub, linkAccount, workhubErrorMessage } from '@/composables/useWorkhub'

const toast = useToast()
const mode = ref('login') // 'login' | 'register'
const email = ref('')
const fullName = ref('')
const password = ref('')
const busy = ref(false)
const error = ref('')

// Gợi ý email SmartSpec đang đăng nhập
watch(
  () => workhub.modalOpen,
  (open) => {
    if (open) {
      error.value = ''
      password.value = ''
      if (!email.value) {
        try { email.value = localStorage.getItem('email') || '' } catch { /* ignore */ }
      }
    }
  },
)

const canSubmit = computed(() => email.value && password.value.length >= 8 && (mode.value === 'login' || fullName.value.trim()))

async function submit() {
  if (!canSubmit.value || busy.value) return
  busy.value = true
  error.value = ''
  try {
    const r = await linkAccount({ email: email.value.trim(), password: password.value, register: mode.value === 'register', fullName: fullName.value.trim() })
    toast.success(`Đã liên kết WorkHub (${r.email}). Đang tạo workspace, team và dự án từ SmartSpec…`)
  } catch (e) {
    error.value = workhubErrorMessage(e)
  } finally {
    busy.value = false
    password.value = ''
  }
}

function later() {
  workhub.dismissed = true
  workhub.modalOpen = false
}
</script>

<template>
  <Teleport to="body">
    <div v-if="workhub.modalOpen" class="wh-backdrop" @keydown.esc="later">
      <form class="wh-card" role="dialog" aria-modal="true" aria-labelledby="wh-title" @submit.prevent="submit">
        <p class="wh-eyebrow">Liên kết WorkHub</p>
        <h1 id="wh-title">Đưa đặc tả thành công việc</h1>
        <p class="wh-muted">
          Đăng nhập hoặc đăng ký WorkHub một lần. Sau đó mọi dự án SmartSpec của bạn tự động có workspace, team, dự án và
          backlog tương ứng trong WorkHub, luôn được cập nhật khi đặc tả đổi.
        </p>

        <div class="wh-tabs" role="tablist">
          <button type="button" role="tab" :aria-selected="mode === 'login'" :class="{ on: mode === 'login' }" @click="mode = 'login'">Đăng nhập</button>
          <button type="button" role="tab" :aria-selected="mode === 'register'" :class="{ on: mode === 'register' }" @click="mode = 'register'">Đăng ký</button>
        </div>

        <label v-if="mode === 'register'" class="wh-field">
          <span>Họ và tên</span>
          <input v-model="fullName" autocomplete="name" placeholder="Nguyễn Văn A" />
        </label>
        <label class="wh-field">
          <span>Email WorkHub</span>
          <input v-model="email" type="email" autocomplete="email" placeholder="you@example.com" />
        </label>
        <label class="wh-field">
          <span>Mật khẩu WorkHub</span>
          <input v-model="password" type="password" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" placeholder="Tối thiểu 8 ký tự" />
        </label>

        <p v-if="error" class="wh-error" role="alert">{{ error }}</p>

        <div class="wh-actions">
          <button type="button" class="wh-ghost" @click="later">Để sau</button>
          <button type="submit" class="wh-primary" :disabled="!canSubmit || busy">
            {{ busy ? 'Đang liên kết…' : mode === 'login' ? 'Đăng nhập và liên kết' : 'Đăng ký và liên kết' }}
          </button>
        </div>
        <p class="wh-fine">Mật khẩu chỉ dùng để đăng nhập WorkHub một lần, SmartSpec không lưu mật khẩu.</p>
      </form>
    </div>
  </Teleport>
</template>

<style scoped>
.wh-backdrop { position: fixed; inset: 0; z-index: 5000; display: grid; place-items: center; padding: 16px; background: rgb(10 10 10 / 0.45); backdrop-filter: blur(2px); }
.wh-card { width: min(460px, 100%); max-height: 92vh; overflow: auto; background: var(--surface); color: var(--text); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-pop); padding: 28px; display: grid; gap: 14px; }
.wh-eyebrow { margin: 0; font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); font-weight: 600; }
h1 { font-family: var(--font-display); font-weight: 600; font-size: 1.7rem; line-height: 1.15; letter-spacing: -0.02em; margin: 0; }
.wh-muted { margin: 0; color: var(--muted); font-size: 0.92rem; }
.wh-tabs { display: inline-flex; padding: 4px; gap: 4px; background: var(--sunken); border-radius: 999px; justify-self: start; }
.wh-tabs button { border: 0; background: transparent; color: var(--muted); padding: 6px 16px; border-radius: 999px; font: inherit; font-weight: 500; cursor: pointer; }
.wh-tabs button.on { background: var(--surface); color: var(--text); box-shadow: var(--shadow); }
.wh-field { display: grid; gap: 6px; font-size: 0.85rem; font-weight: 500; }
.wh-field input { font: inherit; padding: 11px 14px; border: 1px solid var(--border-strong); border-radius: var(--radius-field); background: var(--surface); color: var(--text); }
.wh-field input:focus { outline: 2px solid var(--ink); outline-offset: 1px; }
.wh-error { margin: 0; padding: 10px 14px; border-radius: var(--radius-field); background: var(--danger-soft); color: var(--danger); font-size: 0.88rem; }
.wh-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
.wh-primary, .wh-ghost { font: inherit; font-weight: 500; padding: 10px 20px; border-radius: 999px; cursor: pointer; border: 1px solid var(--ink); }
.wh-primary { background: var(--ink); color: var(--ink-text); }
.wh-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.wh-ghost { background: transparent; color: var(--text); border-color: var(--border-strong); }
.wh-fine { margin: 0; font-size: 0.78rem; color: var(--muted); }
</style>
