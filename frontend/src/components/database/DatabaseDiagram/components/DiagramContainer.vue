<template>
  <div
    class="diagram-container"
    :style="{ width: width + 'px', height: height + 'px' }"
    @wheel="$emit('wheel', $event)"
    @mousedown="$emit('mousedown', $event)"
    @mousemove="$emit('mousemove', $event)"
    @mouseup="$emit('mouseup', $event)"
    @mouseleave="$emit('mouseleave', $event)"
    @contextmenu.prevent="$emit('contextmenu', $event)"
    ref="container"
  >
    <!-- Grid Background -->
    <div v-if="showGrid" class="grid-background" :style="gridStyle"></div>

    <slot></slot>
  </div>
</template>

<script>
export default {
  name: 'DiagramContainer',
  props: {
    width: Number,
    height: Number,
    showGrid: Boolean,
    gridStyle: Object,
    zoomLevel: Number,
    diagramOffset: Object,
  },
  emits: ['wheel', 'mousedown', 'mousemove', 'mouseup', 'mouseleave', 'contextmenu'],
  mounted() {
    this.$el.style.cursor = 'grab'
  },
}
</script>

<style scoped>
.diagram-container {
  position: relative;
  overflow: auto;
  background: linear-gradient(135deg, var(--sunken) 0%, var(--sunken) 50%, var(--sunken) 100%);
  background-size: 100% 100%;
  cursor: grab;
}

.diagram-container.panning {
  cursor: grabbing;
}

.diagram-container:active {
  cursor: grabbing;
}

.grid-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  opacity: 0.4;
  background-image: 
    linear-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.1) 1px, transparent 1px);
  background-size: 20px 20px;
  animation: gridMove 20s linear infinite;
}

@keyframes gridMove {
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 20px 20px;
  }
}

/* Scrollbar Styling */
.diagram-container::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

.diagram-container::-webkit-scrollbar-track {
  background: var(--sunken);
  border-radius: var(--radius-sm);
}

.diagram-container::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: var(--radius-sm);
  border: 2px solid var(--border);
}

.diagram-container::-webkit-scrollbar-thumb:hover {
  background: var(--muted);
}
</style>