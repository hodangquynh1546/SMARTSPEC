# 05. Hướng dẫn Kỹ thuật Frontend (Frontend Architecture & UI Components)

## 1. Cấu trúc Tổng thể Thư mục Frontend

Frontend của SmartSpec được xây dựng bằng **Vue 3** kết hợp **Vite**, định dạng Single File Components (`.vue`), sử dụng cú pháp hiện đại `<script setup>` và **Composition API**.

Thư mục Frontend nằm tại `frontend/`:
```
frontend/
├── index.html                       # Entry HTML file
├── vite.config.js                   # Cấu hình Vite, plugins, proxy dev
├── package.json                     # Frontend dependencies
├── src/
│   ├── main.js                      # Entry point: Mount Vue app, Pinia, Vue Router, Toast
│   ├── App.vue                      # Root component
│   ├── assets/                      # Global styles, Tailwind base, logo SVG
│   ├── router/                      # Cấu hình routing và navigation guards
│   │   ├── index.js                 # Router chính của ứng dụng
│   │   └── admin.js                 # Router các màn hình quản trị Admin
│   ├── stores/                      # Pinia state stores
│   │   ├── projectPollingStore.js   # Quản lý polling và đồng bộ project
│   │   └── counter.js
│   ├── utils/                       # Các hàm tiện ích dùng chung
│   │   ├── axiosClient.js           # Axios instance kèm JWT interceptors & auto-refresh
│   │   ├── authGuard.js             # Route guards (authGuard, adminGuard)
│   │   ├── socket.js                # Quản lý kết nối Socket.IO client
│   │   ├── usecaseFormatter.js      # Chuẩn hóa hiển thị dữ liệu Use Case
│   │   └── useActiveMembers.js      # Hook theo dõi thành viên online trong dự án
│   ├── api/                         # Các module gọi API qua Axios
│   │   ├── project.js               # API quản lý dự án
│   │   ├── share.js                 # API chia sẻ và lời mời thành viên
│   │   ├── ucd.js                   # API Use Case Diagram
│   │   ├── avd.js / activity_diagram.js # API Activity Diagram
│   │   ├── sqd.js                   # API Sequence Diagram
│   │   ├── testcase.js              # API Test Case & Export
│   │   ├── output.js                # API tổng hợp tài liệu đầu ra
│   │   └── admin.js                 # API bảng điều khiển Admin
│   ├── views/                       # Các màn hình chính (Page Views)
│   │   ├── HomePage.vue             # Trang chủ quản lý danh sách dự án
│   │   ├── UsecaseManagement.vue    # Màn hình trích xuất & chỉnh sửa Use Cases
│   │   ├── UmlManagement.vue        # Màn hình quản lý Use Case Diagram & Sequence Diagram
│   │   ├── ActivityDiagramManagement.vue # Màn hình quản lý Activity Diagram
│   │   ├── DatabaseManagement.vue   # Màn hình quản lý ERD & Database Design
│   │   ├── TestcaseManagement.vue   # Màn hình quản lý Test Cases & Test Run
│   │   ├── OutputManagement.vue     # Màn hình xuất tài liệu đặc tả tổng hợp
│   │   └── AdminDashboard.vue       # Bảng điều khiển quản trị hệ thống
│   ├── pages/                       # Các trang xác thực tài khoản (Auth Pages)
│   │   ├── Login.vue, Register.vue, ForgotPassword.vue, ResetPassword.vue
│   │   └── VerifyEmail.vue, VerifyOtp.vue, OauthRedirect.vue
│   └── components/                  # Các UI components tái sử dụng
│       ├── Sidebar.vue              # Thanh điều hướng bên trái
│       ├── ProjectHeader.vue        # Header dự án (hiển thị presence avatar, version selector)
│       ├── ProjectCard.vue          # Thẻ hiển thị dự án trong dashboard
│       ├── usecase/                 # Components liên quan đến Use Cases
│       ├── database/                # Components liên quan đến ERD Canvas
│       ├── uml/                     # Components render diagrams (Mermaid, PlantUML)
│       ├── testcase/                # Components liên quan đến kịch bản kiểm thử
│       └── admin/                   # Modals quản trị Admin
```

---

## 2. Hệ thống Quản lý Trạng thái & Routing

### 2.1. Router & Navigation Guards (`src/router/index.js`, `src/utils/authGuard.js`)
- `authGuard`:
  - Kiểm tra sự tồn tại của `accessToken` trong `localStorage`.
  - Nếu chưa đăng nhập, chuyển hướng người dùng về trang `/login`.
- `adminGuard`:
  - Giải mã payload của JWT token để lấy `system_role`.
  - Nếu `system_role !== "ADMIN"`, ngăn chặn và chuyển hướng về trang `/admin/access-denied`.
- Tự động bắt lỗi 401 khi token hết hạn và thực hiện cơ chế refresh token qua `axiosClient`.

### 2.2. State Management với Pinia (`src/stores/`)
- Quản lý trạng thái dự án hiện tại, phiên bản đang kích hoạt (`current_version`).
- Store quản lý cơ chế polling / fallback khi socket tạm thời mất kết nối (`projectPollingStore.js`).

---

## 3. Kiến trúc Components theo Domain Nghiệp vụ

