<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import axiosClient from '@/utils/axiosClient'
import { socket } from '@/utils/socket'
import { workhub, fetchUserStatus, loadProject, syncNow, workhubErrorMessage } from '@/composables/useWorkhub'

const route = useRoute()
const toast = useToast()
const projectId = computed(() => String(route.params.id))

const COLUMNS = [
  { id: 'TO_DO', name: 'Cần làm' },
  { id: 'IN_PROGRESS', name: 'Đang làm' },
  { id: 'CODE_REVIEW', name: 'Review' },
  { id: 'TESTING', name: 'Kiểm thử' },
  { id: 'DONE', name: 'Hoàn thành' },
]

const loading = ref(true)
const board = ref({ items: [], activeSprint: null })
const busy = ref({}) // key -> true while a status change is in flight

async function load() {
  try {
    const { data } = await axiosClient.get(`/api/workhub/projects/${projectId.value}/board`)
    board.value = data.data
  } catch (e) {
    toast.error(workhubErrorMessage(e))
  } finally {
    loading.value = false
  }
}

// Tiến độ realtime (workhub.progress) ưu tiên hơn bản đã tải
const impl = (item) => workhub.progress[item.key] || item.implementation
const items = computed(() => board.value.items.map((i) => ({ ...i, impl: impl(i) })))
const synced = computed(() => items.value.filter((i) => i.impl?.issue_key && !i.impl.deleted))
const deleted = computed(() => items.value.filter((i) => i.impl?.deleted))
const waiting = computed(() => items.value.filter((i) => !i.impl?.issue_key))
const byStatus = (id) => synced.value.filter((i) => i.impl.status === id)

const percent = (list) => (list.length ? Math.round((list.filter((i) => i.impl?.status === 'DONE').length / list.length) * 100) : 0)
const total = computed(() => items.value.length)
const donePercent = computed(() => percent(items.value))
const modules = computed(() => {
  const m = new Map()
  for (const i of items.value) m.set(i.module, [...(m.get(i.module) || []), i])
  return Array.from(m.entries()).map(([name, list]) => ({
    name,
    total: list.length,
    done: list.filter((i) => i.impl?.status === 'DONE').length,
    percent: percent(list),
    blocked: list.filter((i) => i.impl?.blocked).length,
  }))
})

const openBugs = (i) => (i.bugs || []).filter((b) => b.status !== 'DONE')
const projectState = computed(() => workhub.projects[projectId.value] || {})
const initials = (name) => (name || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
const overdue = (i) => i.impl?.due_date && i.impl.status !== 'DONE' && new Date(i.impl.due_date) < new Date(new Date().toDateString())
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '')

async function setStatus(item, status) {
  if (item.impl?.status === status) return
  busy.value[item.key] = true
  const before = workhub.progress[item.key]
  workhub.progress[item.key] = { ...item.impl, status } // lạc quan; sai thì hoàn lại
  try {
    const { data } = await axiosClient.put(`/api/workhub/projects/${projectId.value}/usecases/${encodeURIComponent(item.key)}/status`, { status })
    workhub.progress[item.key] = data.data
  } catch (e) {
    workhub.progress[item.key] = before
    toast.error(workhubErrorMessage(e))
  } finally {
    busy.value[item.key] = false
  }
}

async function recreate(item) {
  try {
    const { data } = await axiosClient.post(`/api/workhub/projects/${projectId.value}/usecases/${encodeURIComponent(item.key)}/recreate`)
    workhub.progress[item.key] = data.data
    toast.success(`Đã tạo lại task ${data.data.issue_key}`)
  } catch (e) {
    toast.error(workhubErrorMessage(e))
  }
}

async function refreshNow() {
  try {
    await axiosClient.post(`/api/workhub/projects/${projectId.value}/reconcile`)
    await syncNow(projectId.value).catch(() => undefined)
    await load()
  } catch (e) {
    toast.error(workhubErrorMessage(e))
  }
}

let timer
function onEvent(e) {
  if (e?.projectId !== projectId.value) return
  if (e.type === 'WORKHUB_SYNC' && e.state === 'synced') {
    clearTimeout(timer)
    timer = setTimeout(load, 400)
  }
}

onMounted(async () => {
  await fetchUserStatus()
  await Promise.all([load(), loadProject(projectId.value)])
  socket.on('workhub_event', onEvent)
})
onBeforeUnmount(() => {
  socket.off('workhub_event', onEvent)
  clearTimeout(timer)
})
</script>

