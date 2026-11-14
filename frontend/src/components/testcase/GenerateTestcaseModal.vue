<template>
  <div class="modal-overlay" @click.self="handleClose">
    <div class="modal-content large">
      <div class="modal-header">
        <h2>Sinh test case</h2>
        <button class="btn-close" @click="handleClose">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-body">
        <!-- Requirements Selection -->
        <div class="selection-section">
          <h3 class="section-title">Chọn yêu cầu</h3>
          <p class="section-subtitle">Chọn yêu cầu để sinh test case</p>

          <div class="selection-container">
            <div class="selection-header">
              <div class="selection-info">
                <span class="selected-count">{{ selectedRequirements.length }} đã chọn</span>
                <span class="total-count">{{ filteredRequirements.length }} / {{ requirements.length }} tổng</span>
              </div>
              <div class="selection-actions">
                <button
                  class="btn btn-sm btn-secondary"
                  @click="selectAll"
                  :disabled="requirements.length === 0"
                >
                  Chọn tất cả
                </button>
                <button class="btn btn-sm btn-secondary" @click="clearSelection">Bỏ tất cả</button>
              </div>
            </div>

            <!-- Search Box -->
            <div class="search-box">
              <span class="material-symbols-outlined search-icon">search</span>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Tìm yêu cầu theo tên hoặc mục tiêu..."
                class="search-input"
                @input="handleSearch"
              />
              <button
                v-if="searchQuery"
                class="clear-search-btn"
                @click="clearSearch"
                title="Xoá tìm kiếm"
              >
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <div class="selection-list">
              <div
                v-for="requirement in filteredRequirements"
                :key="getRequirementId(requirement)"
                class="selection-item"
                :class="{ selected: isRequirementSelected(requirement) }"
                @click="toggleRequirement(requirement)"
              >
                <input
                  type="checkbox"
                  :checked="isRequirementSelected(requirement)"
                  @change="toggleRequirement(requirement)"
                />
                <div class="item-content">
                  <h4 class="item-title">{{ requirement.name }}</h4>
                  <p class="item-description">{{ requirement.goal }}</p>
                </div>
              </div>

              <div v-if="requirements.length === 0" class="empty-selection">
                <span class="material-symbols-outlined">list_alt</span>
                <p>Phiên bản này chưa có yêu cầu</p>
                <p class="empty-hint">Hãy tạo yêu cầu trước</p>
              </div>
              <div v-else-if="filteredRequirements.length === 0" class="empty-selection">
                <span class="material-symbols-outlined">search_off</span>
                <p>Không có yêu cầu nào khớp "{{ searchQuery }}"</p>
                <p class="empty-hint">Hãy thử từ khoá khác</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Configuration Options -->
        <div class="configuration-section">
          <h3 class="section-title">Tuỳ chọn sinh</h3>

          <div class="configuration-grid">
            <div class="form-group">
              <label class="form-label">Loại kiểm thử</label>
              <select v-model="configuration.testType" class="form-select">
                <option value="all">Tất cả loại</option>
                <!-- <option value="unit">Đơn vị</option> -->
                <option value="integration">Tích hợp</option>
                <option value="api">API</option>
                <option value="ui">UI</option>
                <option value="performance">Hiệu năng</option>
                <option value="security">Bảo mật</option>
              </select>
            </div>

            <!-- Language is automatically set from project settings -->

            <div class="form-group">
              <label class="form-label">Mức ưu tiên</label>
              <select v-model="configuration.priority" class="form-select">
                <option value="auto">Tự nhận diện</option>
                <option value="critical">Nghiêm trọng</option>
                <option value="high">Cao</option>
                <option value="medium">Trung bình</option>
                <option value="low">Thấp</option>
              </select>
            </div>
          </div>
        </div>

        <!-- ✅ BỎ: Draft Management và Preview Section - không cần nữa vì save trực tiếp -->

        <!-- Actions -->
        <div class="action-section">
          <div class="action-buttons">
            <button class="btn btn-secondary" @click="handleClose">Huỷ</button>

            <div class="primary-actions">
              <button
                class="btn btn-primary"
                @click="generateTestCases"
                :disabled="selectedRequirements.length === 0"
              >
                Sinh & lưu test case ({{ selectedRequirements.length }})
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- ✅ BỎ: Custom Confirmation Modal - không cần nữa -->
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useToast } from 'vue-toastification'
import { testcaseApi } from '@/api/testcase'

