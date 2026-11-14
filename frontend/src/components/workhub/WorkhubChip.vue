<script setup>
import { computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { workhub, loadProject, fetchUserStatus, syncNow, workhubErrorMessage } from '@/composables/useWorkhub'

const props = defineProps({ projectId: { type: String, required: true } })
const toast = useToast()
const p = computed(() => workhub.projects[props.projectId] || { linked: false, sync: 'idle', workhub: null })

onMounted(async () => {
  await fetchUserStatus()
  if (workhub.bridge) await loadProject(props.projectId)
})

const label = computed(() => {
  if (!workhub.bridge) return 'ForgeBridge chưa chạy'
  if (!workhub.linked) return 'Chưa liên kết WorkHub'
  if (p.value.sync === 'syncing') return 'Đang đồng bộ…'
  if (p.value.sync === 'error') return 'Đồng bộ lỗi'
  if (p.value.sync === 'link_required') return 'Cần liên kết WorkHub'
  if (!p.value.linked) return 'Chờ đặc tả hoàn tất'
  return 'Đã đồng bộ'
})
const tone = computed(() => (p.value.sync === 'error' || !workhub.bridge ? 'bad' : p.value.sync === 'syncing' ? 'busy' : p.value.linked && workhub.linked ? 'ok' : 'idle'))

async function open() {
  if (!workhub.linked) { workhub.dismissed = false; workhub.modalOpen = true; return }
  if (!p.value.workhub?.url) {
    try { await syncNow(props.projectId); toast.info('Đang tạo dự án trong WorkHub…') } catch (e) { toast.error(workhubErrorMessage(e)) }
    return
  }
  window.open(p.value.workhub.url, '_blank', 'noopener')
}
async function resync() {
  try { await syncNow(props.projectId) } catch (e) { toast.error(workhubErrorMessage(e)) }
}
</script>

<template>
  <div class="wh-chip">
    <span class="state" :class="tone" :title="workhub.email ? `Tài khoản WorkHub: ${workhub.email}` : ''">
      <i class="dot" /> {{ label }}
    </span>
    <button v-if="workhub.linked && workhub.bridge" class="icon" type="button" title="Đồng bộ ngay" :disabled="p.sync === 'syncing'" @click="resync">
      <span class="material-symbols-outlined">sync</span>
    </button>
    <button type="button" class="open" :disabled="!workhub.bridge" @click="open">
      {{ workhub.linked ? 'Mở WorkHub' : 'Liên kết WorkHub' }}
      <span class="material-symbols-outlined">north_east</span>
    </button>
  </div>
</template>

<style scoped>
.wh-chip { display: inline-flex; align-items: center; gap: 8px; }
.state { display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--muted); padding: 5px 12px; border: 1px solid var(--border); border-radius: 999px; background: var(--surface); }
.dot { width: 7px; height: 7px; border-radius: 50%; background: var(--border-strong); }
.ok .dot { background: var(--success); }
.busy .dot { background: var(--warning); animation: pulse 1s infinite; }
.bad .dot { background: var(--danger); }
.open { display: inline-flex; align-items: center; gap: 4px; font: inherit; font-weight: 500; font-size: 0.85rem; padding: 7px 16px; border-radius: 999px; border: 1px solid var(--ink); background: var(--ink); color: var(--ink-text); cursor: pointer; }
.open:disabled { opacity: 0.4; cursor: not-allowed; }
.open .material-symbols-outlined { font-size: 16px; }
.icon { display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; border: 1px solid var(--border-strong); background: var(--surface); color: var(--text); cursor: pointer; }
.icon:disabled { opacity: 0.4; }
.icon .material-symbols-outlined { font-size: 18px; }
@keyframes pulse { 50% { opacity: 0.35; } }
</style>
