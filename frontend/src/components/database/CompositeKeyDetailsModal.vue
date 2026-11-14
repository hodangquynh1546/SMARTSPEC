<template>
  <div class="modal-overlay" @click.self="close">
    <div class="modal-content large">
      <div class="modal-header">
        <h3>Chi tiết khoá phức hợp: {{ table.name }}</h3>
        <button class="btn-close" @click="close">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-body">
        <!-- Table Information -->
        <div class="info-section">
          <h4>Thông tin bảng</h4>
          <div class="info-grid">
            <div class="info-item">
              <label>Tên bảng</label>
              <span class="info-value">{{ table.name }}</span>
            </div>
            <div class="info-item">
              <label>Mô tả</label>
              <span class="info-value">{{ table.description || 'Chưa có mô tả' }}</span>
            </div>
            <div class="info-item">
              <label>Các cột của khoá phức hợp</label>
              <span class="info-value">{{ compositeKeyColumns.length }}</span>
            </div>
            <div class="info-item">
              <label>Kích thước khoá ước tính</label>
              <span class="info-value">{{ keySize }} bytes</span>
            </div>
          </div>
        </div>

        <!-- Composite Key Structure -->
        <div class="columns-section">
          <div class="section-header">
            <h4>Cấu trúc khoá phức hợp</h4>
            <div class="column-stats">
              <span class="stat">
                <span class="stat-dot primary"></span>
                Các cột khoá chính: {{ compositeKeyColumns.length }}
              </span>
            </div>
          </div>

          <div class="columns-table">
            <div class="table-header">
              <div class="col-order">Thứ tự</div>
              <div class="col-name">Tên cột</div>
              <div class="col-type">Kiểu dữ liệu</div>
              <div class="col-attributes">Thuộc tính</div>
              <div class="col-relations">Quan hệ</div>
            </div>

            <div class="table-body">
              <div
                v-for="(column, index) in compositeKeyColumns"
                :key="column.name"
                class="table-row primary-key"
              >
                <div class="col-order">
                  <span class="order-badge">{{ index + 1 }}</span>
                </div>
                <div class="col-name">
                  <span class="column-name">{{ column.name }}</span>
                  <div class="column-badge primary">PK</div>
                </div>

                <div class="col-type">
                  <span class="data-type">{{ column.type }}</span>
                  <span v-if="column.length" class="type-length">({{ column.length }})</span>
                </div>

                <div class="col-attributes">
                  <div class="attribute-list">
                    <span v-if="!column.nullable" class="attribute not-null" title="Bắt buộc"
                      >NN</span
                    >
                    <span v-if="column.unique" class="attribute unique" title="Duy nhất">UQ</span>
                    <span v-if="column.default" class="attribute default" title="Giá trị mặc định">
                      MẶC ĐỊNH: {{ column.default }}
                    </span>
                  </div>
                </div>

                <div class="col-relations">
                  <div v-if="column.is_foreign_key && column.references" class="relation-info">
                    <span class="material-symbols-outlined">arrow_right_alt</span>
                    Tham chiếu {{ column.references }}.id
                  </div>
                  <span v-else class="no-relation">—</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Performance Considerations -->
        <div class="performance-section">
          <h4>Lưu ý hiệu năng</h4>
          <div class="considerations-grid">
            <div class="consideration-card" :class="getConsiderationClass('indexing')">
              <div class="consideration-header">
                <span class="material-symbols-outlined">speed</span>
                <span class="consideration-title">Chỉ mục</span>
              </div>
              <p>
                Khoá phức hợp tạo một chỉ mục bao phủ mọi cột khoá, giúp truy vấn theo tiền tố khoá nhanh hơn.
              </p>
              <div class="consideration-status">
                <span class="status-dot" :class="getConsiderationClass('indexing')"></span>
                {{ getConsiderationText('indexing') }}
              </div>
            </div>

            <div class="consideration-card" :class="getConsiderationClass('storage')">
              <div class="consideration-header">
                <span class="material-symbols-outlined">storage</span>
                <span class="consideration-title">Lưu trữ</span>
              </div>
              <p>
                Khoá lớn hơn có thể làm tăng dung lượng lưu trữ cho chỉ mục và tham chiếu khoá ngoại.
              </p>
              <div class="consideration-status">
                <span class="status-dot" :class="getConsiderationClass('storage')"></span>
                {{ getConsiderationText('storage') }}
              </div>
            </div>

            <div class="consideration-card" :class="getConsiderationClass('foreign')">
              <div class="consideration-header">
                <span class="material-symbols-outlined">account_tree</span>
                <span class="consideration-title">Khoá ngoại</span>
              </div>
              <p>
                Các bảng tham chiếu phải gồm đủ mọi cột của khoá phức hợp trong ràng buộc khoá ngoại.
              </p>
              <div class="consideration-status">
                <span class="status-dot" :class="getConsiderationClass('foreign')"></span>
                {{ getConsiderationText('foreign') }}
              </div>
            </div>
          </div>
        </div>

        <!-- Related Foreign Keys -->
        <div v-if="relatedForeignKeys.length > 0" class="relationships-section">
          <h4>Khoá ngoại liên quan ({{ relatedForeignKeys.length }})</h4>
          <div class="relationships-list">
            <div
              v-for="fk in relatedForeignKeys"
              :key="`${fk.fromTable}.${fk.column}`"
              class="relationship-card"
            >
              <div class="relationship-header">
                <span class="relationship-type">Tham chiếu khoá ngoại</span>
                <span class="relationship-direction">Đến</span>
              </div>

              <div class="relationship-tables">
                <span class="table-name">{{ fk.fromTable }}</span>
                <span class="relationship-arrow">
                  <span class="material-symbols-outlined">arrow_right_alt</span>
                </span>
                <span class="table-name current-table">{{ table.name }}</span>
              </div>

              <div class="relationship-description">
                Cột <strong>{{ fk.column }}</strong> ({{ fk.columnType }}) tham chiếu khoá phức hợp này
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="action-section">
          <div class="sql-actions">
            <button class="btn-secondary" @click="convertToSingleKey">
              <span class="material-symbols-outlined">merge</span>
              Chuyển về khoá đơn
            </button>
            <button class="btn-secondary" @click="exportKeyInfo">
              <span class="material-symbols-outlined">download</span>
              Xuất thông tin khoá
            </button>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-primary" @click="close">Đóng</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CompositeKeyDetailsModal',
  props: {
    table: {
      type: Object,
      required: true,
    },
    compositeKeyInfo: {
      type: Object,
      default: null,
    },
  },
  computed: {
    compositeKeyColumns() {
      if (this.compositeKeyInfo?.columns) {
        return this.compositeKeyInfo.columns
      }

      // Fallback: extract from table columns
      return (this.table.columns || [])
        .filter((col) => col.is_primary_key)
        .sort((a, b) => (a.primary_key_order || 0) - (b.primary_key_order || 0))
    },

    relatedForeignKeys() {
      // This would typically come from the database relationships
      // For now, we'll return empty array - in real implementation, query the database
      return []
    },

    keySize() {
      return this.compositeKeyColumns.reduce((size, col) => {
        const type = col.type?.toUpperCase() || ''
        if (type.includes('INT')) return size + 4
        if (type.includes('VARCHAR') || type.includes('CHAR')) {
          const length = parseInt(col.length) || 255
          return size + Math.min(length, 255)
        }
        if (type.includes('DECIMAL')) return size + 8
        return size + 4
      }, 0)
    },
  },
  methods: {
    close() {
      this.$emit('close')
    },

    getConsiderationClass(type) {
      const considerations = {
        indexing: this.keySize <= 32 ? 'good' : this.keySize <= 64 ? 'warning' : 'critical',
        storage: this.keySize <= 16 ? 'good' : this.keySize <= 32 ? 'warning' : 'critical',
        foreign: this.compositeKeyColumns.some((col) => col.is_foreign_key) ? 'warning' : 'good',
      }
      return considerations[type] || 'good'
    },

    getConsiderationText(type) {
      const classes = this.getConsiderationClass(type)
      const texts = {
        good: 'Optimal',
        warning: 'Cần cân nhắc',
        critical: 'Cần xem xét kỹ',
      }
      return texts[classes] || 'Good'
    },

    convertToSingleKey() {
      if (
        confirm(
          `Convert table "${this.table.name}" from composite key to single key? This will require selecting a primary column.`
        )
      ) {
        this.$emit('convert-to-single', this.table)
        this.close()
      }
    },

    exportKeyInfo() {
      const keyInfo = {
        table: this.table.name,
        compositeKey: {
          columns: this.compositeKeyColumns.map((col) => ({
            name: col.name,
            type: col.type,
            length: col.length,
            order: col.primary_key_order,
          })),
          totalColumns: this.compositeKeyColumns.length,
          estimatedSize: this.keySize,
        },
        exportDate: new Date().toISOString(),
      }

      const dataStr = JSON.stringify(keyInfo, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `composite-key-${this.table.name}.json`
      link.click()
      URL.revokeObjectURL(url)
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
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: var(--radius-field);
  width: 90%;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal-content.large {
  max-width: 1000px;
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg);
  border-radius: var(--radius-field) var(--radius-field) 0 0;
}

.modal-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.btn-close {
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

.btn-close:hover {
  background: var(--sunken);
  color: var(--text);
}

.modal-body {
  padding: 24px;
}

.info-section {
  margin-bottom: 32px;
}

.info-section h4 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 16px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--muted);
}

.info-value {
  font-size: 0.875rem;
  color: var(--text);
  font-weight: 500;
}

.columns-section {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.section-header h4 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.column-stats {
  display: flex;
  gap: 16px;
}

.stat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: var(--muted);
}

.stat-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.stat-dot.primary {
  background: var(--ink);
}

.columns-table {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 80px 2fr 1.5fr 2fr 1.5fr;
  gap: 16px;
  padding: 12px 16px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--text);
}

