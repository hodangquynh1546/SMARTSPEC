<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="export-modal">
      <div class="modal-header">
        <h3>Xuất test case</h3>
        <button class="btn-icon close-btn" @click="$emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-content">
        <div class="export-description">
          <p>Cấu hình xuất: tạo trang tính, gán test case và chọn trường</p>
        </div>

        <!-- Field Selection -->
        <div class="export-options">
          <div class="option-group">
            <label class="option-label">Chọn trường để xuất</label>
            <div class="fields-grid">
              <label
                v-for="field in availableFields"
                :key="field.key"
                class="field-option"
              >
                <input
                  type="checkbox"
                  :value="field.key"
                  v-model="selectedFields"
                />
                
                <span class="field-label">{{ field.label }}</span>
              </label>
            </div>
            <div class="field-actions">
              <button class="btn-text-small" @click="selectAllFields">Chọn tất cả</button>
              <button class="btn-text-small" @click="deselectAllFields">Bỏ chọn tất cả</button>
            </div>
          </div>

          <!-- Sheets Management -->
          <div class="option-group">
            <div class="sheets-header">
              <label class="option-label">Cấu hình trang tính</label>
              <button class="btn-add-sheet" @click="addSheet">
                <span class="material-symbols-outlined">add</span>
                Thêm trang tính
              </button>
            </div>
            <div v-if="sheets.length === 0" class="empty-sheets">
              <span class="material-symbols-outlined">info</span>
              <p>Chưa có trang tính. Hãy thêm trang tính để sắp xếp dữ liệu xuất.</p>
            </div>
            <div v-else class="sheets-list">
              <div
                v-for="(sheet, index) in sheets"
                :key="sheet.id"
                class="sheet-item"
              >
                <div class="sheet-header">
                  <div class="sheet-info">
                    <input
                      v-model="sheet.name"
                      type="text"
                      class="sheet-name-input"
                      placeholder="Tên trang tính..."
                      @blur="validateSheetName(index)"
                    />
                    <span class="sheet-testcase-count">
                      {{ sheet.testCaseIds.length }} test case
                    </span>
                  </div>
                  <div class="sheet-actions">
                    <button
                      class="btn-icon-small"
                      @click="openSheetTestcaseSelector(index)"
                      title="Chọn test case"
                    >
                      <span class="material-symbols-outlined">playlist_add</span>
                    </button>
                    <button
                      class="btn-icon-small danger"
                      @click="removeSheet(index)"
                      title="Xoá trang tính"
                      :disabled="sheets.length === 1"
                    >
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
                <div v-if="sheet.testCaseIds.length > 0" class="sheet-testcases-preview">
                  <div
                    v-for="testcaseId in sheet.testCaseIds.slice(0, 3)"
                    :key="testcaseId"
                    class="preview-item"
                  >
                    {{ getTestCaseName(testcaseId) }}
                  </div>
                  <span v-if="sheet.testCaseIds.length > 3" class="preview-more">
                    +{{ sheet.testCaseIds.length - 3 }} more
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="option-group">
            <label class="option-label">Định dạng xuất</label>
            <div class="option-cards">
              <div class="option-card active">
                <div class="option-icon">
                  <span class="material-symbols-outlined">description</span>
                </div>
                <div class="option-info">
                  <h4>Báo cáo Excel chi tiết</h4>
                  <p>Đầy đủ thông tin chi tiết của test case</p>
                </div>
              </div>
            </div>
          </div>

          <div v-if="selectionMode === 'all'" class="option-group">
            <label class="option-label">Áp dụng bộ lọc hiện tại</label>
            <div class="filter-info">
              <span class="filter-status">
                {{ hasActiveFilters ? 'Sẽ áp dụng bộ lọc hiện tại' : 'Không có bộ lọc nào' }}
              </span>
              <button v-if="hasActiveFilters" class="btn-text" @click="$emit('clearFilters')">
                Xoá bộ lọc
              </button>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="modal-actions">
          <button class="btn-secondary" @click="$emit('close')">Huỷ</button>
          <button class="btn-primary export-action" @click="handleExport" :disabled="loading">
            <span class="material-symbols-outlined" v-if="!loading">download</span>
            <span class="spinner-small" v-else></span>
            {{ loading ? 'Exporting...' : 'Xuất test case' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Test Case Selector Modal for Sheets -->
    <div v-if="showTestcaseSelector" class="modal-overlay" @click.self="closeTestcaseSelector">
      <div class="testcase-selector-modal">
        <div class="modal-header">
          <h3>Chọn test case cho {{ sheets[currentSheetIndex]?.name }}</h3>
          <button class="btn-icon close-btn" @click="closeTestcaseSelector">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-content">
          <!-- Tabs for Test Cases / Use Cases -->
          <div class="selector-tabs">
            <button
              class="tab-button"
              :class="{ active: selectorTab === 'testcases' }"
              @click="selectorTab = 'testcases'"
            >
              <span class="material-symbols-outlined">playlist_add</span>
              Test case
            </button>
            <button
              class="tab-button"
              :class="{ active: selectorTab === 'usecases' }"
              @click="selectorTab = 'usecases'"
            >
              <span class="material-symbols-outlined">list_alt</span>
              Use case
            </button>
          </div>

          <!-- Test Cases Tab -->
          <div v-if="selectorTab === 'testcases'" class="tab-content">
            <div class="search-box">
              <span class="material-symbols-outlined">search</span>
              <input
                v-model="testcaseSearchQuery"
                type="text"
                placeholder="Tìm test case..."
                class="search-input"
              />
            </div>
            <div class="testcase-list-container">
              <div class="testcase-list">
                <label
                  v-for="testcase in filteredTestCasesForSheet"
                  :key="testcase._id || testcase.id"
                  class="testcase-option"
                >
                  <input
                    type="checkbox"
                    :value="String(testcase._id || testcase.id)"
                    :checked="isTestcaseSelected(testcase, currentSheetIndex)"
                    @change="toggleTestcaseForSheet(testcase, currentSheetIndex)"
                  />
                  
                  <div class="testcase-info">
                    <span class="testcase-title">{{ testcase.title || testcase.name }}</span>
                    <span class="testcase-desc">{{ testcase.description || 'Chưa có mô tả' }}</span>
                  </div>
                </label>
                <div v-if="filteredTestCasesForSheet.length === 0" class="empty-testcases">
                  <span class="material-symbols-outlined">search_off</span>
                  <p>Không tìm thấy test case</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Use Cases Tab -->
          <div v-if="selectorTab === 'usecases'" class="tab-content">
            <div class="search-box">
              <span class="material-symbols-outlined">search</span>
              <input
                v-model="usecaseSearchQueryInSelector"
                type="text"
                placeholder="Tìm use case..."
                class="search-input"
              />
            </div>
            <div class="usecase-list-container">
              <div class="usecase-list">
                <div
                  v-for="usecase in filteredUseCasesInSelector"
                  :key="getUsecaseId(usecase)"
                  class="usecase-option-group"
                >
                  <div class="usecase-option-header">
                    <label class="usecase-checkbox-wrapper" @click.stop>
                      <input
                        type="checkbox"
                        :checked="isUsecaseFullySelected(usecase, currentSheetIndex)"
                        :indeterminate="isUsecasePartiallySelected(usecase, currentSheetIndex)"
                        @change="toggleUsecaseSelection(usecase, currentSheetIndex)"
                      />
                      
                    </label>
                    <div 
                      class="usecase-option clickable"
                      @click="toggleUsecaseExpand(usecase)"
                    >
                      <div class="usecase-info">
                        <div class="usecase-header">
                          <span class="usecase-name">{{ usecase.name }}</span>
                          <span class="usecase-badge" :class="{ 'badge-zero': getUsecaseTestCasesCount(usecase) === 0 }">
                            {{ getUsecaseTestCasesCount(usecase) }} test case
                          </span>
                        </div>
                        <span class="usecase-goal">{{ usecase.goal || 'Chưa có mục tiêu' }}</span>
                      </div>
                      <span class="material-symbols-outlined expand-icon" :class="{ expanded: isUsecaseExpanded(usecase) }">
                        expand_more
                      </span>
                    </div>
                  </div>
                  <!-- Expanded Test Cases List -->
                  <div v-if="isUsecaseExpanded(usecase)" class="usecase-testcases-list">
                    <label
                      v-for="testcase in getUsecaseTestCases(usecase)"
                      :key="testcase._id || testcase.id"
                      class="testcase-option nested"
                      @click.stop
                    >
                      <input
                        type="checkbox"
                        :value="String(testcase._id || testcase.id)"
                        :checked="isTestcaseSelected(testcase, currentSheetIndex)"
                        @change="toggleTestcaseForSheet(testcase, currentSheetIndex)"
                      />
                      
                      <div class="testcase-info">
                        <span class="testcase-title">{{ testcase.title || testcase.name }}</span>
                        <span class="testcase-desc">{{ testcase.description || 'Chưa có mô tả' }}</span>
                      </div>
                    </label>
                    <div v-if="getUsecaseTestCases(usecase).length === 0" class="empty-testcases-nested">
                      <span class="material-symbols-outlined">info</span>
                      <p>Use case này chưa có test case</p>
                    </div>
                  </div>
                </div>
                <div v-if="filteredUseCasesInSelector.length === 0" class="empty-usecases">
                  <span class="material-symbols-outlined">search_off</span>
                  <p>Không tìm thấy use case</p>
                </div>
              </div>
            </div>
          </div>

          <div class="selected-count">
            {{ getSelectedCountForSheet(currentSheetIndex) }} test case đã chọn
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="closeTestcaseSelector">Huỷ</button>
          <button class="btn-primary" @click="closeTestcaseSelector">Xong</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'

export default {
  name: 'ExportOptionsPanel',
  props: {
    projectId: {
      type: String,
      required: true,
    },
    versionId: {
      type: String,
      default: null,
    },
    filters: {
      type: Object,
      default: () => ({}),
    },
    loading: {
      type: Boolean,
      default: false,
    },
    testCases: {
      type: Array,
      default: () => [],
    },
    requirements: {
      type: Array,
      default: () => [],
    },
    selectedTestCases: {
      type: Array,
      default: () => [],
    },
  },
  emits: ['export', 'close', 'clearFilters'],
  setup(props, { emit }) {
    const toast = useToast()

    const selectorTab = ref('testcases') // 'testcases' or 'usecases'
    const usecaseSearchQueryInSelector = ref('')
    const expandedUsecases = ref(new Set()) // Track expanded usecases

    // Available fields for export
    const availableFields = [
      { key: 'test_case_id', label: 'Mã test case', required: true },
      { key: 'test_case_name', label: 'Test Case Name/Title', required: true },
      { key: 'description', label: 'Mô tả' },
      { key: 'module_feature', label: 'Phân hệ/Tính năng' },
      { key: 'test_priority', label: 'Độ ưu tiên kiểm thử' },
      { key: 'preconditions', label: 'Điều kiện tiên quyết' },
      { key: 'test_data', label: 'Dữ liệu kiểm thử' },
      { key: 'test_steps', label: 'Các bước kiểm thử' },
      { key: 'expected_result', label: 'Kết quả mong đợi' },
      { key: 'actual_result', label: 'Kết quả thực tế' },
      { key: 'status', label: 'Trạng thái' },
    ]

    const selectedFields = ref(
      availableFields.filter((f) => f.required).map((f) => f.key)
    )

    // Sheets management
    const sheets = ref([
      {
        id: Date.now(),
        name: 'Trang tính 1',
        testCaseIds: [],
      },
    ])

    const showTestcaseSelector = ref(false)
    const currentSheetIndex = ref(0)
    const testcaseSearchQuery = ref('')

    const hasActiveFilters = computed(() => {
      return Object.keys(props.filters).some(
        (key) =>
          props.filters[key] !== undefined &&
          props.filters[key] !== null &&
          props.filters[key] !== ''
      )
    })

    const filteredUseCasesInSelector = computed(() => {
      if (!usecaseSearchQueryInSelector.value) {
        return props.requirements || []
      }
      const query = usecaseSearchQueryInSelector.value.toLowerCase()
      return (props.requirements || []).filter(
        (uc) =>
          uc.name?.toLowerCase().includes(query) ||
          uc.goal?.toLowerCase().includes(query) ||
          String(uc._id || uc.id || '').toLowerCase().includes(query)
      )
    })

    const getUsecaseId = (usecase) => {
      return String(usecase._id || usecase.id || '')
    }

    const getTestCaseName = (testcaseId) => {
      const testcase = (props.testCases || []).find(
        (tc) => String(tc._id || tc.id || '') === String(testcaseId)
      )
      return testcase?.title || testcase?.name || `Test Case ${String(testcaseId).substring(0, 8)}...`
    }

    // Get available testcases - always returns all testcases
    const getAvailableTestCases = computed(() => {
      return props.testCases || []
    })

    // Normalize ID for comparison (handle ObjectId, string, etc.)
    const normalizeId = (id) => {
      if (!id) return ''
      // If it's an object with toString method (like ObjectId), use toString
      if (typeof id === 'object' && id.toString) {
        return String(id.toString())
      }
      return String(id).trim()
    }

    // Check if two IDs match (case-insensitive, handle various formats)
    const idsMatch = (id1, id2) => {
      const normalized1 = normalizeId(id1)
      const normalized2 = normalizeId(id2)
      if (!normalized1 || !normalized2) return false
      return normalized1 === normalized2 || normalized1.toLowerCase() === normalized2.toLowerCase()
    }

    const getUsecaseTestCasesCount = (usecase) => {
      const usecaseId = normalizeId(usecase._id || usecase.id || usecase.requirement_id)
      if (!usecaseId) return 0
      
      return (props.testCases || []).filter((tc) => {
        const reqIds = tc.source_requirement_ids || []
        return reqIds.some((reqId) => idsMatch(reqId, usecaseId))
      }).length
    }

    const addUsecaseTestCases = (usecase, sheetIndex) => {
      const usecaseId = normalizeId(usecase._id || usecase.id || usecase.requirement_id)
      const sheet = sheets.value[sheetIndex]
      
      if (!sheet) {
        toast.error('Không tìm thấy trang tính')
        return
      }
      
      if (!usecaseId) {
        toast.error(`Mã use case không hợp lệ: ${usecase.name}`)
        return
      }
      
      // Get all testcases for this usecase
      const usecaseTestCases = (props.testCases || []).filter((tc) => {
        const reqIds = tc.source_requirement_ids || []
        return reqIds.some((reqId) => idsMatch(reqId, usecaseId))
      })

      console.log('🔍 Add usecase testcases:', {
        usecaseId,
        usecaseName: usecase.name,
        usecaseFull: usecase,
        totalTestCases: props.testCases?.length || 0,
        foundTestCases: usecaseTestCases.length,
        sampleTestCases: usecaseTestCases.slice(0, 3).map(tc => ({
          id: tc._id || tc.id,
          title: tc.title,
          reqIds: tc.source_requirement_ids,
          normalizedReqIds: (tc.source_requirement_ids || []).map(normalizeId)
        })),
        sampleAllTestCases: (props.testCases || []).slice(0, 2).map(tc => ({
          id: tc._id || tc.id,
          title: tc.title,
          reqIds: tc.source_requirement_ids,
          normalizedReqIds: (tc.source_requirement_ids || []).map(normalizeId)
        }))
      })

      if (usecaseTestCases.length === 0) {
        toast.warning(`Không có test case cho use case: ${usecase.name} (ID: ${usecaseId})`)
        return
      }

      // Add all testcases from this usecase (skip if already exists)
      let addedCount = 0
      usecaseTestCases.forEach((tc) => {
        const tcId = normalizeId(tc._id || tc.id)
        if (!tcId) return
        
        // Check if already in sheet
        const alreadyExists = sheet.testCaseIds.some((existingId) => idsMatch(existingId, tcId))
        if (!alreadyExists) {
          sheet.testCaseIds.push(tcId)
          addedCount++
        }
      })

      if (addedCount > 0) {
        toast.success(`Đã thêm ${addedCount} test case từ ${usecase.name}`)
      } else {
        toast.info('Mọi test case của use case này đã có trong trang tính')
      }
    }

    // Get testcases for a usecase
    const getUsecaseTestCases = (usecase) => {
      const usecaseId = normalizeId(usecase._id || usecase.id || usecase.requirement_id)
      if (!usecaseId) return []
      
      return (props.testCases || []).filter((tc) => {
        const reqIds = tc.source_requirement_ids || []
        return reqIds.some((reqId) => idsMatch(reqId, usecaseId))
      })
    }

    // Check if usecase is fully selected (all testcases selected)
    const isUsecaseFullySelected = (usecase, sheetIndex) => {
      const usecaseTestCases = getUsecaseTestCases(usecase)
      if (usecaseTestCases.length === 0) return false
      
      const sheet = sheets.value[sheetIndex]
      if (!sheet) return false
      
      return usecaseTestCases.every((tc) => {
        const tcId = normalizeId(tc._id || tc.id)
        return sheet.testCaseIds.some((id) => idsMatch(id, tcId))
      })
    }

    // Check if usecase is partially selected (some but not all testcases selected)
    const isUsecasePartiallySelected = (usecase, sheetIndex) => {
      const usecaseTestCases = getUsecaseTestCases(usecase)
      if (usecaseTestCases.length === 0) return false
      
      const sheet = sheets.value[sheetIndex]
      if (!sheet) return false
      
      const selectedCount = usecaseTestCases.filter((tc) => {
        const tcId = normalizeId(tc._id || tc.id)
        return sheet.testCaseIds.some((id) => idsMatch(id, tcId))
      }).length
      
      return selectedCount > 0 && selectedCount < usecaseTestCases.length
    }

    // Toggle usecase selection (select/deselect all testcases)
    const toggleUsecaseSelection = (usecase, sheetIndex) => {
      const usecaseTestCases = getUsecaseTestCases(usecase)
      const sheet = sheets.value[sheetIndex]
      
      if (!sheet) return
      
      const isFullySelected = isUsecaseFullySelected(usecase, sheetIndex)
      
      if (isFullySelected) {
        // Deselect all testcases
        usecaseTestCases.forEach((tc) => {
          const tcId = normalizeId(tc._id || tc.id)
          if (!tcId) return
          
          const existingIndex = sheet.testCaseIds.findIndex((id) => idsMatch(id, tcId))
          if (existingIndex > -1) {
            sheet.testCaseIds.splice(existingIndex, 1)
          }
        })
      } else {
        // Select all testcases
        usecaseTestCases.forEach((tc) => {
          const tcId = normalizeId(tc._id || tc.id)
          if (!tcId) return
          
          const alreadyExists = sheet.testCaseIds.some((id) => idsMatch(id, tcId))
          if (!alreadyExists) {
            sheet.testCaseIds.push(tcId)
          }
        })
      }
    }

    // Toggle usecase expand/collapse
    const toggleUsecaseExpand = (usecase) => {
      const usecaseId = getUsecaseId(usecase)
      if (expandedUsecases.value.has(usecaseId)) {
        expandedUsecases.value.delete(usecaseId)
      } else {
        expandedUsecases.value.add(usecaseId)
      }
    }

    // Check if usecase is expanded
    const isUsecaseExpanded = (usecase) => {
      const usecaseId = getUsecaseId(usecase)
      return expandedUsecases.value.has(usecaseId)
    }

    // Field selection methods
    const selectAllFields = () => {
      selectedFields.value = availableFields.map((f) => f.key)
    }

    const deselectAllFields = () => {
      selectedFields.value = availableFields.filter((f) => f.required).map((f) => f.key)
    }

    // Sheet management methods
    const addSheet = () => {
      sheets.value.push({
        id: Date.now() + Math.random(),
        name: `Sheet ${sheets.value.length + 1}`,
        testCaseIds: [],
      })
    }

    const removeSheet = (index) => {
      if (sheets.value.length > 1) {
        sheets.value.splice(index, 1)
      } else {
        toast.warning('Cần ít nhất một trang tính')
      }
    }

    const validateSheetName = (index) => {
      const sheet = sheets.value[index]
      if (!sheet.name || sheet.name.trim() === '') {
        sheet.name = `Sheet ${index + 1}`
        toast.warning('Tên trang tính không được để trống')
      }
    }

    const openSheetTestcaseSelector = (index) => {
      currentSheetIndex.value = index
      showTestcaseSelector.value = true
    }

    const closeTestcaseSelector = () => {
      showTestcaseSelector.value = false
      testcaseSearchQuery.value = ''
    }


    const filteredTestCasesForSheet = computed(() => {
      let testcases = getAvailableTestCases.value
      if (testcaseSearchQuery.value) {
        const query = testcaseSearchQuery.value.toLowerCase()
        testcases = testcases.filter(
          (tc) =>
            tc.title?.toLowerCase().includes(query) ||
            tc.description?.toLowerCase().includes(query) ||
            String(tc._id || tc.id).toLowerCase().includes(query)
        )
      }
      return testcases
    })

    const isTestcaseSelected = (testcase, sheetIndex) => {
      const testcaseId = normalizeId(testcase._id || testcase.id)
      const sheet = sheets.value[sheetIndex]
      if (!sheet) return false
      return sheet.testCaseIds.some((id) => idsMatch(id, testcaseId))
    }

    const toggleTestcaseForSheet = (testcase, sheetIndex) => {
      const testcaseId = normalizeId(testcase._id || testcase.id)
      const sheet = sheets.value[sheetIndex]
      if (!sheet) return
      
      const existingIndex = sheet.testCaseIds.findIndex((id) => idsMatch(id, testcaseId))
      if (existingIndex > -1) {
        sheet.testCaseIds.splice(existingIndex, 1)
      } else {
        sheet.testCaseIds.push(testcaseId)
      }
    }

    const getSelectedCountForSheet = (sheetIndex) => {
      return sheets.value[sheetIndex]?.testCaseIds.length || 0
    }

    const handleExport = () => {
      if (!props.projectId) {
        toast.error('Cần mã dự án để xuất')
        return
      }

      // Validate fields
      if (selectedFields.value.length === 0) {
        toast.warning('Vui lòng chọn ít nhất một trường để xuất')
        return
      }

      // Validate sheets
      const hasTestCases = sheets.value.some((sheet) => sheet.testCaseIds.length > 0)
      if (!hasTestCases) {
        toast.warning('Vui lòng thêm test case vào ít nhất một trang tính')
        return
      }

      // Validate sheet names
      const invalidSheets = sheets.value.filter(
        (sheet) => !sheet.name || sheet.name.trim() === ''
      )
      if (invalidSheets.length > 0) {
        toast.warning('Vui lòng đặt tên cho tất cả trang tính')
        return
      }

      const exportConfig = {
        type: 'testcases',
        title: 'Xuất test case',
        sheets: sheets.value.map((sheet) => ({
          name: sheet.name,
          testCaseIds: sheet.testCaseIds,
        })),
        fields: selectedFields.value,
        options: {
          ...props.filters,
          versionId: props.versionId,
        },
      }

      emit('export', exportConfig)
    }

    return {
      hasActiveFilters,
      selectorTab,
      usecaseSearchQueryInSelector,
      filteredUseCasesInSelector,
      getUsecaseId,
      getTestCaseName,
      getUsecaseTestCasesCount,
      addUsecaseTestCases,
      getUsecaseTestCases,
      isUsecaseFullySelected,
      isUsecasePartiallySelected,
      toggleUsecaseSelection,
      toggleUsecaseExpand,
      isUsecaseExpanded,
      handleExport,
      // Fields
      availableFields,
      selectedFields,
      selectAllFields,
      deselectAllFields,
      // Sheets
      sheets,
      addSheet,
      removeSheet,
      validateSheetName,
      openSheetTestcaseSelector,
      showTestcaseSelector,
      currentSheetIndex,
      closeTestcaseSelector,
      getAvailableTestCases,
      testcaseSearchQuery,
      filteredTestCasesForSheet,
      isTestcaseSelected,
      toggleTestcaseForSheet,
      getSelectedCountForSheet,
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
}

.export-modal {
  background: white;
  border-radius: var(--radius-field);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border);
}

.modal-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0;
}

.close-btn {
  color: var(--muted);
}

.close-btn:hover {
  color: var(--text);
  background: var(--sunken);
}

.modal-content {
  padding: 1.5rem;
}

.export-description {
  text-align: center;
  margin-bottom: 1.5rem;
}

.export-description p {
  color: var(--muted);
  margin: 0;
  line-height: 1.5;
}

.export-options {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.option-label {
  font-weight: 600;
  color: var(--text);
  font-size: 0.875rem;
}

.option-cards {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.option-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  border: 2px solid var(--border);
  border-radius: var(--radius-sm);
  background: white;
  transition: all 0.2s ease;
  cursor: pointer;
}

.option-card.active {
  border-color: var(--ink);
  background: var(--bg);
}

.option-card:hover:not(.active) {
  border-color: var(--border-strong);
}

.option-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ink);
  color: white;
  flex-shrink: 0;
}

.option-info h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 0.25rem 0;
}

