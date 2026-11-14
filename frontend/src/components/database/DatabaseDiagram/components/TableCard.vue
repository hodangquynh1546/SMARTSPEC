<template>
  <div
    class="table-card"
    :class="tableClasses"
    :style="tableStyles"
    @mouseenter="$emit('mouseenter', $event)"
    @mouseleave="$emit('mouseleave', $event)"
    @mousedown="$emit('mousedown', $event)"
    @click="$emit('click', $event)"
    @dblclick="$emit('dblclick', $event)"
  >
    <div class="table-header">
      <h4>{{ table.name }}</h4>
      <div class="table-actions">
        <button class="btn-icon" @click="$emit('view')" title="View Details">
          <span class="material-symbols-outlined">visibility</span>
        </button>
        <button class="btn-icon" @click="$emit('edit')" title="Edit">
          <span class="material-symbols-outlined">edit</span>
        </button>
        <button class="btn-icon danger" @click.stop="$emit('delete')" title="Delete">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    </div>

    <div class="table-description" v-if="table.description">
      {{ table.description }}
    </div>

    <div class="table-columns">
      <div
        v-for="column in table.columns || []"
        :key="column.name"
        class="table-column"
        :class="{
          primary: column.is_primary_key,
          foreign: column.is_foreign_key,
          'column-highlighted': isColumnHighlighted(column),
        }"
        @mouseenter="$emit('column-hover', column, table)"
        @mouseleave="$emit('column-leave')"
      >
        <span class="column-name">{{ column.name }}</span>
        <span class="column-type">
          {{ column.type }}
          <span v-if="column.length">({{ column.length }})</span>
        </span>
        <div class="column-badges">
          <span v-if="column.is_primary_key" class="column-badge pk">PK</span>
          <span v-if="column.is_foreign_key" class="column-badge fk">FK</span>
          <span v-if="!column.nullable" class="column-badge nn">NN</span>
          <span v-if="column.unique" class="column-badge uq">UQ</span>
        </div>
      </div>
    </div>

    <!-- Table Connection Points -->
    <div class="connection-points">
      <div class="connection-point top" data-side="top"></div>
      <div class="connection-point right" data-side="right"></div>
      <div class="connection-point bottom" data-side="bottom"></div>
      <div class="connection-point left" data-side="left"></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TableCard',
  props: {
    table: Object,
    isHighlighted: Boolean,
    isSelected: Boolean,
    isDragging: Boolean,
    isDimmed: Boolean,
    isUnrelated: Boolean,
    isHovered: Boolean,
    zIndex: Number,
    highlightedColumn: Object,
  },
  emits: [
    'mouseenter',
    'mouseleave',
    'mousedown',
    'click',
    'dblclick',
    'view',
    'edit',
    'delete',
    'column-hover',
    'column-leave',
  ],
  computed: {
    tableClasses() {
      return {
        'table-highlighted': this.isHighlighted,
        'table-selected': this.isSelected,
        'table-dragging': this.isDragging,
        'table-dimmed': this.isDimmed,
        'table-unrelated': this.isUnrelated,
        'table-hovered': this.isHovered,
      }
    },
    tableStyles() {
      return {
        top: (this.table.position?.y || 0) + 'px',
        left: (this.table.position?.x || 0) + 'px',
        zIndex: this.zIndex,
      }
    },
  },
  methods: {
    isColumnHighlighted(column) {
      if (!this.highlightedColumn) return false
      return this.highlightedColumn.column === column && this.highlightedColumn.table === this.table
    },
  },
}
</script>

<style scoped>
.table-card {
  position: absolute;
  width: 320px;
  min-height: 200px;
  max-height: 500px;
  background: white;
  border: 2px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: grab;
  overflow: hidden;
  user-select: none;
  z-index: 10;
  backdrop-filter: blur(10px);
}

.table-card.column-highlighted {
  background: transparent !important;
  backdrop-filter: blur(30px);
  border-color: rgba(59, 130, 246, 0.5);
}

.table-card:hover {
  min-height: unset;
  max-height: unset;
}

/* Tùy chỉnh thanh cuộn */
.table-card::-webkit-scrollbar {
  width: 1px;
}

.table-card::-webkit-scrollbar-thumb {
  background-color: var(--muted);
  border-radius: var(--radius-field);
}

.table-card::-webkit-scrollbar-thumb:hover {
  background-color: var(--muted);
}

.table-card::-webkit-scrollbar-track {
  background: var(--sunken);
  border-radius: var(--radius-field);
}

.table-card:hover {
  border-color: var(--ink);
  box-shadow: 0 12px 40px rgba(26, 54, 93, 0.15), 0 4px 16px rgba(0, 0, 0, 0.1);
  transform: translateY(-6px) scale(1.03);
  z-index: 100;
}

.table-card.table-unrelated {
  opacity: 0.4;
  filter: grayscale(70%) blur(0.5px);
  transform: scale(0.92);
  transition: all 0.4s ease;
}

.table-card.table-unrelated:hover {
  opacity: 1;
  filter: grayscale(0%) blur(0px);
  transform: scale(0.95);
  z-index: 90;
}

