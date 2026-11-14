<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <!-- Header -->
      <div class="modal-header">
        <h2>Use Case Details</h2>
        <div class="header-actions">
          <button
            v-if="showSelectButton"
            class="select-usecase-btn"
            :class="{ selected: isSelected }"
            @click="$emit('select-usecase')"
            :disabled="isSelecting"
          >
            <span v-if="isSelecting" class="button-spinner-small"></span>
            <span v-else class="material-symbols-outlined">
              {{ isSelected ? 'check_circle' : 'radio_button_unchecked' }}
            </span>
            {{ isSelecting ? 'Selecting...' : isSelected ? 'Selected' : 'Select This Use Case' }}
          </button>
          <button
            v-if="showSkipButton"
            class="skip-conflict-btn"
            @click="$emit('skip-conflict')"
            :disabled="isSkipping"
          >
            <span v-if="isSkipping" class="button-spinner-small"></span>
            <span v-else class="material-symbols-outlined">close</span>
            {{ isSkipping ? 'Skipping...' : 'Skip Conflict' }}
          </button>
          <button class="close-btn" @click="$emit('close')">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="modal-body">
        <!-- Header Meta Info -->
        <div class="usecase-meta-header">
          <span class="usecase-name">{{ useCase.name }}</span>
          <div class="meta-badges">
            <span v-if="useCase.type" class="meta-badge type-badge">{{ useCase.type }}</span>
            <span v-if="useCase.level" class="meta-badge level-badge">{{ useCase.level }}</span>
            <span v-if="useCase.status" class="meta-badge status-badge" :class="`status-${useCase.status}`">{{ useCase.status }}</span>
            <span v-if="useCase.frequency" class="meta-badge frequency-badge">freq: {{ useCase.frequency }}</span>
          </div>
        </div>
        
        <!-- Actor Details -->
        <div v-if="useCase.actor && typeof useCase.actor === 'object'" class="actor-details">
          <span class="actor-label">Actor:</span>
          <span class="actor-name">{{ useCase.actor.name }}</span>
          <span v-if="useCase.actor.description" class="actor-desc">- {{ useCase.actor.description }}</span>
        </div>
        
        <div class="details-grid">
          <!-- Row 1: Goal, Description, Business Reason, Context -->
          <div class="detail-row">
            <div class="detail-section">
              <h5>Goal</h5>
              <p>{{ useCase.goal || 'No goal specified' }}</p>
            </div>
            <div class="detail-section">
              <h5>Description</h5>
              <p>{{ (useCase.description || useCase.business_reason || useCase.reason) || 'No description available' }}</p>
            </div>
            <div class="detail-section">
              <h5>Business Reason</h5>
              <p>{{ (useCase.business_reason || useCase.reason) || 'No business reason specified' }}</p>
            </div>
            <div class="detail-section">
              <h5>Context</h5>
              <p>{{ contextDisplayText }}</p>
            </div>
          </div>

          <!-- Row 2: Main Flow (Full Width) - Enhanced -->
          <div class="detail-row">
            <div class="detail-section full-width">
              <h5>Main Flow</h5>
              <div class="main-flow-container">
                <template v-if="useCase.main_flow && Array.isArray(useCase.main_flow) && useCase.main_flow.length > 0">
                  <div v-for="(step, i) in useCase.main_flow" :key="i" class="flow-step" :class="{ 'system-step': step.actor === 'System' }">
                    <div class="step-header">
                      <span class="step-number">{{ step.step || (i + 1) }}</span>
                      <span class="step-actor" :class="step.actor === 'System' ? 'actor-system' : 'actor-user'">
                        {{ step.actor || 'User' }}
                      </span>
                    </div>
                    <div class="step-content">
                      <div class="step-action">{{ step.action || step }}</div>
                      <div v-if="step.inputs && step.inputs.length > 0" class="step-inputs">
                        <span class="step-label">Inputs:</span>
                        <span v-for="(inp, idx) in step.inputs" :key="idx" class="step-input-tag">{{ inp }}</span>
                      </div>
                      <div v-if="step.rules_applied && step.rules_applied.length > 0" class="step-rules">
                        <span class="step-label">Rules:</span>
                        <span v-for="(rule, idx) in step.rules_applied" :key="idx" class="step-rule-tag">{{ rule }}</span>
                      </div>
                      <div v-if="step.expected_result" class="step-result">
                        <span class="result-arrow">→</span> {{ step.expected_result }}
                      </div>
                    </div>
                  </div>
                </template>
                <template v-else-if="useCase.tasks && Array.isArray(useCase.tasks) && useCase.tasks.length > 0">
              <ol class="task-list">
                <li v-for="(task, i) in useCase.tasks" :key="i">{{ task }}</li>
              </ol>
                </template>
                <div v-else class="no-data">No main flow defined</div>
              </div>
            </div>
          </div>
          
          <!-- Row 2b: Alternative Flows -->
          <div v-if="useCase.alternative_flows && useCase.alternative_flows.length > 0" class="detail-row">
            <div class="detail-section full-width">
              <h5>Alternative Flows</h5>
              <div class="alt-flows-container">
                <div v-for="(af, i) in useCase.alternative_flows" :key="i" class="alt-flow-item">
                  <div class="alt-flow-header">
                    <span class="alt-flow-id">{{ af.id || `AF${i + 1}` }}</span>
                    <span class="alt-flow-step">at Step {{ af.at_step }}</span>
                  </div>
                  <div class="alt-flow-content">
                    <div class="alt-flow-condition"><strong>If:</strong> {{ af.condition }}</div>
                    <div class="alt-flow-response"><strong>Then:</strong> {{ af.system_response }}</div>
                    <div class="alt-flow-end"><strong>End State:</strong> {{ af.end_state }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Row 3: Preconditions & Postconditions -->
          <div class="detail-row">
            <div class="detail-section">
              <h5>Preconditions</h5>
              <ul class="condition-list">
                <li v-for="(item, i) in useCase.preconditions" :key="i">{{ item }}</li>
                <li v-if="!useCase.preconditions || useCase.preconditions.length === 0">None</li>
              </ul>
            </div>
            <div class="detail-section">
              <h5>Postconditions</h5>
              <ul class="condition-list">
                <li v-for="(item, i) in useCase.postconditions" :key="i">{{ item }}</li>
                <li v-if="!useCase.postconditions || useCase.postconditions.length === 0">None</li>
              </ul>
            </div>
          </div>

          <!-- Row 4: Inputs & Outputs -->
          <div class="detail-row">
            <div class="detail-section">
              <h5>Inputs</h5>
              <div class="tag-list">
                <template v-if="useCase.inputs && Array.isArray(useCase.inputs) && useCase.inputs.length > 0">
                  <span 
                    v-for="(item, i) in useCase.inputs" 
                    :key="i" 
                    class="tag tag-input"
                  >
                    {{ typeof item === 'object' ? item.name : item }}
                  </span>
                </template>
                <span v-else class="tag tag-meta">None</span>
              </div>
            </div>
            <div class="detail-section">
              <h5>Outputs</h5>
              <div class="tag-list">
                <template v-if="useCase.outputs && Array.isArray(useCase.outputs) && useCase.outputs.length > 0">
                  <span 
                    v-for="(item, i) in useCase.outputs" 
                    :key="i" 
                    class="tag tag-output"
                  >
                    {{ typeof item === 'object' ? item.name : item }}
                  </span>
                </template>
                <span v-else class="tag tag-meta">None</span>
              </div>
            </div>
          </div>

          <!-- Row 5: Trigger, Business Rules & Non-functional Constraints -->
          <div class="detail-row">
            <div class="detail-section">
              <h5>Trigger</h5>
              <ul class="condition-list">
                <template v-if="useCase.trigger && typeof useCase.trigger === 'object'">
                  <li><strong>Event:</strong> {{ useCase.trigger.event || 'N/A' }}</li>
                  <li v-if="useCase.trigger.source"><strong>Source:</strong> {{ useCase.trigger.source }}</li>
                </template>
                <template v-else-if="useCase.triggers && Array.isArray(useCase.triggers) && useCase.triggers.length > 0">
                <li v-for="(item, i) in useCase.triggers" :key="i">{{ item }}</li>
                </template>
                <li v-else>None</li>
              </ul>
            </div>
            <div class="detail-section">
              <h5>Business Rules</h5>
              <ul class="condition-list">
                <template v-if="useCase.rules && Array.isArray(useCase.rules) && useCase.rules.length > 0">
                  <li v-for="(item, i) in useCase.rules" :key="i">
                    <span v-if="typeof item === 'object' && item.id" class="rule-id">[{{ item.id }}]</span>
                    {{ typeof item === 'object' ? item.description : item }}
                  </li>
                </template>
                <li v-else>None</li>
              </ul>
            </div>
            <div class="detail-section">
              <h5>Non-functional Constraints</h5>
              <ul class="condition-list">
                <template v-if="useCase.non_functional_constraints && Array.isArray(useCase.non_functional_constraints) && useCase.non_functional_constraints.length > 0">
                  <li v-for="(item, i) in useCase.non_functional_constraints" :key="i">{{ item }}</li>
                </template>
                <template v-else-if="useCase.constraints && Array.isArray(useCase.constraints) && useCase.constraints.length > 0">
                <li v-for="(item, i) in useCase.constraints" :key="i">{{ item }}</li>
                </template>
                <li v-else>None</li>
              </ul>
            </div>
          </div>

          <!-- Row 6: Exceptions (Full Width) -->
          <div class="detail-row">
            <div class="detail-section full-width">
              <h5>Exceptions</h5>
              <ul class="exception-list">
                <template v-if="useCase.exceptions && Array.isArray(useCase.exceptions) && useCase.exceptions.length > 0">
                <li v-for="(item, i) in useCase.exceptions" :key="i">
                  <span class="material-symbols-outlined">warning</span>
                    <template v-if="typeof item === 'object'">
                      <strong>Step {{ item.at_step }}:</strong> {{ item.description || item.type || 'Exception' }}
                      <span v-if="item.system_response"> → {{ item.system_response }}</span>
                    </template>
                    <template v-else>{{ item }}</template>
                </li>
                </template>
                <li v-else>No exceptions defined</li>
              </ul>
            </div>
          </div>

          <!-- Row 7: Stakeholders & Related Use Cases -->
          <div class="detail-row">
            <div class="detail-section">
              <h5>Stakeholders</h5>
              <div class="tag-list">
                <span v-for="item in useCase.stakeholders" :key="item" class="tag tag-meta">{{
                  item
                }}</span>
                <span
                  v-if="!useCase.stakeholders || useCase.stakeholders.length === 0"
                  class="tag tag-meta"
                  >None</span
                >
              </div>
            </div>
            <div class="detail-section">
              <h5>Related Use Cases</h5>
              <div class="tag-list">
                <span
                  v-for="relatedId in useCase.related_usecases"
                  :key="relatedId"
                  class="tag tag-related"
                >
                  UC-{{ relatedId }}
                </span>
                <span
                  v-if="!useCase.related_usecases || useCase.related_usecases.length === 0"
                  class="tag tag-meta"
                  >None</span
                >
              </div>
            </div>
          </div>

          <!-- Row 8: Priority & Context Details -->
          <div class="detail-row">
            <div class="detail-section">
              <h5>Priority</h5>
              <p>
                <span class="priority-badge" :class="`priority-${useCase.priority || 'medium'}`">
                  {{ useCase.priority || 'Medium' }}
                </span>
              </p>
            </div>
            <div v-if="useCase.context && typeof useCase.context === 'object'" class="detail-section">
              <h5>Module</h5>
              <p>{{ useCase.context.module || 'N/A' }}</p>
            </div>
            <div v-if="useCase.context && typeof useCase.context === 'object'" class="detail-section">
              <h5>Scope</h5>
              <p>{{ useCase.context.scope || 'N/A' }}</p>
          </div>
            <div v-if="useCase.context && typeof useCase.context === 'object'" class="detail-section">
              <h5>System</h5>
              <p>{{ useCase.context.system || 'N/A' }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <button class="close-button" @click="$emit('close')">Close</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ConflictDetailModal',
  props: {
    useCase: {
      type: Object,
      required: true,
      default: () => ({}),
    },
    showSkipButton: {
      type: Boolean,
      default: false,
    },
    isSkipping: {
      type: Boolean,
      default: false,
    },
    showSelectButton: {
      type: Boolean,
      default: false,
    },
    isSelected: {
      type: Boolean,
      default: false,
    },
    isSelecting: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['close', 'skip-conflict', 'select-usecase'],
  computed: {
    contextDisplayText() {
      if (!this.useCase.context) return 'No context specified'
      if (typeof this.useCase.context === 'object') {
        const parts = [
          this.useCase.context.module,
          this.useCase.context.scope,
          this.useCase.context.system
        ].filter(Boolean)
        return parts.length > 0 ? parts.join(' / ') : 'No context specified'
      }
      return this.useCase.context || 'No context specified'
    }
  }
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
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: var(--radius-field);
  width: 100%;
  max-width: 1200px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
}

.modal-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.select-usecase-btn {
  background: var(--sunken);
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  color: var(--muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.select-usecase-btn:hover:not(:disabled) {
  background: var(--sunken);
  color: var(--text);
}

.select-usecase-btn.selected {
  background: var(--ink);
  border-color: var(--ink);
  color: white;
}

.select-usecase-btn.selected:hover:not(:disabled) {
  background: var(--ink);
  border-color: var(--ink);
}

.select-usecase-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.skip-conflict-btn {
  background: var(--sunken);
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  color: var(--muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.skip-conflict-btn:hover:not(:disabled) {
  background: var(--sunken);
  color: var(--text);
}

.skip-conflict-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.close-btn {
  background: transparent;
  border: none;
  border-radius: 999px;
  padding: 6px;
  cursor: pointer;
  color: var(--muted);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: var(--sunken);
  color: var(--text);
}

.modal-body {
  padding: 24px;
  flex: 1;
  overflow-y: auto;
  background: white;
}

.details-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  align-items: start;
}

.detail-section {
  background: var(--bg);
  padding: 16px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  height: 100%;
  min-height: 120px;
  display: flex;
  flex-direction: column;
}

.detail-section.full-width {
  grid-column: 1 / -1;
}

.detail-section h5 {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 8px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-section p {
  margin: 0;
  color: var(--text);
  line-height: 1.5;
  font-size: 0.875rem;
  flex: 1;
}

.task-list,
.condition-list,
.exception-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.task-list {
  padding-left: 12px;
  list-style-type: decimal;
}

.task-list li,
.condition-list li {
  color: var(--text);
  font-size: 0.875rem;
  line-height: 1.5;
}

.exception-list li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: var(--danger);
  font-size: 0.875rem;
  line-height: 1.5;
}

.exception-list .material-symbols-outlined {
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 1px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  padding: 4px 8px;
  border-radius: var(--radius-field);
  font-size: 0.75rem;
  font-weight: 500;
}

.tag-input {
  background: var(--sunken);
  color: var(--ink);
}

.tag-output {
  background: var(--success-soft);
  color: var(--success);
}

.tag-meta {
  background: var(--sunken);
  color: var(--text);
}

.tag-related {
  background: var(--sunken);
  color: var(--ink);
}

.priority-badge {
  padding: 4px 8px;
  border-radius: var(--radius-field);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  display: inline-block;
}

.priority-high {
  background: var(--sunken);
  color: var(--danger);
}

.priority-medium {
  background: #fef3c7;
  color: var(--danger);
}

.priority-low {
  background: var(--success-soft);
  color: var(--success);
}

.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid var(--border);
  background: var(--bg);
  display: flex;
  justify-content: flex-end;
}

.close-button {
  background: var(--ink);
  color: white;
  border: none;
  border-radius: 999px;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-button:hover {
  background: var(--ink);
  transform: translateY(-1px);
}

/* Usecase Meta Header */
.usecase-meta-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.usecase-meta-header .usecase-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text);
}

.meta-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.meta-badge {
  padding: 4px 10px;
  border-radius: var(--radius-field);
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
}

.type-badge {
  background: var(--sunken);
  color: var(--ink);
}

.level-badge {
  background: #fef3c7;
  color: var(--danger);
}

.status-badge {
  background: var(--success-soft);
  color: var(--success);
}

.status-badge.status-inactive {
  background: var(--sunken);
  color: var(--danger);
}

.status-badge.status-deprecated {
  background: var(--sunken);
  color: var(--muted);
}

.frequency-badge {
  background: var(--sunken);
  color: var(--ink);
}

/* Actor Details */
.actor-details {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--bg);
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
  border-left: 4px solid var(--ink);
}

.actor-label {
  font-weight: 600;
  color: var(--text);
  font-size: 0.875rem;
}

.actor-name {
  color: var(--ink);
  font-weight: 600;
  font-size: 0.875rem;
}

.actor-desc {
  color: var(--muted);
  font-size: 0.8rem;
  font-style: italic;
}

/* Main Flow Enhanced */
.main-flow-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.flow-step {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
}

.flow-step:hover {
  border-color: var(--ink);
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
}

.flow-step.system-step {
  background: var(--bg);
  border-left: 3px solid var(--ink);
}

.step-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 60px;
}

.step-number {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ink);
  color: white;
  border-radius: 50%;
  font-weight: 600;
  font-size: 0.8rem;
}

