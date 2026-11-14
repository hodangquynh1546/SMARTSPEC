<template>
  <div class="input-sidebar" :class="{ collapsed: isCollapsed }">
    <div class="sidebar-content" :class="{ hidden: isCollapsed }">
      <div class="sidebar-section">
        <div class="section-header">
          <div class="header-left">
            <button
              class="collapse-toggle"
              @click="toggleCollapse"
              :title="isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
            >
              <span class="material-symbols-outlined toggle-icon">menu</span>
            </button>
            <h3>
              Inputs
              <span class="counter-badge">{{ inputs.length }}</span>
            </h3>
          </div>
          <button 
            class="btn-primary" 
            @click="toggleAddForm"
            :class="{ active: showAddForm }"
            :disabled="isVersionProcessing"
            :title="isVersionProcessing ? 'Cannot add inputs while version is being processed' : ''"
          >
            <span class="material-symbols-outlined">{{ showAddForm ? 'close' : 'add' }}</span>
            {{ showAddForm ? 'Cancel' : 'Add Input' }}
          </button>
        </div>

        <!-- Add Input Form (Inline) -->
        <div v-if="showAddForm && !isCollapsed" class="add-input-form">
          <div class="form-section">
            <h4>Upload Files</h4>
            <div class="file-upload-area" @click="triggerFileInput">
              <input
                type="file"
                ref="fileInput"
                @change="handleFileSelect"
                multiple
                accept=".docx,.pdf,.jpg,.jpeg,.png,.gif,.mp3,.wav,.m4a"
                style="display: none"
              />
              <div class="upload-placeholder">
                <span class="material-symbols-outlined upload-icon">cloud_upload</span>
                <p>Click to upload files</p>
                <p class="file-types">Supported: DOCX, PDF, Images, Audio files</p>
              </div>
            </div>
            <div v-if="selectedFiles.length > 0" class="selected-files">
              <h5>Selected Files ({{ selectedFiles.length }})</h5>
              <ul class="file-list">
                <li v-for="(file, index) in selectedFiles" :key="index" class="file-item">
                  <span class="material-symbols-outlined file-icon">description</span>
                  <span class="file-name">{{ file.name }}</span>
                  <span class="file-size">({{ formatFileSize(file.size) }})</span>
                  <button class="remove-file" @click="removeFile(index)">
                    <span class="material-symbols-outlined">close</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div class="form-section">
            <h4>Or Enter Text</h4>
            <textarea
              v-model="rawText"
              placeholder="Describe your requirements, use cases, or system specifications here..."
              class="text-input"
              rows="4"
            ></textarea>
          </div>

          <div v-if="!canSubmit" class="validation-message">
            Please add at least one file or enter some text to proceed!
          </div>

          <div class="form-actions">
            <button 
              class="submit-btn" 
              @click="handleSubmit" 
              :disabled="!canSubmit || isAddingInput || isVersionProcessing"
              :title="isVersionProcessing ? 'Cannot add inputs while version is being processed' : ''"
            >
              <span v-if="isAddingInput" class="button-spinner-small"></span>
              <span v-else class="material-symbols-outlined">check</span>
              {{ isAddingInput ? 'Adding...' : isVersionProcessing ? 'Processing...' : 'Add Input' }}
            </button>
            <div v-if="isVersionProcessing" class="processing-warning">
              <span class="material-symbols-outlined">info</span>
              Cannot add inputs while version is being processed. Please wait for processing to complete.
            </div>
          </div>
        </div>

        <!-- Filter Tabs - Compact in collapsed mode -->
        <div class="filter-tabs" :class="{ compact: isCollapsed }">
          <button
            v-for="filter in inputFilters"
            :key="filter.type"
            class="filter-tab"
            :class="{ active: activeFilter === filter.type }"
            @click="setActiveFilter(filter.type)"
            :title="filter.label"
          >
            <span class="material-symbols-outlined">{{ filter.icon }}</span>
            <span class="filter-label" v-if="!isCollapsed">{{ filter.label }}</span>
            <span class="filter-count" v-if="!isCollapsed">{{ getFilterCount(filter.type) }}</span>
            <span class="filter-count-badge" v-else>{{ getFilterCount(filter.type) }}</span>
          </button>
        </div>

        <!-- Incremental Analysis Section -->
        <div v-if="!isCollapsed" class="incremental-section">
          <!-- Error Banner -->
          <div v-if="isProcessingFailed" class="error-banner">
            <div class="error-content">
              <span class="material-symbols-outlined error-icon">error</span>
              <div class="error-text">
                <h4>Analysis Failed</h4>
                <p>Please check and retry.</p>
              </div>
              <button class="retry-btn-small" @click="$emit('retry-incremental')">
                <span class="material-symbols-outlined">refresh</span>
                Retry
              </button>
            </div>
          </div>

          <!-- Incremental Analysis Button -->
          <div
            v-if="showIncrementalButton && !isProcessingIncremental && !isProcessingFailed"
            class="incremental-banner"
          >
            <div class="banner-content">
              <span class="material-symbols-outlined banner-icon">update</span>
              <div class="banner-text">
                <h4>New Inputs Available</h4>
                <p>
                  {{ unprocessedInputsCount }} unprocessed input(s) ready for analysis.
                </p>
              </div>
            </div>
            <button
              class="incremental-btn"
              @click="$emit('start-incremental-analysis')"
              :disabled="isProcessingIncremental"
            >
              <span v-if="isProcessingIncremental" class="button-spinner-small"></span>
              <span v-else class="material-symbols-outlined">play_arrow</span>
              {{ isProcessingIncremental ? 'Analyzing...' : 'Analyze' }}
            </button>
          </div>
        </div>

        <div class="inputs-list">
          <div
            v-for="input in sortedFilteredInputs"
            :key="input._id"
            class="input-card"
            :class="[
              input.type,
              { 
                expanded: expandedInputId === input._id, 
                processed: input.is_processed,
                loading: input._isLoading,
                error: input._isError
              },
            ]"
            @click="toggleInput(input._id)"
          >
            <div class="input-header">
              <div class="input-type-icon">
                <span class="material-symbols-outlined">{{ getTypeIcon(input.type) }}</span>
              </div>

              <div class="input-main-info" v-if="!isCollapsed">
                <h4 class="input-title">
                  <span v-if="input._isLoading" class="loading-indicator-inline">
                    <!-- <span class="button-spinner-small"></span> -->
                    {{ getCleanText(input) }}
                  </span>
                  <span v-else>{{ getCleanText(input) }}</span>
                </h4>
                <div class="input-meta">
                  <span v-if="input._isLoading" class="status-badge loading-badge">
                    <span class="button-spinner-small"></span>
                    Uploading...
                  </span>
                  <span v-else-if="input._isError" class="status-badge error-badge">
                    <span class="material-symbols-outlined">error</span>
                    Failed
                  </span>
                  <span v-else class="quality-badge" :class="getQualityClass(input)">
                    {{ Math.round(getQualityScore(input) * 100) }}%
                  </span>
                </div>
              </div>

              <!-- Collapsed View -->
              <div class="input-collapsed" v-else>
                <span class="material-symbols-outlined mini-icon">{{
                  getTypeIcon(input.type)
                }}</span>
                <span class="status-dot" :class="{ processed: input.is_processed }"></span>
              </div>

              <div class="input-actions" v-if="!isCollapsed">
                <button
                  class="btn-icon danger"
                  @click.stop="$emit('delete-input', input._id)"
                  :disabled="isDeletingInput === input._id"
                  title="Delete input"
                >
                  <span v-if="isDeletingInput === input._id" class="button-spinner"></span>
                  <span v-else class="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>

            <!-- Expanded Details -->
            <div v-if="expandedInputId === input._id && !isCollapsed" class="input-details">
              <div class="details-grid">
                <div class="detail-item">
                  <span class="detail-label">Status</span>
                  <span class="detail-value">
                    <span class="status-badge" :class="{ processed: input.is_processed }">
                      {{ input.is_processed ? 'Processed' : 'Not Processed' }}
                    </span>
                  </span>
                </div>

                <div class="detail-item">
                  <span class="detail-label">Type</span>
                  <span class="detail-value">{{ input.type }}</span>
                </div>

                <div class="detail-item">
                  <span class="detail-label">Language</span>
                  <span class="detail-value">{{ getLanguage(input) }}</span>
                </div>

                <div class="detail-item full-width">
                  <span class="detail-label">Content</span>
                  <div class="content-preview">
                    {{ getCleanText(input, 2000000) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="filteredInputs.length === 0 && !isCollapsed" class="empty-state">
            <span class="material-symbols-outlined empty-icon">description</span>
            <p v-if="activeFilter === 'all'">
              No inputs added yet. Add your first input to get started.
            </p>
            <p v-else>
              No {{ activeFilter }} inputs found. Try a different filter or add new inputs.
            </p>
            <button class="btn-secondary" @click="toggleAddForm">
              <span class="material-symbols-outlined">add</span>
              Add Input
            </button>
          </div>

          <!-- Collapsed Empty State -->
          <div v-if="filteredInputs.length === 0 && isCollapsed" class="empty-state-collapsed">
            <span class="material-symbols-outlined">add</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Stats in Collapsed Mode -->
    <div class="collapsed-stats" v-if="isCollapsed">
      <!-- Processing Indicator when collapsed -->
      <div 
        v-if="isProcessingIncremental" 
        class="stat-item processing" 
        title="Analyzing... Click to expand"
        @click="toggleCollapse"
      >
        <div class="loading-spinner-small"></div>
        <span class="stat-label">Analyzing</span>
      </div>
      <div 
        v-else-if="isProcessingFailed" 
        class="stat-item error" 
        title="Analysis Failed. Click to expand"
        @click="toggleCollapse"
      >
        <span class="material-symbols-outlined error-icon">error</span>
        <span class="stat-label">Failed</span>
      </div>
      <div 
        v-else-if="showIncrementalButton" 
        class="stat-item pending" 
        :title="`${unprocessedInputsCount} unprocessed inputs. Click to expand`"
        @click="toggleCollapse"
      >
        <span class="material-symbols-outlined warning">update</span>
        <span class="stat-number">{{ unprocessedInputsCount }}</span>
      </div>
      
      <div 
        class="stat-item" 
        :title="`Total inputs: ${inputs.length}. Click to expand`"
        @click="toggleCollapse"
      >
        <span class="material-symbols-outlined">description</span>
        <span class="stat-number">{{ inputs.length }}</span>
      </div>
      <div 
        class="stat-item" 
        :title="`Processed: ${processedCount}. Click to expand`"
        @click="toggleCollapse"
      >
        <span class="material-symbols-outlined success">check_circle</span>
        <span class="stat-number">{{ processedCount }}</span>
      </div>
      <div 
        class="stat-item" 
        :title="`Pending: ${pendingCount}. Click to expand`"
        @click="toggleCollapse"
      >
        <span class="material-symbols-outlined warning">schedule</span>
        <span class="stat-number">{{ pendingCount }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'InputSidebar',
  emits: ['add-input-click', 'delete-input', 'input-added', 'input-deleted', 'inputs-reloaded', 'start-incremental-analysis', 'retry-incremental'],
  props: {
    inputs: {
      type: Array,
      default: () => [],
    },
    isDeletingInput: {
      type: String,
      default: null,
    },
    isProcessingIncremental: {
      type: Boolean,
      default: false,
    },
    isProcessingFailed: {
      type: Boolean,
      default: false,
    },
    showIncrementalButton: {
      type: Boolean,
      default: false,
    },
    unprocessedInputsCount: {
      type: Number,
      default: 0,
    },
    isAddingInput: {
      type: Boolean,
      default: false,
    },
    isVersionProcessing: {
      type: Boolean,
      default: false,
    },
    estimateInfo: {
      type: Object,
      default: () => ({
        estimated_count: 0,
        summary: '',
        estimated_batches: 0,
        isEstimating: false
      }),
    },
    batchProgress: {
      type: Object,
      default: () => ({
        currentBatch: 0,
        totalBatches: 0,
        usecasesInBatch: 0,
        savedCount: 0,
        totalCount: 0
      }),
    },
    agentState: {
      type: String,
      default: null,
    },
    agentMessage: {
      type: String,
      default: null,
    },
    processingProgress: {
      type: Number,
      default: 0,
    },
  },
  data() {
    return {
      expandedInputId: null,
      activeFilter: 'all',
      isCollapsed: false, // Default là hiển thị
      showAddForm: false, // Toggle form thêm input
      selectedFiles: [], // Files đã chọn
      rawText: '', // Raw text input
      inputFilters: [
        { type: 'all', label: 'All', icon: 'apps' },
        { type: 'pdf', label: 'PDF', icon: 'picture_as_pdf' },
        { type: 'docx', label: 'DOCX', icon: 'description' },
        { type: 'image', label: 'Images', icon: 'image' },
        { type: 'audio', label: 'Audio', icon: 'audiotrack' },
        { type: 'text', label: 'Text', icon: 'text_snippet' },
      ],
    }
  },
  computed: {
    filteredInputs() {
      if (this.activeFilter === 'all') {
        return this.inputs
      }
      return this.inputs.filter((input) => input.type === this.activeFilter)
    },
    sortedFilteredInputs() {
      // Sort: is_processed = false ở trên, sau đó sort theo thời gian mới đến cũ
      return [...this.filteredInputs].sort((a, b) => {
        // Ưu tiên: is_processed = false luôn ở trên
        if (a.is_processed !== b.is_processed) {
          return a.is_processed ? 1 : -1
        }
        
        // Nếu cùng trạng thái processed, sort theo thời gian mới đến cũ
        const timeA = new Date(a.created_at || a.createdAt || 0).getTime()
        const timeB = new Date(b.created_at || b.createdAt || 0).getTime()
        return timeB - timeA // Mới nhất ở trên (descending)
      })
    },
    canSubmit() {
      return this.selectedFiles.length > 0 || this.rawText.trim().length > 0
    },
    processedCount() {
      return this.inputs.filter((input) => input.is_processed).length
    },
    pendingCount() {
      return this.inputs.filter((input) => !input.is_processed).length
    },
  },
  mounted() {
    // Load trạng thái từ localStorage khi component được mount
    // this.loadCollapsedState()
  },
  methods: {
    initSocketListeners() {
      if (socket) {
        socket.on('input_event', this.handleInputEvent)
        console.log('✅ InputSidebar: Socket listeners initialized')
      }
    },

    cleanupSocketListeners() {
      if (socket) {
        socket.off('input_event', this.handleInputEvent)
        console.log('🧹 InputSidebar: Socket listeners cleaned up')
      }
    },
    handleInputEvent(event) {
      console.log('📩 InputSidebar received input event:', event)

      // Bỏ qua events từ chính mình
      if (event.userId === this.currentUserId) {
        return
      }

      switch (event.type) {
        case 'INPUT_CREATED':
          this.handleRemoteInputCreated(event)
          break
        case 'INPUT_DELETED':
          this.handleRemoteInputDeleted(event)
          break
        case 'INPUTS_RELOAD':
          this.handleRemoteInputsReload(event)
          break
        default:
          console.warn('Unknown input event type:', event.type)
      }
    },

    handleRemoteInputCreated(event) {
      console.log('➕ Remote input created:', event.input)

      // Thêm input mới vào danh sách nếu chưa có
      if (!this.inputs.find((input) => input._id === event.input._id)) {
        this.$emit('input-added', event.input) // Emit event để parent cập nhật
      }
    },

    handleRemoteInputDeleted(event) {
      console.log('➖ Remote input deleted:', event.inputId)

      // Xóa input khỏi danh sách
      this.$emit('input-deleted', event.inputId) // Emit event để parent cập nhật
    },

    handleRemoteInputsReload(event) {
      console.log('🔄 Remote inputs reload:', event.inputs.length)

      // Cập nhật toàn bộ danh sách inputs
      this.$emit('inputs-reloaded', event.inputs) // Emit event để parent cập nhật
    },
    toggleCollapse() {
      this.isCollapsed = !this.isCollapsed
      this.expandedInputId = null
      // Lưu trạng thái vào localStorage
      this.saveCollapsedState()
    },

    saveCollapsedState() {
      // Lưu trạng thái collapse vào localStorage với key duy nhất cho component này
      localStorage.setItem('inputSidebarCollapsed', JSON.stringify(this.isCollapsed))
    },

    loadCollapsedState() {
      // Load trạng thái từ localStorage
      const savedState = localStorage.getItem('inputSidebarCollapsed')
      if (savedState !== null) {
        this.isCollapsed = JSON.parse(savedState)
      }
    },

    toggleInput(inputId) {
      if (this.isCollapsed) {
        this.isCollapsed = false
        this.saveCollapsedState() // Lưu trạng thái khi auto-expand
        // Auto-expand the clicked input after expanding sidebar
        setTimeout(() => {
          this.expandedInputId = inputId
        }, 100)
      } else {
        this.expandedInputId = this.expandedInputId === inputId ? null : inputId
      }
    },

    setActiveFilter(filterType) {
      this.activeFilter = filterType
      this.expandedInputId = null
    },

    getFilterCount(filterType) {
      if (filterType === 'all') return this.inputs.length
      return this.inputs.filter((input) => input.type === filterType).length
    },

    getTypeIcon(type) {
      const icons = {
        pdf: 'picture_as_pdf',
        docx: 'description',
        image: 'image',
        audio: 'audiotrack',
        text: 'text_snippet',
      }
      return icons[type] || 'description'
    },

    getCleanText(input, maxLength = 60) {
      const text =
        input.cleaned_text || input.clean_text || input.raw_text || 'No content available'
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
    },

    getAgentStateTitle(state) {
      const titles = {
        'ESTIMATE_USECASE_COUNT': 'Đang ước tính usecases',
        'BATCH_PLANNING': 'Đang lập kế hoạch batches',
        'GENERATE_BATCH': 'Đang generate usecases',
        'VERIFY_RESULTS': 'Đang kiểm tra kết quả',
        'REPLAN_MISSING': 'Đang lập kế hoạch retry',
        'GENERATE_RETRY': 'Đang retry usecases',
        'DONE': 'Hoàn thành'
      }
      return titles[state] || 'Đang xử lý...'
    },

    getLanguage(input) {
      return input.metadata?.language || input.language || 'Unknown'
    },

    getQualityScore(input) {
      return input.quality_score || 0
    },

    getQualityClass(input) {
      const score = this.getQualityScore(input)
      if (score >= 0.8) return 'high'
      if (score >= 0.5) return 'medium'
      return 'low'
    },

    formatDate(dateString) {
      if (!dateString) return 'Not available'
      return new Date(dateString).toLocaleDateString('en-US')
    },

    formatDateTime(dateString) {
      if (!dateString) return 'Not available'
      return new Date(dateString).toLocaleString('en-US')
    },
    // Add Input Form Methods
    toggleAddForm() {
      this.showAddForm = !this.showAddForm
      if (!this.showAddForm) {
        this.resetForm()
      }
    },
    triggerFileInput() {
      this.$refs.fileInput?.click()
    },
    handleFileSelect(event) {
      const files = Array.from(event.target.files)
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'audio/mpeg',
        'audio/wav',
        'audio/mp4',
        'audio/x-m4a',
        'audio/m4a',
      ]

      const validFiles = files.filter((file) => {
        // Kiểm tra MIME type hoặc extension nếu MIME type không có
        if (allowedTypes.includes(file.type)) {
          return true
        }
        // Fallback: kiểm tra extension nếu MIME type không khớp
        const fileName = file.name.toLowerCase()
        const allowedExtensions = ['.docx', '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.mp3', '.wav', '.m4a']
        return allowedExtensions.some(ext => fileName.endsWith(ext))
      })
      
      if (validFiles.length < files.length) {
        const rejectedCount = files.length - validFiles.length
        console.warn(`${rejectedCount} file(s) were rejected due to unsupported type`)
      }
      
      this.selectedFiles = [...this.selectedFiles, ...validFiles]
      if (event.target) {
        event.target.value = ''
      }
    },
    removeFile(index) {
      this.selectedFiles.splice(index, 1)
    },
    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    },
    handleSubmit() {
      if (!this.canSubmit) return

      const formData = new FormData()
      const tempInputData = {
        files: [],
        rawText: null
      }
      
      if (this.selectedFiles.length > 0) {
        this.selectedFiles.forEach((file) => {
          formData.append('files', file)
          tempInputData.files.push({
            name: file.name,
            size: file.size,
            type: file.type
          })
        })
      }
      if (this.rawText.trim()) {
        formData.append('rawText', this.rawText.trim())
        tempInputData.rawText = this.rawText.trim()
      }

      this.$emit('add-inputs', { formData, tempInputData })
      this.resetForm()
      this.showAddForm = false
    },
    resetForm() {
      this.selectedFiles = []
      this.rawText = ''
      if (this.$refs.fileInput) {
        this.$refs.fileInput.value = ''
      }
    },
  },

  // Optional: Lưu trạng thái khi component bị destroy (trong trường hợp trang bị reload)
  beforeUnmount() {
    this.saveCollapsedState()
  },
}
</script>
<style scoped>
.input-sidebar {
  position: relative;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--surface);
  padding: 20px;
  box-shadow: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 280px;
  max-width: 380px;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: white;
}

