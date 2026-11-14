<template>
  <div class="database-list-view">
    <!-- List Controls -->
    <div class="list-controls">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search tables, columns..."
          class="search-input"
        />
        <span class="material-symbols-outlined search-icon">search</span>
      </div>

      <div class="filter-controls">
        <select v-model="sortBy" class="filter-select">
          <option value="name">Sort by Name</option>
          <option value="columns">Sort by Columns</option>
          <option value="relationships">Sort by Relationships</option>
        </select>

        <select v-model="filterBy" class="filter-select">
          <option value="all">All Tables</option>
          <option value="withRelationships">With Relationships</option>
          <option value="withForeignKeys">With Foreign Keys</option>
          <option value="noRelationships">No Relationships</option>
        </select>
      </div>

      <div class="view-actions">
        <button class="btn-secondary" @click="exportToCSV">
          <span class="material-symbols-outlined">download</span>
          Export CSV
        </button>
        <button class="btn-secondary" @click="printList">
          <span class="material-symbols-outlined">print</span>
          Print
        </button>
      </div>
    </div>

    <!-- Statistics Cards -->
    <div class="list-statistics">
      <div class="stat-card">
        <div class="stat-value">{{ filteredTables.length }}</div>
        <div class="stat-label">Tables</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ totalColumns }}</div>
        <div class="stat-label">Columns</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ totalRelationships }}</div>
        <div class="stat-label">Relationships</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ tablesWithForeignKeys }}</div>
        <div class="stat-label">Tables with FKs</div>
      </div>
    </div>

    <!-- Tables List -->
    <div class="tables-list">
      <div
        v-for="table in sortedTables"
        :key="table._id || table.name"
        class="table-list-item"
        :class="{ 'table-selected': selectedTable === table.name }"
        @click="selectTable(table)"
        @dblclick="$emit('table-view', table)"
      >
        <div class="table-list-header">
          <div class="table-info">
            <h4 class="table-name">{{ table.name }}</h4>
            <p class="table-description" v-if="table.description">{{ table.description }}</p>
          </div>
          <div class="table-meta">
            <span class="table-stats">
              {{ table.columns?.length || 0 }} columns
              <span class="stat-separator">•</span>
              {{ getTableRelationshipCount(table) }} relationships
            </span>
            <div class="table-actions">
              <button
                class="btn-icon"
                @click.stop="$emit('table-view', table)"
                title="View Details"
              >
                <span class="material-symbols-outlined">visibility</span>
              </button>
              <button class="btn-icon" @click.stop="$emit('table-edit', table)" title="Edit">
                <span class="material-symbols-outlined">edit</span>
              </button>
              <button
                class="btn-icon danger"
                @click.stop="$emit('table-delete', table._id || table.name)"
                title="Delete"
              >
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Columns Preview -->
        <div class="columns-preview">
          <div
            v-for="column in getPreviewColumns(table)"
            :key="column.name"
            class="column-preview-item"
            :class="{
              primary: column.is_primary_key,
              foreign: column.is_foreign_key,
            }"
          >
            <span class="column-name">{{ column.name }}</span>
            <span class="column-type">{{ column.type }}</span>
            <div class="column-badges">
              <span v-if="column.is_primary_key" class="column-badge pk">PK</span>
              <span v-if="column.is_foreign_key" class="column-badge fk">FK</span>
              <span v-if="!column.nullable" class="column-badge nn">NN</span>
              <span v-if="column.unique" class="column-badge uq">UQ</span>
            </div>
          </div>
          <div v-if="hasMoreColumns(table)" class="more-columns">
            +{{ getRemainingColumnsCount(table) }} more columns
          </div>
        </div>

        <!-- Relationships Preview -->
        <div v-if="getTableRelationships(table).length > 0" class="relationships-preview">
          <div class="relationships-label">Relationships:</div>
          <div class="relationship-tags">
            <span
              v-for="rel in getTableRelationships(table)"
              :key="`${rel.from_table}-${rel.to_table}`"
              class="relationship-tag"
              :class="rel.type"
            >
              {{ rel.from_table === table.name ? '→ ' + rel.to_table : '← ' + rel.from_table }}
              <span class="relationship-type">({{ rel.type }})</span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredTables.length === 0" class="empty-state">
      <span class="material-symbols-outlined">table</span>
      <h3>No tables found</h3>
      <p v-if="searchQuery">Try adjusting your search criteria</p>
      <p v-else>No tables available in this database</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DatabaseList',
  props: {
    tables: {
      type: Array,
      default: () => [],
    },
    relationships: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      searchQuery: '',
      sortBy: 'name',
      filterBy: 'all',
      selectedTable: null,
    }
  },
  computed: {
    filteredTables() {
      let filtered = this.tables

      // Apply search filter
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase()
        filtered = filtered.filter(
          (table) =>
            table.name.toLowerCase().includes(query) ||
            table.description?.toLowerCase().includes(query) ||
            table.columns?.some((col) => col.name.toLowerCase().includes(query))
        )
      }

      // Apply type filter
      switch (this.filterBy) {
        case 'withRelationships':
          filtered = filtered.filter((table) => this.getTableRelationshipCount(table) > 0)
          break
        case 'withForeignKeys':
          filtered = filtered.filter((table) => table.columns?.some((col) => col.is_foreign_key))
          break
        case 'noRelationships':
          filtered = filtered.filter((table) => this.getTableRelationshipCount(table) === 0)
          break
      }

      return filtered
    },

    sortedTables() {
      const tables = [...this.filteredTables]

      switch (this.sortBy) {
        case 'name':
          return tables.sort((a, b) => a.name.localeCompare(b.name))
        case 'columns':
          return tables.sort((a, b) => (b.columns?.length || 0) - (a.columns?.length || 0))
        case 'relationships':
          return tables.sort(
            (a, b) => this.getTableRelationshipCount(b) - this.getTableRelationshipCount(a)
          )
        default:
          return tables
      }
    },

    totalColumns() {
      return this.tables.reduce((sum, table) => sum + (table.columns?.length || 0), 0)
    },

    totalRelationships() {
      return this.relationships.length
    },

    tablesWithForeignKeys() {
      return this.tables.filter((table) => table.columns?.some((col) => col.is_foreign_key)).length
    },
  },
  methods: {
    selectTable(table) {
      this.selectedTable = table.name
      this.$emit('table-selected', table)
    },

    getTableRelationshipCount(table) {
      return this.relationships.filter(
        (rel) => rel.from_table === table.name || rel.to_table === table.name
      ).length
    },

    getTableRelationships(table) {
      return this.relationships.filter(
        (rel) => rel.from_table === table.name || rel.to_table === table.name
      )
    },

    getPreviewColumns(table) {
      return (table.columns || []).slice(0, 5) // Show first 5 columns
    },

    hasMoreColumns(table) {
      return (table.columns?.length || 0) > 5
    },

    getRemainingColumnsCount(table) {
      return (table.columns?.length || 0) - 5
    },

    exportToCSV() {
      const csvContent = this.generateCSV()
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `database-schema-${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
    },

    generateCSV() {
      const headers = [
        'Table',
        'Description',
        'Columns',
        'Primary Keys',
        'Foreign Keys',
        'Relationships',
      ]
      const rows = this.tables.map((table) => [
        table.name,
        table.description || '',
        (table.columns?.length || 0).toString(),
        (table.columns?.filter((col) => col.is_primary_key).length || 0).toString(),
        (table.columns?.filter((col) => col.is_foreign_key).length || 0).toString(),
        this.getTableRelationshipCount(table).toString(),
      ])

      return [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
    },

    printList() {
      window.print()
    },
  },
}
</script>

<style scoped>
.database-list-view {
  padding: 20px;
  background: var(--bg);
  min-height: 600px;
}

.list-controls {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 250px;
}

.search-input {
  width: 100%;
  padding: 10px 40px 10px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  background: white;
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--ink);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted);
}

.filter-controls {
  display: flex;
  gap: 12px;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: white;
  font-size: 0.875rem;
  color: var(--text);
}

.view-actions {
  display: flex;
  gap: 8px;
}

.btn-secondary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: white;
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: var(--bg);
  border-color: var(--border-strong);
}

/* Statistics */
.list-statistics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: var(--radius-sm);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  text-align: center;
  border: 1px solid var(--border);
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--muted);
}

/* Tables List */
.tables-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.table-list-item {
  background: white;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.table-list-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.table-list-item.table-selected {
  border-color: var(--ink);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.table-list-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.table-info {
  flex: 1;
}

.table-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 8px 0;
}

.table-description {
  color: var(--muted);
  font-size: 0.875rem;
  margin: 0;
  line-height: 1.4;
}

.table-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.table-stats {
  font-size: 0.75rem;
  color: var(--muted);
}

.stat-separator {
  margin: 0 4px;
}

.table-actions {
  display: flex;
  gap: 4px;
}

.btn-icon {
  padding: 6px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--muted);
  transition: all 0.2s ease;
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

/* Columns Preview */
.columns-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.column-preview-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
}

.column-preview-item.primary {
  background: var(--bg);
  border-color: var(--ink);
}

.column-preview-item.foreign {
  background: var(--bg);
  border-color: var(--ink);
}

.column-name {
  font-weight: 500;
  color: var(--text);
}

.column-type {
  color: var(--muted);
  font-family: 'Courier New', monospace;
}

.column-badges {
  display: flex;
  gap: 2px;
}

.column-badge {
  padding: 1px 4px;
  border-radius: var(--radius-sm);
  font-size: 0.6rem;
  font-weight: 600;
  color: white;
}

.column-badge.pk {
  background: var(--ink);
}

.column-badge.fk {
  background: var(--ink);
}

.column-badge.nn {
  background: var(--danger);
}

.column-badge.uq {
  background: var(--success);
}

.more-columns {
  font-size: 0.75rem;
  color: var(--muted);
  padding: 6px 12px;
  background: var(--bg);
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-sm);
}

/* Relationships Preview */
.relationships-preview {
  border-top: 1px solid var(--border);
  padding-top: 12px;
}

.relationships-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted);
  margin-bottom: 8px;
}

.relationship-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.relationship-tag {
  padding: 4px 8px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.7rem;
  color: var(--text);
}

.relationship-tag.one-to-one {
  border-color: var(--ink);
  background: var(--bg);
}

.relationship-tag.one-to-many {
  border-color: var(--success);
  background: var(--bg);
}

.relationship-tag.many-to-one {
  border-color: var(--warning);
  background: var(--bg);
}

.relationship-tag.many-to-many {
  border-color: var(--ink);
  background: var(--bg);
}

.relationship-type {
  font-size: 0.6rem;
  color: var(--muted);
  margin-left: 2px;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
  background: white;
  border-radius: var(--radius-field);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.empty-state .material-symbols-outlined {
  font-size: 48px;
  color: var(--muted);
  margin-bottom: 16px;
}

.empty-state h3 {
  font-size: 1.5rem;
  margin-bottom: 8px;
  color: var(--text);
}

.empty-state p {
  color: var(--muted);
  margin: 0;
}

/* Print Styles */
@media print {
  .list-controls,
  .list-statistics,
  .table-actions {
    display: none;
  }

  .table-list-item {
    break-inside: avoid;
    box-shadow: none;
    border: 1px solid var(--ink);
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .list-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .table-list-header {
    flex-direction: column;
    gap: 12px;
  }

  .table-meta {
    align-items: flex-start;
    flex-direction: row;
    justify-content: space-between;
    width: 100%;
  }

  .columns-preview {
    flex-direction: column;
    align-items: flex-start;
  }

  .column-preview-item {
    width: 100%;
    justify-content: space-between;
  }
}
</style>