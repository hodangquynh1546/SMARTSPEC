<script setup>
import { computed, ref } from 'vue'
import { useToast } from 'vue-toastification'
import axiosClient from '@/utils/axiosClient'
import { workhub, workhubErrorMessage } from '@/composables/useWorkhub'

const props = defineProps({
  testcase: { type: Object, required: true },
  /** Show a status selector (test case detail): QA can move the bug without leaving SmartSpec. */
  editable: { type: Boolean, default: false },
})
const toast = useToast()
const busy = ref(false)
const OPTIONS = Object.entries({ TO_DO: 'Chờ sửa', IN_PROGRESS: 'Đang sửa', CODE_REVIEW: 'Review', TESTING: 'Chờ chạy lại', DONE: 'Đã sửa' })
async function change(status) {
  if (busy.value || !bug.value || status === bug.value.status) return
  busy.value = true
  const key = props.testcase.lineage_id || props.testcase._id
  try {
    const { data } = await axiosClient.put(`/api/workhub/projects/${props.testcase.project_id}/testcases/${encodeURIComponent(key)}/bug-status`, { status })
    workhub.bugs[key] = data.data
  } catch (e) {
    toast.error(workhubErrorMessage(e))
  } finally {
    busy.value = false
  }
}
const NAMES = { TO_DO: 'Chờ sửa', IN_PROGRESS: 'Đang sửa', CODE_REVIEW: 'Review', TESTING: 'Chờ chạy lại', DONE: 'Đã sửa' }
const bug = computed(() => workhub.bugs[props.testcase.lineage_id || props.testcase._id] || props.testcase.bug)
const tone = computed(() => (bug.value?.deleted ? 'idle' : bug.value?.status === 'DONE' ? 'ok' : 'bad'))
const hint = computed(() => (bug.value?.status === 'DONE' && props.testcase.status === 'failed' ? 'Bug đã sửa: hãy chạy lại test case' : bug.value?.assignee ? `Người sửa: ${bug.value.assignee}` : 'Mở bug trong WorkHub'))
</script>

<template>
  <a v-if="bug && bug.issue_key" class="bug" :class="tone" :href="bug.url || undefined" target="_blank" rel="noopener" :title="hint" @click.stop>
    <span class="material-symbols-outlined">bug_report</span>
    <b>{{ bug.issue_key }}</b>
    <span>{{ bug.deleted ? 'Đã xoá' : NAMES[bug.status] || bug.status }}</span>
  </a>
  <select v-if="editable && bug && bug.issue_key && !bug.deleted" class="bug-status" :value="bug.status" :disabled="busy" aria-label="Đổi trạng thái bug" @change="change($event.target.value)">
    <option v-for="[v, n] in OPTIONS" :key="v" :value="v">{{ n }}</option>
  </select>
</template>

<style scoped>
.bug { display: inline-flex; align-items: center; gap: 6px; margin-left: 8px; padding: 2px 10px; border-radius: 999px; font-size: 0.72rem; line-height: 1.6; text-decoration: none; border: 1px solid transparent; white-space: nowrap; vertical-align: middle; }
.bug .material-symbols-outlined { font-size: 14px; }
.bug b { font-weight: 600; }
.bug.bad { background: var(--danger-soft); color: var(--danger); }
.bug.ok { background: var(--success-soft); color: var(--success); }
.bug.idle { background: var(--surface); color: var(--muted); border-color: var(--border-strong); }
.bug-status { margin-left: 8px; font: inherit; font-size: 0.75rem; padding: 3px 8px; border: 1px solid var(--border-strong); border-radius: var(--radius-field); background: var(--surface); color: var(--text); }
</style>
