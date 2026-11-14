<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content large">
      <div class="modal-header">
        <h2>Select Requirements</h2>
        <button class="btn-close" @click="$emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-body">
        <div class="selector-container">
          <!-- Loading State -->
          <div v-if="loading" class="loading-state">
            <div class="spinner"></div>
            <p>Loading requirements...</p>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="error-state">
            <span class="material-symbols-outlined error-icon">error</span>
            <p>{{ error }}</p>
            <button class="btn btn-primary" @click="loadRequirements">Retry</button>
          </div>

          <!-- Content -->
          <div v-else>
            <div class="search-section">
              <div class="search-input-group">
                <span class="material-symbols-outlined search-icon">search</span>
                <input
                  v-model="searchQuery"
                  type="text"
                  class="search-input"
                  placeholder="Search by use case name or description..."
                />
              </div>
              <div class="filter-controls">
                <select v-model="statusFilter" class="form-select small">
                  <option value="all">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
                <select v-model="priorityFilter" class="form-select small">
                  <option value="all">All Priority</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div class="requirements-grid">
              <div class="available-requirements">
                <h3 class="section-subtitle">
                  Available Requirements
                  <span class="total-count">({{ filteredRequirements.length }})</span>
                </h3>
                <div class="requirements-list">
                  <div
                    v-for="requirement in filteredRequirements"
                    :key="requirement._id || requirement.id"
                    :class="[
                      'requirement-card',
                      isRequirementSelected(requirement) ? 'selected' : '',
                    ]"
                    @click="toggleRequirement(requirement)"
                  >
                    <div class="requirement-header">
                      <div class="requirement-info">
                        <h4 class="requirement-id">
                          {{ requirement.title || requirement.name || 'Unnamed Requirement' }}
                        </h4>
                        <span :class="['status-badge', requirement.status]">
                          {{ requirement.status }}
                        </span>
                        <span :class="['priority-badge', requirement.priority]">
                          {{ requirement.priority }}
                        </span>
                      </div>
                      <div class="requirement-checkbox">
                        <input
                          type="checkbox"
                          :checked="isRequirementSelected(requirement)"
                          @change="toggleRequirement(requirement)"
                        />
                        <span class="checkmark"></span>
                      </div>
                    </div>

                    <h5 class="requirement-title">{{ requirement.title }}</h5>
                    <p class="requirement-description">{{ requirement.description }}</p>

                    <div class="requirement-meta">
                      <div class="meta-item">
                        <span class="material-symbols-outlined meta-icon">person</span>
                        <span class="meta-text">{{ requirement.owner || 'Unknown' }}</span>
                      </div>
                      <div class="meta-item">
                        <span class="material-symbols-outlined meta-icon">event</span>
                        <span class="meta-text">{{ formatDate(requirement.created_at) }}</span>
                      </div>
                      <div class="meta-item" v-if="requirement.test_cases_count > 0">
                        <span class="material-symbols-outlined meta-icon">checklist</span>
                        <span class="meta-text">{{ requirement.test_cases_count }} test cases</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Empty State for Requirements -->
                <div v-if="filteredRequirements.length === 0 && !loading" class="empty-state">
                  <span class="material-symbols-outlined empty-icon">description</span>
                  <p>No requirements available. Use cases will appear here once they are created.</p>
                  <span class="empty-hint">Try adjusting your search or filters</span>
                </div>
              </div>

              <div class="selected-section">
                <h3 class="section-subtitle">
                  Selected Requirements
                  <span class="selected-count">({{ selectedRequirements.length }})</span>
                </h3>
                <div class="selected-requirements-list">
                  <div
                    v-for="requirement in selectedRequirements"
                    :key="requirement._id || requirement.id"
                    class="selected-requirement-item"
                  >
                    <div class="selected-req-info">
                      <span class="req-id">{{ requirement.requirement_id || requirement.id }}</span>
                      <span class="req-title">{{ requirement.title }}</span>
                    </div>
                    <button
                      type="button"
                      class="btn-icon danger"
                      @click="removeRequirement(requirement)"
                    >
                      <span class="material-symbols-outlined">close</span>
                    </button>
                  </div>
                  <div v-if="selectedRequirements.length === 0" class="empty-state">
                    <span class="material-symbols-outlined empty-icon">description</span>
                    <p>No requirements selected</p>
                    <span class="empty-hint">Select requirements from the left panel</span>
                  </div>
                </div>

                <div class="coverage-stats" v-if="selectedRequirements.length > 0">
                  <h4>Coverage Summary</h4>
                  <div class="stats-grid">
                    <div class="stat-item">
                      <span class="stat-value">{{ selectedRequirements.length }}</span>
                      <span class="stat-label">Selected</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-value">{{ coverageStats.highPriority }}</span>
                      <span class="stat-label">High Priority</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-value">{{ coverageStats.approved }}</span>
                      <span class="stat-label">Approved</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="$emit('close')">Cancel</button>
          <button
            class="btn btn-primary"
            @click="applySelection"
            :disabled="selectedRequirements.length === 0 || loading"
          >
            Select {{ selectedRequirements.length }} Requirement(s)
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { usecaseApi } from '@/api/project.js'

