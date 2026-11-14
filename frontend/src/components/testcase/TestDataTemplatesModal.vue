<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content large">
      <div class="modal-header">
        <h2>Mẫu dữ liệu kiểm thử</h2>
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

          <div class="templates-content">
            <div class="templates-list">
              <div
                v-for="template in filteredTemplates"
                :key="template.id"
                class="template-card"
                @click="selectTemplate(template)"
              >
                <div class="template-header">
                  <h4 class="template-title">{{ template.title }}</h4>
                  <span class="template-scenarios">{{ template.scenarios.length }} scenarios</span>
                </div>
                <p class="template-description">{{ template.description }}</p>

                <div class="scenarios-preview">
                  <div
                    v-for="(scenario, index) in template.scenarios.slice(0, 2)"
                    :key="index"
                    class="scenario-preview"
                  >
                    <h5 class="scenario-name">{{ scenario.name }}</h5>
                    <div class="scenario-data">
                      <div class="data-preview">
                        <span class="data-label">Đầu vào:</span>
                        <code class="data-code">{{ previewData(scenario.input_payload) }}</code>
                      </div>
                      <div class="data-preview">
                        <span class="data-label">Mong đợi:</span>
                        <code class="data-code">{{ previewData(scenario.expected_output) }}</code>
                      </div>
                    </div>
                  </div>
                  <div v-if="template.scenarios.length > 2" class="more-scenarios">
                    +{{ template.scenarios.length - 2 }} kịch bản khác
                  </div>
                </div>

                <div class="template-tags">
                  <span v-for="tag in template.tags" :key="tag" class="template-tag">
                    {{ tag }}
                  </span>
                </div>
              </div>
            </div>

            <div class="template-preview" v-if="selectedTemplate">
              <h3 class="preview-title">{{ selectedTemplate.title }}</h3>
              <p class="preview-description">{{ selectedTemplate.description }}</p>

              <div class="scenarios-list">
                <div
                  v-for="(scenario, index) in selectedTemplate.scenarios"
                  :key="index"
                  class="scenario-detail"
                >
                  <h4 class="scenario-title">{{ scenario.name }}</h4>

                  <div class="scenario-data-grid">
                    <div class="data-section">
                      <h5 class="data-title">Dữ liệu đầu vào</h5>
                      <pre
                        class="data-json"
                      ><code>{{ JSON.stringify(scenario.input_payload, null, 2) }}</code></pre>
                    </div>

                    <div class="data-section">
                      <h5 class="data-title">Kết quả mong đợi</h5>
                      <pre
                        class="data-json"
                      ><code>{{ JSON.stringify(scenario.expected_output, null, 2) }}</code></pre>
                    </div>
                  </div>

                  <div class="validation-rules" v-if="scenario.validation_rules.length">
                    <h5 class="rules-title">Quy tắc kiểm tra hợp lệ</h5>
                    <ul class="rules-list">
                      <li
                        v-for="(rule, ruleIndex) in scenario.validation_rules"
                        :key="ruleIndex"
                        class="rule-item"
                      >
                        {{ rule }}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="$emit('close')">Huỷ</button>
          <button class="btn btn-primary" @click="applyTemplate" :disabled="!selectedTemplate">
            Dùng mẫu này
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
  name: 'TestDataTemplatesModal',
  emits: ['close', 'apply-template'],
  setup(props, { emit }) {
    const toast = useToast()
    const activeCategory = ref('common')
    const selectedTemplate = ref(null)

    const categories = [
      { id: 'common', name: 'Kịch bản thường gặp' },
      { id: 'auth', name: 'Xác thực' },
      { id: 'api', name: 'Kiểm thử API' },
      { id: 'forms', name: 'Kiểm tra biểu mẫu' },
      { id: 'boundary', name: 'Giá trị biên' },
      { id: 'custom', name: 'Mẫu của tôi' },
    ]

    const templates = ref([
      {
        id: 'user-registration',
        title: 'Kịch bản đăng ký',
        description: 'Dữ liệu kiểm thử đầy đủ cho luồng đăng ký',
        category: 'auth',
        tags: ['authentication', 'registration', 'validation'],
        scenarios: [
          {
            name: 'Đăng ký hợp lệ',
            input_payload: {
              username: 'john_doe',
              email: 'john@example.com',
              password: 'SecurePass123!',
              confirm_password: 'SecurePass123!',
            },
            expected_output: {
              success: true,
              user_id: 12345,
              message: 'Đăng ký thành công',
            },
            validation_rules: [
              'Username must be unique',
              'Email must be valid format',
              'Password must meet complexity requirements',
            ],
          },
          {
            name: 'Trùng tên đăng nhập',
            input_payload: {
              username: 'existing_user',
              email: 'new@example.com',
              password: 'Password123!',
              confirm_password: 'Password123!',
            },
            expected_output: {
              success: false,
              error: 'Tên đăng nhập đã tồn tại',
              error_code: 'USERNAME_TAKEN',
            },
            validation_rules: ['Username uniqueness validation', 'Appropriate error message'],
          },
        ],
      },
      {
        id: 'api-error-cases',
        title: 'Kịch bản lỗi API',
        description: 'Dữ liệu kiểm thử cho các phản hồi lỗi API',
        category: 'api',
        tags: ['api', 'errors', 'http'],
        scenarios: [
          {
            name: 'JSON không hợp lệ',
            input_payload: {
              malformed: 'json{',
            },
            expected_output: {
              error: 'Định dạng JSON không hợp lệ',
              status_code: 400,
            },
            validation_rules: ['Proper error response format', 'Correct HTTP status code'],
          },
          {
            name: 'Thiếu trường bắt buộc',
            input_payload: {
              optional_field: 'value',
            },
            expected_output: {
              error: 'Thiếu trường bắt buộc: username, email',
              status_code: 422,
              missing_fields: ['username', 'email'],
            },
            validation_rules: ['Clear error message', 'List missing fields'],
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

    const previewData = (data) => {
      const str = JSON.stringify(data)
      return str.length > 50 ? str.substring(0, 50) + '...' : str
    }

    const selectTemplate = (template) => {
      selectedTemplate.value = template
    }

    const applyTemplate = () => {
      if (selectedTemplate.value) {
        emit('apply-template', selectedTemplate.value)
        emit('close')
        toast.success('Đã áp dụng mẫu dữ liệu kiểm thử')
      }
    }

    return {
      activeCategory,
      selectedTemplate,
      categories,
      filteredTemplates,
      previewData,
      selectTemplate,
      applyTemplate,
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

.modal-content.large {
  background: white;
  border-radius: var(--radius-field);
  width: 100%;
  max-width: 1000px;
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
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  height: 600px;
}

.templates-content {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 1.5rem;
  height: 100%;
}

.templates-list {
  display: flex;
  flex-direction: column;
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
  border-color: var(--border-strong);
  background: var(--bg);
}

.template-card:active {
  border-color: var(--ink);
  background: var(--bg);
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

.template-scenarios {
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

.scenarios-preview {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.scenario-preview {
  padding: 0.75rem;
  background: var(--bg);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--ink);
}

.scenario-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 0.5rem 0;
}

.scenario-data {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.data-preview {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.75rem;
}

.data-label {
  font-weight: 500;
  color: var(--muted);
  min-width: 50px;
}

.data-code {
  background: var(--sunken);
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-sm);
  color: var(--text);
  font-family: 'Monaco', 'Menlo', monospace;
  flex: 1;
}

.more-scenarios {
  font-size: 0.75rem;
  color: var(--muted);
  text-align: center;
  padding: 0.5rem;
  background: var(--sunken);
  border-radius: var(--radius-sm);
}

.template-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.template-tag {
  font-size: 0.7rem;
  color: var(--text);
  background: var(--sunken);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-field);
}

.template-preview {
  border-left: 1px solid var(--border);
  padding-left: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
}

.preview-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0;
}

.preview-description {
  color: var(--muted);
  line-height: 1.5;
  margin: 0;
}

.scenarios-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.scenario-detail {
  padding: 1.25rem;
  background: var(--bg);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.scenario-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 1rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border);
}

.scenario-data-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.data-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.data-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0;
}

.data-json {
  background: var(--ink);
  color: var(--muted);
  padding: 1rem;
  border-radius: var(--radius-sm);
  overflow-x: auto;
  font-size: 0.75rem;
  line-height: 1.4;
  font-family: 'Monaco', 'Menlo', monospace;
  margin: 0;
}

.validation-rules {
  margin-top: 1rem;
}

.rules-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 0.5rem 0;
}

.rules-list {
  margin: 0;
  padding-left: 1.25rem;
}

.rule-item {
  font-size: 0.875rem;
  color: var(--text);
  line-height: 1.5;
  margin-bottom: 0.25rem;
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

.btn-primary:disabled {
  background: var(--muted);
  border-color: var(--border-strong);
  cursor: not-allowed;
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

.template-categories {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.category-btn {
  padding: 0.75rem 1rem;
  border: none;
  background: var(--sunken);
  border-radius: 999px;
  cursor: pointer;
  color: var(--muted);
  transition: all 0.2s;
  white-space: nowrap;
}

.category-btn:hover {
  background: var(--sunken);
  color: var(--text);
}

.category-btn.active {
  background: var(--ink);
  color: white;
}

@media (max-width: 768px) {
  .templates-content {
    grid-template-columns: 1fr;
  }

  .template-preview {
    border-left: none;
    border-top: 1px solid var(--border);
    padding-left: 0;
    padding-top: 1.5rem;
  }

  .scenario-data-grid {
    grid-template-columns: 1fr;
  }

  .template-categories {
    flex-wrap: wrap;
  }
}
</style>