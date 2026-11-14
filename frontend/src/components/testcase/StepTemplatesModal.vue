<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content medium">
      <div class="modal-header">
        <h2>Mẫu bước</h2>
        <button class="btn-close" @click="$emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-body">
        <div class="templates-container">
          <div class="template-categories">
            <button
              v-for="category in categories"
              :key="category.id"
              :class="['category-btn', activeCategory === category.id ? 'active' : '']"
              @click="activeCategory = category.id"
            >
              {{ category.name }}
            </button>
          </div>

          <div class="templates-list">
            <div
              v-for="template in filteredTemplates"
              :key="template.id"
              class="template-card"
              @click="selectTemplate(template)"
            >
              <div class="template-header">
                <h4 class="template-title">{{ template.title }}</h4>
                <span class="template-steps">{{ template.steps.length }} steps</span>
              </div>
              <p class="template-description">{{ template.description }}</p>
              <div class="template-preview">
                <div
                  v-for="(step, index) in template.steps.slice(0, 2)"
                  :key="index"
                  class="preview-step"
                >
                  <span class="step-number">{{ index + 1 }}</span>
                  <span class="step-action">{{ step.action.substring(0, 50) }}...</span>
                </div>
                <div v-if="template.steps.length > 2" class="more-steps">
                  +{{ template.steps.length - 2 }} bước khác
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="$emit('close')">Huỷ</button>
          <button class="btn btn-primary" @click="createCustomTemplate" v-if="customSteps.length">
            Tạo tuỳ chỉnh ({{ customSteps.length }})
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'

export default {
  name: 'StepTemplatesModal',
  emits: ['close', 'apply-template'],
  setup(props, { emit }) {
    const toast = useToast()
    const activeCategory = ref('common')
    const customSteps = ref([])

    const categories = [
      { id: 'common', name: 'Luồng thường gặp' },
      { id: 'auth', name: 'Xác thực' },
      { id: 'crud', name: 'Thao tác CRUD' },
      { id: 'api', name: 'Kiểm thử API' },
      { id: 'ui', name: 'Kiểm thử giao diện' },
      { id: 'custom', name: 'Mẫu của tôi' },
    ]

    const templates = ref([
      {
        id: 'login-flow',
        title: 'Luồng đăng nhập',
        description: 'Quy trình xác thực người dùng chuẩn',
        category: 'auth',
        steps: [
          {
            step_number: 1,
            action: 'Mở trang đăng nhập',
            input_data: { url: '/login' },
            expected_immediate_result: 'Trang đăng nhập tải thành công',
          },
          {
            step_number: 2,
            action: 'Nhập tên đăng nhập và mật khẩu',
            input_data: { username: 'testuser', password: 'testpass123' },
            expected_immediate_result: 'Thông tin đã được nhập vào biểu mẫu',
          },
          {
            step_number: 3,
            action: 'Bấm nút đăng nhập',
            input_data: { element: 'login-btn' },
            expected_immediate_result: 'Yêu cầu đăng nhập đã gửi tới máy chủ',
          },
          {
            step_number: 4,
            action: 'Xác nhận đăng nhập thành công',
            input_data: { expected_url: '/dashboard' },
            expected_immediate_result: 'Người dùng được chuyển tới trang chủ',
          },
        ],
      },
      {
        id: 'create-record',
        title: 'Tạo bản ghi mới',
        description: 'Tạo một bản ghi mới trong hệ thống',
        category: 'crud',
        steps: [
          {
            step_number: 1,
            action: 'Mở biểu mẫu tạo mới',
            input_data: { url: '/create' },
            expected_immediate_result: 'Biểu mẫu tạo mới tải thành công',
          },
          {
            step_number: 2,
            action: 'Điền các trường bắt buộc',
            input_data: { field1: 'value1', field2: 'value2' },
            expected_immediate_result: 'Đã điền đủ trường bắt buộc',
          },
          {
            step_number: 3,
            action: 'Gửi biểu mẫu',
            input_data: { element: 'submit-btn' },
            expected_immediate_result: 'Dữ liệu biểu mẫu đã gửi tới máy chủ',
          },
          {
            step_number: 4,
            action: 'Xác nhận bản ghi đã tạo',
            input_data: { expected_message: 'Tạo bản ghi thành công' },
            expected_immediate_result: 'Hiển thị thông báo thành công',
          },
        ],
      },
    ])

    const filteredTemplates = computed(() => {
      if (activeCategory.value === 'custom') {
        return []
      }
      return templates.value.filter((template) => template.category === activeCategory.value)
    })

    const selectTemplate = (template) => {
      emit('apply-template', template)
      emit('close')
    }

    const createCustomTemplate = () => {
      toast.info('Tính năng tạo mẫu tuỳ chỉnh sắp ra mắt')
    }

    return {
      activeCategory,
      categories,
      filteredTemplates,
      customSteps,
      selectTemplate,
      createCustomTemplate,
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
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content.medium {
  background: white;
  border-radius: var(--radius-field);
  width: 100%;
  max-width: 800px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal-header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg);
  position: sticky;
  top: 0;
  z-index: 10;
}

.modal-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0;
}

.btn-close {
  padding: 0.5rem;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  background: var(--sunken);
  color: var(--text);
}

.modal-body {
  padding: 2rem;
}

.templates-container {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 1.5rem;
  height: 500px;
}

.template-categories {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border-right: 1px solid var(--border);
  padding-right: 1rem;
}

.category-btn {
  padding: 0.75rem 1rem;
  border: none;
  background: transparent;
  border-radius: 999px;
  text-align: left;
  cursor: pointer;
  color: var(--muted);
  transition: all 0.2s;
}

.category-btn:hover {
  background: var(--sunken);
  color: var(--text);
}

.category-btn.active {
  background: var(--ink);
  color: white;
}

.templates-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  overflow-y: auto;
}

.template-card {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.template-card:hover {
  border-color: var(--ink);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.template-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0;
}

.template-steps {
  font-size: 0.75rem;
  color: var(--muted);
  background: var(--sunken);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-field);
}

.template-description {
  color: var(--muted);
  margin-bottom: 1rem;
  line-height: 1.5;
}

.template-preview {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.preview-step {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.5rem;
  background: var(--bg);
  border-radius: var(--radius-sm);
}

.step-number {
  background: var(--ink);
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}

.step-action {
  font-size: 0.875rem;
  color: var(--text);
  line-height: 1.4;
}

.more-steps {
  font-size: 0.75rem;
  color: var(--muted);
  text-align: center;
  padding: 0.5rem;
  background: var(--sunken);
  border-radius: var(--radius-sm);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: 1px solid;
  border-radius: 999px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--ink);
  border-color: var(--ink);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--ink);
  border-color: var(--ink);
}

.btn-secondary {
  background: white;
  border-color: var(--border-strong);
  color: var(--text);
}

.btn-secondary:hover {
  background: var(--bg);
  border-color: var(--border-strong);
}

@media (max-width: 768px) {
  .templates-container {
    grid-template-columns: 1fr;
    height: auto;
  }

  .template-categories {
    border-right: none;
    border-bottom: 1px solid var(--border);
    padding-right: 0;
    padding-bottom: 1rem;
    flex-direction: row;
    overflow-x: auto;
  }

  .category-btn {
    white-space: nowrap;
  }
}
</style>