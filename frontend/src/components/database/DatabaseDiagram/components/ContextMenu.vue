<template>
  <div
    class="context-menu"
    :style="{
      left: x + 'px',
      top: y + 'px',
    }"
  >
    <div class="context-menu-item" @click="$emit('add-new-table')">Thêm bảng mới</div>
    <div class="context-menu-item" @click="$emit('auto-layout')">Tự động bố trí</div>
    <div class="context-menu-item" @click="$emit('clear-selection')">Bỏ chọn</div>
    <div class="context-menu-item" @click="$emit('export-as-image')">Xuất thành ảnh</div>
  </div>
</template>

<script>
export default {
  name: 'ContextMenu',
  props: {
    x: Number,
    y: Number,
  },
  emits: ['add-new-table', 'auto-layout', 'clear-selection', 'export-as-image', 'close'],
  mounted() {
    document.addEventListener('click', this.handleClickOutside)
  },
  beforeDestroy() {
    document.removeEventListener('click', this.handleClickOutside)
  },
  methods: {
    handleClickOutside(event) {
      if (!this.$el.contains(event.target)) {
        this.$emit('close')
      }
    },
  },
}
</script>

<style scoped>
.context-menu {
  position: fixed;
  background: white;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  z-index: 1000;
  min-width: 160px;
}

.context-menu-item {
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text);
  transition: background-color 0.2s ease;
}

.context-menu-item:hover {
  background: var(--sunken);
}

.context-menu-item:first-child {
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
}

.context-menu-item:last-child {
  border-radius: 0 0 var(--radius-sm) var(--radius-sm);
}
</style>