export default {
  name: 'RequirementSelectorModal',
  props: {
    projectId: String,
    versionId: String,
  },
  emits: ['close', 'select-requirements'],
  setup(props, { emit }) {
    const toast = useToast()
    const searchQuery = ref('')
    const statusFilter = ref('all')
    const priorityFilter = ref('all')
    const selectedRequirements = ref([])
    const requirements = ref([])
    const loading = ref(false)
    const error = ref(null)

    const filteredRequirements = computed(() => {
      let filtered = requirements.value

      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        filtered = filtered.filter(
          (req) => {
            const reqId = String(req.requirement_id || req._id || req.id || '')
            return reqId.toLowerCase().includes(query) ||
            req.name?.toLowerCase().includes(query) ||
            req.title?.toLowerCase().includes(query) ||
            (req.goal && req.goal.toLowerCase().includes(query))
          }
        )
      }

      if (statusFilter.value !== 'all') {
        filtered = filtered.filter((req) => req.status === statusFilter.value)
      }

      if (priorityFilter.value !== 'all') {
        filtered = filtered.filter((req) => req.priority === priorityFilter.value)
      }

      return filtered
    })

    const coverageStats = computed(() => {
      return {
        highPriority: selectedRequirements.value.filter((req) => req.priority === 'high').length,
        approved: selectedRequirements.value.filter((req) => req.status === 'approved').length,
      }
    })

    // Helper: Get requirement ID (support both requirement_id and id)
    const getRequirementId = (req) => {
      return String(req.requirement_id || req._id || req.id || '')
    }

    const isRequirementSelected = (requirement) => {
      const reqId = getRequirementId(requirement)
      return selectedRequirements.value.some((selected) => {
        const selectedId = getRequirementId(selected)
        return selectedId === reqId && selectedId !== ''
      })
    }

    const toggleRequirement = (requirement) => {
      const isSelected = isRequirementSelected(requirement)
      if (isSelected) {
        const reqId = getRequirementId(requirement)
        selectedRequirements.value = selectedRequirements.value.filter(
          (selected) => getRequirementId(selected) !== reqId
        )
      } else {
        selectedRequirements.value.push(requirement)
      }
    }

    const removeRequirement = (requirement) => {
      const reqId = getRequirementId(requirement)
      selectedRequirements.value = selectedRequirements.value.filter(
        (selected) => getRequirementId(selected) !== reqId
      )
    }

    const formatDate = (dateString) => {
      if (!dateString) return 'Unknown date'
      return new Date(dateString).toLocaleDateString()
    }

    const applySelection = () => {
      // Map to requirement_id, filter out null/undefined/empty values
      const requirementIds = selectedRequirements.value
        .map((req) => getRequirementId(req))
        .filter((id) => id && id !== '' && id !== 'null' && id !== 'undefined')
      
      if (requirementIds.length === 0) {
        toast.error('Please select at least one requirement')
        return
      }
      
      console.log('📤 Applying selection with requirement IDs:', requirementIds)
      emit('select-requirements', requirementIds)
      emit('close')
      toast.success(`Selected ${requirementIds.length} requirements`)
    }

    const loadRequirements = async () => {
      if (!props.projectId || !props.versionId) {
        error.value = 'Project ID and Version ID are required'
        return
      }

      loading.value = true
      error.value = null

      try {
        console.log('🔄 Fetching usecases for version:', props.versionId)
        const response = await usecaseApi.getUsecases(props.versionId)
        console.log('📦 Usecases API response:', response.data)

        // Helper function to get usecase ID
        const getUsecaseId = (uc) => {
          if (!uc) return ''
          return String(uc._id || uc.id || '')
        }
        
        if (response.data && Array.isArray(response.data.data)) {
          requirements.value = response.data.data.map((usecase) => {
            const reqId = getUsecaseId(usecase)
            return {
              ...usecase,
              // Map usecase fields to requirement display fields
              requirement_id: reqId,
              id: reqId, // Also set id for backward compatibility
              _id: usecase._id, // Keep original _id
              title: usecase.name,
              description: usecase.goal,
              status: 'approved', // Default status for usecases
              priority: usecase.priority || 'medium',
              owner: usecase.role?.name || usecase.role || 'Unknown',
              created_at: usecase.created_at || new Date().toISOString(),
              test_cases_count: usecase.test_cases_count || 0,
            }
          })
          console.log(`✅ Loaded ${requirements.value.length} usecases as requirements`)
        } else if (response.data && Array.isArray(response.data)) {
          // Fallback for different response structure
          requirements.value = response.data.map((usecase) => {
            const reqId = getUsecaseId(usecase)
            return {
              ...usecase,
              requirement_id: reqId,
              id: reqId, // Also set id for backward compatibility
              _id: usecase._id, // Keep original _id
              title: usecase.name,
              description: usecase.goal,
              status: 'approved',
              priority: usecase.priority || 'medium',
              owner: usecase.role?.name || usecase.role || 'Unknown',
              created_at: usecase.created_at || new Date().toISOString(),
              test_cases_count: usecase.test_cases_count || 0,
            }
          })
          console.log(`✅ Loaded ${requirements.value.length} usecases as requirements (fallback)`)
        } else {
          requirements.value = []
          console.warn('No usecases data found in response')
        }
      } catch (err) {
        console.error('Error loading requirements:', err)
        error.value = err.response?.data?.message || 'Failed to load requirements'
        toast.error('Failed to load requirements')
      } finally {
        loading.value = false
      }
    }

    onMounted(() => {
      loadRequirements()
    })

    return {
      searchQuery,
      statusFilter,
      priorityFilter,
      selectedRequirements,
      filteredRequirements,
      coverageStats,
      loading,
      error,
      isRequirementSelected,
      toggleRequirement,
      removeRequirement,
      formatDate,
      applySelection,
      loadRequirements,
    }
  },
}
</script>

