<script setup>
import { computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { ref } from 'vue'
import { workhub, loadProject, fetchUserStatus, syncNow, workhubErrorMessage, unlinkAccount, setProjectPaused } from '@/composables/useWorkhub'

const props = defineProps({ projectId: { type: String, required: true } })
const toast = useToast()
const p = computed(() => workhub.projects[props.projectId] || { linked: false, sync: 'idle', workhub: null })

onMounted(async () => {
  await fetchUserStatus()
  if (workhub.bridge) await loadProject(props.projectId)
})

const menuOpen = ref(false)

const label = computed(() => {
  if (!workhub.bridge) return 'ForgeBridge chưa chạy'
  if (!workhub.linked) return 'Chưa liên kết WorkHub'
  if (p.value.paused) return 'Đã tạm dừng đồng bộ'
  if (p.value.archived) return 'Dự án WorkHub đã lưu trữ'
  if (p.value.sync === 'syncing') return 'Đang đồng bộ…'
  if (p.value.sync === 'error') return 'Đồng bộ lỗi'
  if (p.value.sync === 'link_required') return 'Cần liên kết WorkHub'
  if (!p.value.linked) return 'Chờ đặc tả hoàn tất'
  return 'Đã đồng bộ'
})
const tone = computed(() => (p.value.sync === 'error' || !workhub.bridge ? 'bad' : p.value.paused || p.value.archived ? 'idle' : p.value.sync === 'syncing' ? 'busy' : p.value.linked && workhub.linked ? 'ok' : 'idle'))

async function open() {
  if (!workhub.linked) { workhub.dismissed = false; workhub.modalOpen = true; return }
  if (!p.value.workhub?.url) {
    try { await syncNow(props.projectId); toast.info('Đang tạo dự án trong WorkHub…') } catch (e) { toast.error(workhubErrorMessage(e)) }
    return
  }
  window.open(p.value.workhub.url, '_blank', 'noopener')
}
async function togglePause() {
  menuOpen.value = false
  try {
    await setProjectPaused(props.projectId, !p.value.paused)
    toast.info(p.value.paused ? 'Đã tạm dừng đồng bộ dự án này. Không có gì bị xoá ở WorkHub.' : 'Đã tiếp tục đồng bộ.')
  } catch (e) {
    toast.error(workhubErrorMessage(e))
  }
}
async function unlink() {
  menuOpen.value = false
  if (!window.confirm(`Huỷ liên kết tài khoản WorkHub${workhub.email ? ' ' + workhub.email : ''}?\n\nCác task và tài liệu đã tạo vẫn nằm trong WorkHub nhưng SmartSpec sẽ không đồng bộ cho tới khi bạn liên kết lại.`)) return
  try {
    await unlinkAccount()
    toast.info('Đã huỷ liên kết WorkHub.')
  } catch (e) {
    toast.error(workhubErrorMessage(e))
  }
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
    <span v-if="workhub.linked && workhub.bridge" class="menu-wrap">
      <button class="icon" type="button" title="Tuỳ chọn WorkHub" aria-haspopup="menu" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen">
        <span class="material-symbols-outlined">more_horiz</span>
      </button>
      <div v-if="menuOpen" class="menu" role="menu" @mouseleave="menuOpen = false">
        <button type="button" role="menuitem" :disabled="!p.linked" @click="togglePause">{{ p.paused ? 'Tiếp tục đồng bộ dự án' : 'Tạm dừng đồng bộ dự án' }}</button>
        <button type="button" role="menuitem" class="danger" @click="unlink">Huỷ liên kết tài khoản WorkHub</button>
      </div>
    </span>
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
.menu-wrap { position: relative; }
.menu { position: absolute; right: 0; top: 36px; z-index: 50; min-width: 250px; display: grid; padding: 6px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-field); box-shadow: var(--shadow-pop); }
.menu button { text-align: left; font: inherit; font-size: 0.85rem; padding: 8px 12px; border: 0; border-radius: 8px; background: transparent; color: var(--text); cursor: pointer; }
.menu button:hover:not(:disabled) { background: var(--sunken); }
.menu button:disabled { opacity: 0.4; cursor: not-allowed; }
.menu .danger { color: var(--danger); }
@keyframes pulse { 50% { opacity: 0.35; } }
</style>
