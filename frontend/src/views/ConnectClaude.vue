<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import axiosClient from '@/utils/axiosClient'

const router = useRouter()
const toast = useToast()
const BRIDGE = (import.meta.env.VITE_BRIDGE_URL || 'http://localhost:8090').replace(/\/$/, '')

const tokens = ref([])
const name = ref('Claude Code')
const busy = ref(false)
const fresh = ref(null) // token vừa tạo, chỉ hiện một lần

async function load() {
  try {
    const { data } = await axiosClient.get('/api/tokens')
    tokens.value = data.data ?? data
  } catch {
    toast.error('Không tải được danh sách token')
  }
}
async function create() {
  if (!name.value.trim()) return
  busy.value = true
  try {
    const { data } = await axiosClient.post('/api/tokens', { name: name.value.trim() })
    fresh.value = data.data ?? data
    await load()
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Không tạo được token')
  } finally {
    busy.value = false
  }
}
async function revoke(t) {
  if (!confirm(`Thu hồi token "${t.name}"? Claude đang dùng token này sẽ mất kết nối.`)) return
  try {
    await axiosClient.delete(`/api/tokens/${t.id}`)
    if (fresh.value?.id === t.id) fresh.value = null
    await load()
  } catch {
    toast.error('Không thu hồi được token')
  }
}
const command = computed(
  () => `claude mcp add --transport http smartspec ${BRIDGE}/mcp/smartspec --header "Authorization: Bearer ${fresh.value?.token ?? '<TOKEN>'}"`,
)
const stdioConfig = computed(() =>
  JSON.stringify(
    { mcpServers: { smartspec: { command: 'npx', args: ['tsx', '<đường-dẫn>/ForgeBridge/src/smartspec-mcp-stdio.ts'], env: { SMARTSPEC_URL: axiosClient.defaults.baseURL || 'http://localhost:8000', SMARTSPEC_TOKEN: fresh.value?.token ?? '<TOKEN>' } } } },
    null, 2,
  ),
)
async function copy(text) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success('Đã sao chép')
  } catch {
    toast.info('Hãy chọn và sao chép thủ công')
  }
}
const when = (d) => (d ? new Date(d).toLocaleString('vi-VN') : 'chưa dùng')
onMounted(load)
</script>

<template>
  <div class="page">
    <button class="back" @click="router.push('/dashboard')">← Dự án</button>
    <h1>Kết nối Claude</h1>
    <p class="lead">
      Để Claude (Claude Code, Claude Desktop…) đọc và ghi đặc tả trực tiếp vào SmartSpec: use case, sơ đồ, CSDL, test case.
      Claude hành động với quyền của <b>chính bạn</b>; SmartSpec không cần khoá API LLM cho luồng này.
    </p>

    <section class="card">
      <h2>1. Tạo token cá nhân</h2>
      <form class="row" @submit.prevent="create">
        <input v-model="name" maxlength="60" placeholder="Tên (vd: Claude Code trên laptop)" />
        <button class="primary" :disabled="busy">Tạo token</button>
      </form>
      <div v-if="fresh" class="notice">
        <p>Token chỉ hiện <b>một lần</b>. Hãy dán vào lệnh bên dưới ngay:</p>
        <code class="block">{{ fresh.token }}</code>
        <button class="ghost" @click="copy(fresh.token)">Sao chép token</button>
      </div>
      <ul class="tokens">
        <li v-for="t in tokens" :key="t.id">
          <div>
            <b>{{ t.name }}</b> <span class="muted">{{ t.prefix }}…</span>
            <div class="muted">Tạo {{ when(t.created_at) }} · dùng gần nhất: {{ when(t.last_used_at) }}</div>
          </div>
          <button class="ghost danger" @click="revoke(t)">Thu hồi</button>
        </li>
        <li v-if="!tokens.length" class="muted">Chưa có token nào.</li>
      </ul>
    </section>

    <section class="card">
      <h2>2. Thêm vào Claude Code</h2>
      <code class="block">{{ command }}</code>
      <button class="ghost" @click="copy(command)">Sao chép lệnh</button>
      <p class="muted">
        Máy chạy Claude phải truy cập được ForgeBridge ({{ BRIDGE }}). Dùng qua mạng thì đặt sau HTTPS.
        Không có kết nối HTTP? Dùng cấu hình stdio:
      </p>
      <pre class="block">{{ stdioConfig }}</pre>
      <button class="ghost" @click="copy(stdioConfig)">Sao chép cấu hình</button>
    </section>

    <section class="card">
      <h2>3. Dùng thử</h2>
      <p>Trong Claude, hãy nói ví dụ:</p>
      <ul>
        <li>“Dùng SmartSpec tạo dự án quản lý thư viện, viết use case, CSDL và sơ đồ tuần tự cho mượn sách.”</li>
        <li>“Đọc đặc tả dự án X trong SmartSpec rồi viết code cho use case Đăng nhập.”</li>
      </ul>
      <p class="muted">Thay đổi vào phiên bản nháp; chủ dự án duyệt trong SmartSpec. Thu hồi token bất cứ lúc nào ở trên.</p>
    </section>
  </div>
</template>

<style scoped>
.page { max-width: 820px; margin: 0 auto; padding: 32px var(--gutter); color: var(--text); }
h1 { font-family: var(--font-display); font-size: 2rem; margin: 8px 0; }
h2 { font-size: 1.05rem; margin: 0 0 12px; }
.lead { color: var(--muted); margin-bottom: 20px; }
.back { background: none; border: none; color: var(--muted); cursor: pointer; padding: 0; }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; margin-bottom: 16px; box-shadow: var(--shadow); }
.row { display: flex; gap: 8px; }
input { flex: 1; padding: 10px 12px; border: 1px solid var(--border-strong); border-radius: var(--radius-field); background: var(--bg); color: var(--text); }
button { border-radius: 999px; padding: 9px 16px; cursor: pointer; border: 1px solid var(--border-strong); background: var(--surface); color: var(--text); }
button.primary { background: var(--ink); color: var(--ink-text); border-color: var(--ink); }
button.ghost { margin-top: 8px; }
button.danger { color: var(--danger); margin-top: 0; }
.block { display: block; background: var(--sunken); border-radius: var(--radius-field); padding: 12px; margin: 10px 0 0; overflow-x: auto; white-space: pre-wrap; word-break: break-all; font-size: 0.85rem; }
.notice { background: var(--warning-soft); color: var(--warning); border-radius: var(--radius-field); padding: 12px 14px; margin-top: 14px; }
.notice .block { color: var(--text); }
.tokens { list-style: none; padding: 0; margin: 16px 0 0; }
.tokens li { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 0; border-top: 1px solid var(--border); }
.muted { color: var(--muted); font-size: 0.85rem; }
</style>
