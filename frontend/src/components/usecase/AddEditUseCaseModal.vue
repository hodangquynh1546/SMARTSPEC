<template>
  <div v-if="show" class="modal-overlay" @click="close">
    <div class="modal-content" @click.stop>
      <!-- Header -->
      <div class="modal-header">
        <div class="header-content">
          <h2>{{ isEditing ? 'Sửa use case' : 'Tạo use case mới' }}</h2>
          <p class="subtitle">
            {{
              isEditing
                ? 'Cập nhật chi tiết của use case này'
                : 'Định nghĩa use case mới cho hệ thống'
            }}
          </p>
        </div>
        <button class="close-btn" @click="close" aria-label="Đóng hộp thoại">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <!-- Progress indicator for multi-step form -->
      <div class="progress-indicator" v-if="useSteps">
        <div class="step" :class="{ active: currentStep === 1, completed: currentStep > 1 }">
          <span class="step-number">1</span>
          <span class="step-label">Thông tin cơ bản</span>
        </div>
        <div class="step" :class="{ active: currentStep === 2, completed: currentStep > 2 }">
          <span class="step-number">2</span>
          <span class="step-label">Chi tiết</span>
        </div>
        <div class="step" :class="{ active: currentStep === 3 }">
          <span class="step-number">3</span>
          <span class="step-label">Review</span>
        </div>
      </div>

      <!-- Form Content -->
      <form @submit.prevent="submitForm" class="usecase-form">
        <!-- Step 1: Basic Information -->
        <div v-if="!useSteps || currentStep === 1" class="form-step">
          <div class="step-header">
            <h3>Thông tin cơ bản</h3>
            <p>Xác định các thành phần cốt lõi của use case</p>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label for="name" class="required">Tên use case</label>
              <input
                id="name"
                v-model="localForm.name"
                type="text"
                required
                placeholder="VD: Đăng nhập"
                :class="{ error: fieldErrors.name }"
                @blur="validateField('name')"
              />
              <div v-if="fieldErrors.name" class="error-message">{{ fieldErrors.name }}</div>
            </div>

            <div class="form-group">
              <label for="role" class="required">Vai trò</label>
              <input
                id="role"
                :value="roleName"
                @input="updateRoleName($event.target.value)"
                @blur="validateRoleName(roleName)"
                type="text"
                required
                placeholder="VD: Người dùng, Quản trị, Hệ thống"
                autocomplete="off"
                :class="{ error: fieldErrors.role, 'has-suggestion': showSuggestion }"
              />

              <!-- Gợi ý (không tự động áp dụng) -->
              <div v-if="showSuggestion" class="suggestion-banner">
                <span>Gợi ý: </span>
                <button type="button" class="suggestion-btn" @click="applySuggestion">
                  {{ suggestedRole }}
                </button>
                <span> (Nhấn để áp dụng)</span>
              </div>

              <div v-if="fieldErrors.role" class="error-message">{{ fieldErrors.role }}</div>
            </div>

            <div class="form-group span-2">
              <label for="goal" class="required">Mục tiêu</label>
              <textarea
                id="goal"
                v-model="localForm.goal"
                required
                placeholder="Use case này đạt mục tiêu chính nào?"
                rows="3"
                :class="{ error: fieldErrors.goal }"
                @blur="validateField('goal')"
              ></textarea>
              <div v-if="fieldErrors.goal" class="error-message">{{ fieldErrors.goal }}</div>
            </div>

            <div class="form-group span-2">
              <label for="reason" class="required">Lý do</label>
              <textarea
                id="reason"
                v-model="localForm.reason"
                required
                placeholder="Vì sao cần use case này? Nó giải quyết vấn đề gì?"
                rows="3"
                :class="{ error: fieldErrors.reason }"
                @blur="validateField('reason')"
              ></textarea>
              <div v-if="fieldErrors.reason" class="error-message">{{ fieldErrors.reason }}</div>
            </div>

            <div class="form-group">
              <label for="priority" class="required">Độ ưu tiên</label>
              <div class="priority-selector">
                <button
                  type="button"
                  class="priority-option"
                  :class="{ active: localForm.priority === 'high' }"
                  @click="localForm.priority = 'high'"
                >
                  <span class="priority-indicator high"></span>
                  Cao
                </button>
                <button
                  type="button"
                  class="priority-option"
                  :class="{ active: localForm.priority === 'medium' }"
                  @click="localForm.priority = 'medium'"
                >
                  <span class="priority-indicator medium"></span>
                  Trung bình
                </button>
                <button
                  type="button"
                  class="priority-option"
                  :class="{ active: localForm.priority === 'low' }"
                  @click="localForm.priority = 'low'"
                >
                  <span class="priority-indicator low"></span>
                  Thấp
                </button>
              </div>
            </div>

            <div class="form-group span-2">
              <label for="context">Ngữ cảnh</label>
              <textarea
                id="context"
                v-model="localForm.context"
                placeholder="Mô tả tình huống hoặc môi trường diễn ra use case"
                rows="2"
              ></textarea>
              <div class="field-help">Không bắt buộc: giúp hiểu rõ bối cảnh</div>
            </div>
          </div>
        </div>

        <!-- Step 2: Detailed Information -->
        <div v-if="!useSteps || currentStep === 2" class="form-step">
          <div class="step-header">
            <h3>Quy trình & yêu cầu</h3>
            <p>Xác định luồng, đầu vào, đầu ra và ràng buộc</p>
          </div>

          <div class="form-grid">
            <!-- Row 1: Main Flow (Tasks) -->
            <div class="form-group span-3">
              <label class="required">Luồng chính (các bước)</label>
              <div class="array-input">
                <div v-for="(task, index) in localForm.tasks" :key="index" class="task-item">
                  <div class="task-header">
                  <div class="step-number">{{ index + 1 }}</div>
                  <button
                    type="button"
                    class="remove-item-btn"
                    @click="removeArrayItem('tasks', index)"
                    :disabled="localForm.tasks.length <= 1"
                  >
                    <span class="material-symbols-outlined">remove</span>
                  </button>
                  </div>
                  <div class="task-inputs">
                    <div class="task-input-group">
                      <label class="task-label">Hành động</label>
                      <input
                        v-model="localForm.tasks[index].action"
                        type="text"
                        placeholder="Mô tả hành động"
                        required
                        :class="{ error: fieldErrors.tasks && fieldErrors.tasks[index] }"
                        @blur="validateTasks()"
                      />
                    </div>
                    <div class="task-input-group">
                      <label class="task-label">Kết quả mong đợi</label>
                      <input
                        v-model="localForm.tasks[index].expected_result"
                        type="text"
                        placeholder="Kết quả mong đợi"
                        :class="{ error: fieldErrors.tasks && fieldErrors.tasks[index] }"
                        @blur="validateTasks()"
                      />
                    </div>
                  </div>
                </div>
                <button type="button" class="add-item-btn" @click="addArrayItem('tasks')">
                  <span class="material-symbols-outlined">add</span>
                  Thêm bước
                </button>
              </div>
              <div v-if="fieldErrors.tasks" class="error-message">
                Cần ít nhất một bước
              </div>
            </div>

            <!-- Row 2: Inputs & Outputs -->
            <div class="conditions-row">
            <div class="form-group">
              <label>Đầu vào</label>
              <div class="array-input">
                <div v-for="(input, index) in localForm.inputs" :key="index" class="array-item">
                  <input
                    v-model="localForm.inputs[index]"
                    type="text"
                    placeholder="Dữ liệu hoặc sự kiện cần có"
                  />
                  <button
                    type="button"
                    class="remove-item-btn"
                    @click="removeArrayItem('inputs', index)"
                  >
                    <span class="material-symbols-outlined">remove</span>
                  </button>
                </div>
                <button type="button" class="add-item-btn" @click="addArrayItem('inputs')">
                  <span class="material-symbols-outlined">add</span>
                  Thêm đầu vào
                </button>
              </div>
            </div>

            <div class="form-group">
              <label>Đầu ra</label>
              <div class="array-input">
                <div v-for="(output, index) in localForm.outputs" :key="index" class="array-item">
                  <input
                    v-model="localForm.outputs[index]"
                    type="text"
                    placeholder="Kết quả hoặc dữ liệu tạo ra"
                  />
                  <button
                    type="button"
                    class="remove-item-btn"
                    @click="removeArrayItem('outputs', index)"
                  >
                    <span class="material-symbols-outlined">remove</span>
                  </button>
                </div>
                <button type="button" class="add-item-btn" @click="addArrayItem('outputs')">
                  <span class="material-symbols-outlined">add</span>
                  Thêm đầu ra
                </button>
                </div>
              </div>
            </div>

            <!-- Row 3: Preconditions & Postconditions -->
            <div class="conditions-row">
            <div class="form-group">
              <label>Điều kiện tiên quyết</label>
              <div class="array-input">
                <div
                  v-for="(precondition, index) in localForm.preconditions"
                  :key="index"
                  class="array-item"
                >
                  <input
                    v-model="localForm.preconditions[index]"
                    type="text"
                    placeholder="Điều kiện phải đúng trước khi bắt đầu"
                  />
                  <button
                    type="button"
                    class="remove-item-btn"
                    @click="removeArrayItem('preconditions', index)"
                  >
                    <span class="material-symbols-outlined">remove</span>
                  </button>
                </div>
                <button type="button" class="add-item-btn" @click="addArrayItem('preconditions')">
                  <span class="material-symbols-outlined">add</span>
                  Thêm điều kiện tiên quyết
                </button>
              </div>
            </div>

            <div class="form-group">
              <label>Điều kiện sau</label>
              <div class="array-input">
                <div
                  v-for="(postcondition, index) in localForm.postconditions"
                  :key="index"
                  class="array-item"
                >
                  <input
                    v-model="localForm.postconditions[index]"
                    type="text"
                    placeholder="Trạng thái sau khi hoàn thành"
                  />
                  <button
                    type="button"
                    class="remove-item-btn"
                    @click="removeArrayItem('postconditions', index)"
                  >
                    <span class="material-symbols-outlined">remove</span>
                  </button>
                </div>
                <button type="button" class="add-item-btn" @click="addArrayItem('postconditions')">
                  <span class="material-symbols-outlined">add</span>
                  Thêm điều kiện sau
                </button>
                </div>
              </div>
            </div>

            <!-- Row 4: Alternate Flows -->
            <div class="form-group span-3">
              <label>Luồng thay thế</label>
              <div class="array-input">
                <div v-for="(flow, index) in localForm.alternative_flows" :key="index" class="alternative-flow-item">
                  <div class="flow-header">
                    <span class="flow-label">Luồng {{ index + 1 }}</span>
                    <button
                      type="button"
                      class="remove-item-btn"
                      @click="removeArrayItem('alternative_flows', index)"
                    >
                      <span class="material-symbols-outlined">remove</span>
                    </button>
                  </div>
                  <div class="flow-inputs">
                    <div class="flow-input-group">
                      <label class="task-label">Tại bước</label>
                      <input
                        v-model.number="localForm.alternative_flows[index].at_step"
                        type="number"
                        placeholder="Số bước"
                        min="1"
                      />
                    </div>
                    <div class="flow-input-group">
                      <label class="task-label">Điều kiện</label>
                      <input
                        v-model="localForm.alternative_flows[index].condition"
                        type="text"
                        placeholder="Điều kiện kích hoạt luồng này"
                      />
                    </div>
                    <div class="flow-input-group">
                      <label class="task-label">Phản hồi hệ thống</label>
                      <input
                        v-model="localForm.alternative_flows[index].system_response"
                        type="text"
                        placeholder="Hệ thống phản hồi ra sao"
                      />
                    </div>
                    <div class="flow-input-group">
                      <label class="task-label">Trạng thái kết thúc</label>
                      <input
                        v-model="localForm.alternative_flows[index].end_state"
                        type="text"
                        placeholder="Trạng thái cuối sau luồng này"
                      />
                    </div>
                  </div>
                </div>
                <button type="button" class="add-item-btn" @click="addArrayItem('alternative_flows')">
                  <span class="material-symbols-outlined">add</span>
                  Thêm luồng thay thế
                </button>
              </div>
            </div>

            <!-- Row 5: Triggers & Exceptions -->
            <div class="conditions-row">
            <div class="form-group">
              <label>Sự kiện kích hoạt</label>
              <div class="array-input">
                <div v-for="(trigger, index) in localForm.triggers" :key="index" class="array-item">
                  <input
                    v-model="localForm.triggers[index]"
                    type="text"
                    placeholder="Sự kiện bắt đầu use case"
                  />
                  <button
                    type="button"
                    class="remove-item-btn"
                    @click="removeArrayItem('triggers', index)"
                  >
                    <span class="material-symbols-outlined">remove</span>
                  </button>
                </div>
                <button type="button" class="add-item-btn" @click="addArrayItem('triggers')">
                  <span class="material-symbols-outlined">add</span>
                  Thêm sự kiện kích hoạt
                </button>
              </div>
            </div>

              <div class="form-group">
                <label>Ngoại lệ</label>
              <div class="array-input">
                <div
                  v-for="(exception, index) in localForm.exceptions"
                  :key="index"
                  class="array-item"
                >
                  <input
                    v-model="localForm.exceptions[index]"
                    type="text"
                    placeholder="Chuyện gì xảy ra khi có sự cố"
                  />
                  <button
                    type="button"
                    class="remove-item-btn"
                    @click="removeArrayItem('exceptions', index)"
                  >
                    <span class="material-symbols-outlined">remove</span>
                  </button>
                </div>
                <button type="button" class="add-item-btn" @click="addArrayItem('exceptions')">
                  <span class="material-symbols-outlined">add</span>
                  Thêm ngoại lệ
                </button>
                </div>
              </div>
            </div>

            <!-- Row 6: Business Rules & Constraints -->
            <div class="conditions-row">
              <div class="form-group span-3">
              <label>Quy tắc nghiệp vụ</label>
              <div class="array-input">
                <div v-for="(rule, index) in localForm.rules" :key="index" class="alternative-flow-item">
                  <div class="flow-header">
                    <span class="flow-label">Quy tắc {{ index + 1 }}</span>
                    <button
                      type="button"
                      class="remove-item-btn"
                      @click="removeArrayItem('rules', index)"
                    >
                      <span class="material-symbols-outlined">remove</span>
                    </button>
                  </div>
                  <div class="flow-inputs">
                    <div class="flow-input-group">
                      <label class="task-label">ID</label>
                      <input
                        v-model="localForm.rules[index].id"
                        type="text"
                        placeholder="Mã quy tắc"
                      />
                    </div>
                    <div class="flow-input-group" style="grid-column: span 3;">
                      <label class="task-label">Mô tả</label>
                      <input
                        v-model="localForm.rules[index].description"
                        type="text"
                        placeholder="Mô tả quy tắc"
                      />
                    </div>
                  </div>
                </div>
                <button type="button" class="add-item-btn" @click="addArrayItem('rules')">
                  <span class="material-symbols-outlined">add</span>
                  Thêm quy tắc nghiệp vụ
                </button>
              </div>
            </div>

            <div class="form-group">
              <label>Ràng buộc</label>
              <div class="array-input">
                <div
                  v-for="(constraint, index) in localForm.constraints"
                  :key="index"
                  class="array-item"
                >
                  <input
                    v-model="localForm.constraints[index]"
                    type="text"
                    placeholder="Giới hạn hoặc hạn chế"
                  />
                  <button
                    type="button"
                    class="remove-item-btn"
                    @click="removeArrayItem('constraints', index)"
                  >
                    <span class="material-symbols-outlined">remove</span>
                  </button>
                </div>
                <button type="button" class="add-item-btn" @click="addArrayItem('constraints')">
                  <span class="material-symbols-outlined">add</span>
                  Thêm ràng buộc
                </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 3: Relationships & Review -->
        <div v-if="!useSteps || currentStep === 3" class="form-step">
          <div class="step-header">
            <h3>Quan hệ & xem lại</h3>
            <p>Liên kết với các bên liên quan và use case liên quan</p>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label>Các bên liên quan</label>
              <div class="array-input">
                <div
                  v-for="(stakeholder, index) in localForm.stakeholders"
                  :key="index"
                  class="array-item"
                >
                  <input
                    v-model="localForm.stakeholders[index]"
                    type="text"
                    placeholder="Người hoặc vai trò quan tâm"
                  />
                  <button
                    type="button"
                    class="remove-item-btn"
                    @click="removeArrayItem('stakeholders', index)"
                  >
                    <span class="material-symbols-outlined">remove</span>
                  </button>
                </div>
                <button type="button" class="add-item-btn" @click="addArrayItem('stakeholders')">
                  <span class="material-symbols-outlined">add</span>
                  Thêm bên liên quan
                </button>
              </div>
            </div>

            <div class="form-group">
              <label>Use case liên quan</label>
              <div class="array-input">
                <div
                  v-for="(relatedId, index) in localForm.related_usecases"
                  :key="index"
                  class="array-item"
                >
                  <select
                    v-model="localForm.related_usecases[index]"
                    class="related-usecase-select"
                  >
                    <option value="">Chọn một use case</option>
                    <option
                      v-for="usecase in availableUseCases"
                      :key="getUsecaseId(usecase)"
                      :value="getUsecaseId(usecase)"
                      :disabled="
                        isCurrentUseCase(getUsecaseId(usecase)) || isAlreadySelected(getUsecaseId(usecase), index)
                      "
                    >
                      {{ getUsecaseId(usecase) }} - {{ usecase.name }}
                    </option>
                  </select>
                  <button
                    type="button"
                    class="remove-item-btn"
                    @click="removeArrayItem('related_usecases', index)"
                  >
                    <span class="material-symbols-outlined">remove</span>
                  </button>
                </div>
                <button
                  type="button"
                  class="add-item-btn"
                  @click="addArrayItem('related_usecases')"
                  :disabled="!hasAvailableUseCases"
                >
                  <span class="material-symbols-outlined">add</span>
                  Thêm use case liên quan
                </button>
                <div v-if="!hasAvailableUseCases" class="field-help">
                  Không còn use case nào để thêm
                </div>
              </div>
            </div>

            <div class="form-group span-2">
              <label for="feedback">Phản hồi & ghi chú</label>
              <textarea
                id="feedback"
                v-model="localForm.feedback"
                placeholder="Ghi chú, phản hồi hoặc bình luận thêm về use case này"
                rows="3"
              ></textarea>
            </div>

            <!-- Review Section (only in step 3) -->
            <div v-if="useSteps && currentStep === 3" class="form-group span-3">
              <div class="review-section">
                <h4>Xem lại use case của bạn</h4>
                <div class="review-grid">
                  <div class="review-item">
                    <span class="review-label">Tên:</span>
                    <span class="review-value">{{ localForm.name || 'Chưa cung cấp' }}</span>
                  </div>
                  <div class="review-item">
                    <span class="review-label">Vai trò:</span>
                    <span class="review-value">{{ localForm.role.name || 'Chưa cung cấp' }}</span>
                  </div>
                  <div class="review-item">
                    <span class="review-label">Độ ưu tiên:</span>
                    <span class="review-value priority-tag" :class="localForm.priority">
                      {{ localForm.priority || 'Chưa đặt' }}
                    </span>
                  </div>
                  <div class="review-item span-2">
                    <span class="review-label">Mục tiêu:</span>
                    <span class="review-value">{{ localForm.goal || 'Chưa cung cấp' }}</span>
                  </div>
                  <div class="review-item">
                    <span class="review-label">Các bước:</span>
                    <span class="review-value"
                      >{{ localForm.tasks.filter((t) => t && (t.action || '').trim()).length }} steps</span
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Form Actions -->
        <div class="form-actions">
          <div class="action-left">
            <button
              v-if="useSteps && currentStep > 1"
              type="button"
              class="secondary-btn"
              @click="previousStep"
              :disabled="submitting"
            >
              <span class="material-symbols-outlined">arrow_back</span>
              Trước
            </button>
          </div>

          <div class="action-right">
            <button type="button" class="secondary-btn" @click="close" :disabled="submitting">
              Huỷ
            </button>

            <button
              v-if="useSteps && currentStep < 3"
              type="button"
              class="primary-btn"
              @click="nextStep"
              :disabled="!canProceedToNextStep"
            >
              Tiếp
              <span class="material-symbols-outlined">arrow_forward</span>
            </button>

            <button v-else type="submit" class="primary-btn" :disabled="submitting || !isFormValid">
              <span v-if="submitting" class="loading-spinner"></span>
              {{ submitting ? 'Đang lưu...' : isEditing ? 'Cập nhật use case' : 'Tạo use case' }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AddEditUseCaseModal',
  props: {
    show: {
      type: Boolean,
      required: true,
    },
    isEditing: {
      type: Boolean,
      default: false,
    },
    usecaseData: {
      type: Object,
      default: () => ({}),
    },
    submitting: {
      type: Boolean,
      default: false,
    },
    useSteps: {
      type: Boolean,
      default: true, // Enable multi-step form for better UX with complex forms
    },
    availableUseCases: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      localForm: this.getEmptyForm(),
      originalForm: null, // Lưu dữ liệu ban đầu để so sánh
      currentStep: 1,
      fieldErrors: {},
      showSuggestion: false,
      suggestedRole: '',
    }
  },
  computed: {
    existingRoles() {
      const roles = this.availableUseCases.map((uc) => uc.role).filter(Boolean)
      const uniqueRoles = [...new Map(roles.map((role) => [role.id, role])).values()]
      return uniqueRoles
    },

    nextRoleId() {
      // ❌ CÓ THỂ XÓA vì BE đã xử lý
      // Hoặc giữ lại chỉ để hiển thị tạm thời
      return 'role_new' // Placeholder
    },
    roleName: {
      get() {
        return this.localForm.role?.name || ''
      },
      set(value) {
        if (!this.localForm.role) {
          this.localForm.role = { id: '', name: '' }
        }
        this.localForm.role.name = value
        // ❌ XÓA dòng này - để updateRoleName xử lý
        // this.localForm.role.id = `role_${value.toLowerCase().replace(/\s+/g, '_')}`
      },
    },
    isFormValid() {
      // Check required fields
      const requiredFields = ['name', 'role', 'goal', 'reason']
      for (const field of requiredFields) {
        if (field === 'role') {
          if (!this.localForm.role?.name?.trim()) return false
        } else if (!this.localForm[field]?.trim()) return false
      }

      // Check tasks
      if (
        !Array.isArray(this.localForm.tasks) ||
        this.localForm.tasks.length === 0 ||
        !this.localForm.tasks[0]?.action?.trim()
      ) {
        return false
      }

      return true
    },
    canProceedToNextStep() {
      // Validate current step before proceeding
      if (this.currentStep === 1) {
        const step1Fields = ['name', 'role', 'goal', 'reason']
        return step1Fields.every((field) => {
          if (field === 'role') {
            return this.localForm.role?.name?.trim()
          }
          return this.localForm[field]?.trim()
        })
      } else if (this.currentStep === 2) {
        return (
          Array.isArray(this.localForm.tasks) &&
          this.localForm.tasks.length > 0 &&
          this.localForm.tasks[0]?.action?.trim()
        )
      }
      return true
    },
    hasAvailableUseCases() {
      if (!this.availableUseCases.length) return false

      const currentSelected = this.localForm.related_usecases.filter((id) => id)
      return currentSelected.length < this.availableUseCases.length - (this.isEditing ? 1 : 0)
    },
  },
  watch: {
    'localForm.role.name': {
      handler(newValue) {
        if (newValue && this.showSuggestion) {
          // Nếu user tự sửa đúng thì ẩn gợi ý
          const trimmed = newValue.trim()
          if (!/^[a-z]/.test(trimmed)) {
            this.showSuggestion = false
          }
        }
      },
      immediate: false,
    },
    usecaseData: {
      handler(newData) {
        if (newData && Object.keys(newData).length > 0) {
          const normalized = this.normalizeFormData(newData)
          this.localForm = { ...this.getEmptyForm(), ...normalized }
          // Lưu bản gốc đã được clean để so sánh chính xác khi submit
          // Sử dụng cleanFormData để đảm bảo format giống nhau
          this.originalForm = this.cleanFormDataForComparison(this.localForm)
        } else {
          this.localForm = this.getEmptyForm()
          this.originalForm = null
        }
        // Reset step when opening with new data
        this.currentStep = 1
        this.fieldErrors = {}
      },
      immediate: true,
    },
  },
  methods: {
    close() {
      this.$emit('close')
      // Reset form state when closing
      this.currentStep = 1
      this.fieldErrors = {}
      this.originalForm = null
    },

    updateRoleName(value) {
      if (!this.localForm.role) {
        this.localForm.role = { id: '', name: '' }
      }
      this.localForm.role.name = value

      // ❌ XÓA logic tạo ID cũ - để BE xử lý
      // this.localForm.role.id = exactRole ? exactRole.id : this.nextRoleId

      this.validateRoleName(value)
    },

    submitForm() {
      if (this.isEditing && !this.localForm._id && !this.localForm.id) {
        console.warn('⚠️ No usecase ID provided — skipping submit.')
        return
      }

      // Final validation
      if (!this.validateForm()) {
        // If using steps and there are errors, go to the first step with errors
        if (this.useSteps) {
          if (
            !this.localForm.name?.trim() ||
            !this.localForm.role?.name?.trim() ||
            !this.localForm.goal?.trim() ||
            !this.localForm.reason?.trim()
          ) {
            this.currentStep = 1
          } else if (
            !Array.isArray(this.localForm.tasks) ||
            this.localForm.tasks.length === 0 ||
            !this.localForm.tasks[0]?.action?.trim()
          ) {
            this.currentStep = 2
          }
        }
        return
      }

      // Clean data and ensure role has proper structure
      const cleanedForm = this.cleanFormData()
      if (!this.isEditing) {
        delete cleanedForm.id
      }
      
      // Remove id field if _id exists (backend uses _id)
      if (cleanedForm._id && cleanedForm.id) {
        delete cleanedForm.id
      }

      // ✅ KIỂM TRA: Nếu đang edit và không có thay đổi, chỉ đóng modal
      if (this.isEditing && this.originalForm) {
        const originalCleaned = this.cleanFormDataForComparison(this.originalForm)
        const hasChanges = this.hasFormChanged(originalCleaned, cleanedForm)
        if (!hasChanges) {
          console.log('ℹ️ No changes detected, closing modal without API call')
          this.close()
          return
        }
      }
      
      console.log('📤 Data being sent to BE:', JSON.stringify(cleanedForm, null, 2))
      console.log('✅ Submitting form with ID:', cleanedForm._id || cleanedForm.id)

      // 🔥 FIX: Chỉ emit cleanedForm, không emit event object
      this.$emit('submit', cleanedForm)
    },

    applySuggestion() {
      this.roleName = this.suggestedRole
      this.showSuggestion = false
      // ✅ Cần gọi lại updateRoleName để cập nhật ID
      this.updateRoleName(this.suggestedRole)
    },

    validateForm() {
      this.fieldErrors = {}

      // Required fields
      const requiredFields = [
        { key: 'name', label: 'Tên use case' },
        { key: 'role', label: 'Vai trò' },
        { key: 'goal', label: 'Mục tiêu' },
        { key: 'reason', label: 'Lý do' },
      ]

      for (const field of requiredFields) {
        if (field.key === 'role') {
          // Fix: Kiểm tra role.name
          if (!this.localForm.role?.name?.trim()) {
            this.fieldErrors[field.key] = `${field.label} is required`
          }
        } else if (!this.localForm[field.key]?.trim()) {
          this.fieldErrors[field.key] = `${field.label} is required`
        }
      }

      // Tasks validation
      if (
        !Array.isArray(this.localForm.tasks) ||
        this.localForm.tasks.length === 0 ||
        !this.localForm.tasks[0]?.action?.trim()
      ) {
        this.fieldErrors.tasks = 'At least one task is required'
      }

      return Object.keys(this.fieldErrors).length === 0
    },

    validateField(fieldName) {
      if (fieldName === 'tasks') {
        this.validateTasks()
        return
      }

      const requiredFields = ['name', 'role', 'goal', 'reason']

      if (fieldName === 'role') {
        // Fix: Kiểm tra role.name thay vì role
        if (!this.localForm.role?.name?.trim()) {
          this.fieldErrors[fieldName] = 'This field is required'
        } else {
          delete this.fieldErrors[fieldName]
        }
      } else if (requiredFields.includes(fieldName) && !this.localForm[fieldName]?.trim()) {
        this.fieldErrors[fieldName] = 'This field is required'
      } else {
        delete this.fieldErrors[fieldName]
      }
    },

    validateTasks() {
      if (
        !Array.isArray(this.localForm.tasks) ||
        this.localForm.tasks.length === 0 ||
        !this.localForm.tasks[0]?.trim()
      ) {
        this.fieldErrors.tasks = 'At least one task is required'
      } else {
        delete this.fieldErrors.tasks
      }
    },

    cleanFormData() {
      const cleanedForm = { ...this.localForm }

      // Ensure role has proper structure
      if (!cleanedForm.role.id || cleanedForm.role.id === 'role_unknown') {
        cleanedForm.role.id = `role_${
          cleanedForm.role.name?.toLowerCase().replace(/\s+/g, '_') || 'unknown'
        }`
      }

      // Convert tasks to main_flow format for backend
      if (Array.isArray(cleanedForm.tasks) && cleanedForm.tasks.length > 0) {
        cleanedForm.main_flow = cleanedForm.tasks.map((task, index) => {
          if (typeof task === 'object' && task !== null) {
            return {
              step: index + 1,
              action: (task.action || '').trim(),
              expected_result: (task.expected_result || '').trim()
            }
          } else if (typeof task === 'string') {
            // Fallback: if task is string, use it as action
            return {
              step: index + 1,
              action: task.trim(),
              expected_result: ''
            }
          }
          return {
            step: index + 1,
            action: '',
            expected_result: ''
          }
        }).filter((step) => step.action.trim()) // Remove empty actions
        // Keep tasks for internal use but backend will use main_flow
      } else {
        cleanedForm.main_flow = []
      }

      // Clean alternative_flows
      if (Array.isArray(cleanedForm.alternative_flows)) {
        cleanedForm.alternative_flows = cleanedForm.alternative_flows.map((flow) => {
          if (typeof flow === 'object' && flow !== null) {
            return {
              id: (flow.id || '').trim(),
              at_step: flow.at_step ? Number(flow.at_step) : 1,
              condition: (flow.condition || '').trim(),
              system_response: (flow.system_response || '').trim(),
              end_state: (flow.end_state || '').trim()
            }
          }
          return { id: '', at_step: 1, condition: '', system_response: '', end_state: '' }
        }).filter((flow) => flow.condition.trim() || flow.system_response.trim() || flow.end_state.trim())
      } else {
        cleanedForm.alternative_flows = []
      }

      // Clean rules: keep as array of objects { id, description }
      if (Array.isArray(cleanedForm.rules)) {
        cleanedForm.rules = cleanedForm.rules
          .map((item) => {
            if (typeof item === 'object' && item !== null) {
              return {
                id: (item.id || '').trim(),
                description: (item.description || '').trim()
              }
            } else if (typeof item === 'string') {
              // Convert string to object with description
              return {
                id: '',
                description: item.trim()
              }
            }
            return { id: '', description: '' }
          })
          .filter((rule) => rule.id || rule.description) // Remove empty rules
      } else {
        cleanedForm.rules = []
      }

      // Clean array fields - đảm bảo luôn là array
      const arrayFields = [
        'inputs',
        'outputs',
        'preconditions',
        'postconditions',
        'triggers',
        'constraints',
        'exceptions',
        'stakeholders',
        'related_usecases',
      ]

      arrayFields.forEach((field) => {
        if (!Array.isArray(cleanedForm[field])) {
          cleanedForm[field] = []
        } else {
          cleanedForm[field] = cleanedForm[field]
            .map((item) => {
              if (typeof item === 'string') {
                return item.trim()
              } else if (typeof item === 'object' && item !== null) {
                // Convert object thành string để tránh "[object Object]"
                // Xử lý theo từng loại field
                if (field === 'inputs' || field === 'outputs') {
                  if (item.name) {
                    let desc = item.name
                    if (item.type) desc += ` (${item.type})`
                    return desc
                  }
                } else if (field === 'exceptions') {
                  const parts = []
                  if (item.description) parts.push(item.description)
                  else if (item.type) parts.push(`${item.type} exception`)
                  if (item.at_step) parts.push(`at step ${item.at_step}`)
                  return parts.length > 0 ? parts.join(' - ') : ''
                }
                // Fallback: convert object thành string
                return JSON.stringify(item)
              }
              return String(item || '').trim()
            })
            .filter((item) => item && item !== '')
        }
      })

      // Đảm bảo context có giá trị mặc định nếu empty - kiểm tra type trước khi gọi trim()
      if (typeof cleanedForm.context === 'string') {
        if (!cleanedForm.context || cleanedForm.context.trim() === '') {
          cleanedForm.context = ''
        }
      } else if (cleanedForm.context && typeof cleanedForm.context === 'object') {
        // Context object từ backend: { module, scope, system }
        const parts = []
        if (cleanedForm.context.module) parts.push(`Module: ${cleanedForm.context.module}`)
        if (cleanedForm.context.scope) parts.push(`Scope: ${cleanedForm.context.scope}`)
        if (cleanedForm.context.system) parts.push(`System: ${cleanedForm.context.system}`)
        cleanedForm.context = parts.join(', ').trim() || ''
      } else {
        cleanedForm.context = ''
      }

      // Đảm bảo feedback có giá trị phù hợp - kiểm tra type trước khi gọi trim()
      if (typeof cleanedForm.feedback === 'string') {
        if (!cleanedForm.feedback || cleanedForm.feedback.trim() === '') {
          cleanedForm.feedback = null // hoặc '' tùy BE xử lý
        }
      } else {
        cleanedForm.feedback = null
      }

      // Đảm bảo priority hợp lệ
      if (!['low', 'medium', 'high'].includes(cleanedForm.priority)) {
        cleanedForm.priority = 'medium'
      }

      return cleanedForm
    },

    // Trong AddEditUseCaseModal.vue
    validateRoleName(value) {
      const trimmed = value.trim()

      // Reset suggestion trước
      this.showSuggestion = false
      this.suggestedRole = ''

      // Chỉ gợi ý nếu có giá trị và bắt đầu bằng chữ thường
      if (trimmed && /^[a-z]/.test(trimmed)) {
        const suggested = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)

        // Chỉ show gợi ý nếu khác với giá trị hiện tại
        if (suggested !== trimmed) {
          this.showSuggestion = true
          this.suggestedRole = suggested
        }
      }
    },

    normalizeFormData(data) {
      const normalized = { ...data }

      // Normalize business_reason -> reason
      if (normalized.business_reason && !normalized.reason) {
        normalized.reason = normalized.business_reason
      }

      // Normalize role
      if (normalized.role && typeof normalized.role === 'string') {
        // ✅ Đơn giản hóa - chỉ giữ name, để BE mapping ID
        normalized.role = {
          id: '', // Để BE tự động mapping
          name: normalized.role,
        }
      } else if (normalized.role && typeof normalized.role === 'object' && !normalized.role.id) {
        // ✅ Chỉ cần name, BE sẽ tạo ID đúng
        normalized.role = {
          id: '', // Để BE tự động mapping
          name: normalized.role.name || '',
        }
      }

      // Normalize context - convert từ object sang string nếu cần
      if (normalized.context && typeof normalized.context === 'object') {
        // Context object từ backend: { module, scope, system }
        const parts = []
        if (normalized.context.module) parts.push(`Module: ${normalized.context.module}`)
        if (normalized.context.scope) parts.push(`Scope: ${normalized.context.scope}`)
        if (normalized.context.system) parts.push(`System: ${normalized.context.system}`)
        normalized.context = parts.join(', ').trim() || ''
      } else if (!normalized.context || typeof normalized.context !== 'string') {
        normalized.context = ''
      }

      // Normalize actor (backend có thể dùng actor thay vì role)
      if (normalized.actor && !normalized.role) {
        // Nếu có actor nhưng không có role, copy actor sang role
        if (typeof normalized.actor === 'object') {
          normalized.role = {
            id: normalized.actor.id || '',
            name: normalized.actor.name || '',
          }
        } else if (typeof normalized.actor === 'string') {
          normalized.role = {
            id: '',
            name: normalized.actor,
          }
        }
      }

      // Normalize inputs: array of objects { name, type, required, optional } -> array of strings
      if (Array.isArray(normalized.inputs)) {
        normalized.inputs = normalized.inputs.map((item) => {
          if (typeof item === 'string') return item
          if (typeof item === 'object' && item !== null) {
            // Extract name từ object, hoặc tạo string mô tả
            if (item.name) {
              let desc = item.name
              if (item.type) desc += ` (${item.type})`
              return desc
            }
            return JSON.stringify(item)
          }
          return String(item || '')
        }).filter(Boolean)
      } else if (!normalized.inputs) {
        normalized.inputs = []
      }

      // Normalize outputs: array of objects { name, type, required, optional } -> array of strings
      if (Array.isArray(normalized.outputs)) {
        normalized.outputs = normalized.outputs.map((item) => {
          if (typeof item === 'string') return item
          if (typeof item === 'object' && item !== null) {
            // Extract name từ object, hoặc tạo string mô tả
            if (item.name) {
              let desc = item.name
              if (item.type) desc += ` (${item.type})`
              return desc
            }
            return JSON.stringify(item)
          }
          return String(item || '')
        }).filter(Boolean)
      } else if (!normalized.outputs) {
        normalized.outputs = []
      }

      // Normalize rules: keep as array of objects { id, description }
      if (Array.isArray(normalized.rules)) {
        normalized.rules = normalized.rules.map((item) => {
          if (typeof item === 'object' && item !== null) {
            // Keep as object with id and description
            return {
              id: (item.id || '').trim(),
              description: (item.description || '').trim()
            }
          } else if (typeof item === 'string') {
            // Convert string to object with description
            return {
              id: '',
              description: item.trim()
            }
          }
          return { id: '', description: '' }
        }).filter((rule) => rule.id || rule.description) // Remove empty rules
      } else if (!normalized.rules) {
        normalized.rules = []
      }

      // Normalize exceptions: array of objects { id, at_step, type, description, system_response } -> array of strings
      if (Array.isArray(normalized.exceptions)) {
        normalized.exceptions = normalized.exceptions.map((item) => {
          if (typeof item === 'string') return item
          if (typeof item === 'object' && item !== null) {
            // Tạo string mô tả từ exception object
            const parts = []
            if (item.description) parts.push(item.description)
            else if (item.type) parts.push(`${item.type} exception`)
            if (item.at_step) parts.push(`at step ${item.at_step}`)
            if (item.system_response) parts.push(`→ ${item.system_response}`)
            return parts.length > 0 ? parts.join(' - ') : JSON.stringify(item)
          }
          return String(item || '')
        }).filter(Boolean)
      } else if (!normalized.exceptions) {
        normalized.exceptions = []
      }

      // Normalize trigger: object { event, source } -> array of strings (triggers)
      if (normalized.trigger && typeof normalized.trigger === 'object' && !Array.isArray(normalized.trigger)) {
        // Convert trigger object thành array
        const triggerStrings = []
        if (normalized.trigger.event) {
          triggerStrings.push(normalized.trigger.event)
        }
        if (normalized.trigger.source && normalized.trigger.source !== 'UI') {
          triggerStrings.push(`Source: ${normalized.trigger.source}`)
        }
        normalized.triggers = triggerStrings.length > 0 ? triggerStrings : (normalized.triggers || [])
        delete normalized.trigger
      } else if (!normalized.triggers || !Array.isArray(normalized.triggers)) {
        normalized.triggers = []
      }

      // Normalize main_flow: array of objects -> tasks array of objects
      if (Array.isArray(normalized.main_flow) && normalized.main_flow.length > 0) {
        // Convert main_flow objects thành tasks objects
        normalized.tasks = normalized.main_flow.map((step, index) => {
          if (typeof step === 'object' && step !== null) {
            // Extract action và expected_result từ step object
            return {
              action: step.action || '',
              expected_result: step.expected_result || ''
            }
          } else if (typeof step === 'string') {
            // Nếu là string, giả sử toàn bộ là action
            return {
              action: step,
              expected_result: ''
            }
          }
          return { action: String(step || ''), expected_result: '' }
        })
      } else if (!normalized.tasks || !Array.isArray(normalized.tasks)) {
        // Nếu không có main_flow, kiểm tra tasks hiện tại
        normalized.tasks = normalized.tasks || [{ action: '', expected_result: '' }]
      } else {
        // Nếu tasks đã tồn tại, đảm bảo mỗi task là object
        normalized.tasks = normalized.tasks.map((task) => {
          if (typeof task === 'object' && task !== null && (task.action !== undefined || task.expected_result !== undefined)) {
            return {
              action: task.action || '',
              expected_result: task.expected_result || ''
            }
          } else if (typeof task === 'string') {
            // Convert string thành object
            return { action: task, expected_result: '' }
          }
          return { action: '', expected_result: '' }
        })
      }

      // Normalize non_functional_constraints -> constraints
      if (Array.isArray(normalized.non_functional_constraints)) {
        normalized.constraints = normalized.non_functional_constraints.map((item) => {
          return typeof item === 'string' ? item : String(item || '')
        }).filter(Boolean)
      } else if (!normalized.constraints || !Array.isArray(normalized.constraints)) {
        normalized.constraints = []
      }

      // Normalize alternative_flows
      if (Array.isArray(normalized.alternative_flows) && normalized.alternative_flows.length > 0) {
        normalized.alternative_flows = normalized.alternative_flows.map((flow) => {
          if (typeof flow === 'object' && flow !== null) {
            return {
              id: flow.id || '',
              at_step: flow.at_step || 1,
              condition: flow.condition || '',
              system_response: flow.system_response || '',
              end_state: flow.end_state || ''
            }
          }
          return { id: '', at_step: 1, condition: '', system_response: '', end_state: '' }
        })
      } else if (!normalized.alternative_flows || !Array.isArray(normalized.alternative_flows)) {
        normalized.alternative_flows = []
      }
      
      // Ensure alternative_flows is always an array
      if (!Array.isArray(normalized.alternative_flows)) {
        normalized.alternative_flows = []
      }

      // Đảm bảo các array fields khác là array
      const arrayFields = ['preconditions', 'postconditions', 'stakeholders', 'related_usecases']
      arrayFields.forEach((field) => {
        if (!Array.isArray(normalized[field])) {
          normalized[field] = []
        }
      })

      // Đảm bảo tasks có ít nhất một item
      if (!normalized.tasks || normalized.tasks.length === 0) {
        normalized.tasks = [{ action: '', expected_result: '' }]
      }

      return normalized
    },

    nextStep() {
      if (this.currentStep < 3) {
        // Validate current step before proceeding
        if (this.currentStep === 1 && !this.canProceedToNextStep) {
          this.validateForm() // This will set fieldErrors
          return
        }
        this.currentStep++
      }
    },

    previousStep() {
      if (this.currentStep > 1) {
        this.currentStep--
      }
    },

    addArrayItem(field) {
      if (!this.localForm[field]) {
        this.localForm[field] = []
      }
      if (field === 'tasks') {
        this.localForm[field].push({ action: '', expected_result: '' })
      } else if (field === 'alternative_flows') {
        this.localForm[field].push({ 
          id: '', 
          at_step: 1, 
          condition: '', 
          system_response: '', 
          end_state: '' 
        })
      } else if (field === 'rules') {
        this.localForm[field].push({ id: '', description: '' })
      } else {
      this.localForm[field].push('')
      }
    },

    removeArrayItem(field, index) {
      if (this.localForm[field] && this.localForm[field].length > 1) {
        this.localForm[field].splice(index, 1)
      } else if (field !== 'tasks') {
        // For non-required arrays, we can empty them
        this.localForm[field] = []
      } else {
        // For tasks, we always need at least one
        this.localForm[field] = [{ action: '', expected_result: '' }]
      }
    },

    getEmptyForm() {
      return {
        name: '',
        role: '',
        goal: '',
        reason: '',
        priority: 'medium',
        context: '',
        tasks: [{ action: '', expected_result: '' }],
        inputs: [],
        outputs: [],
        preconditions: [],
        postconditions: [],
        alternative_flows: [],
        triggers: [],
        rules: [{ id: '', description: '' }],
        constraints: [],
        exceptions: [],
        stakeholders: [],
        related_usecases: [],
        feedback: '',
      }
    },

    // Helper: Get usecase ID (support both _id and id for backward compatibility)
    getUsecaseId(uc) {
      if (!uc) return ''
      return String(uc._id || uc.id || '')
    },

    // Kiểm tra xem use case có phải là use case hiện tại không
    isCurrentUseCase(usecaseId) {
      if (!this.isEditing) return false
      const currentId = String(this.localForm._id || this.localForm.id || '')
      return currentId === String(usecaseId)
    },

    // Kiểm tra xem use case đã được chọn trong các mục khác chưa
    isAlreadySelected(usecaseId, currentIndex) {
      return this.localForm.related_usecases.some(
        (id, index) => index !== currentIndex && String(id) === String(usecaseId)
      )
    },

    // Clean form data để so sánh (tương tự cleanFormData nhưng không thay đổi ID)
    cleanFormDataForComparison(form) {
      const cleaned = { ...form }

      // Clean tasks - xử lý riêng vì là objects
      if (Array.isArray(cleaned.tasks)) {
        cleaned.tasks = cleaned.tasks.map((task) => {
          if (typeof task === 'object' && task !== null) {
            return {
              action: (task.action || '').trim(),
              expected_result: (task.expected_result || '').trim()
            }
          } else if (typeof task === 'string') {
            return { action: task.trim(), expected_result: '' }
          }
          return { action: '', expected_result: '' }
        }).filter((task) => task.action.trim()) // Remove empty actions
      } else {
        cleaned.tasks = []
      }

      // Đảm bảo tasks có ít nhất một item
      if (cleaned.tasks.length === 0) {
        cleaned.tasks = [{ action: '', expected_result: '' }]
      }

      // Clean alternative_flows
      if (Array.isArray(cleaned.alternative_flows)) {
        cleaned.alternative_flows = cleaned.alternative_flows.map((flow) => {
          if (typeof flow === 'object' && flow !== null) {
            return {
              id: (flow.id || '').trim(),
              at_step: flow.at_step ? Number(flow.at_step) : 1,
              condition: (flow.condition || '').trim(),
              system_response: (flow.system_response || '').trim(),
              end_state: (flow.end_state || '').trim()
            }
          }
          return { id: '', at_step: 1, condition: '', system_response: '', end_state: '' }
        }).filter((flow) => flow.condition.trim() || flow.system_response.trim() || flow.end_state.trim())
      } else {
        cleaned.alternative_flows = []
      }

      // Clean rules: keep as array of objects { id, description }
      if (Array.isArray(cleaned.rules)) {
        cleaned.rules = cleaned.rules
          .map((item) => {
            if (typeof item === 'object' && item !== null) {
              return {
                id: (item.id || '').trim(),
                description: (item.description || '').trim()
              }
            } else if (typeof item === 'string') {
              // Convert string to object with description
              return {
                id: '',
                description: item.trim()
              }
            }
            return { id: '', description: '' }
          })
          .filter((rule) => rule.id || rule.description) // Remove empty rules
      } else {
        cleaned.rules = []
      }

      // Clean array fields - đảm bảo luôn là array và trim
      const arrayFields = [
        'inputs',
        'outputs',
        'preconditions',
        'postconditions',
        'triggers',
        'constraints',
        'exceptions',
        'stakeholders',
        'related_usecases',
      ]

      arrayFields.forEach((field) => {
        if (!Array.isArray(cleaned[field])) {
          cleaned[field] = []
        } else {
          cleaned[field] = cleaned[field]
            .map((item) => {
              if (typeof item === 'string') {
                return item.trim()
              } else if (typeof item === 'object' && item !== null) {
                // Convert object thành string để tránh "[object Object]"
                // Xử lý theo từng loại field
                if (field === 'inputs' || field === 'outputs') {
                  if (item.name) {
                    let desc = item.name
                    if (item.type) desc += ` (${item.type})`
                    return desc
                  }
                } else if (field === 'exceptions') {
                  const parts = []
                  if (item.description) parts.push(item.description)
                  else if (item.type) parts.push(`${item.type} exception`)
                  if (item.at_step) parts.push(`at step ${item.at_step}`)
                  return parts.length > 0 ? parts.join(' - ') : ''
                }
                // Fallback: convert object thành string
                return JSON.stringify(item)
              }
              return String(item || '').trim()
            })
            .filter((item) => item && item !== '')
        }
      })

      // Normalize string fields - kiểm tra type trước khi gọi trim()
      const stringFields = ['name', 'goal', 'reason', 'context', 'feedback']
      stringFields.forEach((field) => {
        const value = cleaned[field]
        if (typeof value === 'string') {
          cleaned[field] = value.trim()
        } else if (value != null && typeof value === 'object') {
          // Nếu là object (ví dụ context từ backend), convert sang string
          if (field === 'context') {
            // Context object từ backend: { module, scope, system }
            const parts = []
            if (value.module) parts.push(`Module: ${value.module}`)
            if (value.scope) parts.push(`Scope: ${value.scope}`)
            if (value.system) parts.push(`System: ${value.system}`)
            cleaned[field] = parts.join(', ').trim()
          } else {
            // Các object khác, convert sang empty string
            cleaned[field] = ''
          }
        } else {
          cleaned[field] = String(value || '').trim()
        }
      })

      // Normalize priority
      if (!['low', 'medium', 'high'].includes(cleaned.priority)) {
        cleaned.priority = 'medium'
      }

      // Normalize role
      if (cleaned.role) {
        cleaned.role = {
          name: (cleaned.role.name || '').trim(),
        }
      }

      return cleaned
    },

    // So sánh form ban đầu với form hiện tại để phát hiện thay đổi
    hasFormChanged(original, current) {
      // So sánh các trường cơ bản
      const basicFields = ['name', 'goal', 'reason', 'priority', 'context', 'feedback']
      for (const field of basicFields) {
        // Xử lý an toàn - kiểm tra type trước khi gọi trim()
        let originalValue = original[field]
        let currentValue = current[field]
        
        if (typeof originalValue === 'string') {
          originalValue = originalValue.trim()
        } else if (originalValue != null && typeof originalValue === 'object' && field === 'context') {
          // Context object từ backend
          const parts = []
          if (originalValue.module) parts.push(`Module: ${originalValue.module}`)
          if (originalValue.scope) parts.push(`Scope: ${originalValue.scope}`)
          if (originalValue.system) parts.push(`System: ${originalValue.system}`)
          originalValue = parts.join(', ').trim()
        } else {
          originalValue = String(originalValue || '').trim()
        }
        
        if (typeof currentValue === 'string') {
          currentValue = currentValue.trim()
        } else if (currentValue != null && typeof currentValue === 'object' && field === 'context') {
          // Context object từ backend
          const parts = []
          if (currentValue.module) parts.push(`Module: ${currentValue.module}`)
          if (currentValue.scope) parts.push(`Scope: ${currentValue.scope}`)
          if (currentValue.system) parts.push(`System: ${currentValue.system}`)
          currentValue = parts.join(', ').trim()
        } else {
          currentValue = String(currentValue || '').trim()
        }
        
        if (originalValue !== currentValue) {
          return true
        }
      }

      // So sánh role
      const originalRoleName = (original.role?.name || '').trim()
      const currentRoleName = (current.role?.name || '').trim()
      if (originalRoleName !== currentRoleName) {
        return true
      }

      // So sánh tasks - xử lý riêng vì là objects
      const originalTasks = (original.tasks || []).map((task) => {
        if (typeof task === 'object' && task !== null) {
          return `${(task.action || '').trim()}|${(task.expected_result || '').trim()}`
        }
        return String(task || '').trim()
      }).filter(Boolean)
      const currentTasks = (current.tasks || []).map((task) => {
        if (typeof task === 'object' && task !== null) {
          return `${(task.action || '').trim()}|${(task.expected_result || '').trim()}`
        }
        return String(task || '').trim()
      }).filter(Boolean)

      if (originalTasks.length !== currentTasks.length) {
        return true
      }

      for (let i = 0; i < originalTasks.length; i++) {
        if (originalTasks[i] !== currentTasks[i]) {
          return true
        }
      }

      // So sánh alternative_flows - xử lý riêng vì là objects
      const originalFlows = (original.alternative_flows || []).map((flow) => {
        if (typeof flow === 'object' && flow !== null) {
          return `${flow.at_step || 1}|${(flow.condition || '').trim()}|${(flow.system_response || '').trim()}|${(flow.end_state || '').trim()}`
        }
        return ''
      }).filter(Boolean)
      const currentFlows = (current.alternative_flows || []).map((flow) => {
        if (typeof flow === 'object' && flow !== null) {
          return `${flow.at_step || 1}|${(flow.condition || '').trim()}|${(flow.system_response || '').trim()}|${(flow.end_state || '').trim()}`
        }
        return ''
      }).filter(Boolean)

      if (originalFlows.length !== currentFlows.length) {
        return true
      }

      for (let i = 0; i < originalFlows.length; i++) {
        if (originalFlows[i] !== currentFlows[i]) {
          return true
        }
      }

      // So sánh rules - xử lý riêng vì là objects
      const originalRules = (original.rules || []).map((rule) => {
        if (typeof rule === 'object' && rule !== null) {
          return `${(rule.id || '').trim()}|${(rule.description || '').trim()}`
        }
        return String(rule || '').trim()
      }).filter(Boolean)
      const currentRules = (current.rules || []).map((rule) => {
        if (typeof rule === 'object' && rule !== null) {
          return `${(rule.id || '').trim()}|${(rule.description || '').trim()}`
        }
        return String(rule || '').trim()
      }).filter(Boolean)

      if (originalRules.length !== currentRules.length) {
        return true
      }

      const sortedOriginalRules = [...originalRules].sort()
      const sortedCurrentRules = [...currentRules].sort()

      for (let i = 0; i < sortedOriginalRules.length; i++) {
        if (sortedOriginalRules[i] !== sortedCurrentRules[i]) {
          return true
        }
      }

      // So sánh các mảng khác
      const arrayFields = [
        'inputs',
        'outputs',
        'preconditions',
        'postconditions',
        'triggers',
        'constraints',
        'exceptions',
        'stakeholders',
        'related_usecases',
      ]

      for (const field of arrayFields) {
        const originalArray = (original[field] || []).map((item) => String(item).trim()).filter(Boolean)
        const currentArray = (current[field] || []).map((item) => String(item).trim()).filter(Boolean)

        if (originalArray.length !== currentArray.length) {
          return true
        }

        // So sánh từng phần tử (đã được sort để so sánh chính xác)
        const sortedOriginal = [...originalArray].sort()
        const sortedCurrent = [...currentArray].sort()

        for (let i = 0; i < sortedOriginal.length; i++) {
          if (sortedOriginal[i] !== sortedCurrent[i]) {
            return true
          }
        }
      }

      return false
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
  animation: fadeIn 0.2s ease-out;
}

