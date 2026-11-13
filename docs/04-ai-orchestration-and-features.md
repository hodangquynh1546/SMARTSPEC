# 04. AI Orchestration & Các Tính Năng Nghiệp Vụ Cốt Lõi (AI Engines & Business Features)

## 1. Trái tim AI của SmartSpec: Orchestrator Service

`OrchestratorService` (`features/orchestrator/domain/service.ts`) là trung tâm điều phối toàn bộ luồng nghiệp vụ thông minh:
1. Nhận danh sách file và văn bản đầu vào.
2. Quản lý trạng thái và phiên bản (Version Bumping):
   - Nếu version hiện tại không phải là `version_temporary: true`, tự động bump version (ví dụ: v1.0 -> v1.1).
   - Đặt trạng thái version sang `processing`, cập nhật `stage` và phát sóng WebSocket realtime (15% -> 50% -> 80% -> 100%).
3. Gọi `ExtractorService` để trích xuất văn bản thô từ đa nguồn.
4. Gọi `GeminiService` với cấu trúc Prompt được tinh chỉnh chuyên sâu để sinh danh sách Use Cases.
5. Kiểm tra chế độ chạy: **Full Mode** (thay thế toàn bộ) hoặc **Incremental Mode** (so sánh và phát hiện xung đột).

---

## 2. Kỹ thuật Prompt Engineering & Trích xuất Use Case

SmartSpec thiết lập các nguyên tắc khắt khe trong prompt (`features/orchestrator/domain/GeminiService.ts`) nhằm đảm bảo AI trả về kết quả chuẩn xác cho ngành kỹ nghệ phần mềm:

### 2.1. Phân biệt Hành vi Thực tế và Hành vi Phần mềm (Software Scope Enforcing):
- **Loại bỏ thủ tục giấy tờ / ngoài đời thực**:
  - ❌ *"Cán bộ ký văn bản giấy"* -> Không phải chức năng phần mềm.
  - ❌ *"Nộp hồ sơ bản cứng tại một cửa"* -> Không phải chức năng phần mềm.
  - ✅ *"Hệ thống xác thực chữ ký số"* -> Đúng chức năng phần mềm.
  - ✅ *"Upload hồ sơ điện tử định dạng PDF"* -> Đúng chức năng phần mềm.

### 2.2. Cấu trúc Đối tượng Use Case chuẩn hóa (`RequirementModel`):
Mỗi Use Case sinh ra bởi AI bắt buộc tuân theo Schema sau:
```typescript
{
  "id": "UC1",
  "name": "Đăng ký tài khoản người dùng",
  "role": {
    "id": "guest",
    "name": "Khách vãng lai",
    "description": "Người dùng chưa có tài khoản trong hệ thống"
  },
  "goal": "Tạo tài khoản truy cập hệ thống",
  "reason": "Cho phép người dùng sử dụng các chức năng được phân quyền",
  "tasks": [
    "Truy cập màn hình đăng ký",
    "Nhập thông tin cá nhân và email",
    "Nhận mã xác thực OTP qua email",
    "Nhập OTP để kích hoạt tài khoản"
  ],
  "inputs": ["email", "mật khẩu", "họ tên", "mã OTP"],
  "outputs": ["tài khoản được kích hoạt", "token đăng nhập", "thông báo thành công"],
  "context": "Phân hệ Xác thực & Quản lý Người dùng",
  "priority": "high",              // "low" | "medium" | "high"
  "feedback": "Giao diện rõ ràng, hỗ trợ tự động gửi lại OTP sau 60 giây",
  "rules": [
    "Mật khẩu tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số",
    "Email chưa từng được đăng ký trong hệ thống",
    "Mã OTP chỉ có hiệu lực trong 5 phút"
  ],
  "triggers": ["Người dùng nhấn nút Đăng ký trên trang chủ"],
  "preconditions": ["Người dùng có kết nối mạng và có địa chỉ email hợp lệ"],
  "postconditions": ["Thông tin người dùng được lưu vào CSDL ở trạng thái active"],
  "exceptions": ["Email đã tồn tại", "Mã OTP nhập sai quá 3 lần"],
  "stakeholders": ["Người dùng cuối", "Quản trị viên"],
  "constraints": ["Thời gian phản hồi gửi OTP < 3 giây"],
  "related_usecases": ["UC2 - Đăng nhập", "UC5 - Xác minh danh tính"]
}
```

