<script setup>
import { computed } from 'vue'
import { workhub } from '@/composables/useWorkhub'

const props = defineProps({ useCase: { type: Object, required: true } })

const NAMES = { TO_DO: 'Cần làm', IN_PROGRESS: 'Đang làm', CODE_REVIEW: 'Review', TESTING: 'Kiểm thử', DONE: 'Hoàn thành' }
// Tiến độ realtime (theo lineage) ưu tiên hơn bản đã lưu trong use case
const impl = computed(() => workhub.progress[props.useCase.lineage_id || props.useCase._id] || props.useCase.implementation)
const tone = computed(() => (impl.value?.deleted ? 'idle' : impl.value?.blocked ? 'bad' : impl.value?.status === 'DONE' ? 'ok' : impl.value?.status === 'TO_DO' ? 'idle' : 'busy'))
</script>

<template>
  <a v-if="impl && impl.issue_key" class="wh-badge" :class="tone" :href="impl.url || undefined" target="_blank" rel="noopener" :title="[impl.assignee && `Người làm: ${impl.assignee}`, impl.sprint && `Sprint: ${impl.sprint}`, impl.blocked && 'Đang bị chặn', impl.removed && 'Không còn trong đặc tả'].filter(Boolean).join(' · ') || 'Mở trong WorkHub'" @click.stop>
    <b>{{ impl.issue_key }}</b>
    <span>{{ impl.deleted ? 'Đã xoá' : impl.blocked ? 'Bị chặn' : NAMES[impl.status] || impl.status }}</span>
  </a>
</template>

<style scoped>
.wh-badge { display: inline-flex; align-items: center; gap: 6px; margin-left: 8px; padding: 2px 10px; border-radius: 999px; font-size: 0.72rem; line-height: 1.6; text-decoration: none; border: 1px solid var(--border-strong); background: var(--surface); color: var(--text); vertical-align: middle; white-space: nowrap; }
.wh-badge b { font-weight: 600; letter-spacing: 0.02em; }
.wh-badge.ok { background: var(--success-soft); border-color: transparent; color: var(--success); }
.wh-badge.busy { background: var(--warning-soft); border-color: transparent; color: var(--warning); }
.wh-badge.bad { background: var(--danger-soft); border-color: transparent; color: var(--danger); }
.wh-badge.idle { color: var(--muted); }
</style>