.modal-content {
  position: relative;
  min-height: 650px;
  background: white;
  border-radius: var(--radius-field);
  max-width: 1000px;
  width: 100%;
  padding: 12px 0px;
  max-height: 90vh;
  overflow-y: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  animation: slideUp 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  position: absolute;
  width: 100%;
  height: 80px;
  top: 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 12px 24px;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  border-radius: var(--radius-field) var(--radius-field) 0 0;
}
.header-content {
  padding-bottom: 12px;
}
.header-content h2 {
  margin: 0 0 4px 0;
  color: var(--text);
  font-size: 1.5rem;
  font-weight: 600;
}

.subtitle {
  margin: 0;
  color: var(--muted);
  font-size: 0.875rem;
}

.close-btn {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  border-radius: 999px;
  color: var(--muted);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: var(--sunken);
  color: var(--text);
}

/* Progress Indicator */
.progress-indicator {
  position: absolute;
  width: 100%;
  top: calc(15% - 20px);
  display: flex;
  padding: 8px 24px;
  border-bottom: 1px solid var(--border-strong);
  background: var(--bg);
  z-index: 1;
}

.step {
  display: flex;
  align-items: center;
  padding: 12px 0;
  flex: 1;
  position: relative;
}

.step:not(:last-child):after {
  content: '';
  position: absolute;
  top: 50%;
  right: 0;
  width: 100%;
  height: 2px;
  background: var(--sunken);
  z-index: 1;
}

