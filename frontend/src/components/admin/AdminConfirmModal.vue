<template>
  <div class="modal-overlay" @click.self="$emit('cancel')">
    <div class="modal-content confirm-modal">
      <div class="modal-header" :class="type">
        <div class="header-icon">
          <span class="material-symbols-outlined">{{ getIcon() }}</span>
        </div>
        <div class="header-content">
          <h3>{{ title }}</h3>
          <p>{{ message }}</p>
        </div>
        <button class="close-btn" @click="$emit('cancel')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-body">
        <slot>
          <div class="confirmation-content">
            <p class="warning-text" v-if="warning">{{ warning }}</p>
            <div class="input-group" v-if="requiresConfirmation">
              <label :for="inputId">Nhập "{{ confirmationText }}" để xác nhận:</label>
              <input
                :id="inputId"
                type="text"
                v-model="confirmationInput"
                class="form-input"
                :placeholder="`Nhập ${confirmationText}`"
              />
            </div>
          </div>
        </slot>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('cancel')">
          {{ cancelText }}
        </button>
        <button
          class="btn"
          :class="confirmButtonClass"
          @click="handleConfirm"
          :disabled="!isConfirmEnabled"
        >
          <span v-if="loading" class="loading-spinner"></span>
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  confirmText: {
    type: String,
    default: 'Xác nhận',
  },
  cancelText: {
    type: String,
    default: 'Hủy',
  },
  type: {
    type: String,
    default: 'warning',
    validator: (value) => ['info', 'warning', 'danger', 'success'].includes(value),
  },
  requiresConfirmation: {
    type: Boolean,
    default: false,
  },
  confirmationText: {
    type: String,
    default: 'DELETE',
  },
  warning: {
    type: String,
    default: '',
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['confirm', 'cancel'])

const confirmationInput = ref('')
const inputId = `confirm-input-${Math.random().toString(36).substr(2, 9)}`

const isConfirmEnabled = computed(() => {
  if (props.requiresConfirmation) {
    return confirmationInput.value === props.confirmationText
  }
  return true
})

const confirmButtonClass = computed(() => {
  const baseClass =
    {
      'btn-danger': props.type === 'danger',
      'btn-warning': props.type === 'warning',
      'btn-success': props.type === 'success',
      'btn-info': props.type === 'info',
    }[props.type] || 'btn-primary'

  return baseClass
})

const getIcon = () => {
  const icons = {
    info: 'info',
    warning: 'warning',
    danger: 'error',
    success: 'check_circle',
  }
  return icons[props.type] || 'help'
}

const handleConfirm = () => {
  if (isConfirmEnabled.value) {
    emit('confirm')
  }
}
</script>

<style scoped>
/* ======================
   Overlay
   ====================== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.55); /* tối nhẹ cho contrast tốt */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  animation: modal-fade 180ms ease;
}

/* ======================
   Modal shell
   ====================== */
.modal-content.confirm-modal {
  width: 100%;
  max-width: 520px;
  background: var(--surface);
  border-radius: var(--radius-field);
  box-shadow: 0 14px 40px rgba(12, 18, 30, 0.18);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: modal-pop 200ms cubic-bezier(.2,.9,.3,1);
  color: var(--text);
  min-height: 120px;
}

/* ======================
   Header
   ====================== */
.modal-header {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 18px 20px;
  border-bottom: 1px solid rgba(15, 23, 36, 0.06);
  position: relative;
}

/* Icon bubble - small and subtle */
.header-icon {
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: var(--radius-field);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* default neutral look, overridden by type class */
.modal-header.info .header-icon {
  background: linear-gradient(180deg, rgba(238, 249, 255, 0.9), rgba(232, 245, 255, 0.9));
  color: var(--ink);
}
.modal-header.warning .header-icon {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.9), rgba(255, 245, 230, 0.9));
  color: var(--danger);
}
.modal-header.danger .header-icon {
  background: linear-gradient(180deg, rgba(255, 242, 242, 0.95), rgba(255, 235, 235, 0.95));
  color: var(--danger);
}
.modal-header.success .header-icon {
  background: linear-gradient(180deg, rgba(245, 255, 250, 0.95), rgba(235, 255, 240, 0.95));
  color: var(--success);
}

/* Icon size */
.header-icon .material-symbols-outlined {
  font-size: 20px;
}

