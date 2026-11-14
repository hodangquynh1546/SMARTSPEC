<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content large">
      <div class="modal-header">
        <h2>Select Database Tables</h2>
        <button class="btn-close" @click="$emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-body">
        <div class="selector-container">
          <!-- Loading State -->
          <div v-if="loading" class="loading-state">
            <div class="spinner"></div>
            <p>Loading database tables...</p>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="error-state">
            <span class="material-symbols-outlined error-icon">error</span>
            <p>{{ error }}</p>
            <button class="btn btn-primary" @click="loadTables">Retry</button>
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
                  placeholder="Search tables by name..."
                />
              </div>
              <div class="filter-buttons">
                <button
                  v-for="filter in filters"
                  :key="filter.value"
                  :class="['filter-btn', activeFilter === filter.value ? 'active' : '']"
                  @click="activeFilter = filter.value"
                >
                  {{ filter.label }}
                </button>
              </div>
            </div>

            <div class="tables-grid">
              <div class="available-tables">
                <h3 class="section-subtitle">Available Tables</h3>
                <div class="tables-list">
                  <div
                    v-for="table in filteredTables"
                    :key="table.name"
                    :class="['table-card', isTableSelected(table) ? 'selected' : '']"
                    @click="toggleTable(table)"
                  >
                    <div class="table-header">
                      <div class="table-info">
                        <h4 class="table-name">{{ table.name }}</h4>
                        <span class="table-row-count">{{ table.row_count || 0 }} rows</span>
                      </div>
                      <div class="table-checkbox">
                        <input
                          type="checkbox"
                          :checked="isTableSelected(table)"
                          @change="toggleTable(table)"
                        />
                        <span class="checkmark"></span>
                      </div>
                    </div>

                    <div class="table-columns">
                      <div
                        v-for="column in (table.columns || []).slice(0, 3)"
                        :key="column.name"
                        class="column-tag"
                      >
                        <span class="column-name">{{ column.name }}</span>
                        <span class="column-type">{{ column.type }}</span>
                        <span v-if="column.is_primary_key" class="pk-badge">PK</span>
                      </div>
                      <div v-if="(table.columns || []).length > 3" class="more-columns">
                        +{{ (table.columns || []).length - 3 }} more
                      </div>
                    </div>

                    <div
                      class="table-relationships"
                      v-if="table.relationships && table.relationships.length"
                    >
                      <span class="relationships-label">Relationships:</span>
                      <div class="relationship-tags">
                        <span
                          v-for="rel in table.relationships.slice(0, 2)"
                          :key="rel.table"
                          class="relationship-tag"
                        >
                          {{ rel.table }} ({{ rel.type }})
                        </span>
                        <span v-if="table.relationships.length > 2" class="more-relationships">
                          +{{ table.relationships.length - 2 }}
                        </span>
                      </div>
                    </div>

                    <div class="table-meta">
                      <div class="meta-item" v-if="table.column_count">
                        <span class="material-symbols-outlined meta-icon">view_column</span>
                        <span class="meta-text">{{ table.column_count }} columns</span>
                      </div>
                      <div class="meta-item" v-if="table.has_foreign_keys">
                        <span class="material-symbols-outlined meta-icon">link</span>
                        <span class="meta-text">Foreign Keys</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Empty State for Tables -->
                <div v-if="filteredTables.length === 0 && !loading" class="empty-state">
                  <span class="material-symbols-outlined empty-icon">table</span>
                  <p>No tables found</p>
                  <span class="empty-hint">Try adjusting your search or filters</span>
                </div>
              </div>

              <div class="selected-section">
                <h3 class="section-subtitle">
                  Selected Tables
                  <span class="selected-count">({{ selectedTables.length }})</span>
                </h3>
                <div class="selected-tables-list">
                  <div
                    v-for="table in selectedTables"
                    :key="table.name"
                    class="selected-table-item"
                  >
                    <span class="table-name">{{ table.name }}</span>
                    <button type="button" class="btn-icon danger" @click="removeTable(table)">
                      <span class="material-symbols-outlined">close</span>
                    </button>
                  </div>
                  <div v-if="selectedTables.length === 0" class="empty-state">
                    <span class="material-symbols-outlined empty-icon">table</span>
                    <p>No tables selected</p>
                    <span class="empty-hint">Select tables from the left panel</span>
                  </div>
                </div>

                <div class="selection-stats" v-if="selectedTables.length > 0">
                  <h4>Selection Summary</h4>
                  <div class="stats-grid">
                    <div class="stat-item">
                      <span class="stat-value">{{ selectedTables.length }}</span>
                      <span class="stat-label">Tables</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-value">{{ totalColumns }}</span>
                      <span class="stat-label">Columns</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-value">{{ tablesWithRelationships }}</span>
                      <span class="stat-label">With Relationships</span>
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
            :disabled="selectedTables.length === 0 || loading"
          >
            Select {{ selectedTables.length }} Table(s)
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import {
  getDatabaseWithReferences,
  getDatabaseById,
  getDatabasesByVersion, // THÊM DÒNG NÀY
} from '@/api/project.js'