.input-sidebar:hover {
  box-shadow: var(--shadow);
  border-color: rgba(10, 10, 10, 0.2);
}

.input-sidebar.collapsed {
  min-width: 80px;
  max-width: 80px;
  padding: 12px;
  max-height: calc(100vh - 200px);
}

.collapse-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  background: transparent;
  color: var(--muted);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
}

.collapse-toggle:hover {
  background: var(--sunken);
  color: var(--ink);
}

.collapse-toggle:active {
  background: var(--sunken);
}

.collapse-toggle.collapsed-mode {
  position: absolute;
  top: 0px;
  left: 50%;
  transform: translateX(-50%);
  width:28px;
  height: px;
  background: var(--ink);
  color: white;
  border-radius: var(--radius-sm);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.collapse-toggle.collapsed-mode:hover {
  background: var(--ink);
  transform: translateX(-50%) translateY(-1px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
}

.collapse-toggle.collapsed-mode:active {
  transform: translateX(-50%);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.toggle-icon {
  font-size: 20px;
  transition: transform 0.3s ease;
}

.collapse-toggle.collapsed-mode .toggle-icon {
  font-size: 24px;
  transform: rotate(180deg);
}

.sidebar-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  transition: opacity 0.3s ease;
}

.sidebar-content.hidden {
  opacity: 0;
  pointer-events: none;
  max-height: 0;
  overflow: hidden;
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 12px;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-bottom: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.section-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.counter-badge {
  background: var(--sunken);
  color: var(--text);
  padding: 4px 8px;
  border-radius: var(--radius-field);
  font-size: 0.75rem;
  font-weight: 600;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--ink);
  color: white;
  border: none;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(10, 10, 10, 0.2);
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.btn-primary:hover {
  background: var(--ink);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(10, 10, 10, 0.3);
}

.btn-primary.active {
  background: var(--danger);
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.2);
}

.btn-primary.active:hover {
  background: var(--danger);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}

/* Filter Tabs */
.filter-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 0;
  padding: 10px;
  background: var(--bg);
  border-radius: var(--radius-field);
  border: 2px solid var(--border);
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(10, 10, 10, 0.08);
  transition: box-shadow 0.3s ease;
}

.filter-tabs:hover {
  box-shadow: 0 4px 12px rgba(10, 10, 10, 0.12);
}

.filter-tabs.compact {
  flex-direction: column;
  gap: 2px;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.3s ease;
  flex: 1;
  justify-content: center;
}

.filter-tabs.compact .filter-tab {
  padding: 8px;
  justify-content: center;
}

.filter-tab:hover {
  color: var(--text);
  background: var(--sunken);
}

.filter-tab.active {
  background: white;
  color: var(--ink);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.filter-label {
  white-space: nowrap;
}

.filter-count {
  background: var(--sunken);
  color: var(--text);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: 0.625rem;
  font-weight: 600;
}

.filter-count-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background: var(--danger);
  color: white;
  padding: 1px 4px;
  border-radius: var(--radius-sm);
  font-size: 0.5rem;
  font-weight: 700;
  min-width: 12px;
  text-align: center;
}

.filter-tab.active .filter-count {
  background: var(--ink);
  color: white;
}

/* Inputs List */
.inputs-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
  margin-top: 0;
}