.step.completed:not(:last-child):after {
  background: var(--success);
}

.step-number {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--sunken);
  border: 2px solid var(--border-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--muted);
  margin-right: 8px;
  z-index: 2;
  transition: all 0.3s;
}

.step.active .step-number {
  background: var(--ink);
  border-color: var(--ink);
  color: white;
}

.step.completed .step-number {
  background: var(--success);
  border-color: var(--success);
  color: white;
}

.step-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--muted);
  transform: translatey(15px) translateX(-20%);
  transition: color 0.3s;
}

.step.active .step-label {
  color: var(--text);
  font-weight: 600;
}

.step.completed .step-label {
  color: var(--success);
}

/* Form Steps */
.usecase-form {
  transform: translateY(40%);
  max-height: 300px;
  padding: 0;
}

.form-step {
  max-height: 450px;
  overflow-y: auto;
  padding: 24px;
}

.step-header {
  margin-bottom: 24px;
}

.step-header h3 {
  margin: 0 0 4px 0;
  color: var(--text);
  font-size: 1.25rem;
  font-weight: 600;
}

.step-header p {
  margin: 0;
  color: var(--muted);
  font-size: 0.875rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group.span-2 {
  grid-column: span 2;
}

.form-group.span-3 {
  grid-column: span 3;
}

.conditions-row {
  grid-column: span 3;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.conditions-row .form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.conditions-row .array-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.conditions-row .array-item input {
  flex: 1 1 auto;
  min-width: 0;
}

label {
  font-weight: 600;
  color: var(--text);
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 4px;
}

label.required:after {
  content: '*';
  color: var(--danger);
}

input,
select,
textarea {
  padding: 10px 12px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  transition: all 0.2s;
  font-family: inherit;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: var(--ink);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

input.error,
textarea.error {
  border-color: var(--danger);
}

input.error:focus,
textarea.error:focus {
  border-color: var(--danger);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.error-message {
  color: var(--danger);
  font-size: 0.75rem;
  margin-top: 4px;
}

.field-help {
  color: var(--muted);
  font-size: 0.75rem;
  margin-top: 4px;
}

textarea {
  resize: vertical;
  min-height: 60px;
  line-height: 1.5;
}

/* Priority Selector */
.priority-selector {
  display: flex;
  gap: 8px;
}

.priority-option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;
}

.priority-option:hover {
  border-color: var(--border-strong);
}

.priority-option.active {
  border-color: var(--ink);
  background: var(--sunken);
  color: var(--ink);
  font-weight: 500;
}

.priority-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.priority-indicator.high {
  background: var(--danger);
}

.priority-indicator.medium {
  background: var(--warning);
}

.priority-indicator.low {
  background: var(--success);
}

/* Array Inputs */
.array-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.array-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.array-item .step-number {
  width: 20px;
  height: 20px;
  background: var(--sunken);
  border: 1px solid var(--border-strong);
  color: var(--muted);
  font-size: 0.625rem;
  flex-shrink: 0;
}

.array-item input {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
}

/* Task Item Styles */
.task-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
}

.task-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-header .step-number {
  width: 24px;
  height: 24px;
  background: var(--ink);
  border: 1px solid var(--ink);
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}

.task-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.task-input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.task-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--muted);
  margin: 0;
}