.step-actor {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.actor-user {
  background: var(--sunken);
  color: var(--ink);
}

.actor-system {
  background: #fef3c7;
  color: var(--danger);
}

.step-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.step-action {
  color: var(--text);
  font-size: 0.9rem;
  line-height: 1.5;
}

.step-inputs, .step-rules {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.step-label {
  font-size: 0.75rem;
  color: var(--muted);
  font-weight: 500;
}

.step-input-tag {
  padding: 2px 8px;
  background: var(--sunken);
  color: var(--ink);
  border-radius: var(--radius-field);
  font-size: 0.7rem;
  font-weight: 500;
}

.step-rule-tag {
  padding: 2px 8px;
  background: #fef3c7;
  color: var(--danger);
  border-radius: var(--radius-field);
  font-size: 0.7rem;
  font-weight: 500;
}

.rule-id {
  font-weight: 600;
  color: var(--danger);
  margin-right: 6px;
}

.step-result {
  color: var(--success);
  font-size: 0.85rem;
  font-style: italic;
}

.result-arrow {
  color: var(--success);
  font-weight: 600;
}

/* Alternative Flows */
.alt-flows-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.alt-flow-item {
  background: var(--bg);
  border: 1px solid var(--warning-soft);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.alt-flow-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #fef3c7;
}

.alt-flow-id {
  font-weight: 700;
  color: var(--danger);
  font-size: 0.85rem;
}

.alt-flow-step {
  font-size: 0.75rem;
  color: var(--danger);
}

.alt-flow-content {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.alt-flow-condition, .alt-flow-response, .alt-flow-end {
  font-size: 0.85rem;
  color: var(--text);
}

.no-data {
  color: var(--muted);
  font-style: italic;
  padding: 12px;
  text-align: center;
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
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Scrollbar styling */
.modal-body::-webkit-scrollbar {
  width: 6px;
}

.modal-body::-webkit-scrollbar-track {
  background: var(--sunken);
}

.modal-body::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: var(--radius-sm);
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: var(--muted);
}

/* Responsive Design */
@media (max-width: 768px) {
  .modal-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .modal-content {
    max-width: 95%;
  }

  .detail-row {
    grid-template-columns: 1fr;
  }

  .detail-section {
    min-height: auto;
  }
}

@media (max-width: 480px) {
  .modal-body {
    padding: 16px;
  }

  .detail-row {
    gap: 12px;
  }
}
</style>