/* Custom scrollbar for inputs-list */
.inputs-list::-webkit-scrollbar {
  width: 6px;
}

.inputs-list::-webkit-scrollbar-track {
  background: var(--sunken);
  border-radius: var(--radius-sm);
}

.inputs-list::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: var(--radius-sm);
}

.inputs-list::-webkit-scrollbar-thumb:hover {
  background: var(--muted);
}

.input-card {
  background: white;
  border: 2px solid var(--border);
  border-radius: var(--radius-field);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.input-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  background: rgba(10, 10, 10, 0.06);
  transition: width 0.3s ease;
}

.input-card:hover::before {
  width: 4px;
}

.input-card:hover {
  border-color: var(--ink);
  box-shadow: var(--shadow);
}

.input-card.expanded {
  border-color: var(--ink);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.input-card.processed {
  border-left: 3px solid var(--success);
}

.input-card:not(.processed):not(.loading):not(.error) {
  border-left: 3px solid var(--danger);
}

.input-card.loading {
  border-left: 3px solid var(--ink);
  background: var(--bg);
  animation: pulseLoading 2s ease-in-out infinite;
}

.input-card.error {
  border-left: 3px solid var(--danger);
  background: var(--sunken);
}

@keyframes pulseLoading {
  0%, 100% {
    background: var(--bg);
  }
  50% {
    background: var(--sunken);
  }
}

.loading-indicator-inline {
  display: flex;
  align-items: center;
  gap: 8px;
}

.loading-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: var(--sunken);
  color: var(--ink);
  border-radius: var(--radius-field);
  font-size: 0.75rem;
  font-weight: 600;
}