.table-card.table-highlighted {
  border-color: var(--ink);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.8), 0 6px 20px -6px rgba(59, 130, 246, 0.3);
  z-index: 80;
}

.table-card.table-selected {
  border-color: var(--ink);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.4), 0 8px 25px -8px rgba(37, 99, 235, 0.2);
  z-index: 85;
}

.table-card.table-dragging {
  cursor: grabbing;
  box-shadow: 0 15px 40px -12px rgba(0, 0, 0, 0.25), 0 0 0 2px rgba(59, 130, 246, 0.8);
  transform: rotate(1deg) scale(1.03);
  z-index: 1000;
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: linear-gradient(135deg, var(--ink) 0%, var(--ink) 100%);
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius) var(--radius) 0 0;
  position: relative;
  overflow: hidden;
}

.table-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transition: left 0.5s;
}

.table-card:hover .table-header::before {
  left: 100%;
}

.table-header h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: white;
  letter-spacing: -0.01em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-header h4::before {
  content: 'table';
  font-family: 'Material Symbols Outlined';
  font-size: 18px;
  font-weight: normal;
  opacity: 0.9;
}

.table-actions {
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateX(10px);
}

.table-card:hover .table-actions {
  opacity: 1;
  transform: translateX(0);
}

.btn-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-sm);
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
}

.btn-icon:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.btn-icon.danger:hover {
  background: rgba(239, 68, 68, 0.3);
  border-color: rgba(239, 68, 68, 0.5);
}

.btn-icon .material-symbols-outlined {
  font-size: 16px;
}

.table-description {
  padding: 10px 18px;
  font-size: 12px;
  color: var(--muted);
  border-bottom: 1px solid var(--border);
  background: linear-gradient(135deg, var(--bg) 0%, var(--sunken) 100%);
  font-style: italic;
  line-height: 1.5;
}

.table-columns {
  min-height: 300px;
}

.table-column {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px;
  border-bottom: 1px solid var(--border);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.table-column::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: transparent;
  transition: background 0.2s ease;
}

.table-column:hover {
  background: linear-gradient(135deg, var(--bg) 0%, var(--sunken) 100%);
  padding-left: 22px;
}

.table-column:hover::before {
  background: linear-gradient(135deg, var(--ink) 0%, var(--ink) 100%);
}

.table-column.column-highlighted {
  background: linear-gradient(135deg, var(--sunken) 0%, var(--ink-soft) 100%);
  border-left: 3px solid var(--ink);
  padding-left: 22px;
}

.column-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  flex: 1;
}

.column-type {
  font-size: 12px;
  color: var(--muted);
  margin-right: 8px;
}

.column-badges {
  display: flex;
  gap: 4px;
}

.column-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.column-badge:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.column-badge.pk {
  background: linear-gradient(135deg, var(--danger) 0%, var(--danger) 100%);
}

.column-badge.fk {
  background: linear-gradient(135deg, var(--ink) 0%, var(--ink) 100%);
}

.column-badge.nn {
  background: linear-gradient(135deg, var(--warning) 0%, var(--danger) 100%);
}

.column-badge.uq {
  background: linear-gradient(135deg, var(--success) 0%, var(--success) 100%);
}

/* Connection Points */
.connection-points {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.connection-point {
  position: absolute;
  width: 12px;
  height: 12px;
  background: var(--ink);
  border: 2px solid white;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: all;
  cursor: crosshair;
}

.connection-point.top {
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
}

.connection-point.right {
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
}

.connection-point.bottom {
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
}

.connection-point.left {
  left: -6px;
  top: 50%;
  transform: translateY(-50%);
}

.table-card:hover .connection-point {
  opacity: 1;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .table-card {
    background: var(--ink);
    border-color: var(--ink);
    color: var(--muted);
  }

  .table-header {
    background: var(--ink);
    border-color: var(--ink);
    color: var(--muted);
  }

  .table-header h4 {
    color: var(--muted);
  }

  .table-description {
    background: var(--ink);
    border-color: var(--ink);
    color: var(--muted);
  }

  .table-column {
    border-color: var(--ink);
    color: var(--muted);
  }

  .table-column:hover {
    background: var(--ink);
  }

  .column-name {
    color: var(--muted);
  }

  .column-type {
    color: var(--muted);
  }
}

/* Thêm style cho table được highlight */
.table-card.table-highlighted {
  border-color: var(--ink) !important;
  box-shadow: 0 0 0 12px rgba(244, 11, 3, 0.4), 0 8px 25px -8px rgba(64, 102, 163, 0.3) !important;
  z-index: 80;
  transform: scale(1.08);
  transition: all 0.3s ease;
}

/* Column highlight */
.table-column.column-highlighted {
  background: var(--sunken) !important;
  border-left: 3px solid var(--ink);
}

.table-column.primary.column-highlighted {
  background: var(--sunken);
  border-left: 3px solid var(--danger);
}

.table-column.foreign.column-highlighted {
  background: var(--sunken);
  border-left: 3px solid var(--ink);
}
</style>