.option-info p {
  font-size: 0.75rem;
  color: var(--muted);
  margin: 0;
  line-height: 1.4;
}

.checkbox-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.checkbox-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  color: var(--text);
  font-size: 0.875rem;
}

.checkbox-option input {
  display: none;
}

.checkmark {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border-strong);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.checkbox-option input:checked + .checkmark {
  background: var(--ink);
  border-color: var(--ink);
}

.checkbox-option input:checked + .checkmark::after {
  content: '✓';
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.filter-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: var(--bg);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.filter-status {
  font-size: 0.875rem;
  color: var(--muted);
}

.btn-text {
  background: none;
  border: none;
  color: var(--ink);
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
}

.btn-text:hover {
  background: var(--sunken);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
}

.btn-primary,
.btn-secondary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 999px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.btn-primary {
  background: var(--ink);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--ink);
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: var(--text);
  border: 1px solid var(--border-strong);
}

.btn-secondary:hover {
  background: var(--bg);
  border-color: var(--border-strong);
}

.export-action {
  min-width: 140px;
  justify-content: center;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid white;
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

/* Selection Mode Styles */
.selection-mode {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.radio-option {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 2px solid var(--border);
  border-radius: var(--radius-sm);
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.radio-option:hover {
  border-color: var(--border-strong);
  background: var(--bg);
}

.radio-option input[type="radio"] {
  margin-top: 0.125rem;
  accent-color: #1a365d;
  cursor: pointer;
}

.radio-option input[type="radio"]:checked + .radio-label .radio-title {
  color: var(--ink);
  font-weight: 600;
}

.radio-option:has(input[type="radio"]:checked) {
  border-color: var(--ink);
  background: var(--sunken);
}

.radio-label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.radio-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text);
}

.radio-desc {
  font-size: 0.75rem;
  color: var(--muted);
}

/* Selected Test Cases */
.selection-count {
  font-weight: 400;
  color: var(--muted);
  font-size: 0.75rem;
}

.empty-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  background: var(--bg);
  border-radius: var(--radius-sm);
  border: 1px dashed var(--border-strong);
}