.error-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: var(--sunken);
  color: var(--danger);
  border-radius: var(--radius-field);
  font-size: 0.75rem;
  font-weight: 600;
}

.error-badge .material-symbols-outlined {
  font-size: 14px;
}

.input-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  min-height: 48px;
}

.input-type-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: var(--sunken);
  color: var(--muted);
  flex-shrink: 0;
}

.input-card.pdf .input-type-icon {
  background: var(--sunken);
  color: var(--danger);
}

.input-card.docx .input-type-icon {
  background: var(--sunken);
  color: var(--ink);
}

.input-card.image .input-type-icon {
  background: var(--bg);
  color: var(--ink);
}

.input-card.audio .input-type-icon {
  background: var(--sunken);
  color: var(--ink);
}

.input-card.text .input-type-icon {
  background: var(--bg);
  color: var(--success);
}

.input-main-info {
  flex: 1;
  min-width: 0;
}

.input-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 4px 0;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.input-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.quality-badge {
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: 0.625rem;
  font-weight: 700;
}

.quality-badge.high {
  background: var(--success-soft);
  color: var(--success);
}

.quality-badge.medium {
  background: #fef3c7;
  color: var(--danger);
}

.quality-badge.low {
  background: var(--sunken);
  color: var(--danger);
}

/* Collapsed View */
.input-collapsed {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.mini-icon {
  font-size: 20px;
  color: var(--muted);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--danger);
}