### 3.1. Phân hệ Use Case (`components/usecase/`)
- `InputSidebar.vue`: Thanh bên cho phép kéo thả file upload (PDF, Word, Ảnh, Audio) hoặc paste text trực tiếp; hiển thị danh sách các file input kèm mã hash SHA-256.
- `AddInputModal.vue`: Modal nạp dữ liệu đầu vào.
- `UseCaseMainContent.vue`: Bảng danh sách Use Cases chi tiết (tên, role, goal, priority, tags).
- `AddEditUseCaseModal.vue`: Modal cho phép người dùng chỉnh sửa từng trường của Use Case (thêm bớt tasks, rules, inputs, outputs, preconditions).
- `IncrementalAnalysis.vue`: Giao diện phân tích bổ sung cho tài liệu nạp thêm.
- `HandleConflict.vue` & `ConflictDetailModal.vue`: Giao diện so sánh hai phiên bản Use Case bị xung đột, hiển thị highlight những điểm khác biệt và cung cấp 3 nút: Chấp nhận mới, Giữ bản cũ, Hợp nhất.
- `UsecaseSpecDocExport.vue`: Xem trước và xuất tài liệu đặc tả hoàn chỉnh.

### 3.2. Phân hệ Cơ sở Dữ liệu & ERD Canvas (`components/database/`)
- `DatabaseDiagram/`:
  - `DiagramContainer.vue`: Vùng vẽ Canvas không giới hạn, hỗ trợ Pan (di chuyển) và Zoom (phóng to / thu nhỏ) bằng con trỏ chuột.
  - `TableCard.vue`: Đại diện cho một bảng trong CSDL với tiêu đề bảng, danh sách cột, icon biểu thị Khóa chính (PK), Khóa ngoại (FK), Kiểu dữ liệu, Nullable.
  - `RelationshipLayer.vue`: Vẽ các đường cong Bezier hoặc đường gãy kết nối giữa các bảng để thể hiện quan hệ 1-1, 1-N, N-N.
  - `MiniMap.vue`: Bản đồ thu nhỏ góc màn hình giúp người dùng nhanh chóng điều hướng trên sơ đồ lớn hàng chục bảng.
  - `ContextMenu.vue`: Menu chuột phải để thêm bảng, sửa bảng, tạo quan hệ nhanh.
- `TableModal.vue` & `TableDetailsModal.vue`: Quản lý danh sách cột, kiểu dữ liệu, ràng buộc.
- `CompositeKeyModal.vue`: Thiết lập khóa chính tổng hợp từ nhiều cột.
- `RelationshipModal.vue`: Thiết lập mối quan hệ từ bảng cha sang bảng con.

### 3.3. Phân hệ UML Diagrams (`components/uml/`)
- `usecase_diagram/UCDRenderer.vue`: Render sơ đồ Use Case bằng PlantUML / Mermaid / SVG, hiển thị Actor và các Use Case elip, mũi tên quan hệ include/extend.
- `sequence_diagram/SequenceDiagramRenderer.vue`: Render sơ đồ tuần tự Sequence Diagram với các đường lifeline dọc, thông điệp mũi tên ngang và các khối alt/opt/loop.
- `activity_diagram/ActivityDiagramRenderer.vue`: Render sơ đồ hoạt động dạng Swimlane kết hợp các bước xử lý và nút rẽ nhánh điều kiện.

### 3.4. Phân hệ Test Case (`components/testcase/`)
- `GenerateTestcaseModal.vue`: Cho phép người dùng tùy chọn phạm vi sinh test case (chọn các Use Case cụ thể hoặc chọn các Table DB tương ứng).
- `EnhanceTestcaseModal.vue`: Dùng AI để bổ sung các kịch bản kiểm thử ngoại lệ (Negative / Edge Cases / Security Injection).
- `TestcaseDetailModal.vue` & `TestcaseFormModal.vue`: Xem và tùy chỉnh chi tiết từng bước kiểm thử.
- `TestcaseExecutionModal.vue`: Chế độ thực thi kiểm thử (Test Run mode) tương tác.
- `ExportOptionsPanel.vue` & `ExportProgressModal.vue`: Tùy chỉnh format xuất file báo cáo (Excel, CSV, PDF, JSON).

### 3.5. Phân hệ Quản trị Admin (`components/admin/`)
- `AdminUserManagementModal.vue`, `AdminUserDetailsModal.vue`, `AdminEditUserModal.vue`: Quản lý tài khoản người dùng, đổi quyền, kích hoạt/vô hiệu hóa.
- `AdminApiKeyManagementModal.vue`, `AdminAddApiKeyModal.vue`, `AdminEditApiKeyModal.vue`: Quản lý pool API keys, kiểm tra quota.
- `AdminProjectManagementModal.vue`, `AdminProjectDetailsModal.vue`: Quản lý toàn bộ dự án trong hệ thống.
- `AdminLogManagementModal.vue`: Xem log hệ thống và log sự kiện realtime.
- `AdminSystemSettingsModal.vue`: Cấu hình thông số hệ thống.

---

## 4. Cơ chế Real-time và Giao tiếp Socket phía Client

1. **Khởi tạo kết nối (`src/utils/socket.js`)**:
   - Khi đăng nhập thành công, client thiết lập kết nối WebSocket tới Backend (`http://localhost:8000`).
   - Tự động gửi `userId` để gia nhập phòng cá nhân nhận thông báo: `socket.emit("notification", userId)`.
2. **Theo dõi thành viên online (`src/utils/useActiveMembers.js`)**:
   - Khi vào trang chi tiết một project, hook gọi `socket.emit("join_project", projectId)`.
   - Lắng nghe event `presence_update` để cập nhật danh sách avatar thành viên đang cùng mở màn hình đó trên `ProjectHeader.vue`.
3. **Hiển thị tiến trình AI phân tích thời gian thực**:
   - Lắng nghe sự kiện `progress_update` từ socket để hiển thị thanh tiến độ xử lý file mà không cần người dùng phải bấm F5 tải lại trang.