export default {
  name: 'TableSelectorModal',
  props: {
    projectId: String,
    versionId: String,
    databaseId: String, // Add databaseId prop for direct database access
  },
  emits: ['close', 'select-tables'],
  setup(props, { emit }) {
    const toast = useToast()
    const searchQuery = ref('')
    const activeFilter = ref('all')
    const selectedTables = ref([])
    const databaseTables = ref([])
    const loading = ref(false)
    const error = ref(null)

    const filters = [
      { value: 'all', label: 'All Tables' },
      { value: 'with_data', label: 'With Data' },
      { value: 'no_data', label: 'Empty Tables' },
      { value: 'relationships', label: 'With Relationships' },
      { value: 'primary_keys', label: 'With Primary Keys' },
    ]

    const filteredTables = computed(() => {
      let filtered = databaseTables.value

      if (searchQuery.value) {
        filtered = filtered.filter((table) =>
          table.name.toLowerCase().includes(searchQuery.value.toLowerCase())
        )
      }

      switch (activeFilter.value) {
        case 'with_data':
          filtered = filtered.filter((table) => (table.row_count || 0) > 0)
          break
        case 'no_data':
          filtered = filtered.filter((table) => (table.row_count || 0) === 0)
          break
        case 'relationships':
          filtered = filtered.filter(
            (table) => table.relationships && table.relationships.length > 0
          )
          break
        case 'primary_keys':
          filtered = filtered.filter(
            (table) => table.columns && table.columns.some((col) => col.is_primary_key)
          )
          break
      }

      return filtered
    })

    const totalColumns = computed(() => {
      return selectedTables.value.reduce((total, table) => {
        return total + (table.columns ? table.columns.length : 0)
      }, 0)
    })

    const tablesWithRelationships = computed(() => {
      return selectedTables.value.filter(
        (table) => table.relationships && table.relationships.length > 0
      ).length
    })

    const isTableSelected = (table) => {
      return selectedTables.value.some((selected) => selected.name === table.name)
    }

    const toggleTable = (table) => {
      const isSelected = isTableSelected(table)
      if (isSelected) {
        selectedTables.value = selectedTables.value.filter(
          (selected) => selected.name !== table.name
        )
      } else {
        selectedTables.value.push(table)
      }
    }

    const removeTable = (table) => {
      selectedTables.value = selectedTables.value.filter((selected) => selected.name !== table.name)
    }

    const applySelection = () => {
      const tableNames = selectedTables.value.map((table) => table.name)
      emit('select-tables', tableNames)
      emit('close')
      toast.success(`Selected ${selectedTables.value.length} tables`)
    }

    const extractTablesFromDatabase = (database) => {
      console.log('🔍 Database structure for extraction:', database)
      console.log('🔍 Database tables:', database.tables)
      console.log('🔍 Database tables type:', typeof database.tables)
      console.log('🔍 Database tables length:', database.tables?.length)

      if (!database || !database.tables) {
        console.log('❌ No tables array found in database')
        return []
      }

      const tables = database.tables.map((table, index) => {
        console.log(`📋 Processing table ${index}:`, table)
        console.log(`📋 Table name: ${table.name}`)
        console.log(`📋 Table columns:`, table.columns)

        return {
          name: table.name,
          row_count: table.row_count || 0,
          column_count: table.columns ? table.columns.length : 0,
          columns: table.columns || [],
          relationships: table.relationships || [],
          has_foreign_keys: table.columns ? table.columns.some((col) => col.is_foreign_key) : false,
        }
      })

      console.log('✅ Final tables array:', tables)
      return tables
    }

    const loadTables = async () => {
      loading.value = true
      error.value = null

      try {
        let databaseData = null
        console.log('🔍 Loading tables for version:', props.versionId)

        if (props.versionId) {
          const response = await getDatabasesByVersion(props.versionId)
          console.log('📊 Response data.data:', response.data?.data)

          const databases = response.data?.data || response.data || []
          console.log('📋 Databases array length:', databases.length)

          if (databases && databases.length > 0) {
            const database = databases[0]
            console.log('🔍 Selected database ID:', database._id)

            const databaseId = database._id || database.id
            databaseData = await getDatabaseWithReferences(databaseId)
            console.log('📋 Database with references response:', databaseData)

            // DEBUG: Kiểm tra cấu trúc nested
            console.log('🔍 databaseData.data:', databaseData.data)
            console.log('🔍 databaseData.data.data:', databaseData.data?.data)
            console.log('🔍 databaseData.data.data?.tables:', databaseData.data?.data?.tables)
          }
        }

        // SỬA QUAN TRỌNG: Xử lý nested data structure
        if (databaseData) {
          let db = databaseData.data

          // Nếu có nested data.data, lấy cái trong cùng
          if (db && db.data) {
            db = db.data
            console.log('🔄 Using nested db.data')
          }

          console.log('📋 Final database object:', db)
          console.log('📋 Database tables:', db?.tables)
          console.log('📋 Database tables length:', db?.tables?.length)

          if (db && db.tables && db.tables.length > 0) {
            const tables = extractTablesFromDatabase(db)
            console.log('✅ Extracted tables:', tables)
            databaseTables.value = tables
            console.log(`🎉 Successfully loaded ${tables.length} tables`)
          } else {
            console.log('❌ No tables found in final database object')
            databaseTables.value = []
            toast.warning('No tables found in database schema')
          }
        } else {
          console.log('❌ No database data available')
          databaseTables.value = []
          toast.warning('No database schema found')
        }
      } catch (err) {
        console.error('❌ Error loading database tables:', err)
        error.value = err.response?.data?.message || 'Failed to load database tables'
        toast.error('Failed to load database tables')
      } finally {
        loading.value = false
      }
    }

    onMounted(() => {
      loadTables()
    })

    return {
      searchQuery,
      activeFilter,
      selectedTables,
      filters,
      filteredTables,
      loading,
      error,
      totalColumns,
      tablesWithRelationships,
      isTableSelected,
      toggleTable,
      removeTable,
      applySelection,
      loadTables,
    }
  },
}
</script>