.task-input-group input {
  margin: 0;
}

/* Alternative Flow Item Styles */
.alternative-flow-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
}

.flow-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.flow-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text);
}

.flow-inputs {
  display: grid;
  grid-template-columns: 80px 1fr 1fr 1fr;
  gap: 12px;
}

.flow-input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.flow-input-group input {
  margin: 0;
}

.remove-item-btn,
.add-item-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.75rem;
  color: var(--muted);
}

.remove-item-btn:hover {
  background: var(--sunken);
  border-color: #fecaca;
  color: var(--danger);
}

.add-item-btn:hover {
  background: var(--bg);
  border-color: var(--border-strong);
  color: var(--ink);
}

.remove-item-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.remove-item-btn:disabled:hover {
  background: white;
  border-color: var(--border-strong);
  color: var(--muted);
}

/* Review Section */
.review-section {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 20px;
}

.review-section h4 {
  margin: 0 0 16px 0;
  color: var(--text);
  font-size: 1rem;
  font-weight: 600;
}

.review-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.review-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.review-item.span-2 {
  grid-column: span 2;
}

.review-label {
  font-size: 0.75rem;
  color: var(--muted);
  font-weight: 500;
}

.review-value {
  font-size: 0.875rem;
  color: var(--text);
  line-height: 1.4;
}

