# 06. Thiết kế Cơ sở Dữ liệu & Mongoose Schemas (Database Schema Reference)

SmartSpec sử dụng **MongoDB** làm cơ sở dữ liệu chính, được mô hình hóa bằng **Mongoose ORM** với đầy đủ TypeScript types và indexes.

Toàn bộ các model được định nghĩa tại thư mục: `backend/internal/model/`.

---

## 1. Sơ đồ Quan hệ Thực thể Tổng thể (Entity Relationship Overview)

```
                  ┌──────────────┐
                  │    users     │
                  └──────┬───────┘
                         │ 1
                         │ sở hữu (owner_id) / là thành viên (members)
                         ▼ n
                  ┌──────────────┐
                  │   projects   │
                  └──────┬───────┘
                         │ 1
                         │ có nhiều phiên bản
                         ▼ n
                  ┌──────────────┐
           ┌─────►│   versions   │◄────────────────┐
           │      └──────┬───────┘                 │
           │             │                         │
           │ 1           │ 1                       │ 1
           │             │                         │
           ▼ n           ▼ n                       ▼ n
     ┌───────────┐ ┌───────────┐             ┌───────────┐
     │  inputs   │ │  outputs  │             │ databases │ (ERD)
     └───────────┘ └─────┬─────┘             └───────────┘
                         │ 1                       │ 1
                         │                         │
       ┌─────────────────┼────────────────┐        ▼ n
       │ 1               │ 1              │ 1   ┌───────────┐
       ▼                 ▼                ▼     │ testcases │
┌──────────────┐  ┌──────────────┐  ┌─────────┐ └───────────┘
│usecase_diag. │  │sequence_diag.│  │activity_│
└──────────────┘  └──────────────┘  │ diagram │
                                    └─────────┘
```

---

## 2. Chi tiết các Collections cốt lõi

### 2.1. `projects` (`internal/model/project.ts`)
Quản lý thông tin dự án đặc tả phần mềm.
```typescript
{
  _id: ObjectId,
  name: String,                      // Tên dự án (bắt buộc)
  description: String,               // Mô tả dự án
  language: "vi-VN" | "en-US",       // Ngôn ngữ phân tích mặc định
  owner_id: ObjectId -> users,       // Chủ sở hữu dự án
  members: [                         // Danh sách thành viên được chia sẻ
    {
      user_id: ObjectId -> users,
      role: "owner" | "editor" | "viewer",
      status: "pending" | "accepted" | "rejected" | "canceled",
      invited_by: ObjectId -> users,
      invited_at: Date,
      responded_at: Date,
      invite_token: String,
      history: [{ action: String, by: ObjectId, at: Date }]
    }
  ],
  current_version: ObjectId -> versions, // Con trỏ tới version đang kích hoạt
  status: {
    is_trashed: Boolean,             // Trạng thái xóa mềm (thùng rác)
    trashed_at: Date,
    delete_after_days: Number        // Tự động xóa vĩnh viễn sau n ngày (mặc định 30)
  },
  last_accessed_at: Date,
  timestamps: true
}
```

---

### 2.2. `versions` (`internal/model/version.ts`)
Quản lý các mốc phiên bản đặc tả của một dự án.
```typescript
{
  _id: ObjectId,
  project_id: ObjectId -> projects,  // Thuộc dự án nào
  version_major: Number,             // Số phiên bản lớn (ví dụ: 1)
  version_minor: Number,             // Số phiên bản nhỏ (ví dụ: 0 -> 1.0)
  version_number: String,            // Chuỗi phiên bản hiển thị ("1.0", "1.1")
  created_by: ObjectId -> users,
  parent_version_id: ObjectId -> versions, // Phiên bản cha (đối với bump version)
  version_temporary: Boolean,        // Đánh dấu là phiên bản nháp tạm thời
  inputs: [ObjectId -> inputs],      // Các tài liệu/văn bản đầu vào nạp vào version này
  outputs: [ObjectId -> outputs],    // Các kết quả đặc tả đã sinh ra
  progress: Number,                  // Tiến độ xử lý AI (0 - 100)
  stage: "normalization" | "input" | "analyzing" | "finalizing" | "completed" | "failed" | "paused",
  status: "processing" | "completed" | "failed" | "has_conflicts" | "paused",
  pending_conflicts: [               // Danh sách các cặp/nhóm xung đột cần người dùng giải quyết
    {
      conflict_id: String,
      items: [ObjectId -> usecases]
    }
  ],
  processing_errors: [String],       // Danh sách thông điệp lỗi nếu có
  edit_flag: "editing" | "locked" | "none", // Khóa version khi đang chỉnh sửa đồng thời
  timestamps: true
}
```

Use cases không được nhúng trong `versions`. Chúng được lưu riêng trong collection `usecases` (`backend/internal/model/usecase.ts`) và liên kết tới phiên bản qua `version_id`; các truy vấn use case theo phiên bản phải dùng liên kết này.

---