<style scoped>
/* Styles remain the same as previous version with additions */
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
  height: 500px;
}

.search-section {
  display: flex;
  gap: 1rem;
  align-items: center;
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

.filter-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-strong);
  background: white;
  border-radius: 999px;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--muted);
  transition: all 0.2s;
  white-space: nowrap;
}

.filter-btn:hover {
  background: var(--bg);
  border-color: var(--border-strong);
}

.filter-btn.active {
  background: var(--ink);
  border-color: var(--ink);
  color: white;
}

.tables-grid {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 1.5rem;
  height: 100%;
}

.available-tables {
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

.selected-count {
  font-size: 0.875rem;
  color: var(--muted);
  font-weight: normal;
}

.tables-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
  flex: 1;
}

.table-card {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.table-card:hover {
  border-color: var(--border-strong);
  background: var(--bg);
}

.table-card.selected {
  border-color: var(--ink);
  background: var(--bg);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.table-info {
  flex: 1;
}

.table-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 0.25rem 0;
}

.table-row-count {
  font-size: 0.75rem;
  color: var(--muted);
  background: var(--sunken);
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-sm);
}

.table-checkbox {
  position: relative;
}

.table-checkbox input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
}

.table-checkbox .checkmark {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-strong);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.table-checkbox input:checked + .checkmark {
  background: var(--ink);
  border-color: var(--ink);
}

.table-checkbox input:checked + .checkmark::after {
  content: '✓';
  color: white;
  font-size: 0.75rem;
  font-weight: bold;
}

.table-columns {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.column-tag {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: var(--sunken);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  position: relative;
}

.column-name {
  font-weight: 500;
  color: var(--ink);
}

.column-type {
  color: var(--muted);
  font-size: 0.7rem;
}

.pk-badge {
  background: var(--danger);
  color: white;
  font-size: 0.6rem;
  padding: 0.125rem 0.25rem;
  border-radius: var(--radius-sm);
  font-weight: bold;
}

.more-columns {
  font-size: 0.75rem;
  color: var(--muted);
  background: var(--sunken);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
}

.table-relationships {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.relationships-label {
  font-size: 0.75rem;
  color: var(--muted);
  font-weight: 500;
}

.relationship-tags {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.relationship-tag {
  font-size: 0.7rem;
  color: var(--text);
  background: var(--sunken);
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-sm);
}

.more-relationships {
  font-size: 0.7rem;
  color: var(--muted);
}

.table-meta {
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

.selected-tables-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
  flex: 1;
  margin-bottom: 1.5rem;
}

.selected-table-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.selected-table-item .table-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ink);
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

.selection-stats {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 1.25rem;
}

.selection-stats h4 {
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
  .tables-grid {
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

  .filter-buttons {
    justify-content: center;
  }
}
</style>