.status-dot.processed {
  background: var(--success);
}

.input-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-icon {
  padding: 6px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--muted);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: var(--sunken);
  color: var(--text);
}

.btn-icon.danger:hover {
  background: var(--sunken);
  color: var(--danger);
}

.btn-icon:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.button-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid var(--danger);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Input Details */
.input-details {
  padding: 12px;
  border-top: 1px solid var(--border);
  background: var(--bg);
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-value {
  font-size: 0.875rem;
  color: var(--muted);
}

.status-badge {
  padding: 4px 8px;
  border-radius: var(--radius-field);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.processed {
  background: var(--success-soft);
  color: var(--success);
}

.status-badge:not(.processed) {
  background: var(--sunken);
  color: var(--danger);
}

.content-preview {
  background: white;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px;
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--text);
  max-height: 80px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
}

/* Empty States */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--muted);
}

.empty-state-collapsed {
  text-align: center;
  padding: 20px;
  color: var(--muted);
}

.empty-icon {
  font-size: 48px;
  color: var(--muted);
  margin-bottom: 12px;
}

.empty-state p {
  margin: 0 0 16px 0;
  font-size: 0.875rem;
}

.btn-secondary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--sunken);
  color: var(--text);
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: var(--sunken);
}

/* Collapsed Stats */
.collapsed-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  background: var(--bg);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.3s ease;
}