export default {
  name: 'GenerateTestcaseModal',
  props: {
    projectId: String,
    versionId: String,
    project: {
      type: Object,
      default: null,
    },
    requirements: {
      type: Array,
      default: () => [],
    },
    databaseSchema: {
      type: Object,
      default: null,
    },
  },
  emits: ['close', 'generate'],
  setup(props, { emit }) {
    const toast = useToast()

    // State management
    const selectedRequirements = ref([])
    const searchQuery = ref('')

    // Configuration
    const configuration = ref({
      testType: 'all',
      language: 'vi-VN', // Will be set from project
      priority: 'auto',
    })
    
    // Set language from project when available
    watch(() => props.project, (newProject) => {
      if (newProject?.language) {
        configuration.value.language = newProject.language
      }
    }, { immediate: true })

    // ✅ BỎ: Draft management và computed properties không cần thiết

    // Helper: Get requirement ID (support both _id and id for backward compatibility)
    const getRequirementId = (req) => {
      if (!req) return ''
      return String(req._id || req.id || req.requirement_id || '')
    }

    // Filtered requirements based on search query
    const filteredRequirements = computed(() => {
      if (!searchQuery.value.trim()) {
        return props.requirements || []
      }

      const query = searchQuery.value.toLowerCase().trim()
      return (props.requirements || []).filter((req) => {
        const name = (req.name || '').toLowerCase()
        const goal = (req.goal || '').toLowerCase()
        const type = (req.type || '').toLowerCase()
        const priority = (req.priority || '').toLowerCase()
        
        return (
          name.includes(query) ||
          goal.includes(query) ||
          type.includes(query) ||
          priority.includes(query)
        )
      })
    })

    // Handle search input
    const handleSearch = () => {
      // Search is handled by computed property
    }

    // Clear search
    const clearSearch = () => {
      searchQuery.value = ''
    }

    // Check if requirement is selected
    const isRequirementSelected = (requirement) => {
      const reqId = getRequirementId(requirement)
      if (!reqId) return false
      return selectedRequirements.value.includes(reqId)
    }

    // Methods
    const selectAll = () => {
      // Select all filtered requirements (or all if no search)
      const requirementsToSelect = filteredRequirements.value.length > 0 
        ? filteredRequirements.value 
        : props.requirements
      
      const newSelectedIds = requirementsToSelect
        .map((req) => getRequirementId(req))
        .filter((id) => id && id !== '')
      
      // Merge with existing selections to avoid deselecting items not in current filter
      const existingIds = new Set(selectedRequirements.value)
      newSelectedIds.forEach(id => existingIds.add(id))
      selectedRequirements.value = Array.from(existingIds)
    }

    const clearSelection = () => {
      selectedRequirements.value = []
    }

    const toggleRequirement = (requirement) => {
      const reqId = getRequirementId(requirement)
      if (!reqId) {
        console.warn('⚠️ Cannot toggle requirement with no ID:', requirement)
        return
      }
      
      const index = selectedRequirements.value.indexOf(reqId)
      if (index > -1) {
        selectedRequirements.value.splice(index, 1)
      } else {
        selectedRequirements.value.push(reqId)
      }
    }

    const generateTestCases = async () => {
      if (selectedRequirements.value.length === 0) {
        toast.error('Vui lòng chọn ít nhất một yêu cầu')
        return
      }

      if (!props.projectId || !props.versionId) {
        toast.error('Phải chọn dự án và phiên bản')
        return
      }

      // Filter out null/undefined/empty values and validate
      const validRequirementIds = selectedRequirements.value
        .filter((id) => id != null && id !== '' && String(id).trim() !== '' && String(id).toLowerCase() !== 'null' && String(id).toLowerCase() !== 'undefined')

      if (validRequirementIds.length === 0) {
        toast.error('Vui lòng chọn ít nhất một yêu cầu hợp lệ')
        return
      }

      if (!props.projectId || !props.versionId) {
        toast.error('Phải chọn dự án và phiên bản')
        return
      }

      console.log('🔍 Starting test case generation with requirements:', {
        original: selectedRequirements.value,
        filtered: validRequirementIds,
        requirements: props.requirements.map(req => ({
          _id: req._id,
          id: req.id,
          requirement_id: req.requirement_id,
          name: req.name,
          computedId: getRequirementId(req)
        }))
      })

      // Đóng modal ngay lập tức
      handleClose()

      // Gọi API generate trong background - progress sẽ hiển thị qua socket events trong ProjectLayout
      try {
        const response = await testcaseApi.generateTestCases(props.projectId, props.versionId, {
          selectedRequirementIds: validRequirementIds,
          language: configuration.value.language,
          testType: configuration.value.testType,
        })

        const savedTestCases = response.data.data || response.data || []
        const savedCount = savedTestCases.length || 0

        console.log('✅ Test case generation completed:', {
          savedCount,
          response: response.data
        })

        /*if (savedCount === 0) {
          toast.warning('Chưa sinh được test case. Hãy thử yêu cầu hoặc tuỳ chọn khác.')
        } else {
          toast.success(`Đã sinh và lưu ${savedCount} test case`)
          // Emit event để parent refresh test cases
          emit('generate', savedTestCases)
        }*/
      } catch (error) {
        console.error('❌ Error generating test cases:', error)
        
        const { formatErrorForDisplay } = await import('@/utils/errorMessages')
        const errorMessage = formatErrorForDisplay(error, 'Không thể tạo test case. Vui lòng thử lại.')
        toast.error(errorMessage)
      }
    }

    // ✅ BỎ: Các methods không cần thiết nữa (showConfirmation, executeConfirmedAction, executeCancelAction, checkDraft)

    const handleClose = () => {
      // ✅ BỎ: Không cần check unsaved changes nữa vì save trực tiếp
      emit('close')
    }

    // Lifecycle
    onMounted(() => {
      // Auto-select all requirements if there are few
      if (props.requirements.length > 0 && props.requirements.length <= 10) {
        selectedRequirements.value = props.requirements
          .map((req) => getRequirementId(req))
          .filter((id) => id && id !== '')
      }

      // ✅ BỎ: Không check draft nữa
    })

    onUnmounted(() => {
      // Cleanup any intervals
      const intervals = []
      intervals.forEach((interval) => clearInterval(interval))
    })

    return {
      selectedRequirements,
      configuration,
      searchQuery,
      filteredRequirements,
      getRequirementId,
      isRequirementSelected,
      selectAll,
      clearSelection,
      toggleRequirement,
      handleSearch,
      clearSearch,
      generateTestCases,
      handleClose,
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
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content.large {
  background: white;
  border-radius: var(--radius);
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(255, 255, 255, 0.2);
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

.modal-content.medium {
  background: white;
  border-radius: var(--radius-field);
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.confirm-overlay {
  z-index: 1001;
}

.modal-header {
  padding: 1.75rem 2rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg);
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.modal-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--ink);
  margin: 0;
  letter-spacing: -0.02em;
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
  transition: all 0.2s ease;
}

.btn-close:hover {
  background: var(--sunken);
  color: var(--ink);
  transform: scale(1.1);
}

.btn-close:active {
  transform: scale(0.95);
}

.modal-body {
  padding: 2rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 0.5rem;
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-title::before {
  content: '';
  width: 4px;
  height: 1.25rem;
  background: var(--ink);
  border-radius: var(--radius-sm);
}

.section-subtitle {
  color: var(--muted);
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  line-height: 1.5;
}

.selection-section,
.configuration-section,
.preview-section {
  margin-bottom: 2rem;
}

.configuration-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

/* Draft Section */
.draft-section {
  margin-bottom: 2rem;
}

.draft-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: var(--radius-sm);
}

.draft-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.draft-info h4 {
  margin: 0 0 0.25rem 0;
  color: #856404;
}

.draft-info p {
  margin: 0;
  color: #856404;
  font-size: 0.875rem;
}

.draft-actions {
  display: flex;
  gap: 0.5rem;
}

/* Preview Header */
.preview-header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.preview-actions {
  display: flex;
  gap: 0.5rem;
}

.preview-container {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.preview-stats-bar {
  display: flex;
  gap: 2rem;
  padding: 1rem 1.5rem;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  font-size: 0.875rem;
}

.stat-item {
  display: flex;
  gap: 0.5rem;
}

.stat-label {
  color: var(--muted);
  font-weight: 500;
}

.stat-value {
  color: var(--text);
  font-weight: 600;
}

.preview-list {
  max-height: 400px;
  overflow-y: auto;
}

.preview-item {
  border-bottom: 1px solid var(--border);
  transition: all 0.2s ease;
}

.preview-item:last-child {
  border-bottom: none;
}

.preview-item:hover {
  background: var(--bg);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}

.preview-main {
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.preview-main:hover {
  background: var(--sunken);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.preview-title {
  font-weight: 600;
  color: var(--ink);
  margin: 0;
  flex: 1;
  font-size: 1rem;
  line-height: 1.4;
}

.preview-badges {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.expand-icon {
  color: var(--muted);
  font-size: 1.25rem;
  transition: transform 0.2s ease;
}

.preview-main:hover .expand-icon {
  color: var(--ink);
  transform: scale(1.1);
}

.preview-meta {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.table-info,
.requirement-info {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--muted);
}

/* Detail Section */
.preview-detail {
  padding: 0 1.5rem 1.5rem 1.5rem;
  background: var(--bg);
  border-top: 1px solid var(--border);
}

.detail-section {
  margin-bottom: 1.5rem;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-section h5 {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 0.75rem 0;
}

.detail-section p {
  color: var(--muted);
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
}

.detail-section ul {
  margin: 0;
  padding-left: 1.5rem;
  color: var(--muted);
  font-size: 0.875rem;
}

.detail-section li {
  margin-bottom: 0.25rem;
  line-height: 1.4;
}

/* Steps List */
.steps-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.step-item {
  display: flex;
  gap: 1rem;
  padding: 0.75rem;
  background: white;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.step-number {
  width: 2rem;
  height: 2rem;
  background: var(--ink);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.step-action {
  font-weight: 500;
  color: var(--text);
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
}

.step-expected {
  color: var(--muted);
  font-size: 0.75rem;
  font-style: italic;
}

/* Expected Results */
.expected-results {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.expected-results > div {
  padding: 0.75rem;
  background: white;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.expected-results strong {
  color: var(--text);
  font-size: 0.875rem;
}

.expected-results ul {
  margin: 0.5rem 0 0 0;
}

/* Selection styles (keep existing) */
.selection-container {
  border: 2px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(10, 10, 10, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: white;
}

.selection-container:hover {
  box-shadow: var(--shadow);
  border-color: rgba(10, 10, 10, 0.2);
}

.selection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
}

.selected-count {
  font-weight: 600;
  color: var(--text);
  font-size: 0.875rem;
}

.total-count {
  color: var(--muted);
  font-size: 0.875rem;
  margin-left: 0.5rem;
}

.selection-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-sm {
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
}

/* Search Box */
.search-box {
  position: relative;
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  background: white;
  border-bottom: 1px solid var(--border);
  transition: all 0.2s ease;
}

.search-box:focus-within {
  background: var(--bg);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.02);
}

.search-icon {
  position: absolute;
  left: 1.25rem;
  color: var(--muted);
  font-size: 1.25rem;
  pointer-events: none;
  transition: color 0.2s ease;
}

.search-box:focus-within .search-icon {
  color: var(--ink);
}

.search-input {
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 2.75rem;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-field);
  font-size: 0.875rem;
  color: var(--text);
  background: var(--bg);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.search-input::placeholder {
  color: var(--muted);
}

.search-input:focus {
  outline: none;
  border-color: var(--ink);
  background: white;
  box-shadow: 0 0 0 4px rgba(10, 10, 10, 0.1), 0 4px 12px rgba(10, 10, 10, 0.15);
  transform: translateY(-1px);
}

.clear-search-btn {
  position: absolute;
  right: 1.25rem;
  padding: 0.25rem;
  border: none;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  transition: all 0.2s ease;
}

.clear-search-btn:hover {
  background: var(--sunken);
  color: var(--ink);
}

.clear-search-btn .material-symbols-outlined {
  font-size: 1.125rem;
}

.selection-list {
  max-height: 300px;
  overflow-y: auto;
}

.selection-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  background: white;
}

.selection-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  background: rgba(10, 10, 10, 0.06);
  transition: width 0.3s ease;
}

.selection-item:hover {
  background: var(--bg);
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(10, 10, 10, 0.1);
}

.selection-item:hover::before {
  width: 4px;
}

.selection-item.selected {
  background: var(--sunken);
  border-left: 4px solid var(--ink);
  box-shadow: 0 2px 8px rgba(10, 10, 10, 0.15);
}

.selection-item.selected::before {
  width: 4px;
}

.selection-item.selected:hover {
  background: var(--sunken);
  transform: translateX(4px) translateY(-2px);
  box-shadow: var(--shadow);
}

.selection-item:last-child {
  border-bottom: none;
}

.selection-item input[type="checkbox"] {
  width: 20px;
  height: 20px;
  margin-top: 2px;
  cursor: pointer;
  accent-color: #1a365d;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.selection-item input[type="checkbox"]:hover {
  transform: scale(1.1);
}

.selection-item input[type="checkbox"]:checked {
  transform: scale(1.05);
}

.item-content {
  flex: 1;
}

.item-title {
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 0.5rem;
  font-size: 1rem;
  line-height: 1.4;
  transition: color 0.2s ease;
}

.selection-item:hover .item-title {
  color: var(--ink);
}

.item-description {
  color: var(--muted);
  font-size: 0.875rem;
  line-height: 1.5;
  margin-bottom: 0.75rem;
}

.item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.meta-tag {
  padding: 0.375rem 0.75rem;
  background: var(--sunken);
  color: var(--text);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.meta-tag:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.meta-tag.priority.critical {
  background: var(--sunken);
  color: var(--danger);
}

.meta-tag.priority.high {
  background: #fed7aa;
  color: var(--danger);
}

.meta-tag.priority.medium {
  background: #fef3c7;
  color: var(--danger);
}

.meta-tag.priority.low {
  background: var(--success-soft);
  color: var(--success);
}

.empty-selection {
  text-align: center;
  padding: 3rem 2rem;
  color: var(--muted);
}

.empty-selection .material-symbols-outlined {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
  color: var(--muted);
}

.empty-hint {
  font-size: 0.875rem;
  color: var(--muted);
  margin-top: 0.5rem;
}

.empty-hint {
  font-size: 0.875rem;
  color: var(--muted);
  margin-top: 0.5rem;
}

/* Form styles */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-weight: 500;
  color: var(--text);
  font-size: 0.875rem;
}

.form-select {
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  background: white;
  transition: all 0.2s ease;
  cursor: pointer;
}

.form-select:hover {
  border-color: var(--border-strong);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.form-select:focus {
  outline: none;
  border-color: var(--ink);
  box-shadow: 0 0 0 3px rgba(10, 10, 10, 0.1);
}

/* Action Section */
.action-section {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border);
}

.action-buttons {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.primary-actions {
  display: flex;
  gap: 1rem;
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
  text-decoration: none;
  font-size: 0.875rem;
}

.btn-primary {
  background: var(--ink);
  border-color: var(--ink);
  color: white;
  box-shadow: 0 4px 12px rgba(10, 10, 10, 0.25);
  border-radius: var(--radius-field);
}

.btn-primary:hover:not(:disabled) {
  background: var(--ink);
  border-color: var(--ink);
  box-shadow: var(--shadow);
  transform: translateY(-2px);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(10, 10, 10, 0.2);
}

.btn-primary:disabled {
  background: var(--muted);
  border-color: var(--border-strong);
  cursor: not-allowed;
  box-shadow: none;
}

.btn-secondary {
  background: white;
  border-color: var(--border-strong);
  color: var(--text);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--bg);
  border-color: var(--border-strong);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.btn-secondary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-secondary:disabled {
  background: var(--sunken);
  border-color: var(--border-strong);
  color: var(--muted);
  cursor: not-allowed;
}

/* Loading */
.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.spinner.large {
  justify-self: center;
  width: 3rem;
  height: 3rem;
  border-width: 3px;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}


.generation-progress {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.progress-bar {
  width: 100%;
  height: 10px;
  background: var(--sunken);
  border-radius: var(--radius-sm);
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
}

.progress-fill {
  height: 100%;
  background: var(--ink);
  transition: width 0.3s ease;
  border-radius: var(--radius-sm);
  box-shadow: 0 1px 3px rgba(10, 10, 10, 0.3);
}

.progress-text {
  font-size: 0.875rem;
  color: var(--ink);
  font-weight: 600;
}

/* Badges */
.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
}

.badge.type.unit {
  background: var(--sunken);
  color: var(--ink);
}

.badge.type.integration {
  background: var(--success-soft);
  color: var(--success);
}

.badge.type.api {
  background: var(--sunken);
  color: var(--ink);
}

.badge.type.ui {
  background: #fef3c7;
  color: var(--danger);
}

.badge.type.performance {
  background: var(--sunken);
  color: var(--danger);
}

.badge.type.security {
  background: var(--sunken);
  color: var(--success);
}

.badge.priority.critical {
  background: var(--sunken);
  color: var(--danger);
}

.badge.priority.high {
  background: #fed7aa;
  color: var(--danger);
}

.badge.priority.medium {
  background: #fef3c7;
  color: var(--danger);
}

.badge.priority.low {
  background: var(--success-soft);
  color: var(--success);
}

/* Confirm Actions */
.confirm-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

/* Responsive */
@media (max-width: 768px) {
  .modal-content.large {
    margin: 1rem;
    max-height: calc(100vh - 2rem);
  }

  .modal-body {
    padding: 1rem;
  }

  .configuration-grid {
    grid-template-columns: 1fr;
  }

  .preview-header-section {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .preview-actions {
    justify-content: center;
  }

  .preview-stats-bar {
    flex-direction: column;
    gap: 0.75rem;
  }

  .action-buttons {
    flex-direction: column;
    gap: 1rem;
  }

  .primary-actions {
    width: 100%;
    flex-direction: column;
  }

  .primary-actions .btn {
    width: 100%;
    justify-content: center;
  }

  .selection-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .selection-actions {
    justify-content: center;
  }

  .draft-banner {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .draft-info {
    flex-direction: column;
    text-align: center;
  }

  .preview-header {
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
  }

  .preview-badges {
    align-self: flex-end;
  }
}
</style>