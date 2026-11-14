<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Thêm đầu vào mới</h3>
        <button class="close-btn" @click="$emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="modal-body">
        <div class="input-section">
          <h4>Tải tệp lên</h4>
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
              <p>Bấm để tải tệp lên</p>
              <p class="file-types">Hỗ trợ: DOCX, PDF, ảnh, âm thanh</p>
            </div>
          </div>
          <div v-if="selectedFiles.length > 0" class="selected-files">
            <h5>Tệp đã chọn ({{ selectedFiles.length }})</h5>
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

        <div class="input-section">
          <h4>Mô tả dự án của bạn</h4>
          <textarea
            v-model="rawText"
            placeholder="Mô tả yêu cầu, use case hoặc đặc tả hệ thống tại đây..."
            class="text-input"
            rows="6"
          ></textarea>
        </div>

        <div v-if="!canSubmit" class="validation-message">
          Vui lòng thêm ít nhất một tệp hoặc nhập nội dung để tiếp tục!
        </div>
      </div>
      <div class="modal-footer">
        <button class="cancel-btn" @click="$emit('close')">Huỷ</button>
        <button class="submit-btn" @click="handleSubmit" :disabled="!canSubmit || isAddingInput">
          <span v-if="isAddingInput" class="button-spinner-small"></span>
          {{ isAddingInput ? 'Adding...' : 'Thêm đầu vào' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AddInputModal',
  emits: ['close', 'add-inputs'],
  props: {
    isAddingInput: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      selectedFiles: [],
      rawText: '',
    }
  },
  computed: {
    canSubmit() {
      return this.selectedFiles.length > 0 || this.rawText.trim().length > 0
    },
  },
  methods: {
    /**
     * Trigger file input click
     */
    triggerFileInput() {
      this.$refs.fileInput.click()
    },

    /**
     * Handle file selection
     */
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
      event.target.value = ''
    },

    /**
     * Remove selected file
     */
    removeFile(index) {
      this.selectedFiles.splice(index, 1)
    },

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    },

    /**
     * Handle form submission
     */
    handleSubmit() {
      if (!this.canSubmit) return

      const formData = new FormData()
      if (this.selectedFiles.length > 0) {
        this.selectedFiles.forEach((file) => {
          formData.append('files', file)
        })
      }
      if (this.rawText.trim()) {
        formData.append('rawText', this.rawText.trim())
      }

      this.$emit('add-inputs', formData)
      this.resetForm()
    },

    /**
     * Reset form
     */
    resetForm() {
      this.selectedFiles = []
      this.rawText = ''
    },
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
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: var(--radius-field);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: bold;
  color: var(--text);
}

.close-btn {
  background: transparent;
  border: none;
  border-radius: 999px;
  padding: 4px;
  cursor: pointer;
  color: var(--muted);
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: var(--sunken);
  color: var(--text);
}

.modal-body {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
}

.input-section {
  margin-bottom: 20px;
}

.input-section h4 {
  font-weight: bold;
  margin-bottom: 10px;
}

.file-upload-area {
  border: 2px dashed var(--border-strong);
  border-radius: var(--radius-sm);
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 20px;
}

.file-upload-area:hover {
  border-color: var(--ink);
  background: var(--bg);
}

.upload-placeholder {
  color: var(--muted);
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 10px;
  color: var(--muted);
}

.file-types {
  font-size: 12px;
  margin-top: 8px;
  color: var(--muted);
}

.selected-files h5 {
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.file-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: var(--bg);
  border-radius: var(--radius-sm);
  margin-bottom: 4px;
}

.file-name {
  flex: 1;
  font-size: 14px;
  color: var(--text);
}

.file-size {
  font-size: 12px;
  color: var(--muted);
}

.remove-file {
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  padding: 2px;
  cursor: pointer;
  color: var(--muted);
  transition: all 0.2s ease;
}

.remove-file:hover {
  background: var(--sunken);
  color: var(--text);
}

.text-input {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  font-size: 14px;
  resize: vertical;
  transition: border-color 0.2s ease;
}

.text-input:focus {
  outline: none;
  border-color: var(--ink);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.validation-message {
  color: var(--danger);
  font-size: 14px;
  text-align: center;
  padding: 10px;
  background: var(--sunken);
  border-radius: var(--radius-sm);
  margin-top: 10px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid var(--border);
}

.cancel-btn {
  padding: 10px 20px;
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  background: white;
  color: var(--text);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-btn:hover {
  background: var(--bg);
  border-color: var(--border-strong);
}

.submit-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 999px;
  background: var(--ink);
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.submit-btn:hover:not(:disabled) {
  background: var(--ink);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.button-spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>