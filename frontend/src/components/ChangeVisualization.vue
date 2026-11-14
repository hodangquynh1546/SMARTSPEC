<template>
  <div class="change-visualization">
    <!-- Before Panel -->
    <div class="comparison-panel before-panel">
      <div class="panel-header">
        <span class="material-symbols-outlined">history</span>
        Trước
      </div>
      <div class="panel-content">
        <div v-if="beforeData" class="visualized-content">
          <ChangeFieldDisplay :data="beforeData" :entity-type="entityType" />
        </div>
        <div v-else class="no-data">
          <span class="material-symbols-outlined">add</span>
          Không có dữ liệu trước đó
        </div>
      </div>
    </div>

    <!-- After Panel -->
    <div class="comparison-panel after-panel">
      <div class="panel-header">
        <span class="material-symbols-outlined">edit</span>
        Sau
      </div>
      <div class="panel-content">
        <div v-if="afterData" class="visualized-content">
          <ChangeFieldDisplay :data="afterData" :entity-type="entityType" />
        </div>
        <div v-else class="no-data">
          <span class="material-symbols-outlined">remove</span>
          Dữ liệu sẽ bị xoá
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ChangeFieldDisplay from './ChangeFieldDisplay.vue'

export default {
  name: 'ChangeVisualization',
  components: {
    ChangeFieldDisplay,
  },
  props: {
    beforeSnapshot: {
      type: [Object, String],
      default: null,
    },
    afterSnapshot: {
      type: [Object, String],
      default: null,
    },
    entityType: {
      type: String,
      default: '',
    },
  },
  computed: {
    beforeData() {
      if (!this.beforeSnapshot) return null
      if (typeof this.beforeSnapshot === 'string') {
        try {
          return JSON.parse(this.beforeSnapshot)
        } catch {
          return null
        }
      }
      return this.beforeSnapshot
    },
    afterData() {
      if (!this.afterSnapshot) return null
      if (typeof this.afterSnapshot === 'string') {
        try {
          return JSON.parse(this.afterSnapshot)
        } catch {
          return null
        }
      }
      return this.afterSnapshot
    },
  },
}
</script>

<style scoped>
.change-visualization {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  flex: 1;
  min-height: 0;
}

.comparison-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  font-weight: 600;
  color: var(--text);
}

.before-panel .panel-header {
  color: var(--danger);
}

.after-panel .panel-header {
  color: var(--success);
}

.panel-content {
  flex: 1;
  overflow: auto;
  padding: 16px;
  background: var(--bg);
}

.visualized-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--muted);
  text-align: center;
  gap: 8px;
  min-height: 200px;
}

.no-data .material-symbols-outlined {
  font-size: 48px;
  opacity: 0.5;
}
</style>





