.empty-selection .material-symbols-outlined {
  font-size: 2rem;
  color: var(--muted);
  margin-bottom: 0.5rem;
}

.empty-selection p {
  margin: 0;
  color: var(--muted);
  font-size: 0.875rem;
}

.selected-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.5rem;
  background: var(--bg);
}

.selected-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  background: white;
  margin-bottom: 0.25rem;
}

.selected-item:last-child {
  margin-bottom: 0;
}

.selected-item .material-symbols-outlined {
  font-size: 1.25rem;
  color: var(--success);
}

.item-name {
  font-size: 0.875rem;
  color: var(--text);
  flex: 1;
}

/* Use Case Selector */
.usecase-selector {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-box .material-symbols-outlined {
  position: absolute;
  left: 0.75rem;
  color: var(--muted);
  font-size: 1.25rem;
}

.search-box .search-input {
  width: 100%;
  padding: 0.75rem 0.75rem 0.75rem 2.5rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  transition: border-color 0.2s;
}

.search-box .search-input:focus {
  outline: none;
  border-color: var(--ink);
  box-shadow: 0 0 0 3px rgba(10, 10, 10, 0.1);
}

.usecase-list {
  max-height: 250px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.5rem;
  background: var(--bg);
}

.usecase-option-group {
  margin-bottom: 0.5rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: white;
  overflow: hidden;
}

.usecase-option-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.usecase-checkbox-wrapper {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  cursor: pointer;
  flex-shrink: 0;
}

.usecase-checkbox-wrapper input[type="checkbox"] {
  margin: 0;
  accent-color: #1a365d;
  cursor: pointer;
  width: 18px;
  height: 18px;
}

.usecase-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem;
  padding-left: 0;
  border-radius: var(--radius-sm);
  cursor: default;
  transition: all 0.2s;
  flex: 1;
  background: transparent;
  border: none;
}

