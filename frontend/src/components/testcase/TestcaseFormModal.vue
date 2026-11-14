<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content xlarge">
      <div class="modal-header">
        <h2>{{ isEdit ? 'Sửa test case' : 'Tạo test case mới' }}</h2>
        <button class="btn-close" @click="$emit('close')">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="modal-body">
        <!-- Progress Steps -->
        <div class="progress-steps">
          <div
            v-for="(step, index) in steps"
            :key="step.id"
            :class="[
              'step',
              {
                active: currentStep === index,
                completed: currentStep > index,
              },
            ]"
            @click="goToStep(index)"
          >
            <div class="step-number">{{ index + 1 }}</div>
            <div class="step-label">{{ step.label }}</div>
          </div>
        </div>

        <!-- Step Content -->
        <form @submit.prevent="handleSubmit" class="testcase-form">
          <!-- Step 1: Basic Information -->
          <div v-if="currentStep === 0" class="form-step">
            <div class="form-section">
              <h3 class="section-title">
                <span class="material-symbols-outlined">info</span>
                Thông tin cơ bản
              </h3>

              <div class="form-grid">
                <div class="form-group full-width">
                  <label class="form-label required">Tiêu đề</label>
                  <input
                    v-model="formData.title"
                    type="text"
                    class="form-input"
                    placeholder="Nhập tiêu đề test case"
                    required
                    :class="{ error: !formData.title && submitted }"
                    @blur="autoFormatTitle"
                  />
                  <div class="title-format-hint">Định dạng: UC{số} - {Tính năng} - {Kịch bản}</div>
                  <div v-if="!formData.title && submitted" class="error-message">
                    Cần nhập tiêu đề
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label required">Loại kiểm thử</label>
                  <select v-model="formData.test_type" class="form-select" required>
                    <option value="">Chọn kiểu</option>
                    <option value="unit">Kiểm thử đơn vị</option>
                    <option value="integration">Kiểm thử tích hợp</option>
                    <option value="api">Kiểm thử API</option>
                    <option value="ui">Kiểm thử giao diện</option>
                    <option value="performance">Kiểm thử hiệu năng</option>
                    <option value="security">Kiểm thử bảo mật</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label required">Độ ưu tiên</label>
                  <select v-model="formData.priority" class="form-select" required>
                    <option value="">Chọn mức ưu tiên</option>
                    <option value="critical">Nghiêm trọng</option>
                    <option value="high">Cao</option>
                    <option value="medium">Trung bình</option>
                    <option value="low">Thấp</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label required">Trạng thái</label>
                  <select v-model="formData.status" class="form-select" required>
                    <option value="not_executed">Chưa chạy</option>
                    <option value="in_progress">Đang thực hiện</option>
                    <option value="passed">Đạt</option>
                    <option value="failed">Thất bại</option>
                    <option value="blocked">Bị chặn</option>
                  </select>
                </div>

                <div class="form-group full-width">
                  <label class="form-label">Mô tả</label>
                  <textarea
                    v-model="formData.description"
                    class="form-textarea"
                    rows="3"
                    placeholder="Mô tả mục đích của test case..."
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 2: Conditions & Steps -->
          <div v-if="currentStep === 1" class="form-step">
            <!-- Preconditions & Postconditions Section -->
            <div class="form-section">
              <h3 class="section-title">
                <span class="material-symbols-outlined">assignment</span>
                Điều kiện tiên quyết & điều kiện sau
              </h3>

              <div class="condition-grid">
                <div class="condition-group">
                  <label class="form-label">Điều kiện tiên quyết</label>
                  <div class="list-container">
                    <div
                      v-for="(condition, index) in formData.preconditions"
                      :key="index"
                      class="list-item"
                    >
                      <textarea
                        v-model="formData.preconditions[index]"
                        class="form-textarea small"
                        rows="2"
                        placeholder="Nhập điều kiện tiên quyết..."
                      ></textarea>
                      <button
                        type="button"
                        class="btn-icon danger"
                        @click="removePrecondition(index)"
                        :disabled="formData.preconditions.length === 1"
                      >
                        <span class="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                    <button type="button" class="btn-add-item" @click="addPrecondition">
                      <span class="material-symbols-outlined">add</span>
                      Thêm điều kiện tiên quyết
                    </button>
                  </div>
                </div>

                <div class="condition-group">
                  <label class="form-label">Điều kiện sau</label>
                  <div class="list-container">
                    <div
                      v-for="(condition, index) in formData.postconditions"
                      :key="index"
                      class="list-item"
                    >
                      <textarea
                        v-model="formData.postconditions[index]"
                        class="form-textarea small"
                        rows="2"
                        placeholder="Nhập điều kiện sau..."
                      ></textarea>
                      <button
                        type="button"
                        class="btn-icon danger"
                        @click="removePostcondition(index)"
                        :disabled="formData.postconditions.length === 1"
                      >
                        <span class="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                    <button type="button" class="btn-add-item" @click="addPostcondition">
                      <span class="material-symbols-outlined">add</span>
                      Thêm điều kiện sau
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Test Steps Section -->
            <div class="form-section">
              <h3 class="section-title">
                <span class="material-symbols-outlined">list</span>
                Các bước kiểm thử
                <button type="button" class="btn-text" @click="showStepTemplates = true">
                  <span class="material-symbols-outlined">mobile_layout</span>
                  Dùng mẫu
                </button>
              </h3>

              <div class="steps-container">
                <draggable
                  v-model="formData.steps"
                  item-key="step_number"
                  handle=".drag-handle"
                  @end="onStepReorder"
                >
                  <template #item="{ element: step, index }">
                    <div class="step-item">
                      <div class="step-header">
                        <div class="step-left">
                          <button type="button" class="btn-icon drag-handle">
                            <span class="material-symbols-outlined">drag_indicator</span>
                          </button>
                          <span class="step-number">Bước {{ step.step_number }}</span>
                        </div>
                        <button
                          type="button"
                          class="btn-icon danger"
                          @click="removeStep(index)"
                          :disabled="formData.steps.length === 1"
                        >
                          <span class="material-symbols-outlined">delete</span>
                        </button>
                      </div>

                      <div class="step-content">
                        <div class="form-group full-width">
                          <label class="form-label">Hành động</label>
                          <div class="action-input-group">
                            <textarea
                              v-model="step.action"
                              class="form-textarea"
                              rows="3"
                              placeholder="Mô tả hành động cần thực hiện..."
                            ></textarea>
                            <button
                              type="button"
                              class="btn-icon suggestion-btn"
                              @click="showActionSuggestions(index)"
                              title="Gợi ý hành động"
                            >
                              <span class="material-symbols-outlined">lightbulb</span>
                            </button>
                          </div>
                        </div>

                        <div class="form-group full-width">
                          <label class="form-label">Dữ liệu đầu vào</label>
                          <div class="json-input-container">
                            <div class="json-input-tabs">
                              <button
                                type="button"
                                :class="['tab-btn', step.jsonViewMode === 'form' ? 'active' : '']"
                                @click="step.jsonViewMode = 'form'"
                              >
                                Biểu mẫu
                              </button>
                              <button
                                type="button"
                                :class="['tab-btn', step.jsonViewMode === 'json' ? 'active' : '']"
                                @click="step.jsonViewMode = 'json'"
                              >
                                JSON
                              </button>
                            </div>

                            <div v-if="step.jsonViewMode === 'form'" class="key-value-form">
                              <div
                                v-for="(item, keyIndex) in step.input_data_form"
                                :key="keyIndex"
                                class="key-value-row"
                              >
                                <input
                                  v-model="item.key"
                                  type="text"
                                  class="form-input key-input"
                                  placeholder="Khoá"
                                  @blur="updateStepJsonFromForm(step)"
                                />
                                <input
                                  v-model="item.value"
                                  type="text"
                                  class="form-input value-input"
                                  placeholder="Giá trị"
                                  @blur="updateStepJsonFromForm(step)"
                                />
                                <button
                                  type="button"
                                  class="btn-icon danger"
                                  @click="removeKeyValue(step.input_data_form, keyIndex)"
                                >
                                  <span class="material-symbols-outlined">delete</span>
                                </button>
                              </div>
                              <button
                                type="button"
                                class="btn-add-kv"
                                @click="addKeyValue(step.input_data_form)"
                              >
                                <span class="material-symbols-outlined">add</span>
                                Thêm trường
                              </button>
                            </div>

                            <textarea
                              v-else
                              v-model="step.input_data_json"
                              class="form-textarea json-textarea"
                              rows="4"
                              placeholder="Dán JSON hoặc dùng dạng biểu mẫu"
                              :class="{ error: step.input_data_error }"
                              @blur="validateStepJson(step, 'input_data')"
                              @paste="handleJsonPaste($event, step)"
                            ></textarea>

                            <div v-if="step.input_data_error" class="error-message">
                              {{ step.input_data_error }}
                            </div>
                          </div>
                        </div>

                        <div class="form-group full-width">
                          <label class="form-label">Kết quả tức thời mong đợi</label>
                          <textarea
                            v-model="step.expected_immediate_result"
                            class="form-textarea"
                            rows="2"
                            placeholder="Ngay sau bước này cần xảy ra điều gì?"
                          ></textarea>
                        </div>
                      </div>
                    </div>
                  </template>
                </draggable>

                <div class="step-actions">
                  <button type="button" class="btn-add-step" @click="addStep">
                    <span class="material-symbols-outlined">add</span>
                    Thêm bước
                  </button>
                  <button type="button" class="btn-text" @click="duplicateLastStep">
                    <span class="material-symbols-outlined">content_copy</span>
                    Nhân bản dòng cuối
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 3: Expected Results -->
          <div v-if="currentStep === 2" class="form-step">
            <div class="form-section">
              <h3 class="section-title">
                <span class="material-symbols-outlined">check_circle</span>
                Kết quả mong đợi
              </h3>

              <div class="expected-results-grid">
                <div class="result-level">
                  <h4 class="result-title">Kết quả mức giao diện</h4>
                  <div class="list-container">
                    <div
                      v-for="(result, index) in formData.expected_results.ui_level"
                      :key="index"
                      class="list-item"
                    >
                      <input
                        v-model="formData.expected_results.ui_level[index]"
                        type="text"
                        class="form-input"
                        placeholder="Nhập kết quả mong đợi mức giao diện..."
                      />
                      <button
                        type="button"
                        class="btn-icon danger"
                        @click="removeUIResult(index)"
                        :disabled="formData.expected_results.ui_level.length === 1"
                      >
                        <span class="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                    <button type="button" class="btn-add-item" @click="addUIResult">
                      <span class="material-symbols-outlined">add</span>
                      Thêm kết quả giao diện
                    </button>
                  </div>
                </div>

                <div class="result-level">
                  <h4 class="result-title">Kết quả mức API</h4>
                  <div class="api-results-form">
                    <div class="form-group">
                      <label class="form-label">Mã trạng thái</label>
                      <input
                        v-model="formData.expected_results.api_level.status_code"
                        type="number"
                        class="form-input"
                        placeholder="e.g., 200, 400, 500"
                      />
                    </div>
                    <div class="form-group full-width">
                      <label class="form-label">Lược đồ phản hồi</label>
                      <div class="json-input-container">
                        <div class="json-input-tabs">
                          <button
                            type="button"
                            :class="[
                              'tab-btn',
                              formData.expected_results.api_level.jsonViewMode === 'form'
                                ? 'active'
                                : '',
                            ]"
                            @click="formData.expected_results.api_level.jsonViewMode = 'form'"
                          >
                            Biểu mẫu
                          </button>
                          <button
                            type="button"
                            :class="[
                              'tab-btn',
                              formData.expected_results.api_level.jsonViewMode === 'json'
                                ? 'active'
                                : '',
                            ]"
                            @click="formData.expected_results.api_level.jsonViewMode = 'json'"
                          >
                            JSON
                          </button>
                        </div>

                        <div
                          v-if="formData.expected_results.api_level.jsonViewMode === 'form'"
                          class="key-value-form"
                        >
                          <div
                            v-for="(item, keyIndex) in formData.expected_results.api_level
                              .response_schema_form"
                            :key="keyIndex"
                            class="key-value-row"
                          >
                            <input
                              v-model="item.key"
                              type="text"
                              class="form-input key-input"
                              placeholder="Khoá"
                              @blur="updateApiSchemaFromForm"
                            />
                            <input
                              v-model="item.value"
                              type="text"
                              class="form-input value-input"
                              placeholder="Giá trị"
                              @blur="updateApiSchemaFromForm"
                            />
                            <button
                              type="button"
                              class="btn-icon danger"
                              @click="
                                removeKeyValue(
                                  formData.expected_results.api_level.response_schema_form,
                                  keyIndex
                                )
                              "
                            >
                              <span class="material-symbols-outlined">delete</span>
                            </button>
                          </div>
                          <button
                            type="button"
                            class="btn-add-kv"
                            @click="
                              addKeyValue(formData.expected_results.api_level.response_schema_form)
                            "
                          >
                            <span class="material-symbols-outlined">add</span>
                            Thêm trường
                          </button>
                        </div>

                        <textarea
                          v-else
                          v-model="formData.expected_results.api_level.response_schema_json"
                          class="form-textarea json-textarea"
                          rows="4"
                          placeholder="Dán JSON hoặc dùng dạng biểu mẫu"
                          :class="{
                            error: formData.expected_results.api_level.response_schema_error,
                          }"
                          @blur="validateApiResponseSchema"
                          @paste="handleApiSchemaPaste"
                        ></textarea>
                      </div>
                      <div
                        v-if="formData.expected_results.api_level.response_schema_error"
                        class="error-message"
                      >
                        {{ formData.expected_results.api_level.response_schema_error }}
                      </div>
                    </div>
                  </div>
                </div>

                <div class="result-level">
                  <h4 class="result-title">Kết quả mức cơ sở dữ liệu</h4>
                  <div class="list-container">
                    <div
                      v-for="(result, index) in formData.expected_results.database_level"
                      :key="index"
                      class="list-item"
                    >
                      <input
                        v-model="formData.expected_results.database_level[index]"
                        type="text"
                        class="form-input"
                        placeholder="Nhập kết quả mong đợi mức cơ sở dữ liệu..."
                      />
                      <button
                        type="button"
                        class="btn-icon danger"
                        @click="removeDBResult(index)"
                        :disabled="formData.expected_results.database_level.length === 1"
                      >
                        <span class="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                    <button type="button" class="btn-add-item" @click="addDBResult">
                      <span class="material-symbols-outlined">add</span>
                      Thêm kết quả cơ sở dữ liệu
                    </button>
                  </div>
                </div>

                <div class="result-level full-width">
                  <h4 class="result-title">Kết quả mức nghiệp vụ</h4>
                  <textarea
                    v-model="formData.expected_results.business_level"
                    class="form-textarea"
                    rows="3"
                    placeholder="Mô tả kết quả mong đợi mức nghiệp vụ..."
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 4: Test Data & Database -->
          <div v-if="currentStep === 3" class="form-step">
            <!-- Database Integration Section -->
            <div class="form-section">
              <h3 class="section-title">
                <span class="material-symbols-outlined">database</span>
                Tích hợp cơ sở dữ liệu
                <button type="button" class="btn-text" @click="showTableSelector = true">
                  <span class="material-symbols-outlined">search</span>
                  Chọn bảng
                </button>
              </h3>

              <div class="form-grid">
                <div class="form-group full-width">
                  <label class="form-label">Bảng dữ liệu</label>
                  <div class="tags-input">
                    <div class="selected-tags">
                      <span v-for="table in formData.database_tables" :key="table" class="tag">
                        {{ table }}
                        <button type="button" class="tag-remove" @click="removeTable(table)">
                          <span class="material-symbols-outlined">close</span>
                        </button>
                      </span>
                    </div>
                    <div class="tag-input-group">
                      <input
                        v-model="newTable"
                        type="text"
                        class="form-input tag-input"
                        placeholder="Nhập tên bảng hoặc chọn từ danh sách..."
                        @keydown.enter.prevent="addTable"
                        @focus="showTableSuggestions = true"
                      />
                      <button
                        type="button"
                        class="btn-secondary small"
                        @click="addTable"
                        :disabled="!newTable.trim()"
                      >
                        Thêm bảng
                      </button>
                    </div>

                    <!-- Table Suggestions -->
                    <div
                      v-if="showTableSuggestions && availableTables.length"
                      class="suggestions-dropdown"
                    >
                      <div
                        v-for="table in availableTables"
                        :key="table"
                        class="suggestion-item"
                        @click="selectTable(table)"
                      >
                        <span class="table-name">{{ table.name }}</span>
                        <span class="table-columns">{{ table.columns.length }} cột</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="form-group full-width">
                  <label class="form-label">Thao tác cơ sở dữ liệu</label>
                  <div class="checkbox-group">
                    <label
                      v-for="operation in databaseOperations"
                      :key="operation.value"
                      class="checkbox-item"
                    >
                      <input
                        type="checkbox"
                        :value="operation.value"
                        v-model="formData.database_operations"
                      />
                      <span class="checkmark"></span>
                      <span class="checkbox-label">{{ operation.label }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <!-- Test Data Section -->
            <div class="form-section">
              <h3 class="section-title">
                <span class="material-symbols-outlined">data_table</span>
                Dữ liệu kiểm thử
                <button type="button" class="btn-text" @click="showTestDataTemplates = true">
                  <span class="material-symbols-outlined">mobile_layout</span>
                  Dùng mẫu
                </button>
              </h3>

              <div class="test-data-container">
                <div
                  v-for="(data, index) in formData.test_data"
                  :key="index"
                  class="test-data-item"
                >
                  <div class="data-header">
                    <input
                      v-model="data.name"
                      type="text"
                      class="form-input data-name"
                      placeholder="Tên kịch bản dữ liệu kiểm thử"
                    />
                    <div class="data-actions">
                      <button
                        type="button"
                        class="btn-icon"
                        @click="duplicateTestData(index)"
                        title="Nhân bản kịch bản"
                      >
                        <span class="material-symbols-outlined">content_copy</span>
                      </button>
                      <button
                        type="button"
                        class="btn-icon danger"
                        @click="removeTestData(index)"
                        :disabled="formData.test_data.length === 1"
                      >
                        <span class="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </div>

                  <div class="data-grid">
                    <div class="data-field">
                      <label class="form-label">Dữ liệu đầu vào</label>
                      <div class="json-input-container">
                        <div class="json-input-tabs">
                          <button
                            type="button"
                            :class="[
                              'tab-btn',
                              data.inputPayloadViewMode === 'form' ? 'active' : '',
                            ]"
                            @click="data.inputPayloadViewMode = 'form'"
                          >
                            Biểu mẫu
                          </button>
                          <button
                            type="button"
                            :class="[
                              'tab-btn',
                              data.inputPayloadViewMode === 'json' ? 'active' : '',
                            ]"
                            @click="data.inputPayloadViewMode = 'json'"
                          >
                            JSON
                          </button>
                        </div>

                        <div v-if="data.inputPayloadViewMode === 'form'" class="key-value-form">
                          <div
                            v-for="(item, keyIndex) in data.input_payload_form"
                            :key="keyIndex"
                            class="key-value-row"
                          >
                            <input
                              v-model="item.key"
                              type="text"
                              class="form-input key-input"
                              placeholder="Khoá"
                              @blur="updateTestDataJsonFromForm(data, 'input_payload')"
                            />
                            <input
                              v-model="item.value"
                              type="text"
                              class="form-input value-input"
                              placeholder="Giá trị"
                              @blur="updateTestDataJsonFromForm(data, 'input_payload')"
                            />
                            <button
                              type="button"
                              class="btn-icon danger"
                              @click="removeKeyValue(data.input_payload_form, keyIndex)"
                            >
                              <span class="material-symbols-outlined">delete</span>
                            </button>
                          </div>
                          <button
                            type="button"
                            class="btn-add-kv"
                            @click="addKeyValue(data.input_payload_form)"
                          >
                            <span class="material-symbols-outlined">add</span>
                            Thêm trường
                          </button>
                        </div>

                        <textarea
                          v-else
                          v-model="data.input_payload_json"
                          class="form-textarea json-textarea"
                          rows="4"
                          placeholder="Dán JSON hoặc dùng dạng biểu mẫu"
                          :class="{ error: data.input_payload_error }"
                          @blur="validateTestDataJson(data, 'input_payload')"
                          @paste="handleTestDataJsonPaste($event, data, 'input_payload')"
                        ></textarea>
                      </div>
                      <div v-if="data.input_payload_error" class="error-message">
                        {{ data.input_payload_error }}
                      </div>
                    </div>

                    <div class="data-field">
                      <label class="form-label">Kết quả mong đợi</label>
                      <div class="json-input-container">
                        <div class="json-input-tabs">
                          <button
                            type="button"
                            :class="[
                              'tab-btn',
                              data.expectedOutputViewMode === 'form' ? 'active' : '',
                            ]"
                            @click="data.expectedOutputViewMode = 'form'"
                          >
                            Biểu mẫu
                          </button>
                          <button
                            type="button"
                            :class="[
                              'tab-btn',
                              data.expectedOutputViewMode === 'json' ? 'active' : '',
                            ]"
                            @click="data.expectedOutputViewMode = 'json'"
                          >
                            JSON
                          </button>
                        </div>

                        <div v-if="data.expectedOutputViewMode === 'form'" class="key-value-form">
                          <div
                            v-for="(item, keyIndex) in data.expected_output_form"
                            :key="keyIndex"
                            class="key-value-row"
                          >
                            <input
                              v-model="item.key"
                              type="text"
                              class="form-input key-input"
                              placeholder="Khoá"
                              @blur="updateTestDataJsonFromForm(data, 'expected_output')"
                            />
                            <input
                              v-model="item.value"
                              type="text"
                              class="form-input value-input"
                              placeholder="Giá trị"
                              @blur="updateTestDataJsonFromForm(data, 'expected_output')"
                            />
                            <button
                              type="button"
                              class="btn-icon danger"
                              @click="removeKeyValue(data.expected_output_form, keyIndex)"
                            >
                              <span class="material-symbols-outlined">delete</span>
                            </button>
                          </div>
                          <button
                            type="button"
                            class="btn-add-kv"
                            @click="addKeyValue(data.expected_output_form)"
                          >
                            <span class="material-symbols-outlined">add</span>
                            Thêm trường
                          </button>
                        </div>

                        <textarea
                          v-else
                          v-model="data.expected_output_json"
                          class="form-textarea json-textarea"
                          rows="4"
                          placeholder="Dán JSON hoặc dùng dạng biểu mẫu"
                          :class="{ error: data.expected_output_error }"
                          @blur="validateTestDataJson(data, 'expected_output')"
                          @paste="handleTestDataJsonPaste($event, data, 'expected_output')"
                        ></textarea>
                      </div>
                      <div v-if="data.expected_output_error" class="error-message">
                        {{ data.expected_output_error }}
                      </div>
                    </div>

                    <div class="data-field full-width">
                      <label class="form-label">Quy tắc kiểm tra hợp lệ</label>
                      <div class="list-container">
                        <div
                          v-for="(rule, ruleIndex) in data.validation_rules"
                          :key="ruleIndex"
                          class="list-item"
                        >
                          <input
                            v-model="data.validation_rules[ruleIndex]"
                            type="text"
                            class="form-input"
                            placeholder="Nhập quy tắc kiểm tra..."
                          />
                          <button
                            type="button"
                            class="btn-icon danger"
                            @click="removeValidationRule(data, ruleIndex)"
                            :disabled="data.validation_rules.length === 1"
                          >
                            <span class="material-symbols-outlined">delete</span>
                          </button>
                        </div>
                        <button type="button" class="btn-add-item" @click="addValidationRule(data)">
                          <span class="material-symbols-outlined">add</span>
                          Thêm quy tắc kiểm tra
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="test-data-actions">
                  <button type="button" class="btn-add-data" @click="addTestData">
                    <span class="material-symbols-outlined">add</span>
                    Thêm kịch bản dữ liệu
                  </button>
                  <button type="button" class="btn-text" @click="importTestDataFromClipboard">
                    <span class="material-symbols-outlined">content_paste</span>
                    Nhập từ bộ nhớ tạm
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 5: Requirements & Automation -->
          <div v-if="currentStep === 4" class="form-step">
            <!-- Requirements Section -->
            <div class="form-section">
              <h3 class="section-title">
                <span class="material-symbols-outlined">link</span>
                Yêu cầu
                <button type="button" class="btn-text" @click="showRequirementSelector = true">
                  <span class="material-symbols-outlined">search</span>
                  Chọn yêu cầu
                </button>
              </h3>

              <div class="form-group full-width">
                <label class="form-label">Mã yêu cầu nguồn</label>
                <div class="tags-input">
                  <div class="selected-tags">
                    <span v-for="reqId in formData.source_requirement_ids" :key="reqId" class="tag">
                      {{ reqId }}
                      <button type="button" class="tag-remove" @click="removeRequirement(reqId)">
                        <span class="material-symbols-outlined">close</span>
                      </button>
                    </span>
                  </div>
                  <div class="tag-input-group">
                    <input
                      v-model="newRequirement"
                      type="text"
                      class="form-input tag-input"
                      placeholder="Nhập mã yêu cầu hoặc chọn từ danh sách..."
                      @keydown.enter.prevent="addRequirement"
                      @focus="showRequirementSuggestions = true"
                    />
                    <button
                      type="button"
                      class="btn-secondary small"
                      @click="addRequirement"
                      :disabled="!newRequirement.trim()"
                    >
                      Thêm yêu cầu
                    </button>
                  </div>

                  <!-- Requirement Suggestions -->
                  <div
                    v-if="showRequirementSuggestions && availableRequirements.length"
                    class="suggestions-dropdown"
                  >
                    <div
                      v-for="req in availableRequirements"
                      :key="req.id"
                      class="suggestion-item"
                      @click="selectRequirement(req)"
                    >
                      <span class="req-id">{{ req.id }}</span>
                      <span class="req-title">{{ req.title }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Automation Section -->
            <div class="form-section">
              <h3 class="section-title">
                <span class="material-symbols-outlined">smart_toy</span>
                Tự động hoá
              </h3>

              <div class="automation-section">
                <label class="checkbox-large">
                  <input type="checkbox" v-model="formData.automation.is_automated" />
                  <span class="checkmark"></span>
                  <div class="checkbox-content">
                    <span class="checkbox-title">Test case tự động</span>
                    <span class="checkbox-description"
                      >Test case này được tự động hoá bằng script</span
                    >
                  </div>
                </label>

                <div v-if="formData.automation.is_automated" class="automation-details">
                  <div class="form-grid">
                    <div class="form-group">
                      <label class="form-label">Đường dẫn script</label>
                      <div class="script-path-group">
                        <input
                          v-model="formData.automation.script_path"
                          type="text"
                          class="form-input"
                          placeholder="VD: /tests/login/test_login.py"
                          @blur="autoGenerateScriptPath"
                        />
                        <button
                          type="button"
                          class="btn-icon"
                          @click="suggestScriptPath"
                          title="Gợi ý đường dẫn script"
                        >
                          <span class="material-symbols-outlined">auto_awesome</span>
                        </button>
                      </div>
                    </div>

                    <div class="form-group">
                      <label class="form-label">Lệnh chạy</label>
                      <input
                        v-model="formData.automation.test_command"
                        type="text"
                        class="form-input"
                        placeholder="VD: pytest tests/login/test_login.py::test_login_long_username"
                      />
                    </div>

                    <div class="form-group full-width">
                      <label class="form-label">Thẻ</label>
                      <div class="tags-input">
                        <div class="selected-tags">
                          <span v-for="tag in formData.automation.tags" :key="tag" class="tag">
                            {{ tag }}
                            <button
                              type="button"
                              class="tag-remove"
                              @click="removeAutomationTag(tag)"
                            >
                              <span class="material-symbols-outlined">close</span>
                            </button>
                          </span>
                        </div>
                        <div class="tag-input-group">
                          <input
                            v-model="newAutomationTag"
                            type="text"
                            class="form-input tag-input"
                            placeholder="Nhập thẻ tự động hoá..."
                            @keydown.enter.prevent="addAutomationTag"
                            @focus="showTagSuggestions = true"
                          />
                          <button
                            type="button"
                            class="btn-secondary small"
                            @click="addAutomationTag"
                            :disabled="!newAutomationTag.trim()"
                          >
                            Thêm thẻ
                          </button>
                        </div>

                        <!-- Tag Suggestions -->
                        <div
                          v-if="showTagSuggestions && availableTags.length"
                          class="suggestions-dropdown"
                        >
                          <div
                            v-for="tag in availableTags"
                            :key="tag"
                            class="suggestion-item"
                            @click="selectTag(tag)"
                          >
                            {{ tag }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Navigation Buttons -->
          <div class="step-navigation">
            <button
              type="button"
              class="btn btn-secondary"
              @click="prevStep"
              :disabled="currentStep === 0"
            >
              <span class="material-symbols-outlined">arrow_back</span>
              Trước
            </button>

            <div class="nav-right">
              <button type="button" class="btn btn-outline" @click="saveDraft" :disabled="saving">
                Lưu nháp
              </button>

              <button
                v-if="currentStep < steps.length - 1"
                type="button"
                class="btn btn-primary"
                @click="nextStep"
              >
                Tiếp
                <span class="material-symbols-outlined">arrow_forward</span>
              </button>

              <button v-else type="submit" class="btn btn-primary" :disabled="saving">
                <span v-if="saving" class="spinner"></span>
                {{ saving ? 'Đang lưu...' : isEdit ? 'Cập nhật test case' : 'Tạo test case' }}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Modals -->
    <StepTemplatesModal
      v-if="showStepTemplates"
      @close="showStepTemplates = false"
      @apply-template="applyStepTemplate"
    />

    <TableSelectorModal
      v-if="showTableSelector"
      :project-id="projectId"
      :version-id="versionId"
      @close="showTableSelector = false"
      @select-tables="handleTableSelection"
    />

    <RequirementSelectorModal
      v-if="showRequirementSelector"
      :project-id="projectId"
      :version-id="versionId"
      @close="showRequirementSelector = false"
      @select-requirements="handleRequirementSelection"
    />

    <TestDataTemplatesModal
      v-if="showTestDataTemplates"
      @close="showTestDataTemplates = false"
      @apply-template="applyTestDataTemplate"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import draggable from 'vuedraggable'
// Import modal components
import StepTemplatesModal from './StepTemplatesModal.vue'
import TableSelectorModal from './TableSelectorModal.vue'
import RequirementSelectorModal from './RequirementSelectorModal.vue'
import TestDataTemplatesModal from './TestDataTemplatesModal.vue'

export default {
  name: 'TestcaseFormModal',
  components: {
    draggable,
    StepTemplatesModal,
    TableSelectorModal,
    RequirementSelectorModal,
    TestDataTemplatesModal,
  },
  props: {
    testcase: {
      type: Object,
      default: null,
    },
    projectId: String,
    versionId: String,
  },
  emits: ['close', 'save'],
  setup(props, { emit }) {
    const toast = useToast()
    const saving = ref(false)
    const submitted = ref(false)
    const currentStep = ref(0)
    const newTable = ref('')
    const newRequirement = ref('')
    const newAutomationTag = ref('')

    // Define steps
    const steps = ref([
      { id: 'basic', label: 'Thông tin cơ bản' },
      { id: 'conditions', label: 'Điều kiện & các bước' },
      { id: 'results', label: 'Kết quả mong đợi' },
      { id: 'data', label: 'Dữ liệu kiểm thử & cơ sở dữ liệu' },
      { id: 'final', label: 'Yêu cầu & tự động hoá' },
    ])

    // Modal states
    const showStepTemplates = ref(false)
    const showTableSelector = ref(false)
    const showRequirementSelector = ref(false)
    const showTestDataTemplates = ref(false)

    // Suggestions states
    const showTableSuggestions = ref(false)
    const showRequirementSuggestions = ref(false)
    const showTagSuggestions = ref(false)

    const databaseOperations = [
      { value: 'select', label: 'SELECT' },
      { value: 'insert', label: 'INSERT' },
      { value: 'update', label: 'UPDATE' },
      { value: 'delete', label: 'DELETE' },
      { value: 'create', label: 'CREATE' },
      { value: 'alter', label: 'ALTER' },
    ]

    // Mock data for suggestions - in real app, these would come from APIs
    const availableTables = ref([
      { name: 'users', columns: ['id', 'username', 'email', 'created_at'] },
      { name: 'products', columns: ['id', 'name', 'price', 'category'] },
      { name: 'orders', columns: ['id', 'user_id', 'total', 'status'] },
      { name: 'categories', columns: ['id', 'name', 'description'] },
    ])

    const availableRequirements = ref([
      { id: 'REQ-001', title: 'Hệ thống xác thực người dùng' },
      { id: 'REQ-002', title: 'Quản lý danh mục sản phẩm' },
      { id: 'REQ-003', title: 'Quy trình xử lý đơn hàng' },
      { id: 'REQ-004', title: 'Tích hợp thanh toán' },
    ])

    const availableTags = ref([
      'smoke',
      'regression',
      'sanity',
      'api',
      'ui',
      'database',
      'performance',
    ])

    const formData = ref({
      title: '',
      description: '',
      test_type: 'ui',
      priority: 'medium',
      status: 'not_executed',
      preconditions: [''],
      postconditions: [''],
      steps: [
        {
          step_number: 1,
          action: '',
          input_data: {},
          input_data_json: '{}',
          input_data_form: [{ key: '', value: '' }],
          input_data_error: '',
          expected_immediate_result: '',
          jsonViewMode: 'form',
        },
      ],
      expected_results: {
        ui_level: [''],
        api_level: {
          status_code: null,
          response_schema: {},
          response_schema_json: '{}',
          response_schema_form: [{ key: '', value: '' }],
          response_schema_error: '',
          jsonViewMode: 'form',
        },
        database_level: [''],
        business_level: '',
      },
      source_requirement_ids: [],
      database_tables: [],
      database_operations: ['select'],
      test_data: [
        {
          name: 'Kịch bản mặc định',
          input_payload: {},
          input_payload_json: '{}',
          input_payload_form: [{ key: '', value: '' }],
          input_payload_error: '',
          expected_output: {},
          expected_output_json: '{}',
          expected_output_form: [{ key: '', value: '' }],
          expected_output_error: '',
          validation_rules: [''],
          inputPayloadViewMode: 'form',
          expectedOutputViewMode: 'form',
        },
      ],
      automation: {
        is_automated: false,
        script_path: '',
        test_command: '',
        tags: [],
      },
    })

    const isEdit = computed(() => !!props.testcase)

    // Step Navigation
    const nextStep = () => {
      if (currentStep.value < steps.value.length - 1) {
        currentStep.value++
      }
    }

    const prevStep = () => {
      if (currentStep.value > 0) {
        currentStep.value--
      }
    }

    const goToStep = (index) => {
      if (index <= currentStep.value) {
        currentStep.value = index
      }
    }

    // Auto-format title to UC{number} - {Feature} - {Scenario} format
    const autoFormatTitle = () => {
      if (!formData.value.title.trim() || isEdit.value) return

      const title = formData.value.title.trim()

      // Check if title already matches the format
      const ucFormatRegex = /^UC\d+\s*-\s*.+\s*-\s*.+$/
      if (ucFormatRegex.test(title)) return

      // Extract UC number, feature, and scenario from the title
      let ucNumber = 1
      let feature = ''
      let scenario = ''

      // Try to extract UC number if present
      const ucMatch = title.match(/UC\s*(\d+)/i)
      if (ucMatch) {
        ucNumber = parseInt(ucMatch[1])
        // Remove the UC part from title for further processing
        const remaining = title.replace(ucMatch[0], '').trim()

        // Split by common separators to get feature and scenario
        const parts = remaining
          .split(/[-–—]/)
          .map((part) => part.trim())
          .filter((part) => part)

        if (parts.length >= 2) {
          feature = parts[0]
          scenario = parts.slice(1).join(' - ')
        } else if (parts.length === 1) {
          feature = parts[0]
          scenario = 'Thành công với thông tin hợp lệ' // Default scenario
        }
      } else {
        // No UC number found, split the title to extract feature and scenario
        const parts = title
          .split(/[-–—]/)
          .map((part) => part.trim())
          .filter((part) => part)

        if (parts.length >= 2) {
          feature = parts[0]
          scenario = parts.slice(1).join(' - ')
        } else if (parts.length === 1) {
          feature = parts[0]
          scenario = 'Thành công với thông tin hợp lệ'
        }

        // Get next UC number (in real app, this would come from API)
        ucNumber = getNextUcNumber()
      }

      // Format the title
      if (feature && scenario) {
        formData.value.title = `UC${ucNumber} - ${feature} - ${scenario}`
      }
    }

    const getNextUcNumber = () => {
      // In real app, this would fetch the next available UC number from API
      // For now, return a mock number
      return Math.floor(Math.random() * 100) + 1
    }

    // Initialize form data
    const initializeForm = () => {
      if (props.testcase) {
        const convertJsonToForm = (jsonString) => {
          try {
            const obj = JSON.parse(jsonString || '{}')
            return Object.keys(obj).map((key) => ({ key, value: obj[key] }))
          } catch {
            return [{ key: '', value: '' }]
          }
        }

        formData.value = {
          ...formData.value,
          title: props.testcase.title || '',
          description: props.testcase.description || '',
          test_type: props.testcase.test_type || 'ui',
          priority: props.testcase.priority || 'medium',
          status: props.testcase.status || 'not_executed',
          preconditions: props.testcase.preconditions?.length
            ? [...props.testcase.preconditions]
            : [''],
          postconditions: props.testcase.postconditions?.length
            ? [...props.testcase.postconditions]
            : [''],
          steps: props.testcase.steps?.length
            ? props.testcase.steps.map((step, index) => ({
                step_number: step.step_number || index + 1,
                action: step.action || '',
                input_data: step.input_data || {},
                input_data_json: JSON.stringify(step.input_data || {}, null, 2),
                input_data_form: convertJsonToForm(JSON.stringify(step.input_data || {})),
                input_data_error: '',
                expected_immediate_result: step.expected_immediate_result || '',
                jsonViewMode: 'form',
              }))
            : formData.value.steps,
          expected_results: {
            ui_level: props.testcase.expected_results?.ui_level?.length
              ? [...props.testcase.expected_results.ui_level]
              : [''],
            api_level: {
              status_code: props.testcase.expected_results?.api_level?.status_code || null,
              response_schema: props.testcase.expected_results?.api_level?.response_schema || {},
              response_schema_json: JSON.stringify(
                props.testcase.expected_results?.api_level?.response_schema || {},
                null,
                2
              ),
              response_schema_form: convertJsonToForm(
                JSON.stringify(props.testcase.expected_results?.api_level?.response_schema || {})
              ),
              response_schema_error: '',
              jsonViewMode: 'form',
            },
            database_level: props.testcase.expected_results?.database_level?.length
              ? [...props.testcase.expected_results.database_level]
              : [''],
            business_level: props.testcase.expected_results?.business_level || '',
          },
          source_requirement_ids: props.testcase.source_requirement_ids || [],
          database_tables: props.testcase.database_tables || [],
          database_operations: props.testcase.database_operations || ['select'],
          test_data: props.testcase.test_data?.length
            ? props.testcase.test_data.map((data) => ({
                name: data.name || 'Dữ liệu kiểm thử',
                input_payload: data.input_payload || {},
                input_payload_json: JSON.stringify(data.input_payload || {}, null, 2),
                input_payload_form: convertJsonToForm(JSON.stringify(data.input_payload || {})),
                input_payload_error: '',
                expected_output: data.expected_output || {},
                expected_output_json: JSON.stringify(data.expected_output || {}, null, 2),
                expected_output_form: convertJsonToForm(JSON.stringify(data.expected_output || {})),
                expected_output_error: '',
                validation_rules: data.validation_rules?.length ? [...data.validation_rules] : [''],
                inputPayloadViewMode: 'form',
                expectedOutputViewMode: 'form',
              }))
            : formData.value.test_data,
          automation: {
            is_automated: props.testcase.automation?.is_automated || false,
            script_path: props.testcase.automation?.script_path || '',
            test_command: props.testcase.automation?.test_command || '',
            tags: props.testcase.automation?.tags || [],
          },
        }
      }
    }

    // Steps Management
    const addStep = () => {
      formData.value.steps.push({
        step_number: formData.value.steps.length + 1,
        action: '',
        input_data: {},
        input_data_json: '{}',
        input_data_form: [{ key: '', value: '' }],
        input_data_error: '',
        expected_immediate_result: '',
        jsonViewMode: 'form',
      })
    }

    const removeStep = (index) => {
      if (formData.value.steps.length > 1) {
        formData.value.steps.splice(index, 1)
        renumberSteps()
      }
    }

    const duplicateLastStep = () => {
      if (formData.value.steps.length > 0) {
        const lastStep = formData.value.steps[formData.value.steps.length - 1]
        formData.value.steps.push({
          ...JSON.parse(JSON.stringify(lastStep)),
          step_number: formData.value.steps.length + 1,
        })
      }
    }

    const onStepReorder = () => {
      renumberSteps()
    }

    const renumberSteps = () => {
      formData.value.steps.forEach((step, index) => {
        step.step_number = index + 1
      })
    }

    // Action Suggestions
    const showActionSuggestions = (index) => {
      toast.info(`Gợi ý hành động cho bước ${index + 1}`)
    }

    // JSON Form Management
    const addKeyValue = (formArray) => {
      formArray.push({ key: '', value: '' })
    }

    const removeKeyValue = (formArray, index) => {
      if (formArray.length > 1) {
        formArray.splice(index, 1)
      }
    }

    const updateStepJsonFromForm = (step) => {
      try {
        const obj = {}
        step.input_data_form.forEach((item) => {
          if (item.key.trim()) {
            obj[item.key] = item.value
          }
        })
        step.input_data = obj
        step.input_data_json = JSON.stringify(obj, null, 2)
        step.input_data_error = ''
      } catch (error) {
        step.input_data_error = `Error: ${error.message}`
      }
    }

    const updateApiSchemaFromForm = () => {
      try {
        const apiLevel = formData.value.expected_results.api_level
        const obj = {}
        apiLevel.response_schema_form.forEach((item) => {
          if (item.key.trim()) {
            obj[item.key] = item.value
          }
        })
        apiLevel.response_schema = obj
        apiLevel.response_schema_json = JSON.stringify(obj, null, 2)
        apiLevel.response_schema_error = ''
      } catch (error) {
        formData.value.expected_results.api_level.response_schema_error = `Error: ${error.message}`
      }
    }

    const updateTestDataJsonFromForm = (data, type) => {
      const errorField =
        type === 'input_payload' ? 'input_payload_error' : 'expected_output_error'
      try {
        const formArray =
          type === 'input_payload' ? data.input_payload_form : data.expected_output_form
        const dataField = type === 'input_payload' ? 'input_payload' : 'expected_output'
        const jsonField = type === 'input_payload' ? 'input_payload_json' : 'expected_output_json'

        const obj = {}
        formArray.forEach((item) => {
          if (item.key.trim()) {
            obj[item.key] = item.value
          }
        })
        data[dataField] = obj
        data[jsonField] = JSON.stringify(obj, null, 2)
        data[errorField] = ''
      } catch (error) {
        data[errorField] = `Error: ${error.message}`
      }
    }

    // JSON Paste Handlers
    const handleJsonPaste = (event, step) => {
      const pastedText = event.clipboardData.getData('text')
      try {
        const parsed = JSON.parse(pastedText)
        step.input_data = parsed
        step.input_data_json = JSON.stringify(parsed, null, 2)

        step.input_data_form = Object.keys(parsed).map((key) => ({
          key,
          value: parsed[key],
        }))

        step.input_data_error = ''
        event.preventDefault()
        toast.success('Đã dán JSON và chuyển sang dạng biểu mẫu')
      } catch {
        console.log('Pasted text is not valid JSON, treating as plain text')
      }
    }

    const handleApiSchemaPaste = (event) => {
      const pastedText = event.clipboardData.getData('text')
      try {
        const parsed = JSON.parse(pastedText)
        const apiLevel = formData.value.expected_results.api_level
        apiLevel.response_schema = parsed
        apiLevel.response_schema_json = JSON.stringify(parsed, null, 2)

        apiLevel.response_schema_form = Object.keys(parsed).map((key) => ({
          key,
          value: parsed[key],
        }))

        apiLevel.response_schema_error = ''
        event.preventDefault()
        toast.success('Đã dán JSON và chuyển sang dạng biểu mẫu')
      } catch {
        console.log('Pasted text is not valid JSON, treating as plain text')
      }
    }

    const handleTestDataJsonPaste = (event, data, type) => {
      const pastedText = event.clipboardData.getData('text')
      try {
        const parsed = JSON.parse(pastedText)
        const dataField = type === 'input_payload' ? 'input_payload' : 'expected_output'
        const jsonField = type === 'input_payload' ? 'input_payload_json' : 'expected_output_json'
        const formField = type === 'input_payload' ? 'input_payload_form' : 'expected_output_form'
        const errorField =
          type === 'input_payload' ? 'input_payload_error' : 'expected_output_error'

        data[dataField] = parsed
        data[jsonField] = JSON.stringify(parsed, null, 2)

        data[formField] = Object.keys(parsed).map((key) => ({
          key,
          value: parsed[key],
        }))

        data[errorField] = ''
        event.preventDefault()
        toast.success('Đã dán JSON và chuyển sang dạng biểu mẫu')
      } catch {
        console.log('Pasted text is not valid JSON, treating as plain text')
      }
    }

    // Table Management
    const selectTable = (table) => {
      if (!formData.value.database_tables.includes(table.name)) {
        formData.value.database_tables.push(table.name)
      }
      newTable.value = ''
      showTableSuggestions.value = false
    }

    const handleTableSelection = (selectedTables) => {
      formData.value.database_tables = [
        ...new Set([...formData.value.database_tables, ...selectedTables]),
      ]
    }

    const addTable = () => {
      const tableName = newTable.value.trim()
      if (tableName && !formData.value.database_tables.includes(tableName)) {
        formData.value.database_tables.push(tableName)
        newTable.value = ''
      }
    }

    const removeTable = (table) => {
      const index = formData.value.database_tables.indexOf(table)
      if (index > -1) {
        formData.value.database_tables.splice(index, 1)
      }
    }

    // Requirement Management
    const selectRequirement = (requirement) => {
      if (!formData.value.source_requirement_ids.includes(requirement.id)) {
        formData.value.source_requirement_ids.push(requirement.id)
      }
      newRequirement.value = ''
      showRequirementSuggestions.value = false
    }

    const handleRequirementSelection = (selectedRequirements) => {
      formData.value.source_requirement_ids = [
        ...new Set([...formData.value.source_requirement_ids, ...selectedRequirements]),
      ]
    }

    const addRequirement = () => {
      const reqId = newRequirement.value.trim()
      if (reqId && !formData.value.source_requirement_ids.includes(reqId)) {
        formData.value.source_requirement_ids.push(reqId)
        newRequirement.value = ''
      }
    }

    const removeRequirement = (reqId) => {
      const index = formData.value.source_requirement_ids.indexOf(reqId)
      if (index > -1) {
        formData.value.source_requirement_ids.splice(index, 1)
      }
    }

    // Tag Management
    const selectTag = (tag) => {
      if (!formData.value.automation.tags.includes(tag)) {
        formData.value.automation.tags.push(tag)
      }
      newAutomationTag.value = ''
      showTagSuggestions.value = false
    }

    const addAutomationTag = () => {
      const tag = newAutomationTag.value.trim()
      if (tag && !formData.value.automation.tags.includes(tag)) {
        formData.value.automation.tags.push(tag)
        newAutomationTag.value = ''
      }
    }

    const removeAutomationTag = (tag) => {
      const index = formData.value.automation.tags.indexOf(tag)
      if (index > -1) {
        formData.value.automation.tags.splice(index, 1)
      }
    }

    // Test Data Management
    const duplicateTestData = (index) => {
      const original = formData.value.test_data[index]
      formData.value.test_data.push({
        ...JSON.parse(JSON.stringify(original)),
        name: `${original.name} (Copy)`,
      })
    }

    const importTestDataFromClipboard = async () => {
      try {
        const text = await navigator.clipboard.readText()
        const lines = text.split('\n').filter((line) => line.trim())
        if (lines.length > 0) {
          toast.info('Phát hiện dữ liệu trong bộ nhớ tạm - hãy bổ sung logic nhập tại đây')
        }
      } catch {
        toast.error('Không đọc được bộ nhớ tạm')
      }
    }

    const addTestData = () => {
      formData.value.test_data.push({
        name: `Scenario ${formData.value.test_data.length + 1}`,
        input_payload: {},
        input_payload_json: '{}',
        input_payload_form: [{ key: '', value: '' }],
        input_payload_error: '',
        expected_output: {},
        expected_output_json: '{}',
        expected_output_form: [{ key: '', value: '' }],
        expected_output_error: '',
        validation_rules: [''],
        inputPayloadViewMode: 'form',
        expectedOutputViewMode: 'form',
      })
    }

    const removeTestData = (index) => {
      if (formData.value.test_data.length > 1) {
        formData.value.test_data.splice(index, 1)
      }
    }

    const addValidationRule = (data) => {
      data.validation_rules.push('')
    }

    const removeValidationRule = (data, index) => {
      if (data.validation_rules.length > 1) {
        data.validation_rules.splice(index, 1)
      }
    }

    // Automation
    const autoGenerateScriptPath = () => {
      if (!formData.value.automation.script_path && formData.value.title) {
        const sanitizedTitle = formData.value.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/(^_+|_+$)/g, '')
        formData.value.automation.script_path = `/tests/${sanitizedTitle}/test_${sanitizedTitle}.py`
      }
    }

    const suggestScriptPath = () => {
      autoGenerateScriptPath()
      toast.info('Đã gợi ý đường dẫn script theo tiêu đề test case')
    }

    // Template Application
    const applyStepTemplate = (template) => {
      formData.value.steps = template.steps.map((step, index) => ({
        ...step,
        step_number: index + 1,
        input_data_form: step.input_data
          ? Object.keys(step.input_data).map((key) => ({
              key,
              value: step.input_data[key],
            }))
          : [{ key: '', value: '' }],
        jsonViewMode: 'form',
      }))
      toast.success('Đã áp dụng mẫu bước')
    }

    const applyTestDataTemplate = (template) => {
      formData.value.test_data = template.scenarios.map((scenario) => ({
        ...scenario,
        input_payload_form: scenario.input_payload
          ? Object.keys(scenario.input_payload).map((key) => ({
              key,
              value: scenario.input_payload[key],
            }))
          : [{ key: '', value: '' }],
        expected_output_form: scenario.expected_output
          ? Object.keys(scenario.expected_output).map((key) => ({
              key,
              value: scenario.expected_output[key],
            }))
          : [{ key: '', value: '' }],
        inputPayloadViewMode: 'form',
        expectedOutputViewMode: 'form',
      }))
      toast.success('Đã áp dụng mẫu dữ liệu kiểm thử')
    }

    // Conditions Management
    const addPrecondition = () => {
      formData.value.preconditions.push('')
    }

    const removePrecondition = (index) => {
      if (formData.value.preconditions.length > 1) {
        formData.value.preconditions.splice(index, 1)
      }
    }

    const addPostcondition = () => {
      formData.value.postconditions.push('')
    }

    const removePostcondition = (index) => {
      if (formData.value.postconditions.length > 1) {
        formData.value.postconditions.splice(index, 1)
      }
    }

    // Expected Results Management
    const addUIResult = () => {
      formData.value.expected_results.ui_level.push('')
    }

    const removeUIResult = (index) => {
      if (formData.value.expected_results.ui_level.length > 1) {
        formData.value.expected_results.ui_level.splice(index, 1)
      }
    }

    const addDBResult = () => {
      formData.value.expected_results.database_level.push('')
    }

    const removeDBResult = (index) => {
      if (formData.value.expected_results.database_level.length > 1) {
        formData.value.expected_results.database_level.splice(index, 1)
      }
    }

    // JSON Validation
    const validateStepJson = (step) => {
      const jsonField = 'input_data_json'
      const dataField = 'input_data'
      const errorField = 'input_data_error'

      try {
        if (!step[jsonField] || step[jsonField].trim() === '') {
          step[dataField] = {}
          step[errorField] = ''
          return
        }

        const parsed = JSON.parse(step[jsonField])
        step[dataField] = parsed
        step[errorField] = ''
      } catch (error) {
        step[errorField] = `Invalid JSON: ${error.message}`
      }
    }

    const validateTestDataJson = (data, type) => {
      const jsonField = type === 'input_payload' ? 'input_payload_json' : 'expected_output_json'
      const dataField = type === 'input_payload' ? 'input_payload' : 'expected_output'
      const errorField = type === 'input_payload' ? 'input_payload_error' : 'expected_output_error'

      try {
        if (!data[jsonField] || data[jsonField].trim() === '') {
          data[dataField] = {}
          data[errorField] = ''
          return
        }

        const parsed = JSON.parse(data[jsonField])
        data[dataField] = parsed
        data[errorField] = ''
      } catch (error) {
        data[errorField] = `Invalid JSON: ${error.message}`
      }
    }

    const validateApiResponseSchema = () => {
      const apiLevel = formData.value.expected_results.api_level
      try {
        if (!apiLevel.response_schema_json || apiLevel.response_schema_json.trim() === '') {
          apiLevel.response_schema = {}
          apiLevel.response_schema_error = ''
          return
        }

        const parsed = JSON.parse(apiLevel.response_schema_json)
        apiLevel.response_schema = parsed
        apiLevel.response_schema_error = ''
      } catch (error) {
        apiLevel.response_schema_error = `Invalid JSON: ${error.message}`
      }
    }

    // Form Validation & Submission
    const validateForm = () => {
      submitted.value = true

      if (!formData.value.title || !formData.value.test_type || !formData.value.priority) {
        return false
      }

      let hasJsonErrors = false

      formData.value.steps.forEach((step) => {
        validateStepJson(step, 'input_data')
        if (step.input_data_error) hasJsonErrors = true
      })

      formData.value.test_data.forEach((data) => {
        validateTestDataJson(data, 'input_payload')
        validateTestDataJson(data, 'expected_output')
        if (data.input_payload_error || data.expected_output_error) hasJsonErrors = true
      })

      validateApiResponseSchema()
      if (formData.value.expected_results.api_level.response_schema_error) hasJsonErrors = true

      return !hasJsonErrors
    }

    const handleSubmit = async () => {
      if (!validateForm()) {
        toast.error('Vui lòng sửa lỗi trong biểu mẫu trước khi gửi')
        return
      }

      saving.value = true

      try {
        const finalData = {
          ...formData.value,
          project_id: props.projectId,
          version_id: props.versionId,
          steps: formData.value.steps.map((step) => ({
            step_number: step.step_number,
            action: step.action,
            input_data: step.input_data,
            expected_immediate_result: step.expected_immediate_result,
          })),
          test_data: formData.value.test_data.map((data) => ({
            name: data.name,
            input_payload: data.input_payload,
            expected_output: data.expected_output,
            validation_rules: data.validation_rules.filter((rule) => rule.trim() !== ''),
          })),
          preconditions: formData.value.preconditions.filter((pre) => pre.trim() !== ''),
          postconditions: formData.value.postconditions.filter((post) => post.trim() !== ''),
          expected_results: {
            ui_level: formData.value.expected_results.ui_level.filter((ui) => ui.trim() !== ''),
            api_level: {
              status_code: formData.value.expected_results.api_level.status_code,
              response_schema: formData.value.expected_results.api_level.response_schema,
            },
            database_level: formData.value.expected_results.database_level.filter(
              (db) => db.trim() !== ''
            ),
            business_level: formData.value.expected_results.business_level,
          },
        }

        emit('save', finalData)
        toast.success(`Test case ${isEdit.value ? 'updated' : 'created'} successfully`)
      } catch (error) {
        console.error('Error saving test case:', error)
        toast.error(`Failed to ${isEdit.value ? 'update' : 'create'} test case`)
      } finally {
        saving.value = false
      }
    }

    const saveDraft = () => {
      toast.success('Đã lưu nháp')
    }

    onMounted(() => {
      initializeForm()
      if (formData.value.automation.is_automated && !formData.value.automation.script_path) {
        autoGenerateScriptPath()
      }
    })

    return {
      formData,
      saving,
      submitted,
      currentStep,
      steps,
      newTable,
      newRequirement,
      newAutomationTag,
      databaseOperations,
      isEdit,

      // Modal states
      showStepTemplates,
      showTableSelector,
      showRequirementSelector,
      showTestDataTemplates,

      // Suggestions states
      showTableSuggestions,
      showRequirementSuggestions,
      showTagSuggestions,

      // Data
      availableTables,
      availableRequirements,
      availableTags,

      // Methods
      nextStep,
      prevStep,
      goToStep,
      autoFormatTitle,
      showActionSuggestions,
      addStep,
      removeStep,
      duplicateLastStep,
      onStepReorder,
      addKeyValue,
      removeKeyValue,
      updateStepJsonFromForm,
      updateApiSchemaFromForm,
      updateTestDataJsonFromForm,
      handleJsonPaste,
      handleApiSchemaPaste,
      handleTestDataJsonPaste,
      selectTable,
      handleTableSelection,
      addTable,
      removeTable,
      selectRequirement,
      handleRequirementSelection,
      addRequirement,
      removeRequirement,
      selectTag,
      addAutomationTag,
      removeAutomationTag,
      duplicateTestData,
      importTestDataFromClipboard,
      addTestData,
      removeTestData,
      addValidationRule,
      removeValidationRule,
      autoGenerateScriptPath,
      suggestScriptPath,
      applyStepTemplate,
      applyTestDataTemplate,
      addPrecondition,
      removePrecondition,
      addPostcondition,
      removePostcondition,
      addUIResult,
      removeUIResult,
      addDBResult,
      removeDBResult,
      validateStepJson,
      validateTestDataJson,
      validateApiResponseSchema,
      handleSubmit,
      saveDraft,
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
  z-index: 10000;
  padding: 1rem;
}

.modal-content.xlarge {
  background: white;
  border-radius: var(--radius-field);
  width: 100%;
  max-width: 1000px;
  max-height: 90vh;
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

/* Progress Steps */
.progress-steps {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border);
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  transition: all 0.3s ease;
  flex: 1;
  max-width: 120px;
}

.step:hover:not(.active) {
  background: var(--bg);
}

.step.active {
  background: var(--ink);
  color: white;
}

.step.completed {
  color: var(--success);
}

.step-number {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
  border: 2px solid var(--border);
  transition: all 0.3s ease;
}

.step.active .step-number {
  background: white;
  color: var(--ink);
  border-color: white;
}

.step.completed .step-number {
  background: var(--success);
  color: white;
  border-color: var(--success);
}

.step-label {
  font-size: 0.75rem;
  font-weight: 500;
  text-align: center;
  line-height: 1.2;
}

.testcase-form {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.form-step {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.form-section {
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--border);
}

.form-section:last-of-type {
  border-bottom: none;
  margin-bottom: 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 1.5rem;
}

.section-title .material-symbols-outlined {
  font-size: 1.25rem;
  color: var(--ink);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text);
  font-size: 0.875rem;
}

.form-label.required::after {
  content: '*';
  color: var(--danger);
  margin-left: 0.25rem;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  transition: all 0.2s;
  background: white;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--ink);
  box-shadow: 0 0 0 3px rgba(10, 10, 10, 0.1);
}

.form-input.error,
.form-textarea.error {
  border-color: var(--danger);
  background: var(--sunken);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
  line-height: 1.5;
}

.title-format-hint {
  font-size: 0.75rem;
  color: var(--muted);
  margin-top: 0.25rem;
  font-style: italic;
}

.error-message {
  color: var(--danger);
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

.condition-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.condition-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.list-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.list-item {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}

.list-item .form-input,
.list-item .form-textarea {
  flex: 1;
  margin: 0;
}

.form-textarea.small {
  min-height: 60px;
}

.btn-add-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: white;
  border: 1px dashed var(--border-strong);
  border-radius: 999px;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;
}

.btn-add-item:hover {
  border-color: var(--ink);
  color: var(--ink);
  background: var(--bg);
}

.steps-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.step-item {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 1rem;
  background: var(--bg);
}

.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.step-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.step-number {
  font-weight: 600;
  color: var(--ink);
  font-size: 0.875rem;
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.action-input-group {
  position: relative;
}

.suggestion-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: var(--bg);
  border: 1px solid var(--border);
}

.suggestion-btn:hover {
  background: var(--sunken);
}

.json-input-container {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.json-input-tabs {
  display: flex;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
}

.tab-btn {
  flex: 1;
  padding: 0.5rem 1rem;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--muted);
  transition: all 0.2s;
}

.tab-btn.active {
  background: white;
  color: var(--ink);
  font-weight: 500;
  border-bottom: 2px solid var(--ink);
}

.tab-btn:hover:not(.active) {
  background: var(--sunken);
}

.key-value-form {
  padding: 1rem;
  background: white;
}

.key-value-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  align-items: center;
}

.key-input,
.value-input {
  flex: 1;
  margin: 0;
}

.btn-add-kv {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--bg);
  border: 1px dashed var(--border-strong);
  border-radius: 999px;
  color: var(--muted);
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
  width: 100%;
  justify-content: center;
}