<style scoped>
/* Styles remain the same as previous version */
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

.selector-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  height: 600px;
}

.search-section {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
}

.search-input-group {
  position: relative;
  flex: 1;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted);
}

.search-input {
  width: 100%;
  padding: 0.75rem 0.75rem 0.75rem 2.5rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
}

.search-input:focus {
  outline: none;
  border-color: var(--ink);
  box-shadow: 0 0 0 3px rgba(10, 10, 10, 0.1);
}

.filter-controls {
  display: flex;
  gap: 0.5rem;
}

.form-select.small {
  padding: 0.5rem 2rem 0.5rem 0.75rem;
  font-size: 0.875rem;
  min-width: 120px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: white;
}

.requirements-grid {
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: 1.5rem;
  height: 100%;
}

.available-requirements {
  display: flex;
  flex-direction: column;
}

.section-subtitle {
  font-size: 1rem;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.total-count,
.selected-count {
  font-size: 0.875rem;
  color: var(--muted);
  font-weight: normal;
}

.requirements-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
  flex: 1;
}

.requirement-card {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.requirement-card:hover {
  border-color: var(--border-strong);
  background: var(--bg);
}

.requirement-card.selected {
  border-color: var(--ink);
  background: var(--bg);
}

.requirement-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.requirement-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.requirement-id {
  font-size: 1rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0;
}

.status-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-field);
  font-weight: 500;
  text-transform: capitalize;
}

.status-badge.approved {
  background: var(--sunken);
  color: var(--success);
}

.status-badge.pending {
  background: #fef3c7;
  color: var(--danger);
}

.status-badge.rejected {
  background: var(--sunken);
  color: var(--danger);
}

.priority-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-field);
  font-weight: 500;
  text-transform: capitalize;
}

.priority-badge.high {
  background: var(--sunken);
  color: var(--danger);
}

.priority-badge.medium {
  background: #fef3c7;
  color: var(--danger);
}

.priority-badge.low {
  background: var(--sunken);
  color: var(--ink);
}

.requirement-checkbox {
  position: relative;
}

.requirement-checkbox input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
}

.requirement-checkbox .checkmark {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-strong);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.requirement-checkbox input:checked + .checkmark {
  background: var(--ink);
  border-color: var(--ink);
}

.requirement-checkbox input:checked + .checkmark::after {
  content: '✓';
  color: white;
  font-size: 0.75rem;
  font-weight: bold;
}

.requirement-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 0.5rem 0;
  line-height: 1.4;
}

.requirement-description {
  color: var(--muted);
  line-height: 1.5;
  margin-bottom: 1rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.requirement-meta {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--muted);
}

.meta-icon {
  font-size: 1rem;
}

.selected-section {
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border);
  padding-left: 1.5rem;
}

.selected-requirements-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
  flex: 1;
  margin-bottom: 1.5rem;
}

.selected-requirement-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0.75rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  gap: 0.5rem;
}

.selected-req-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.selected-req-info .req-id {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ink);
}

.selected-req-info .req-title {
  font-size: 0.75rem;
  color: var(--muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.3;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: var(--muted);
  text-align: center;
  flex: 1;
}

.empty-icon {
  font-size: 3rem;
  color: var(--muted);
  margin-bottom: 1rem;
}

.empty-hint {
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.coverage-stats {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 1.25rem;
}

.coverage-stats h4 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 1rem 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--ink);
  line-height: 1;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--muted);
  margin-top: 0.25rem;
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

.btn-icon {
  padding: 0.375rem;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-icon:hover:not(:disabled) {
  background: var(--sunken);
  color: var(--text);
}

.btn-icon.danger:hover:not(:disabled) {
  background: var(--sunken);
  color: var(--danger);
}

/* Loading and Error States */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: var(--muted);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border);
  border-left: 4px solid var(--ink);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: var(--danger);
  text-align: center;
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

@media (max-width: 768px) {
  .requirements-grid {
    grid-template-columns: 1fr;
  }

  .selected-section {
    border-left: none;
    border-top: 1px solid var(--border);
    padding-left: 0;
    padding-top: 1.5rem;
  }

  .search-section {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-controls {
    justify-content: center;
  }

  .requirement-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>