/* Title + message */
.header-content {
  flex: 1;
  min-width: 0;
}
.header-content h3 {
  margin: 0;
  font-size: 16px;
  line-height: 1.2;
  font-weight: 700;
  color: var(--text);
}
.header-content p {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--text);
  line-height: 1.5;
  overflow-wrap: break-word;
}

/* Close button (top-right) */
.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: transparent;
  border: none;
  padding: 6px;
  border-radius: 999px;
  color: var(--muted);
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease, transform 120ms ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.close-btn .material-symbols-outlined { font-size: 20px; }
.close-btn:hover {
  background: rgba(15, 23, 36, 0.04);
  color: var(--text);
  transform: rotate(20deg);
}

/* ======================
   Body
   ====================== */
.modal-body {
  padding: 20px;
  background: var(--surface);
  color: var(--text);
  font-size: 14px;
  line-height: 1.6;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Warning banner inside body (if present) */
.warning-text {
  display: block;
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  color: var(--danger);
  background: linear-gradient(180deg, rgba(254, 226, 226, 0.8), rgba(255, 245, 245, 0.8));
  border: 1px solid rgba(235, 87, 87, 0.12);
  box-shadow: inset 0 -1px 0 rgba(255,255,255,0.4);
}

/* Confirmation input group */
.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.input-group label {
  font-size: 13px;
  color: var(--text);
  font-weight: 600;
}
.form-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 14px;
  transition: box-shadow 120ms ease, border-color 120ms ease, transform 120ms ease;
  box-shadow: none;
}
.form-input::placeholder { color: var(--muted); }
.form-input:focus {
  outline: none;
  border-color: var(--ink);
  box-shadow: 0 6px 20px rgba(43,111,183,0.08);
  transform: translateY(-1px);
}

/* If you want center alignment of main body text for simple confirmations */
.confirmation-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
}

/* ======================
   Footer (actions)
   ====================== */
.modal-footer {
  display: flex;
  gap: 10px;
  padding: 16px 20px;
  background: linear-gradient(180deg,var(--surface),var(--bg));
  border-top: 1px solid rgba(15, 23, 36, 0.04);
  justify-content: flex-end;
}

/* Button base */
.btn {
  min-width: 90px;
  padding: 10px 16px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid transparent;
  transition: transform 120ms ease, box-shadow 120ms ease, opacity 120ms ease;
}

/* Disabled */
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Variants */
.btn-secondary {
  background: var(--sunken);
  color: var(--text);
  border-color: var(--border);
}
.btn-secondary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(12,18,30,0.06);
}

.btn-primary {
  background: linear-gradient(180deg,var(--ink),var(--ink));
  color: #fff;
  border-color: rgba(0,0,0,0.06);
}
.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(18,48,85,0.12);
}

/* Type-based confirm button classes mapping in component: btn-danger, btn-warning, btn-success, btn-info */
.btn-danger {
  background: linear-gradient(180deg,var(--danger),var(--danger));
  color: #fff;
}
.btn-warning {
  background: linear-gradient(180deg,var(--danger),var(--danger));
  color: #fff;
}
.btn-success {
  background: linear-gradient(180deg,var(--success),var(--success));
  color: #fff;
}
.btn-info {
  background: linear-gradient(180deg,var(--ink),var(--ink));
  color: #fff;
}

/* Hover effects for type buttons */
.btn-danger:hover:not(:disabled),
.btn-warning:hover:not(:disabled),
.btn-success:hover:not(:disabled),
.btn-info:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(12,18,30,0.08);
}

/* Loading spinner inside button */
.loading-spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.35);
  border-top-color: rgba(255,255,255,0.9);
  animation: spinner 800ms linear infinite;
  display: inline-block;
}

/* ======================
   Small screens
   ====================== */
@media (max-width: 520px) {
  .modal-content.confirm-modal { max-width: 96%; border-radius: var(--radius-field); }
  .modal-header { padding: 14px 14px; gap: 12px; }
  .modal-body { padding: 16px; }
  .modal-footer { padding: 12px 14px; flex-direction: column-reverse; gap: 8px; align-items: stretch; }
  .btn { width: 100%; }
  .close-btn { top: 10px; right: 10px; }
  .header-content h3 { font-size: 15px; }
  .header-content p { font-size: 13px; }
}

/* ======================
   Animations & Keyframes
   ====================== */
@keyframes modal-fade {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes modal-pop {
  from { opacity: 0; transform: scale(.98); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes spinner {
  to { transform: rotate(360deg); }
}
</style>