.priority-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--radius-field);
  font-size: 0.75rem;
  font-weight: 500;
  width: fit-content;
}

.priority-tag.high {
  background: var(--sunken);
  color: var(--danger);
}

.priority-tag.medium {
  background: var(--bg);
  color: var(--danger);
}

.priority-tag.low {
  background: var(--bg);
  color: var(--success);
}

/* Form Actions */
.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-top: 1px solid var(--border);
  background: var(--bg);
  border-radius: 0 0 var(--radius-field) var(--radius-field);
}

.action-left,
.action-right {
  display: flex;
  gap: 12px;
}

.primary-btn,
.secondary-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: none;
  border-radius: 999px;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.primary-btn {
  background: var(--ink);
  color: white;
}

.primary-btn:hover:not(:disabled) {
  background: var(--ink);
}

.primary-btn:disabled {
  background: var(--muted);
  cursor: not-allowed;
}

.secondary-btn {
  background: white;
  color: var(--text);
  border: 1px solid var(--border-strong);
}

.secondary-btn:hover:not(:disabled) {
  background: var(--bg);
  border-color: var(--border-strong);
}

.secondary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Loading Spinner */
.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Related Use Case Select */
.related-usecase-select {
  padding: 10px 12px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  transition: all 0.2s;
  font-family: inherit;
  background: white;
  flex: 1;
}