.stat-item:hover {
  background: var(--sunken);
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stat-item:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.stat-item .material-symbols-outlined {
  font-size: 16px;
  color: var(--muted);
}

.stat-item .material-symbols-outlined.success {
  color: var(--success);
}

.stat-item .material-symbols-outlined.warning {
  color: var(--warning);
}

.stat-number {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text);
}

.stat-label {
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--text);
  text-align: center;
  margin-top: 2px;
}

.stat-item.processing {
  background: var(--success);
  color: white;
}

.stat-item.processing .stat-label {
  color: white;
}

.stat-item.error {
  background: var(--danger);
  color: white;
}

.stat-item.error .stat-label {
  color: white;
}

.stat-item.error .error-icon {
  color: white;
}

.stat-item.pending {
  background: var(--warning);
  color: white;
}

.stat-item.pending .stat-number {
  color: white;
}

.stat-item.pending .material-symbols-outlined {
  color: white;
}

.loading-spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Incremental Analysis Styles */
.incremental-section {
  margin-bottom: 12px;
  flex-shrink: 0;
}

.incremental-banner {
  background: var(--ink);
  border-radius: var(--radius-field);
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  color: white;
  box-shadow: 0 2px 8px rgba(10, 10, 10, 0.15);
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.banner-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.banner-text {
  flex: 1;
  min-width: 0;
}

.banner-text h4 {
  margin: 0 0 2px 0;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.2;
}

.banner-text p {
  margin: 0;
  opacity: 0.9;
  font-size: 0.75rem;
  line-height: 1.3;
}

.incremental-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 999px;
  padding: 8px 14px;
  color: white;
  font-weight: 500;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  flex-shrink: 0;
}