<template>
  <div class="tasks">
    <div v-if="loading" class="empty">Đang tải…</div>

    <div v-else-if="!workhub.linked" class="empty card">
      <h2>Chưa liên kết WorkHub</h2>
      <p>Liên kết tài khoản WorkHub để đặc tả của dự án tự trở thành task và bạn theo dõi tiến độ ngay tại đây.</p>
      <button class="primary" type="button" @click="((workhub.dismissed = false), (workhub.modalOpen = true))">Liên kết WorkHub</button>
    </div>

    <div v-else-if="!total" class="empty card">
      <h2>Chưa có use case để theo dõi</h2>
      <p>Khi dự án có một phiên bản đặc tả hoàn tất, các use case sẽ tự được tạo thành task trong WorkHub.</p>
    </div>

    <template v-else>
      <p v-if="projectState.paused" class="banner">Đồng bộ với WorkHub đang tạm dừng. Dữ liệu dưới đây là lần đồng bộ cuối; chủ dự án có thể tiếp tục từ menu ⋯ ở đầu trang.</p>
      <p v-else-if="projectState.archived" class="banner">Dự án WorkHub đang được lưu trữ vì dự án này ở thùng rác. Khôi phục dự án để mở lại.</p>

      <section class="summary card">
        <div class="summary-top">
          <div>
            <p class="eyebrow">Tiến độ triển khai</p>
            <h1>{{ donePercent }}% hoàn thành</h1>
            <p class="muted">
              {{ items.filter((i) => i.impl?.status === 'DONE').length }}/{{ total }} use case đã xong
              <template v-if="board.activeSprint"> · Sprint <b>{{ board.activeSprint.name }}</b><template v-if="board.activeSprint.endDate"> đến {{ fmtDate(board.activeSprint.endDate) }}</template></template>
            </p>
          </div>
          <div class="summary-actions">
            <button class="ghost" type="button" @click="refreshNow"><span class="material-symbols-outlined">sync</span> Đối soát ngay</button>
            <a v-if="projectState.workhub?.url" class="primary" :href="projectState.workhub.url" target="_blank" rel="noopener">Mở WorkHub <span class="material-symbols-outlined">north_east</span></a>
          </div>
        </div>
        <div class="bar" role="progressbar" :aria-valuenow="donePercent" aria-valuemin="0" aria-valuemax="100"><i :style="{ width: donePercent + '%' }" /></div>
        <p class="note">Giao việc, sprint và hạn chót được quản lý trong WorkHub; SmartSpec hiển thị lại và luôn cập nhật theo.</p>
      </section>

      <section class="modules">
        <article v-for="m in modules" :key="m.name" class="card module">
          <header><b>{{ m.name }}</b><span class="muted small">{{ m.done }}/{{ m.total }}</span></header>
          <div class="bar thin"><i :style="{ width: m.percent + '%' }" /></div>
          <span v-if="m.blocked" class="tag bad">{{ m.blocked }} bị chặn</span>
        </article>
      </section>

      <section class="board">
        <div v-for="col in COLUMNS" :key="col.id" class="col">
          <header>{{ col.name }} <span class="count">{{ byStatus(col.id).length }}</span></header>
          <article v-for="i in byStatus(col.id)" :key="i.key" class="card task" :class="{ blocked: i.impl.blocked }">
            <div class="row">
              <a :href="i.impl.url" target="_blank" rel="noopener" class="key">{{ i.impl.issue_key }}</a>
              <span v-if="i.impl.blocked" class="tag bad" :title="i.impl.blocked_reason || ''">Bị chặn</span>
            </div>
            <h3>{{ i.name }}</h3>
            <p class="muted small">{{ i.module }}</p>
            <div class="meta">
              <span v-if="i.impl.assignee" class="who" :title="i.impl.assignee">
                <img v-if="i.impl.assignee_avatar" :src="i.impl.assignee_avatar" alt="" />
                <span v-else class="av">{{ initials(i.impl.assignee) }}</span>
                {{ i.impl.assignee }}
              </span>
              <span v-else class="tag idle" title="Giao việc trong WorkHub">Chưa giao</span>
              <span v-if="i.impl.sprint" class="tag">{{ i.impl.sprint }}</span>
              <span v-if="i.impl.story_points != null" class="tag">{{ i.impl.story_points }} điểm</span>
              <span v-if="i.impl.due_date" class="tag" :class="{ bad: overdue(i) }">Hạn {{ fmtDate(i.impl.due_date) }}</span>
              <a v-for="b in openBugs(i)" :key="b.key" class="tag bad" :href="b.url" target="_blank" rel="noopener" :title="b.testcase">🐞 {{ b.key }}</a>
            </div>
            <select :value="i.impl.status" :disabled="busy[i.key]" aria-label="Đổi trạng thái" @change="setStatus(i, $event.target.value)">
              <option v-for="c in COLUMNS" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </article>
        </div>
      </section>

      <section v-if="waiting.length || deleted.length" class="side">
        <div v-if="waiting.length" class="card">
          <h2>Chờ đồng bộ ({{ waiting.length }})</h2>
          <p class="muted small">Sẽ tự có task trong WorkHub sau lần đồng bộ kế tiếp.</p>
          <ul><li v-for="i in waiting" :key="i.key">{{ i.name }}</li></ul>
        </div>
        <div v-if="deleted.length" class="card">
          <h2>Task đã bị xoá ở WorkHub ({{ deleted.length }})</h2>
          <ul>
            <li v-for="i in deleted" :key="i.key">{{ i.name }} <button class="ghost small" type="button" @click="recreate(i)">Tạo lại task</button></li>
          </ul>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.tasks { padding: 20px var(--gutter) 48px; display: grid; gap: 20px; color: var(--text); }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px; }
