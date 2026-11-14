# 07. Danh Mục API Endpoints & WebSocket Events (API Reference)

Tất cả các API được phục vụ từ Backend tại Base URL: `http://localhost:8000/api`.

Yêu cầu Header đối với các Private Endpoints:
```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

---

## 1. Phân hệ Xác thực & Tài khoản (`/api/auth`)

| Phương thức | Endpoint | Yêu cầu Auth | Mô tả chức năng |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/auth/register` | Không | Đăng ký tài khoản người dùng mới |
| `POST` | `/api/auth/login` | Không | Đăng nhập hệ thống, trả về accessToken và refreshToken |
| `POST` | `/api/auth/logout` | Có | Đăng xuất, hủy phiên |
| `POST` | `/api/auth/token` | Không | Cấp lại accessToken mới từ refreshToken |
| `POST` | `/api/auth/forgot-password` | Không | Gửi email yêu cầu đặt lại mật khẩu |
| `POST` | `/api/auth/reset-password` | Không | Đặt lại mật khẩu bằng token xác thực |
| `POST` | `/api/auth/send-verification-email`| Có | Gửi mã kích hoạt email |
| `POST` | `/api/auth/verify-email` | Có | Xác minh email qua đường dẫn kích hoạt |
| `POST` | `/api/auth/verify-otp` | Có | Xác minh mã OTP 6 số |
| `POST` | `/api/auth/toggle-2fa` | Có | Bật/tắt xác thực 2 lớp (2FA) |
| `GET` | `/api/auth/me` | Có | Lấy thông tin user hiện tại từ token |
| `GET` | `/api/auth/google/oauth` | Không | Đăng nhập bằng tài khoản Google |

---

## 2. Phân hệ Dự án & Phiên bản (`/api/projects` & `/api/versions`)

| Phương thức | Endpoint | Yêu cầu Auth | Mô tả chức năng |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/projects/myproject` | Có | Lấy danh sách các dự án thuộc sở hữu của user |
| `POST` | `/api/projects` | Có | Tạo mới một dự án đặc tả |
| `GET` | `/api/projects/:projectId` | Có | Lấy chi tiết thông tin dự án |
| `PUT` | `/api/projects/:projectId` | Có | Cập nhật thông tin dự án (tên, mô tả, ngôn ngữ) |
| `DELETE` | `/api/projects/:projectId` | Có | Xóa mềm dự án vào thùng rác (soft delete) |
| `POST` | `/api/projects/:projectId/restore`| Có | Khôi phục dự án từ thùng rác |
| `GET` | `/api/projects/recent` | Có | Lấy danh sách dự án truy cập gần đây |
| `GET` | `/api/projects/shared` | Có | Lấy danh sách dự án được người khác chia sẻ |
| `GET` | `/api/projects/trashed` | Có | Lấy danh sách dự án trong thùng rác |
| `POST` | `/api/projects/:projectId/share` | Có | Mời thành viên tham gia dự án qua email |
| `GET` | `/api/versions/:versionId/status`| Có | Lấy trạng thái xử lý AI của version |
| `POST` | `/api/versions/:versionId/bump` | Có | Tạo phiên bản mới kế thừa phiên bản cũ |

---

## 3. Phân hệ Phân tích Đa Nguồn & Orchestration (`/api/orchestrate` & `/api/input`)

| Phương thức | Endpoint | Payload / Params | Mô tả chức năng |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/orchestrate/run` | `multipart/form-data`<br>- `projectId`, `versionId`<br>- `files` (array)<br>- `rawText`<br>- `mode` ("full" \| "incremental")<br>- `language` ("vi-VN" \| "en-US") | Kích hoạt toàn bộ pipeline bóc tách đa nguồn và sinh Use Case |
| `POST` | `/api/input/upload` | `multipart/form-data`: files | Upload file đầu vào độc lập |
| `POST` | `/api/handle_extraction/extract` | `multipart/form-data`: files | Kiểm tra bóc tách nội dung thô từ file mà chưa qua LLM |
| `POST` | `/api/handle_audio/transcribe` | `audio` file | Test riêng bộ nhận dạng giọng nói Whisper |
| `POST` | `/api/handle_image/ocr` | `image` file | Test riêng bộ nhận dạng chữ viết OCR |
| `POST` | `/api/handle_docx/read` | `docx` file | Test riêng bộ bóc tách file Word |
| `POST` | `/api/handle_pdf/read` | `pdf` file | Test riêng bộ bóc tách file PDF |

---

## 4. Phân hệ Quản lý Use Case (`/api/usecaseManagement`)

| Phương thức | Endpoint | Mô tả chức năng |
| :--- | :--- | :--- |
| `GET` | `/api/usecaseManagement/:versionId` | Lấy danh sách Use Cases và các xung đột của version |
| `POST` | `/api/usecaseManagement/:versionId` | Thêm mới thủ công một Use Case |
| `PUT` | `/api/usecaseManagement/:versionId/:usecaseId` | Cập nhật thông tin chi tiết một Use Case |
| `DELETE` | `/api/usecaseManagement/:versionId/:usecaseId` | Xóa một Use Case khỏi version |
| `POST` | `/api/usecaseManagement/:versionId/conflicts/resolve` | Giải quyết xung đột (override, keep, merge) |

