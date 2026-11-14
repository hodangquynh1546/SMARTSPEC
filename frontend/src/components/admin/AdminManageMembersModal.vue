<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content large">
      <div class="modal-header">
        <h3><span class="material-symbols-outlined">group</span> Quản lý thành viên</h3>
        <button class="close-btn" @click="$emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-body">
        <div v-if="project.members.length" class="members-list">
          <div v-for="member in project.members" :key="member.user_id" class="member-card">
            <div class="avatar">
              <img :src="member.avatar_url || defaultAvatar" alt="avatar" />
            </div>
            <div class="info">
              <h4>{{ member.name }}</h4>
              <p>{{ member.role }}</p>
            </div>
            <div class="actions">
              <button class="btn-icon" title="Thay đổi quyền" @click="toggleRole(member)">
                <span class="material-symbols-outlined">manage_accounts</span>
              </button>
              <button
                class="btn-icon danger"
                title="Xóa thành viên"
                @click="removeMember(member)"
              >
                <span class="material-symbols-outlined">person_remove</span>
              </button>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <p>Chưa có thành viên nào trong dự án này.</p>
        </div>

        <div class="add-member-section">
          <input v-model="newMemberName" placeholder="Nhập tên thành viên mới..." />
          <button class="btn btn-primary" @click="addMember">
            <span class="material-symbols-outlined">person_add</span>
            Thêm thành viên
          </button>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')">Đóng</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
const emit = defineEmits(['close', 'update'])
const defaultAvatar =
  'https://static.vecteezy.com/system/resources/previews/024/983/914/original/simple-user-default-icon-free-png.png'

const project = reactive({
  id: 1,
  name: 'Dự án quản lý mock',
  members: [
    { user_id: 1, name: 'Nguyễn Văn A', role: 'admin', avatar_url: null },
    { user_id: 2, name: 'Trần Thị B', role: 'editor', avatar_url: null },
  ],
})

const newMemberName = ref('')

const addMember = () => {
  if (!newMemberName.value.trim()) return alert('⚠️ Nhập tên thành viên!')
  project.members.push({
    user_id: Date.now(),
    name: newMemberName.value,
    role: 'viewer',
    avatar_url: null,
  })
  console.log('👤 Thêm thành viên:', newMemberName.value)
  alert('✅ Đã thêm thành viên!')
  newMemberName.value = ''
  emit('update', project.members)
}

const removeMember = (member) => {
  if (confirm(`Bạn có chắc muốn xóa ${member.name}?`)) {
    project.members = project.members.filter((m) => m.user_id !== member.user_id)
    console.log('🗑️ Xóa thành viên:', member)
    alert('✅ Đã xóa thành viên!')
    emit('update', project.members)
  }
}

const toggleRole = (member) => {
  member.role = member.role === 'admin' ? 'viewer' : 'admin'
  console.log('🔄 Thay đổi quyền:', member)
  alert(`✅ ${member.name} bây giờ là ${member.role}`)
  emit('update', project.members)
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

.members-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.empty-state {
  text-align: center;
  color: var(--muted);
  font-size: 14px;
  padding: 16px;
  background: var(--bg);
  border-radius: var(--radius-sm);
}
.member-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
}
.member-card .avatar img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}
.member-card .info h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}
.member-card .info p {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}
.add-member-section {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}
.add-member-section input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
}
</style>