.usecase-option.clickable {
  cursor: pointer;
}

.usecase-option.clickable:hover {
  background: var(--sunken);
}

.usecase-option input[type="checkbox"] {
  margin-top: 0.125rem;
  accent-color: #1a365d;
  cursor: pointer;
}

.usecase-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.usecase-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background: var(--sunken);
  color: var(--ink);
  border-radius: var(--radius-field);
  font-weight: 500;
  white-space: nowrap;
}

.usecase-badge.badge-zero {
  background: var(--sunken);
  color: var(--muted);
}

.expand-icon {
  color: var(--muted);
  font-size: 1.5rem;
  flex-shrink: 0;
  transition: transform 0.2s;
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.usecase-testcases-list {
  padding: 0.5rem 0.75rem 0.75rem 2.5rem;
  background: var(--bg);
  border-top: 1px solid var(--border);
}

.testcase-option.nested {
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  background: white;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.testcase-option.nested:hover {
  background: var(--sunken);
  border-color: var(--border-strong);
}

.empty-testcases-nested {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  text-align: center;
  color: var(--muted);
}

.empty-testcases-nested .material-symbols-outlined {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.empty-testcases-nested p {
  margin: 0;
  font-size: 0.75rem;
}

.usecase-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.usecase-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text);
}

.usecase-goal {
  font-size: 0.75rem;
  color: var(--muted);
  line-height: 1.4;
}

.empty-usecases {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
}

.empty-usecases .material-symbols-outlined {
  font-size: 2rem;
  color: var(--muted);
  margin-bottom: 0.5rem;
}

.empty-usecases p {
  margin: 0;
  color: var(--muted);
  font-size: 0.875rem;
}

.selected-usecases-summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--sunken);
  border-radius: var(--radius-sm);
  color: var(--ink);
  font-size: 0.875rem;
  font-weight: 500;
}