---

## 5. Phân hệ Sơ đồ UML (`/api/usecase-diagram`, `/api/sequence-diagram`, `/api/activity-diagrams`)

| Phương thức | Endpoint | Mô tả chức năng |
| :--- | :--- | :--- |
| `POST` | `/api/usecase-diagram/generate` | Sinh Use Case Diagram từ danh sách Use Case đã duyệt |
| `GET` | `/api/usecase-diagram/:versionId` | Lấy dữ liệu Use Case Diagram (nodes, edges, mermaid/plantuml) |
| `POST` | `/api/sequence-diagram/generate` | Sinh Sequence Diagram cho một Use Case cụ thể |
| `GET` | `/api/sequence-diagram/:versionId` | Lấy danh sách các Sequence Diagram |
| `POST` | `/api/activity-diagrams/generate` | Sinh Activity Diagram (Swimlanes, Decision nodes) |
| `GET` | `/api/activity-diagrams/:versionId` | Lấy dữ liệu sơ đồ Activity Diagram |

---

## 6. Phân hệ Cơ sở Dữ liệu & ERD (`/api/databases`)

| Phương thức | Endpoint | Mô tả chức năng |
| :--- | :--- | :--- |
| `POST` | `/api/databases/generate` | AI suy luận và sinh cấu trúc CSDL từ Use Cases |
| `GET` | `/api/databases/:versionId` | Lấy cấu trúc CSDL hiện tại (bảng, cột, quan hệ) |
| `POST` | `/api/databases/:databaseId/tables` | Thêm bảng mới vào sơ đồ |
| `PUT` | `/api/databases/:databaseId/tables/:tableId` | Sửa thông tin bảng và danh sách cột |
| `DELETE` | `/api/databases/:databaseId/tables/:tableId` | Xóa bảng khỏi sơ đồ |
| `POST` | `/api/databases/:databaseId/relationships` | Tạo mối quan hệ giữa 2 bảng |
| `PUT` | `/api/databases/:databaseId/positions` | Lưu tọa độ `(x, y)` kéo thả các bảng trên Canvas |

---

## 7. Phân hệ Kịch bản Kiểm thử (`/api/testcases`)

| Phương thức | Endpoint | Mô tả chức năng |
| :--- | :--- | :--- |
| `POST` | `/api/testcases/generate` | AI sinh bộ Test Cases từ Use Cases và cấu trúc CSDL |
| `GET` | `/api/testcases/:versionId` | Lấy danh sách Test Cases của version |
| `POST` | `/api/testcases` | Tạo thủ công một Test Case mới |
| `PUT` | `/api/testcases/:id` | Cập nhật thông tin chi tiết một Test Case |
| `DELETE` | `/api/testcases/:id` | Xóa Test Case |
| `POST` | `/api/testcases/:id/execute` | Đánh dấu kết quả chạy kiểm thử (Pass/Fail/Blocked) |
| `GET` | `/api/testcases/:versionId/export` | Xuất file báo cáo: query `?format=excel|csv|pdf|json` |

---

## 8. Danh mục WebSocket Events (Socket.IO)

### Client gửi lên Server (Emit):
- `notification`: Đăng ký nhận thông báo cá nhân (`socket.emit('notification', userId)`).
- `join_project`: Gia nhập phòng dự án để cộng tác realtime (`socket.emit('join_project', projectId)`).
- `join_system_logs`: Gia nhập phòng stream log hệ thống (dành cho Admin).

### Server phát xuống Client (Listen):
- `presence_update`: Danh sách thành viên đang online trong dự án.
- `progress_update`: Tiến trình phân tích AI (stage, percentage 0-100%).
- `usecase_updated`: Thông báo Use Case vừa được thêm/sửa/xóa.
- `version_updated`: Thông báo phiên bản mới đã được tạo/cập nhật.
- `log_event`: Dòng log mới phát sinh từ dự án hoặc hệ thống.

---

## 9. Admin API: khoảng trống đã xác minh

Backend hiện có user CRUD cơ bản qua `/api/users`, API key CRUD qua `/api/keys` và danh sách project quản trị qua `/api/projects/admin/all`. Tuy nhiên, Frontend còn gọi các route chưa được đăng ký trong backend:

- `GET /api/admin/dashboard/stats` và `GET /api/admin/dashboard/activities`.
- `GET /api/admin/system/info` và `GET /api/admin/system/logs`.
- `PATCH /api/users/:id/status` và `POST /api/users/bulk-action`.

Tạo user từ Admin hiện gọi `POST /api/auth/register`, không phải một endpoint admin-only. Trước khi coi Admin Panel hoàn chỉnh, cần quyết định và triển khai các hợp đồng này hoặc loại bỏ các giao diện gọi chúng. Danh sách được đối chiếu với `frontend/src/api/admin.js` và route mounts trong `backend/executable/command-ingress/app.ts`.