.incremental-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.incremental-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}


.error-banner {
  background: var(--danger);
  border-radius: var(--radius-field);
  padding: 12px 16px;
  color: white;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.15);
  margin-bottom: 12px;
}

.processing-banner {
  background: var(--ink);
  border-radius: var(--radius-field);
  padding: 16px;
  color: white;
  box-shadow: 0 2px 8px rgba(10, 10, 10, 0.15);
  margin-bottom: 12px;
}

.processing-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.processing-icon {
  font-size: 24px;
  animation: spin 1s linear infinite;
  flex-shrink: 0;
}

.processing-text {
  flex: 1;
}

.processing-text h4 {
  margin: 0 0 4px 0;
  font-size: 0.95rem;
  font-weight: 600;
}

.processing-text p {
  margin: 0;
  font-size: 0.85rem;
  opacity: 0.9;
  line-height: 1.4;
}

.processing-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--ink);
  border-radius: var(--radius-sm);
  transition: width 0.3s ease;
  animation: pulse 2s ease-in-out infinite;
}

.progress-text {
  font-size: 0.8rem;
  font-weight: 600;
  min-width: 45px;
  text-align: right;
}

.batch-info {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 0.8rem;
  opacity: 0.9;
}

.batch-stat {
  display: flex;
  align-items: center;
  gap: 6px;
}