.selected-usecases-summary .material-symbols-outlined {
  font-size: 1.25rem;
}

/* Fields Selection */
.fields-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--bg);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.field-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  transition: background-color 0.2s;
}

.field-option:hover {
  background: white;
}

.field-option input[type="checkbox"] {
  accent-color: #1a365d;
}

.field-label {
  font-size: 0.875rem;
  color: var(--text);
}

.field-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.btn-text-small {
  background: none;
  border: none;
  color: var(--ink);
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
}

.btn-text-small:hover {
  background: var(--sunken);
}

/* Sheets Management */
.sheets-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.btn-add-sheet {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--ink);
  color: white;
  border: none;
  border-radius: 999px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-sheet:hover {
  background: var(--ink);
}

.empty-sheets {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  background: var(--bg);
  border-radius: var(--radius-sm);
  border: 1px dashed var(--border-strong);
}

.empty-sheets .material-symbols-outlined {
  font-size: 2rem;
  color: var(--muted);
  margin-bottom: 0.5rem;
}

.empty-sheets p {
  margin: 0;
  color: var(--muted);
  font-size: 0.875rem;
}

.sheets-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.sheet-item {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 1rem;
  background: white;
}

.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.sheet-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.sheet-name-input {
  padding: 0.5rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-weight: 500;
  width: 100%;
  max-width: 300px;
}

