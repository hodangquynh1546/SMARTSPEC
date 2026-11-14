<template>
  <div class="stats-grid">
    <div class="stat-card tables">
      <div class="stat-icon">
        <span class="material-symbols-outlined">table</span>
      </div>
      <div class="stat-info">
        <h3>{{ stats.tables }}</h3>
        <p>Tổng số bảng</p>
      </div>
    </div>
    <div class="stat-card relationships">
      <div class="stat-icon">
        <span class="material-symbols-outlined">link</span>
      </div>
      <div class="stat-info">
        <h3>{{ stats.relationships }}</h3>
        <p>Quan hệ</p>
      </div>
    </div>
    <div class="stat-card columns">
      <div class="stat-icon">
        <span class="material-symbols-outlined">view_column</span>
      </div>
      <div class="stat-info">
        <h3>{{ stats.columns }}</h3>
        <p>Tổng số cột</p>
      </div>
    </div>
    <div class="stat-card usecases">
      <div class="stat-icon">
        <span class="material-symbols-outlined">assignment</span>
      </div>
      <div class="stat-info">
        <h3>{{ stats.relatedUsecases }}</h3>
        <p>Use case liên quan</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DatabaseStats',
  props: {
    stats: {
      type: Object,
      required: true,
      default: () => ({
        tables: 0,
        relationships: 0,
        columns: 0,
        relatedUsecases: 0,
      }),
    },
  },
}
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: var(--radius-field);
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-card.tables {
  border-left: 4px solid var(--ink);
}

.stat-card.relationships {
  border-left: 4px solid var(--ink);
}

.stat-card.columns {
  border-left: 4px solid var(--success);
}

.stat-card.usecases {
  border-left: 4px solid var(--warning);
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: var(--radius-field);
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-card.tables .stat-icon {
  background: var(--sunken);
  color: var(--ink);
}

.stat-card.relationships .stat-icon {
  background: var(--sunken);
  color: var(--ink);
}

.stat-card.columns .stat-icon {
  background: var(--success-soft);
  color: var(--success);
}

.stat-card.usecases .stat-icon {
  background: #fef3c7;
  color: var(--warning);
}

.stat-info h3 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 4px;
  color: var(--text);
}

.stat-info p {
  color: var(--muted);
  font-size: 0.875rem;
  margin: 0;
}
</style>