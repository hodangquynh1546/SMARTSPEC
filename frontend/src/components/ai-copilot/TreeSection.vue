<template>
  <div class="tree-section">
    <div class="section-header" @click="expanded = !expanded">
      <span class="icon">{{ icon }}</span>
      <span class="title">{{ title }}</span>
      <span class="count">({{ items.length }})</span>
      <span class="expand-icon">{{ expanded ? '▼' : '▶' }}</span>
    </div>

    <div v-if="expanded" class="section-items">
      <div
        v-for="item in items"
        :key="item._id || item.id"
        class="tree-item"
        :class="{ 'selected': selectedId === (item._id || item.id) }"
        @click="handleSelect(item)"
        draggable="true"
        @dragstart="handleDragStart(item, $event)"
      >
        <span class="item-icon">📄</span>
        <span class="item-name">{{ item.name || item.title || `${itemType}-${item._id || item.id}` }}</span>
        <div class="item-actions">
          <button 
            class="action-btn edit-btn"
            @click.stop="handleEdit(item)"
            title="Sửa"
          >
            ✏️
          </button>
          <button 
            class="action-btn delete-btn"
            @click.stop="handleDelete(item)"
            title="Xoá"
          >
            🗑️
          </button>
        </div>
      </div>
      
      <button 
        class="add-item-btn"
        @click="handleAdd"
        title="Thêm mục mới"
      >
        + Thêm {{ title.slice(0, -1) }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  title: String,
  items: Array,
  itemType: String,
  icon: String
})

const emit = defineEmits(['select', 'drag-start', 'create', 'update', 'delete'])

const expanded = ref(true)
const selectedId = ref(null)

const handleSelect = (item) => {
  selectedId.value = item._id || item.id
  emit('select', item, props.itemType)
}

const handleDragStart = (item, event) => {
  selectedId.value = item._id || item.id
  event.dataTransfer.effectAllowed = 'copy'
  event.dataTransfer.setData('application/json', JSON.stringify({
    type: props.itemType,
    item: item
  }))
  emit('drag-start', item, props.itemType)
}

const handleEdit = (item) => {
  emit('select', item, props.itemType)
}

const handleDelete = async (item) => {
  if (confirm(`Bạn có chắc muốn xoá ${props.itemType} này?`)) {
    emit('delete', props.itemType, item._id || item.id)
  }
}

const handleAdd = () => {
  emit('create', props.itemType, {})
}
</script>

<style scoped>
.tree-section {
  margin-bottom: 8px;
}

.section-header {
  display: flex;
  align-items: center;
  padding: 8px;
  cursor: pointer;
  user-select: none;
  border-radius: var(--radius-sm);
  transition: background 0.2s;
}

.section-header:hover {
  background: var(--ink);
}

.icon {
  margin-right: 6px;
  font-size: 14px;
}

.title {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: var(--muted);
}

.count {
  font-size: 11px;
  color: var(--muted);
  margin-right: 8px;
}

.expand-icon {
  font-size: 10px;
  color: var(--muted);
}

.section-items {
  margin-left: 16px;
  margin-top: 4px;
}

.tree-item {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  margin-bottom: 2px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.2s;
  position: relative;
}

.tree-item:hover {
  background: var(--ink);
}

.tree-item:hover .item-actions {
  opacity: 1;
}

.tree-item.selected {
  background: var(--ink);
}

.item-icon {
  margin-right: 6px;
  font-size: 12px;
}

.item-name {
  flex: 1;
  font-size: 12px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  font-size: 12px;
  border-radius: 999px;
  transition: background 0.2s;
}

.action-btn:hover {
  background: var(--ink);
}

.add-item-btn {
  width: 100%;
  padding: 6px;
  margin-top: 4px;
  background: var(--ink);
  border: none;
  border-radius: 999px;
  color: #ffffff;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.2s;
}

.add-item-btn:hover {
  background: var(--ink);
}
</style>

