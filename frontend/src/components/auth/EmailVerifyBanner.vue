<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import axiosClient from '@/utils/axiosClient'

const route = useRoute()
const toast = useToast()
const email = ref('')
const unverified = ref(false)
const sending = ref(false)
const dismissed = ref(false)
const AUTH_PATH = /^\/(login|register|forgot-password|reset-password|verify|oauth)/

async function load() {
  if (!localStorage.getItem('accessToken') || AUTH_PATH.test(route.path)) { unverified.value = false; return }
  try {
    const { data } = await axiosClient.get('/api/auth/me')
    email.value = data?.data?.email || ''
    unverified.value = data?.data?.email_verified === false
  } catch { /* the page that needs auth will deal with it */ }
}

async function resend() {
  sending.value = true
  try {
    const { data } = await axiosClient.post('/api/auth/resend-verification')
    data?.data ? toast.success('Đã gửi lại email xác thực') : toast.error('Không gửi được email, hãy thử lại sau')
  } catch (e) {
    toast.error(e.response?.data?.message || 'Không gửi được email')
  } finally {
    sending.value = false
  }
}

// keep the page content below the fixed banner
watch([unverified, dismissed], ([u, d]) => { document.body.style.paddingTop = u && !d ? '40px' : '' }, { immediate: true })

onMounted(load)
watch(() => route.path, load)
</script>

<template>
  <div v-if="unverified && !dismissed" class="verify-banner" role="status">
    <span>Email <b>{{ email }}</b> chưa được xác thực.</span>
    <button type="button" :disabled="sending" @click="resend">{{ sending ? 'Đang gửi…' : 'Gửi lại email xác thực' }}</button>
    <button type="button" class="close" aria-label="Đóng" @click="dismissed = true">×</button>
  </div>
</template>

<style scoped>
.verify-banner { position: fixed; top: 0; left: 0; right: 0; z-index: 4000; display: flex; gap: 12px; align-items: center; justify-content: center; padding: 8px 16px; background: var(--warning-soft); color: var(--warning); font-size: 0.88rem; border-bottom: 1px solid var(--border); }
.verify-banner button { font: inherit; font-size: 0.82rem; padding: 3px 12px; border-radius: 999px; border: 1px solid currentColor; background: transparent; color: inherit; cursor: pointer; }
.verify-banner .close { border: 0; padding: 0 6px; font-size: 1.1rem; }
</style>