.related-usecase-select:focus {
  outline: none;
  border-color: var(--ink);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.related-usecase-select option:disabled {
  color: var(--muted);
  background-color: var(--sunken);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 10px;
  }

  .modal-content {
    max-height: 95vh;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-group.span-2,
  .form-group.span-3 {
    grid-column: span 1;
  }

  .conditions-row {
    grid-column: span 1;
    grid-template-columns: 1fr;
  }

  .flow-inputs {
    grid-template-columns: 1fr;
  }

  .priority-selector {
    flex-direction: column;
  }

  .form-actions {
    flex-direction: column-reverse;
    gap: 12px;
  }

  .action-left,
  .action-right {
    width: 100%;
  }

  .action-right {
    justify-content: space-between;
  }

  .progress-indicator {
    padding: 0 16px;
  }

  .step-label {
    display: none;
  }
}
.suggestion-banner {
  background: var(--bg);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  margin-top: 8px;
  font-size: 0.875rem;
  color: var(--ink);
}

.suggestion-btn {
  background: none;
  border: none;
  color: var(--ink);
  text-decoration: underline;
  cursor: pointer;
  font-weight: 500;
}

.suggestion-btn:hover {
  color: var(--ink);
}

input.has-suggestion {
  border-color: var(--ink);
  box-shadow: 0 0 0 1px #38bdf8;
}
</style>