.btn-add-kv:hover {
  border-color: var(--ink);
  color: var(--ink);
  background: var(--bg);
}

.json-textarea {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.75rem;
  line-height: 1.4;
  min-height: 100px;
  border: none;
  border-radius: 0;
}

.step-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.btn-add-step {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: white;
  border: 2px dashed var(--border-strong);
  border-radius: 999px;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  justify-content: center;
}

.btn-add-step:hover {
  border-color: var(--ink);
  color: var(--ink);
  background: var(--bg);
}

.expected-results-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.result-level.full-width {
  grid-column: 1 / -1;
}

.result-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 1rem;
  border-left: 3px solid var(--ink);
  padding-left: 0.75rem;
}

.api-results-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tags-input {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  position: relative;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  min-height: 2.5rem;
  padding: 0.5rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.75rem;
  background: var(--sunken);
  color: var(--ink);
  border-radius: var(--radius);
  font-size: 0.75rem;
  font-weight: 500;
}

.tag-remove {
  padding: 0.125rem;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
}

.tag-remove:hover {
  background: var(--border);
  color: var(--text);
}

.tag-input-group {
  display: flex;
  gap: 0.5rem;
}

.tag-input {
  flex: 1;
  margin: 0;
}

.btn-secondary.small {
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  white-space: nowrap;
  background: var(--bg);
  border: 1px solid var(--border-strong);
  color: var(--text);
}

