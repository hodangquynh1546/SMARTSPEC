<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="export-progress-modal">
      <div class="modal-header">
        <h3>{{ progress.title }}</h3>
        <button
          class="btn-icon"
          @click="$emit('cancel')"
          :disabled="progress.status === 'exporting'"
        >
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-content">
        <!-- Progress Bar -->
        <div class="progress-section">
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: `${progress.progress}%` }"
              :class="progress.status"
            ></div>
          </div>
          <div class="progress-info">
            <span class="progress-text">{{ getStatusText() }}</span>
            <span class="progress-percentage">{{ progress.progress }}%</span>
          </div>
        </div>

        <!-- Status Messages -->
        <div class="status-section">
          <div class="status-item" :class="{ active: progress.status === 'preparing' }">
            <span class="status-icon">
              <span class="material-symbols-outlined" v-if="progress.status === 'preparing'">
                hourglass_empty
              </span>
              <span class="material-symbols-outlined" v-else-if="progress.status === 'exporting'">
                autorenew
              </span>
              <span class="material-symbols-outlined" v-else-if="progress.status === 'completed'">
                check_circle
              </span>
              <span class="material-symbols-outlined" v-else-if="progress.status === 'error'">
                error
              </span>
              <span class="material-symbols-outlined" v-else> pending </span>
            </span>
            <div class="status-info">
              <span class="status-title">{{ getStatusTitle() }}</span>
              <span class="status-description">{{ getStatusDescription() }}</span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="action-section">
          <button
            v-if="progress.status === 'exporting'"
            class="btn-secondary"
            @click="$emit('cancel')"
          >
            <span class="material-symbols-outlined">cancel</span>
            Huỷ xuất
          </button>
          <button
            v-else-if="progress.status === 'completed'"
            class="btn-primary"
            @click="$emit('close')"
          >
            <span class="material-symbols-outlined">check</span>
            Xong
          </button>
          <button
            v-else-if="progress.status === 'error'"
            class="btn-primary"
            @click="$emit('retry')"
          >
            <span class="material-symbols-outlined">refresh</span>
            Thử lại
          </button>
          <button v-else class="btn-secondary" @click="$emit('close')">
            <span class="material-symbols-outlined">close</span>
            Đóng
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ExportProgressModal',
  props: {
    progress: {
      type: Object,
      required: true,
      default: () => ({
        show: false,
        title: '',
        progress: 0,
        status: 'idle', // 'preparing', 'exporting', 'completed', 'error'
      }),
    },
  },
  emits: ['close', 'cancel', 'retry'],
  setup(props) {
    const getStatusText = () => {
      const statusMap = {
        preparing: 'Preparing export...',
        exporting: 'Exporting data...',
        completed: 'Xuất hoàn tất!',
        error: 'Xuất thất bại',
        idle: 'Sẵn sàng xuất',
      }
      return statusMap[props.progress.status] || 'Đang xử lý...'
    }

    const getStatusTitle = () => {
      const titleMap = {
        preparing: 'Đang chuẩn bị dữ liệu',
        exporting: 'Đang tạo báo cáo',
        completed: 'Xuất hoàn tất',
        error: 'Xuất thất bại',
        idle: 'Ready',
      }
      return titleMap[props.progress.status] || 'Processing'
    }

    const getStatusDescription = () => {
      const descMap = {
        preparing: 'Collecting and formatting test case data...',
        exporting: 'Creating Excel file with multiple sheets...',
        completed: 'Your report has been successfully generated and downloaded.',
        error: 'An error occurred during export. Please try again.',
        idle: 'Click export to begin the process.',
      }
      return descMap[props.progress.status] || 'Processing your request...'
    }

    return {
      getStatusText,
      getStatusTitle,
      getStatusDescription,
    }
  },
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.export-progress-modal {
  background: white;
  border-radius: var(--radius);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.75rem 2rem;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.modal-header h3 {
  font-size: 1.5rem;
  font-weight: 700;
  background: var(--ink);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  letter-spacing: -0.02em;
}

.modal-content {
  padding: 1.5rem;
}

.progress-section {
  margin-bottom: 2rem;
}

.progress-bar {
  width: 100%;
  height: 10px;
  background: var(--sunken);
  border-radius: var(--radius-sm);
  overflow: hidden;
  margin-bottom: 0.5rem;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
}

.progress-fill {
  height: 100%;
  background: var(--ink);
  border-radius: var(--radius-sm);
  transition: width 0.3s ease;
  box-shadow: 0 1px 3px rgba(10, 10, 10, 0.3);
  position: relative;
  overflow: hidden;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.progress-fill.preparing {
  background: var(--warning);
}

.progress-fill.exporting {
  background: var(--ink);
  animation: pulse 2s infinite;
}

.progress-fill.completed {
  background: var(--success);
}

.progress-fill.error {
  background: var(--danger);
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.progress-percentage {
  font-size: 0.875rem;
  color: var(--text-primary);
  font-weight: 600;
}

.status-section {
  margin-bottom: 2rem;
}

.status-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.25rem;
  border: 2px solid var(--border);
  border-radius: var(--radius-field);
  background: var(--bg);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.status-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, transparent, rgba(10, 10, 10, 0.3), transparent);
  transform: translateX(-100%);
  transition: transform 0.5s ease;
}

.status-item.active::before {
  transform: translateX(100%);
}

.status-item.active {
  border-color: var(--ink);
  background: var(--sunken);
  box-shadow: 0 4px 12px rgba(10, 10, 10, 0.15);
  transform: translateY(-2px);
}

.status-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-field);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ink);
  color: white;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(10, 10, 10, 0.25);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.status-icon::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, transparent 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.status-item:hover .status-icon {
  transform: scale(1.1) rotate(5deg);
  box-shadow: var(--shadow);
}

.status-item:hover .status-icon::before {
  opacity: 1;
}

.status-item.preparing .status-icon {
  background: var(--warning);
}

.status-item.exporting .status-icon {
  background: var(--ink);
}

.status-item.completed .status-icon {
  background: var(--success);
}

.status-item.error .status-icon {
  background: var(--danger);
}

.status-info {
  flex: 1;
}

.status-title {
  display: block;
  font-weight: 700;
  background: var(--ink);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.25rem;
  font-size: 1rem;
}

.status-description {
  display: block;
  font-size: 0.875rem;
  color: var(--muted);
  line-height: 1.5;
}

.action-section {
  display: flex;
  justify-content: center;
}

.action-section .btn-primary,
.action-section .btn-secondary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 999px;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.action-section .btn-primary {
  background: var(--ink);
  color: white;
  box-shadow: 0 4px 12px rgba(10, 10, 10, 0.25);
}

.action-section .btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}

.action-section .btn-secondary {
  background: white;
  border: 1.5px solid var(--border);
  color: var(--ink);
}

.action-section .btn-secondary:hover {
  background: var(--bg);
  border-color: var(--ink);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(10, 10, 10, 0.15);
}

@media (max-width: 768px) {
  .export-progress-modal {
    width: 95%;
    margin: 1rem;
  }

  .modal-header,
  .modal-content {
    padding: 1rem;
  }

  .status-item {
    flex-direction: column;
    text-align: center;
    gap: 0.75rem;
  }

  .status-icon {
    align-self: center;
  }
}
</style>