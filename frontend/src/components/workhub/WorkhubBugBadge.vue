<script setup>
import { computed } from 'vue'
import { workhub } from '@/composables/useWorkhub'

const props = defineProps({ testcase: { type: Object, required: true } })
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
</template>

<style scoped>
.bug { display: inline-flex; align-items: center; gap: 6px; margin-left: 8px; padding: 2px 10px; border-radius: 999px; font-size: 0.72rem; line-height: 1.6; text-decoration: none; border: 1px solid transparent; white-space: nowrap; vertical-align: middle; }
.bug .material-symbols-outlined { font-size: 14px; }
.bug b { font-weight: 600; }
.bug.bad { background: var(--danger-soft); color: var(--danger); }
.bug.ok { background: var(--success-soft); color: var(--success); }
.bug.idle { background: var(--surface); color: var(--muted); border-color: var(--border-strong); }
</style>