.btn-secondary.small:hover {
  background: var(--sunken);
}

.checkbox-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}

.checkbox-item:hover {
  border-color: var(--border-strong);
  background: var(--bg);
}

.checkbox-item input[type='checkbox'] {
  display: none;
}

.checkmark {
  width: 1rem;
  height: 1rem;
  border: 2px solid var(--border-strong);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.checkbox-item input[type='checkbox']:checked + .checkmark {
  background: var(--ink);
  border-color: var(--ink);
}

.checkbox-item input[type='checkbox']:checked + .checkmark::after {
  content: '✓';
  color: white;
  font-size: 0.75rem;
  font-weight: bold;
}

.checkbox-label {
  font-size: 0.875rem;
  color: var(--text);
  font-weight: 500;
}

.test-data-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.test-data-item {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 1.5rem;
  background: var(--bg);
}

.data-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  gap: 1rem;
}

.data-name {
  flex: 1;
  margin: 0;
}

.data-actions {
  display: flex;
  gap: 0.25rem;
}

.data-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.data-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.data-field.full-width {
  grid-column: 1 / -1;
}

.test-data-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.btn-add-data {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: white;
  border: 2px dashed var(--border-strong);
  border-radius: 999px;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  justify-content: center;
}

.btn-add-data:hover {
  border-color: var(--ink);
  color: var(--ink);
  background: var(--bg);
}