.sheet-name-input:focus {
  outline: none;
  border-color: var(--ink);
  box-shadow: 0 0 0 3px rgba(10, 10, 10, 0.1);
}

.sheet-testcase-count {
  font-size: 0.75rem;
  color: var(--muted);
}

.sheet-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-icon-small {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--sunken);
  color: var(--muted);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon-small:hover {
  background: var(--sunken);
  color: var(--text);
}

.btn-icon-small.danger {
  color: var(--danger);
}

.btn-icon-small.danger:hover {
  background: var(--sunken);
}

.btn-icon-small:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sheet-testcases-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border);
}

.preview-item {
  padding: 0.25rem 0.5rem;
  background: var(--sunken);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  color: var(--text);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-more {
  padding: 0.25rem 0.5rem;
  background: var(--sunken);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  color: var(--ink);
  font-weight: 500;
}

/* Test Case Selector Modal */
.testcase-selector-modal {
  background: white;
  border-radius: var(--radius-field);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.testcase-list-container {
  flex: 1;
  overflow-y: auto;
  max-height: 400px;
}

.testcase-list {
  padding: 0.5rem;
}

.testcase-option {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color 0.2s;
  margin-bottom: 0.25rem;
  background: white;
  border: 1px solid transparent;
}

.testcase-option:hover {
  background: var(--sunken);
  border-color: var(--border-strong);
}

.testcase-option input[type="checkbox"] {
  margin-top: 0.125rem;
  accent-color: #1a365d;
  cursor: pointer;
}

.testcase-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.testcase-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text);
}

