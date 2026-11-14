import { reactive } from 'vue'
import axiosClient from '@/utils/axiosClient'
import { socket } from '@/utils/socket'

/**
 * Trạng thái liên kết SmartSpec ↔ WorkHub (qua ForgeBridge), dùng chung cho cả app.
 * - user: đã liên kết tài khoản WorkHub chưa (nếu chưa → hiện modal đăng nhập/đăng ký)
 * - projects[projectId]: link WorkHub của dự án + trạng thái đồng bộ
 * - progress[useCaseKey]: tiến độ triển khai (issue WorkHub) của từng use case
 */
export const workhub = reactive({
  loaded: false,
  bridge: true,
  linked: false,
  email: '',
  modalOpen: false,
  dismissed: false, // người dùng bấm "Để sau" trong phiên này
  projects: {},
  progress: {},
  bugs: {}, // test case lineage/_id -> bug WorkHub
})

let listening = false

/** Dạng ForgeBridge trả về (camelCase) → dạng lưu trong use case (snake_case). */
export const progressToImplementation = (p) => ({
  issue_key: p.issueKey, issue_id: p.issueId, url: p.url, status: p.status, priority: p.priority,
  assignee: p.assignee?.name ?? null, assignee_avatar: p.assignee?.avatar ?? null,
  sprint: p.sprint?.name ?? null, sprint_status: p.sprint?.status ?? null,
  start_date: p.startDate, due_date: p.dueDate, story_points: p.storyPoints,
  blocked: p.blocked, blocked_reason: p.blockedReason, done_at: p.doneAt, deleted: p.deleted,
})

const ensureProject = (id) => (workhub.projects[id] ??= { loaded: false, linked: false, sync: 'idle', workhub: null, items: {}, lastSyncedAt: null })

function onEvent(e) {
  if (e?.type === 'WORKHUB_SYNC') {
    const p = ensureProject(e.projectId)
    p.sync = e.state
    if (e.workhub) { p.workhub = e.workhub; p.linked = true }
    if (e.state === 'paused') p.paused = true
    else if (e.state === 'syncing' || e.state === 'synced') p.paused = false
    if (e.state === 'synced') loadProject(e.projectId)
    if (e.state === 'link_required' && !workhub.linked && !workhub.dismissed) workhub.modalOpen = true
  } else if (e?.type === 'WORKHUB_BUG') {
    workhub.bugs[e.key] = e.bug
  } else if (e?.type === 'WORKHUB_PROGRESS') {
    workhub.progress[e.key] = e.implementation
  }
}

function listen() {
  if (listening) return
  listening = true
  socket.on('workhub_event', onEvent)
}

export async function fetchUserStatus() {
  listen()
  try {
    const { data } = await axiosClient.get('/api/workhub/status')
    const s = data.data
    workhub.bridge = !!s.bridge
    workhub.linked = !!s.linked
    workhub.email = s.email || ''
  } catch {
    workhub.bridge = false
  } finally {
    workhub.loaded = true
  }
  return workhub
}

/** Hỏi người dùng liên kết WorkHub nếu họ chưa có (gọi khi vào các trang sau đăng nhập). */
export async function promptLinkIfNeeded() {
  if (!workhub.loaded) await fetchUserStatus()
  if (workhub.bridge && !workhub.linked && !workhub.dismissed) workhub.modalOpen = true
}

export async function linkAccount({ email, password, register, fullName }) {
  const { data } = await axiosClient.post('/api/workhub/link', { email, password, register, fullName })
  workhub.linked = true
  workhub.email = data.data.email
  workhub.modalOpen = false
  return data.data
}

export async function loadProject(projectId) {
  listen()
  const p = ensureProject(projectId)
  try {
    const { data } = await axiosClient.get(`/api/workhub/projects/${projectId}`)
    const s = data.data
    p.linked = !!s.linked
    p.workhub = s.workhub || null
    p.items = s.items || {}
    p.lastSyncedAt = s.lastSyncedAt || null
    p.paused = !!s.paused
    p.archived = !!s.archived
    for (const [key, it] of Object.entries(p.items)) {
      if (it.progress) workhub.progress[key] = { ...progressToImplementation(it.progress), removed: it.removed }
    }
  } catch {
    /* Bridge tắt: giữ trạng thái cũ */
  } finally {
    p.loaded = true
  }
  return p
}

export async function syncNow(projectId) {
  const p = ensureProject(projectId)
  p.sync = 'syncing'
  try {
    await axiosClient.post(`/api/workhub/projects/${projectId}/sync`)
  } catch (e) {
    p.sync = e.response?.data?.code === 'WORKHUB_LINK_REQUIRED' ? 'link_required' : 'error'
    throw e
  }
}

/** Huỷ liên kết tài khoản WorkHub của tôi (token bị thu hồi; task/tài liệu đã tạo vẫn còn). */
export async function unlinkAccount() {
  await axiosClient.delete('/api/workhub/link')
  workhub.linked = false
  workhub.email = ''
  workhub.dismissed = true // đã chủ động huỷ: đừng bật lại modal ngay
}

/** Chủ dự án tạm dừng/tiếp tục đồng bộ một dự án. */
export async function setProjectPaused(projectId, paused) {
  await axiosClient.put(`/api/workhub/projects/${projectId}/paused`, { paused })
  ensureProject(projectId).paused = paused
}

export const workhubErrorMessage = (e) =>
  e?.response?.data?.message || e?.message || 'Có lỗi xảy ra, thử lại sau'
