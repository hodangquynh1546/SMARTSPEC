<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content medium">
      <div class="modal-header">
        <h3><span class="material-symbols-outlined">edit</span> Chỉnh sửa dự án</h3>
        <button class="close-btn" @click="$emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-body">
        <form class="form-grid">
          <div class="form-group">
            <label for="name">Tên dự án</label>
            <input v-model="form.name" id="name" type="text" />
          </div>

          <div class="form-group">
            <label for="description">Mô tả</label>
            <textarea v-model="form.description" id="description" rows="3"></textarea>
          </div>

          <div class="form-group">
            <label for="language">Ngôn ngữ</label>
            <select v-model="form.language" id="language">
              <option value="vi-VN">Tiếng Việt</option>
              <option value="en-US">Tiếng Anh</option>
            </select>
          </div>
        </form>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')">Hủy</button>
        <button class="btn btn-primary" @click="saveEdit">Lưu thay đổi</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue'

const props = defineProps({ project: Object })
const emit = defineEmits(['save', 'close'])

const form = reactive({
  name: '',
  description: '',
  language: '',
})

watch(
  () => props.project,
  (newVal) => {
    if (newVal) Object.assign(form, newVal)
  },
  { immediate: true }
)

const saveEdit = () => {
  console.log('💾 Dự án đã chỉnh sửa:', form)
  alert('✅ Lưu thay đổi thành công!')
  emit('save', { ...form })
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.25s ease;
}

.modal-content {
  background: white;
  border-radius: var(--radius);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  width: 100%;
  display: flex;
  flex-direction: column;
  animation: scaleIn 0.25s ease;
}

.modal-content.medium {
  max-width: 600px;
}

.modal-content.large {
  max-width: 900px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ink);
}

.modal-body {
  padding: 24px;
  background: var(--surface);
  color: var(--text);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border);
  background: var(--bg);
}

.btn {
  padding: 8px 16px;
  border-radius: 999px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-primary {
  background: var(--ink);
  color: #fff;
}

.btn-primary:hover {
  background: var(--ink);
}

.btn-secondary {
  background: var(--sunken);
  color: var(--text);
}

.btn-secondary:hover {
  background: var(--sunken);
}

.btn-icon {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 6px;
  border-radius: var(--radius-sm);
}

.btn-icon:hover {
  background: var(--sunken);
  color: var(--ink);
}

.btn-icon.danger:hover {
  background: var(--border);
  color: var(--danger);
}

.close-btn {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 6px;
  border-radius: 999px;
}

.close-btn:hover {
  background: var(--bg);
  color: var(--ink);
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group label {
  font-weight: 500;
  color: var(--text);
  font-size: 14px;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  font-size: 14px;
  transition: all 0.2s;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  border-color: var(--ink);
  box-shadow: 0 0 0 3px rgba(10, 10, 10, 0.1);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

</style>