### 2.3. `inputs` (`internal/model/input.ts`)
Lưu trữ thông tin các file upload và văn bản thô được người dùng nạp vào hệ thống.
```typescript
{
  _id: ObjectId,
  project_id: ObjectId -> projects,
  version_id: ObjectId -> versions,
  file_name: String,                 // Tên file gốc
  file_type: String,                 // "audio", "image", "docx", "pdf", "text"
  file_url: String,                  // Đường dẫn lưu file trên disk/cloud
  file_hash: String,                 // Băm SHA-256 nội dung file để chống xử lý trùng lặp
  raw_text: String,                  // Văn bản bóc tách được sau khi chạy OCR/STT
  is_processed: Boolean,             // Đã được trích xuất xong chưa
  created_at: Date
}
```

---

### 2.4. `databases` (`internal/model/database.ts`)
Lưu trữ lược đồ cơ sở dữ liệu quan hệ được AI đề xuất cho phiên bản đặc tả.
```typescript
{
  _id: ObjectId,
  project_id: ObjectId -> projects,
  version_id: ObjectId -> versions,
  name: String,                      // Tên CSDL
  description: String,
  tables: [
    {
      name: String,                  // Tên bảng (ví dụ: "users", "orders")
      description: String,
      position: { x: Number, y: Number }, // Tọa độ hiển thị trên Canvas ERD
      columns: [
        {
          name: String,              // Tên cột (ví dụ: "id", "email")
          type: String,              // VARCHAR, INT, TIMESTAMP...
          length: Mixed,
          is_primary_key: Boolean,   // Là khóa chính
          is_foreign_key: Boolean,   // Là khóa ngoại
          nullable: Boolean,
          unique: Boolean,
          references: String,        // Bảng và cột tham chiếu (ví dụ: "users.id")
          related_usecase_ids: [String], // Ánh xạ Use Case (ví dụ: ["UC1", "UC2"])
          primary_key_order: Number  // Thứ tự trong Composite Primary Key (1, 2...)
        }
      ]
    }
  ],
  relationships: [
    {
      from_table: String,
      to_table: String,
      type: "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many"
    }
  ],
  generated_by: ObjectId -> users,
  timestamps: true
}
```

---

### 2.5. `testcases` (`internal/model/testcase.ts`)
Lưu trữ các kịch bản kiểm thử phần mềm được sinh tự động hoặc tạo thủ công.
```typescript
{
  _id: ObjectId,
  project_id: ObjectId -> projects,
  version_id: ObjectId -> versions,
  test_type: "integration" | "api" | "ui" | "performance" | "security",
  source_requirement_ids: [String],  // Các ID Use Case nguồn (ví dụ: ["UC1"])
  database_tables: [String],         // Các bảng CSDL bị tác động
  database_operations: ["select" | "insert" | "update" | "delete" | "create" | "alter"],
  title: String,                     // Tiêu đề test case
  description: String,
  objectives: [String],
  preconditions: [String],
  postconditions: [String],
  steps: [
    {
      step_number: Number,
      action: String,                // Hành động thực hiện
      input_data: String,            // Dữ liệu truyền vào
      expected_result: String        // Kết quả kỳ vọng
    }
  ],
  execution: {
    status: "untested" | "passed" | "failed" | "blocked" | "skipped",
    executed_by: ObjectId -> users,
    executed_at: Date,
    actual_result: String,
    notes: String,
    attachments: [String]
  },
  priority: "critical" | "high" | "medium" | "low",
  timestamps: true
}
```

---

### 2.6. Các Mô hình UML (`usecase_diagrams`, `sequence_diagrams`, `activity_diagrams`)
1. **`usecase_diagrams`**:
   - `actors`: `[{ name, description, position: {x, y} }]`
   - `usecases`: `[{ title, description, position: {x, y} }]`
   - `associations`: `[{ actor_id, usecase_id }]`
   - `relationships`: `[{ source, target, type: "include" | "extend" | "generalization" }]`
   - `diagram_svg`: Mã SVG hoặc Mermaid script render sơ đồ.
2. **`sequence_diagrams`**:
   - `lifelines`: `[{ name, description }]`
   - `messages`: `[{ source_lifeline_id, target_lifeline_id, order, content, type: "sync" | "async" | "reply" | "create" | "destroy" }]`
   - `fragments`: `[{ type: "loop" | "alt" | "opt" | "par" | "region" | "else", guard_condition, parent_fragment_id }]`
   - `layout_data`: Dữ liệu vị trí hiển thị.
3. **`activity_diagrams`**:
   - `lanes`: `[{ id, name }]` (Swimlanes)
   - `nodes`: `[{ id, type: "start" | "end" | "action" | "decision" | "merge" | "fork" | "join" | "swimlane", label, lane_id }]`
   - `edges`: `[{ from, to, condition, guard, trigger }]`

---

### 2.7. `users` & `api_keys`
- **`users`**:
  - `email`, `password` (hashed bcrypt), `name`, `system_role` ("USER" | "ADMIN"), `avatar_url`, `is_email_verified`, `two_factor_enabled`.
- **`api_keys`**:
  - `provider` ("gemini" | "openai" | "claude"), `key_value`, `model_name`, `is_active`, `usage_count`, `last_used_at`, `created_by`.