.batch-stat .material-symbols-outlined {
  font-size: 16px;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

.error-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.error-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.error-text {
  flex: 1;
  min-width: 0;
}

.error-text h4 {
  margin: 0 0 2px 0;
  font-size: 0.875rem;
  font-weight: 600;
}

.error-text p {
  margin: 0;
  opacity: 0.9;
  font-size: 0.75rem;
}

.retry-btn-small {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 999px;
  padding: 6px 12px;
  color: white;
  font-weight: 500;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}

.retry-btn-small:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.button-spinner-small {
  width: 14px;
  height: 14px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@media (max-width: 768px) {
  .input-sidebar {
    min-width: auto;
    max-width: none;
  }

  .input-sidebar.collapsed {
    min-width: 60px;
    max-width: 60px;
    padding: 12px 8px;
  }

  .filter-tabs {
    flex-wrap: wrap;
  }

  .incremental-banner {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .banner-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .incremental-btn {
    width: 100%;
    justify-content: center;
  }
}

/* Add Input Form Styles */
.add-input-form {
  background: var(--bg);
  border: 2px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  margin-bottom: 12px;
  flex-shrink: 0;
  max-height: 450px;
  overflow-y: auto;
  overflow-x: hidden;
  box-shadow: 0 4px 12px rgba(10, 10, 10, 0.1);
  transition: box-shadow 0.3s ease;
}

.add-input-form:hover {
  box-shadow: var(--shadow);
}

.form-section {
  margin-bottom: 12px;
}

.form-section:last-of-type {
  margin-bottom: 0;
}

.form-section h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 8px 0;
}

.file-upload-area {
  border: 2px dashed var(--border-strong);
  border-radius: var(--radius-field);
  padding: 20px 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--surface);
  position: relative;
  overflow: hidden;
}

.file-upload-area::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(10, 10, 10, 0.05) 0%, transparent 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.file-upload-area:hover::before {
  opacity: 1;
}

.file-upload-area:hover {
  border-color: var(--ink);
  background: var(--bg);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(10, 10, 10, 0.15);
}

.upload-placeholder {
  color: var(--muted);
}

.upload-icon {
  font-size: 28px;
  margin-bottom: 6px;
  color: var(--muted);
  display: block;
}

.upload-placeholder p {
  margin: 4px 0;
  font-size: 0.875rem;
}

.file-types {
  font-size: 0.75rem;
  color: var(--muted);
}

.selected-files {
  margin-top: 8px;
  max-height: 150px;
  overflow-y: auto;
}

.selected-files h5 {
  margin: 0 0 8px 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text);
}

.file-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: white;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
}

.file-icon {
  font-size: 16px;
  color: var(--muted);
  flex-shrink: 0;
}

.file-name {
  flex: 1;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.file-size {
  font-size: 0.7rem;
  color: var(--muted);
  flex-shrink: 0;
}

.remove-file {
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  padding: 2px 4px;
  cursor: pointer;
  color: var(--muted);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.remove-file:hover {
  background: var(--sunken);
  color: var(--danger);
}

.remove-file .material-symbols-outlined {
  font-size: 16px;
}

.text-input {
  width: 100%;
  padding: 12px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-field);
  font-size: 0.875rem;
  resize: vertical;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.text-input:focus {
  outline: none;
  border-color: var(--ink);
  box-shadow: 0 0 0 4px rgba(10, 10, 10, 0.1), 0 4px 12px rgba(10, 10, 10, 0.15);
  transform: translateY(-1px);
  transition: border-color 0.2s ease;
  font-family: inherit;
  line-height: 1.5;
  box-sizing: border-box;
  min-height: 80px;
  max-height: 120px;
}

.text-input:focus {
  outline: none;
  border-color: var(--ink);
  box-shadow: 0 0 0 3px rgba(10, 10, 10, 0.1);
}

.validation-message {
  color: var(--danger);
  font-size: 0.75rem;
  text-align: center;
  padding: 8px;
  background: var(--sunken);
  border-radius: var(--radius-sm);
  margin-top: 8px;
}

.form-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.form-actions > .submit-btn {
  align-self: flex-end;
}

.processing-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #fef3c7;
  border: 1px solid var(--warning-soft);
  border-radius: var(--radius-sm);
  color: var(--danger);
  font-size: 0.875rem;
  line-height: 1.4;
}

.processing-warning .material-symbols-outlined {
  font-size: 18px;
  flex-shrink: 0;
}

.submit-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 999px;
  background: var(--ink);
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(10, 10, 10, 0.25);
  width: 100%;
  justify-content: center;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.submit-btn:hover:not(:disabled) {
  background: var(--ink);
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>