.empty { text-align: center; color: var(--muted); padding: 56px 16px; }
.empty h2 { color: var(--text); }
.eyebrow { margin: 0; font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); font-weight: 600; }
h1 { font-family: var(--font-display); font-size: 2rem; margin: 4px 0; letter-spacing: -0.02em; }
h2 { font-size: 1.05rem; margin: 0 0 6px; }
h3 { font-size: 0.95rem; margin: 6px 0 0; }
.muted { color: var(--muted); margin: 0; }
.small { font-size: 0.8rem; }
.banner { margin: 0; padding: 10px 16px; border-radius: var(--radius-field); background: var(--warning-soft); color: var(--warning); font-size: 0.88rem; }
.note { margin: 12px 0 0; font-size: 0.8rem; color: var(--muted); }
.summary-top { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; align-items: flex-start; }
.summary-actions { display: flex; gap: 8px; align-items: center; }
.bar { height: 10px; background: var(--sunken); border-radius: 999px; overflow: hidden; margin-top: 14px; }
.bar.thin { height: 6px; margin-top: 10px; }
.bar i { display: block; height: 100%; background: var(--ink); border-radius: 999px; transition: width 0.4s; }
.modules { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 12px; }
.module header { display: flex; justify-content: space-between; gap: 8px; }
.board { display: grid; grid-template-columns: repeat(5, minmax(230px, 1fr)); gap: 14px; overflow-x: auto; align-items: start; padding-bottom: 8px; }
.col { background: var(--sunken); border-radius: var(--radius); padding: 12px; display: grid; gap: 10px; align-content: start; min-height: 120px; }
.col > header { font-weight: 600; font-size: 0.85rem; display: flex; justify-content: space-between; padding: 0 4px; }
.count { color: var(--muted); font-weight: 500; }
.task { padding: 14px; display: grid; gap: 4px; }
.task.blocked { border-color: var(--danger); }
.task .row { display: flex; justify-content: space-between; align-items: center; }
.key { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.03em; color: var(--muted); text-decoration: none; }
.key:hover { color: var(--text); }
.meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 6px 0; }
.tag { font-size: 0.72rem; padding: 2px 10px; border-radius: 999px; border: 1px solid var(--border-strong); background: var(--surface); }
.tag.bad { background: var(--danger-soft); color: var(--danger); border-color: transparent; }
.tag.idle { color: var(--muted); border-style: dashed; }
.who { display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem; }
.who img, .av { width: 22px; height: 22px; border-radius: 50%; object-fit: cover; }
.av { display: inline-grid; place-items: center; background: var(--ink); color: var(--ink-text); font-size: 0.65rem; font-weight: 600; }
select { font: inherit; font-size: 0.82rem; padding: 6px 10px; border: 1px solid var(--border-strong); border-radius: var(--radius-field); background: var(--surface); color: var(--text); }
button, .primary { font: inherit; font-weight: 500; display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; border-radius: 999px; cursor: pointer; text-decoration: none; border: 1px solid var(--ink); }
.primary { background: var(--ink); color: var(--ink-text); }
.ghost { background: transparent; color: var(--text); border-color: var(--border-strong); }
.ghost.small { padding: 3px 12px; font-size: 0.78rem; margin-left: 8px; }
button .material-symbols-outlined, .primary .material-symbols-outlined { font-size: 18px; }
.side { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; }
.side ul { margin: 8px 0 0; padding-left: 18px; }
@media (max-width: 900px) { .board { grid-template-columns: repeat(5, 240px); } }
</style>