.automation-section {
  margin-top: 1.5rem;
}

.checkbox-large {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  cursor: pointer;
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}

.checkbox-large:hover {
  border-color: var(--border-strong);
  background: var(--bg);
}

.checkbox-large input[type='checkbox'] {
  display: none;
}

.checkbox-large .checkmark {
  margin-top: 0.125rem;
  flex-shrink: 0;
}

.checkbox-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.checkbox-title {
  font-weight: 600;
  color: var(--ink);
}

.checkbox-description {
  font-size: 0.875rem;
  color: var(--muted);
}

.automation-details {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}

.script-path-group {
  position: relative;
}

.script-path-group .btn-icon {
  position: absolute;
  top: 50%;
  right: 0.5rem;
  transform: translateY(-50%);
}

.suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  max-height: 80px;
  overflow-y: auto;
  z-index: 1000;
  margin-top: 0.25rem;
}

.suggestion-item {
  padding: 0.75rem 1rem;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.suggestion-item:hover {
  background: var(--bg);
}

.suggestion-item:last-child {
  border-bottom: none;
}

.table-name {
  font-weight: 500;
  color: var(--ink);
}

.table-columns {
  font-size: 0.75rem;
  color: var(--muted);
}

.req-id {
  font-weight: 500;
  color: var(--ink);
}

.req-title {
  font-size: 0.875rem;
  color: var(--muted);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-text {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  color: var(--muted);
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.btn-text:hover {
  background: var(--bg);
  border-color: var(--border-strong);
}

.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: white;
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  color: var(--text);
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-outline:hover {
  background: var(--bg);
  border-color: var(--border-strong);
}

/* Step Navigation */
.step-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border);
}

.nav-right {
  display: flex;
  gap: 1rem;
  align-items: center;
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
  text-decoration: none;
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

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon.danger:hover:not(:disabled) {
  background: var(--sunken);
  color: var(--danger);
}

.drag-handle {
  cursor: grab;
  color: var(--muted);
}

.drag-handle:active {
  cursor: grabbing;
}

.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .modal-content.xlarge {
    margin: 1rem;
    max-height: calc(100vh - 2rem);
  }

  .modal-body {
    padding: 1rem;
  }

  .progress-steps {
    flex-direction: column;
    gap: 1rem;
  }

  .step {
    flex-direction: row;
    max-width: none;
    text-align: left;
  }

  .step-label {
    text-align: left;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .condition-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .expected-results-grid {
    grid-template-columns: 1fr;
  }

  .data-grid {
    grid-template-columns: 1fr;
  }

  .step-navigation {
    flex-direction: column;
    gap: 1rem;
  }

  .nav-right {
    width: 100%;
    justify-content: space-between;
  }

  .checkbox-group {
    grid-template-columns: 1fr;
  }

  .list-item {
    flex-direction: column;
  }

  .list-item .btn-icon {
    align-self: flex-end;
  }

  .step-actions,
  .test-data-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .section-title {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .section-title .btn-text {
    margin-left: 0;
    align-self: flex-start;
  }

  .key-value-row {
    flex-direction: column;
  }
}
</style>