.table-body {
  max-height: 400px;
  overflow-y: auto;
}

.table-row {
  display: grid;
  grid-template-columns: 80px 2fr 1.5fr 2fr 1.5fr;
  gap: 16px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  transition: background-color 0.2s ease;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row:hover {
  background: var(--bg);
}

.table-row.primary-key {
  background: var(--bg);
}

.col-order {
  display: flex;
  align-items: center;
}

.order-badge {
  background: var(--ink);
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.8rem;
}

.col-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.column-name {
  font-weight: 500;
  color: var(--text);
  font-size: 0.875rem;
}

.column-badge {
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: 0.7rem;
  font-weight: 600;
  color: white;
}

.column-badge.primary {
  background: var(--ink);
}

.col-type {
  display: flex;
  align-items: center;
  gap: 4px;
}

.data-type {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  color: var(--text);
}

.type-length {
  font-size: 0.75rem;
  color: var(--muted);
}

.col-attributes {
  display: flex;
  align-items: center;
}

.attribute-list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.attribute {
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: 0.7rem;
  font-weight: 600;
  color: white;
}

.attribute.not-null {
  background: var(--danger);
}

.attribute.unique {
  background: var(--success);
}

.attribute.default {
  background: var(--muted);
  color: white;
}

.col-relations {
  display: flex;
  align-items: center;
}

.relation-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--ink);
}