.testcase-desc {
  font-size: 0.75rem;
  color: var(--muted);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.empty-testcases {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
}

.empty-testcases .material-symbols-outlined {
  font-size: 2rem;
  color: var(--muted);
  margin-bottom: 0.5rem;
}

.empty-testcases p {
  margin: 0;
  color: var(--muted);
  font-size: 0.875rem;
}

.selected-count {
  padding: 0.75rem 1rem;
  background: var(--sunken);
  color: var(--ink);
  font-size: 0.875rem;
  font-weight: 500;
  border-top: 1px solid var(--border);
}

@media (max-width: 768px) {
  .export-modal {
    width: 95%;
    margin: 1rem;
    max-width: 100%;
  }

  .modal-header,
  .modal-content {
    padding: 1rem;
  }

  .modal-actions {
    flex-direction: column;
  }

  .btn-primary,
  .btn-secondary {
    justify-content: center;
  }

  .usecase-list {
    max-height: 200px;
  }

  .selected-list {
    max-height: 150px;
  }

  .fields-grid {
    grid-template-columns: 1fr;
  }

  .testcase-selector-modal {
    width: 95%;
  }

  .selector-tabs {
    flex-direction: column;
  }

  .tab-content {
    min-height: 200px;
  }
}

/* Selector Tabs */
.selector-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  border-bottom: 2px solid var(--border);
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--muted);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: -2px;
}

.tab-button:hover {
  color: var(--ink);
  background: var(--bg);
}

.tab-button.active {
  color: var(--ink);
  border-bottom-color: var(--ink);
}

.tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.usecase-list-container {
  flex: 1;
  overflow-y: auto;
  max-height: 400px;
}
</style>