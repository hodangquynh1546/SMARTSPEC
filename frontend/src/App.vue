
<script setup>
import { onMounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { watch } from 'vue'
import WorkhubLinkModal from '@/components/workhub/WorkhubLinkModal.vue'
import { promptLinkIfNeeded } from '@/composables/useWorkhub'
import { initSocketConnection } from '@/utils/socket'
const route = useRoute()
const AUTH_PATH = /^\/(login|register|forgot-password|reset-password|verify|oauth)/
// Sau khi đăng nhập SmartSpec: nếu chưa liên kết WorkHub thì yêu cầu đăng nhập/đăng ký WorkHub
watch(
  () => route.fullPath,
  () => {
    if (localStorage.getItem('accessToken') && !AUTH_PATH.test(route.path)) promptLinkIfNeeded()
  },
  { immediate: true },
)
// Khi app được mount (chạy lần đầu tiên)
onMounted(() => {
  const userId = localStorage.getItem('userId')
  if (userId) {
    initSocketConnection()
    console.log('🔌 Socket initialized from App.vue')
  } else {
    console.log('⚠️ No userId found in localStorage — socket not joined')
  }
})
</script>

<template>
  <RouterView />
  <WorkhubLinkModal />
</template>

 