.relation-info .material-symbols-outlined {
  font-size: 14px;
}

.no-relation {
  color: var(--muted);
  font-size: 0.875rem;
  font-style: italic;
}

.performance-section {
  margin-bottom: 32px;
}

.performance-section h4 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 16px;
}

.considerations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.consideration-card {
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: white;
  transition: all 0.2s ease;
}

.consideration-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.consideration-card.good {
  border-left: 4px solid var(--success);
}

.consideration-card.warning {
  border-left: 4px solid var(--warning);
}

.consideration-card.critical {
  border-left: 4px solid var(--danger);
}

.consideration-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.consideration-header .material-symbols-outlined {
  font-size: 18px;
  color: var(--muted);
}

.consideration-card.good .consideration-header .material-symbols-outlined {
  color: var(--success);
}

.consideration-card.warning .consideration-header .material-symbols-outlined {
  color: var(--warning);
}

.consideration-card.critical .consideration-header .material-symbols-outlined {
  color: var(--danger);
}

.consideration-title {
  font-weight: 600;
  color: var(--text);
  font-size: 0.9rem;
}

.consideration-card p {
  margin: 0 0 12px 0;
  font-size: 0.875rem;
  color: var(--muted);
  line-height: 1.4;
}

.consideration-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-dot.good {
  background: var(--success);
}

.status-dot.warning {
  background: var(--warning);
}

.status-dot.critical {
  background: var(--danger);
}

.relationships-section {
  margin-bottom: 32px;
}

.relationships-section h4 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 16px;
}

.relationships-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.relationship-card {
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: white;
  transition: all 0.2s ease;
}

.relationship-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.relationship-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.relationship-type {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text);
}

.relationship-direction {
  font-size: 0.75rem;
  color: var(--muted);
  background: var(--sunken);
  padding: 2px 8px;
  border-radius: var(--radius-field);
}

.relationship-tables {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.table-name {
  font-weight: 500;
  color: var(--text);
  font-size: 0.875rem;
}

.table-name.current-table {
  color: var(--ink);
  font-weight: 600;
}

.relationship-arrow {
  color: var(--muted);
}

.relationship-arrow .material-symbols-outlined {
  font-size: 16px;
}

.relationship-description {
  font-size: 0.875rem;
  color: var(--muted);
  line-height: 1.4;
}

.action-section {
  margin-bottom: 24px;
}

.sql-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
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
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.875rem;
}

.btn-secondary:hover {
  background: var(--sunken);
}

.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  background: var(--bg);
  border-radius: 0 0 var(--radius-field) var(--radius-field);
}

.btn-primary {
  padding: 10px 20px;
  background: var(--ink);
  color: white;
  border: none;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s ease;
  font-size: 0.875rem;
}

.btn-primary:hover {
  background: var(--ink);
}

/* Responsive design */
@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    margin: 10px;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .table-header,
  .table-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .table-header {
    display: none;
  }

  .table-row {
    padding: 16px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    margin-bottom: 8px;
  }

  .col-order::before {
    content: 'Order: ';
    font-weight: 600;
    color: var(--text);
  }

  .col-name::before {
    content: 'Column: ';
    font-weight: 600;
    color: var(--text);
  }

  .col-type::before {
    content: 'Type: ';
    font-weight: 600;
    color: var(--text);
  }

  .col-attributes::before {
    content: 'Attributes: ';
    font-weight: 600;
    color: var(--text);
  }

  .col-relations::before {
    content: 'Relations: ';
    font-weight: 600;
    color: var(--text);
  }

  .considerations-grid {
    grid-template-columns: 1fr;
  }

  .sql-actions {
    flex-direction: column;
  }

  .sql-actions button {
    width: 100%;
  }
}
</style>