---

## 3. Phân tích gia tăng & Giải quyết xung đột (Incremental Analysis & Conflict Resolution)

Khi một dự án đã có sẵn danh sách Use Cases (Version hiện tại), khách hàng gửi thêm tài liệu bổ sung (ví dụ: tài liệu Requirement Change Request):
1. **Incremental Mode**:
   - Hệ thống nạp danh sách Use Cases hiện có và văn bản mới vào Prompt so sánh ngữ nghĩa.
   - AI đánh giá các trường hợp:
     - **Use Case hoàn toàn mới**: Đưa vào danh sách đề xuất thêm.
     - **Use Case không bị ảnh hưởng**: Giữ nguyên.
     - **Use Case bị xung đột / mâu thuẫn (Conflict)**: Ví dụ tài liệu cũ quy định đăng nhập bằng OTP, tài liệu mới yêu cầu đăng nhập bằng Face ID / CCCD gắn chip.
2. **Quản lý xung đột (`pending_conflicts`)**:
   - Khi phát hiện xung đột, Version được đánh dấu trạng thái `has_conflicts`.
   - Lưu trữ danh sách cặp/nhóm Use Case xung đột vào `pending_conflicts` trong MongoDB.
   - Frontend hiển thị giao diện đối chiếu trực quan (`HandleConflict.vue` và `ConflictDetailModal.vue`).
   - Người dùng có thể:
     - **Chấp nhận bản mới (Override)**.
     - **Giữ lại bản cũ (Keep Original)**.
     - **Hợp nhất thủ công (Merge)** cả hai luồng quy tắc.

---

## 4. Tự động sinh Mô hình UML (UML Diagram Generation)

Hệ thống hỗ trợ sinh 3 loại biểu đồ UML phổ biến nhất trong phân tích thiết kế:

### 4.1. Use Case Diagram (`features/uml/usecase.diagram/`)
- **Dữ liệu phân tích**: Danh sách Use Cases và các Actors (`role`).
- **Thành phần sinh ra**:
  - Danh sách Actors kèm tọa độ hiển thị (`position: {x, y}`).
  - Danh sách Use Cases.
  - Các liên kết:
    - `association`: Nối Actor với Use Case.
    - `relationship`: Các quan hệ đặc thù UML: `include` (bắt buộc kèm theo), `extend` (mở rộng có điều kiện), `generalization` (kế thừa vai trò hoặc use case).
  - Trả về cả dữ liệu có cấu trúc và chuỗi mã **Mermaid / PlantUML**.

### 4.2. Activity Diagram (`features/uml/activity_diagram/`)
- **Dữ liệu phân tích**: Trường `tasks`, `rules`, `inputs`, `outputs` của một Use Case cụ thể.
- **Thành phần sinh ra**:
  - `lanes` (Swimlanes): Phân làn hành động giữa các đối tượng (Người dùng, Hệ thống, Cổng thanh toán bên thứ ba).
  - `nodes`:
    - `start`: Nút bắt đầu.
    - `end`: Nút kết thúc.
    - `action`: Hành động nghiệp vụ.
    - `decision`: Nút rẽ nhánh điều kiện (hình thoi).
    - `merge` / `fork` / `join`: Phân tách hoặc gộp luồng song song.
  - `edges`: Mũi tên kết nối giữa các nodes kèm `condition`, `guard`, `trigger`.
  - Frontend render tương tác qua `ActivityCanvas.vue`.

### 4.3. Sequence Diagram (`features/uml/sequence.diagram/`)
- **Dữ liệu phân tích**: Tương tác tuần tự giữa các thành phần phần mềm để hoàn thành Use Case.
- **Thành phần sinh ra**:
  - `lifelines`: Đường đời của các đối tượng (ví dụ: `:User`, `:ClientUI`, `:AuthController`, `:UserService`, `:Database`).
  - `messages`: Thông điệp tương tác có số thứ tự `order`:
    - `sync`: Lời gọi đồng bộ.
    - `async`: Gọi bất đồng bộ / sự kiện.
    - `reply`: Kết quả trả về (nét đứt).
    - `create` / `destroy`: Khởi tạo hoặc hủy đối tượng.
  - `fragments`: Các khối điều kiện lồng nhau: `alt` (if-else), `opt` (optional), `loop` (vòng lặp).

---

## 5. Tự động Đề xuất Thiết kế Cơ sở Dữ liệu (AI Database Design / ERD)

Dịch vụ `features/database/` chuyển hóa các nghiệp vụ thành Lược đồ cơ sở dữ liệu quan hệ hoàn chỉnh:
1. **Suy luận thực thể & thuộc tính (Entity & Attribute Inference)**:
   - Từ `inputs`, `outputs`, `context` và `rules` của toàn bộ Use Cases, AI suy luận ra các Bảng (Tables).
   - Với mỗi bảng, AI thiết lập danh sách Cột (Columns):
     - `name`: Tên cột chuẩn snake_case (ví dụ: `user_id`, `created_at`, `status`).
     - `type`: Kiểu dữ liệu tương thích SQL/NoSQL (VARCHAR, INT, BOOLEAN, TIMESTAMP, TEXT, JSON...).
     - `is_primary_key`: Khóa chính.
     - `primary_key_order`: Hỗ trợ Khóa chính tổng hợp (Composite Primary Keys: ví dụ cặp `order_id` + `item_id`).
     - `is_foreign_key`: Khóa ngoại.
     - `nullable`, `unique`, `references` (trỏ tới `Table.Column`).
     - `related_usecase_ids`: Truy vết ngược (Traceability) cột này phục vụ cho Use Case nào.
2. **Quan hệ giữa các bảng (Relationships)**:
   - Tự động phát hiện quan hệ: `one-to-one`, `one-to-many`, `many-to-one`, `many-to-many`.
   - Nếu là quan hệ Many-to-Many (`many-to-many`), AI tự động đề xuất tạo bảng trung gian (Junction/Pivot Table).
3. **ERD Visual Canvas trên Frontend**:
   - `components/database/DatabaseDiagram/`: Cho phép kéo thả bảng, điều chỉnh vị trí tọa độ `(x, y)`, xem minimap, zoom in/out, tạo quan hệ trực quan bằng cách nối dây giữa các bảng.

---

## 6. Tự động Sinh và Quản lý Kịch bản Kiểm thử (Test Case Generation & Execution)

Dịch vụ `features/testcase/` cung cấp công cụ kiểm thử toàn diện:
1. **Phân loại kịch bản kiểm thử (Test Types)**:
   - `integration`: Kiểm thử tích hợp luồng nghiệp vụ.
   - `api`: Kiểm thử giao diện lập trình ứng dụng (Endpoints, Status Code, Payload, Auth header).
   - `ui`: Kiểm thử giao diện người dùng (Validation form, disable button, toast message).
   - `security`: Kiểm thử bảo mật (SQL Injection, XSS, phân quyền truy cập trái phép, rate limit).
   - `performance`: Kiểm thử hiệu năng (Tải đồng thời, thời gian phản hồi API).
2. **Tác động Cơ sở dữ liệu (Database Impact Tracing)**:
   - Mỗi test case được liên kết với danh sách các bảng bị ảnh hưởng (`database_tables`) và thao tác tương ứng (`database_operations`: `select`, `insert`, `update`, `delete`).
3. **Cấu trúc bước kiểm thử (Test Steps)**:
   - `step_number`, `action` (hành động thực hiện), `input_data` (dữ liệu truyền vào), `expected_result` (kết quả mong đợi).
4. **Test Execution & Quản lý thực thi**:
   - Giao diện `TestcaseExecutionModal.vue` cho phép tester chạy từng bước, đánh dấu trạng thái (`Pass`, `Fail`, `Blocked`, `Skipped`), nhập ghi chú thực tế và đính kèm ảnh chụp màn hình lỗi.
5. **Xuất báo cáo đa định dạng (Export Service)**:
   - Hỗ trợ xuất toàn bộ bộ Test Cases thành file:
     - **Excel (.xlsx)**: Phân format chuẩn với màu sắc, viền bảng, tiêu đề in đậm.
     - **CSV (.csv)**: Dễ dàng import vào Jira / TestRail.
     - **PDF (.pdf)**: Báo cáo chuyên nghiệp in ấn gửi cho khách hàng/QA Lead.
     - **JSON (.json)**: Phục vụ tích hợp CI/CD và Automation Test Script.
