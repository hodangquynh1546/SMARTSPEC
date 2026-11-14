# 02. Hướng dẫn Kỹ thuật Backend (Backend Architecture & Implementation Guide)

## 1. Cấu trúc tổng quan Backend

Backend của SmartSpec được viết hoàn toàn bằng **TypeScript**, chạy trên nền tảng **Node.js (v20+)** kết hợp **Express.js**, tuân thủ nghiêm ngặt nguyên lý thiết kế **Modular Monolith** kết hợp **Clean Architecture (Ports & Adapters)**.

Thư mục Backend nằm tại `backend/`:
```
backend/
├── executable/                      # Các entry points có thể khởi chạy độc lập
│   ├── command-ingress/             # Dịch vụ API Ingress chính (Port 8000)
│   │   ├── app.ts                   # Cấu hình Express app, middlewares, mount routes
│   │   ├── main.ts                  # Khởi tạo DB, Redis, Socket server, lắng nghe PORT
│   │   ├── socket.ts                # Khởi tạo Socket.IO hub & đăng ký các namespace/room
│   │   ├── features/                # Các lát cắt tính năng (Feature Slices)
│   │   ├── middlewares/             # Express middlewares (logger, auth, recover, cors)
│   │   ├── services/                # Các dịch vụ dùng chung (notification, mailer)
│   │   ├── shared/                  # Định nghĩa dùng chung giữa các feature
│   │   ├── types/                   # TypeScript interfaces & types
│   │   └── utils/                   # Tiện ích môi trường (env.ts), mã hóa, hash
│   ├── mongodb-redis-connector/     # Dịch vụ CDC (Change Data Capture) đồng bộ Mongo -> Redis
│   │   ├── main.ts
│   │   ├── pipeline.ts
│   │   ├── operator/
│   │   ├── sink/
│   │   └── source/
├── internal/                        # Thư mục mã nguồn nội bộ
│   └── model/                       # Toàn bộ Mongoose Schemas & TypeScript Types
├── lib/                             # Thư viện tiện ích cấp thấp (kết nối Redis, ...)
├── requirements.txt                 # Các gói thư viện phụ thuộc Python cho AI/OCR/STT
├── package.json                     # Node.js dependencies và scripts
└── tsconfig.json                    # Cấu hình TypeScript compiler
```

### Build, test và lint

Chạy các lệnh trong `backend/`. TypeScript build được ghi vào `backend/dist/`, không phát sinh JavaScript cạnh mã nguồn; Jest chỉ thu thập test TypeScript. `npm run lint` kiểm tra mà không tự sửa file.

```bash
npm run build
npm test -- --runInBand
npm run lint
```

---

## 2. Mô hình phân lớp Feature (Clean Architecture Feature Slice)

Mỗi thư mục trong `backend/executable/command-ingress/features/` đại diện cho một domain nghiệp vụ độc lập, ví dụ: `usecase/`, `database/`, `testcase/`, `uml/`, `project/`, `auth/`, `orchestrator/`.

Mỗi feature được tổ chức nhất quán thành 2 tầng:

```
feature_name/
├── adapter/                         # Tầng giao tiếp ngoại vi (Driving Adapters)
│   ├── controller.ts                # Tiếp nhận HTTP Request, gọi Domain Service, trả về HTTP Response
│   ├── route.ts                     # Định nghĩa URL paths, middlewares (auth, upload, validator)
│   └── validator.ts (nếu có)        # Validate DTO đầu vào (class-validator / custom)
└── domain/                          # Tầng nghiệp vụ cốt lõi (Core Business Logic)
    ├── service.ts                   # Interface và Class triển khai logic nghiệp vụ
    ├── GeminiService.ts (nếu có)    # Tích hợp AI Prompting riêng cho feature đó
    ├── interfaces.ts                # Định nghĩa types, DTOs, domain contracts
    └── *.socket.service.ts (nếu có) # Phát tán sự kiện WebSocket realtime của feature
```

### Ưu điểm của mô hình này:
- **Tách biệt mối quan tâm (Separation of Concerns)**: Controller không chứa logic tính toán nghiệp vụ hay câu lệnh truy vấn DB trực tiếp; Controller chỉ đóng vai trò chuyển ngữ giữa giao thức HTTP và Domain Service.
- **Dễ dàng bảo trì & mở rộng**: Khi cần thay đổi cách trích xuất hoặc thay đổi nhà cung cấp AI, ta chỉ cần can thiệp vào tầng `domain/`, các tầng `adapter/` vẫn giữ nguyên.
- **Kiểm thử độc lập (Testability)**: Dễ dàng viết Unit Test cho Domain Service bằng cách mock các model Mongoose hoặc AI Service.

---

## 3. Hệ sinh thái Features chi tiết

| Tên Feature | Đường dẫn | Chức năng chính |
| :--- | :--- | :--- |
| **auth** | `features/auth/` | Xác thực người dùng: Đăng ký, Đăng nhập, JWT Token & Refresh Token, Quên mật khẩu, Xác minh OTP qua Email, Google OAuth 2.0 Identity Broker. |
| **user** | `features/user/` | Quản lý thông tin cá nhân, cập nhật profile, đổi mật khẩu, phân quyền hệ thống (`system_role`: USER, ADMIN). |
| **api_key** | `features/api_key/` | Quản lý pool API keys cho AI (Gemini, OpenAI, Claude), thống kê quota, kiểm tra tính hợp lệ của key. |
| **project** | `features/project/` | CRUD dự án, chia sẻ dự án, quản lý quyền thành viên (owner, editor, viewer), soft delete (thùng rác) và khôi phục. |
| **version** | `features/version/` | Quản lý phiên bản đặc tả của dự án (Semantic Versioning: v1.0, v1.1...), tự động bump version khi cập nhật mới, quản lý cờ khóa edit. |
| **input** | `features/input/` | Quản lý các file và dữ liệu đầu vào được nạp vào project/version; lưu trữ hash SHA-256 để chống xử lý trùng lặp. |
| **orchestrator** | `features/orchestrator/` | Nhạc trưởng điều phối pipeline trích xuất đa nguồn, kết nối với Gemini AI để bóc tách Use Cases và phát hiện xung đột. |
| **handle_image** | `features/handle_image/` | Nhận file ảnh (.png, .jpg), gọi Python OCR subprocess (EasyOCR/Tesseract) để trích xuất chữ. |
| **handle_audio** | `features/handle_audio/` | Nhận file âm thanh (.mp3, .wav), tiền xử lý lọc nhiễu và gọi Python Whisper subprocess để nhận dạng giọng nói thành văn bản. |
| **handle_docx** | `features/handle_docx/` | Đọc cấu trúc tài liệu Word (.docx), trích xuất headings, paragraphs, bullet points. |
| **handle_pdf** | `features/handle_pdf/` | Đọc tài liệu PDF (kết hợp text extraction của PyMuPDF và fallback OCR nếu là file scan). |
| **handle_text** | `features/handle_text/` | Chuẩn hóa dữ liệu text thô nhập trực tiếp từ bàn phím. |
| **handle_extraction** | `features/handle_extraction/`| Bộ chuyển đổi tập trung (Unified Extractor) điều phối các file upload tới đúng service tương ứng. |
| **usecase** | `features/usecase/` | Quản lý Use Case Schema, CRUD Use Case, chỉnh sửa chi tiết task, rule, actor; phát tán thay đổi realtime qua Socket.IO. |
| **uml** | `features/uml/` | Sinh các biểu đồ UML: Use Case Diagram, Sequence Diagram, Activity Diagram dưới dạng Mermaid/PlantUML và SVG. |
| **database** | `features/database/` | Sinh lược đồ CSDL (Tables, Columns, Primary/Foreign Keys, Relationships) từ Use Cases; kiểm tra toàn vẹn quan hệ. |
| **testcase** | `features/testcase/` | Sinh bộ kịch bản kiểm thử (Test Cases), hỗ trợ chạy testcase và xuất báo cáo (Excel, CSV, PDF, JSON). |
| **share** | `features/share/` | Quản lý lời mời cộng tác dự án qua email token, chấp nhận hoặc từ chối lời mời. |
| **presence** | `features/presence/` | Theo dõi trạng thái online/offline của người dùng trong cùng một dự án theo thời gian thực. |
| **log** | `features/log/` | Ghi nhận và truy vấn logs hoạt động hệ thống và logs từng dự án, stream realtime qua Socket.IO. |
| **notification** | `features/notification/`| Tạo và gửi thông báo trong ứng dụng và qua email (Nodemailer). |

---

## 4. Quản lý Pool API Key thông minh (`ApiKeyService`)

Một trong những điểm sáng kiến trúc của SmartSpec là cơ chế **quản lý API Key độc lập**:
- Các API Keys được lưu trữ trong bảng `api_keys` trong MongoDB.
- Mỗi key được gán với `provider` ("gemini" | "openai" | "claude"), `model_name`, `is_active`, `usage_count`, `last_used_at`.
- Khi Backend cần gọi AI:
  ```typescript
  const keyDoc = await ApiKey.findOne({ provider: "gemini", is_active: true })
                             .sort({ updatedAt: -1 });
  ```
- Nếu một key gặp lỗi quota (HTTP 429) hoặc invalid key (HTTP 401/403), hệ thống tự động gọi `disableKey(keyId)` để đánh dấu `is_active: false` và tự động chuyển sang key tiếp theo trong pool.

---

## 5. Hệ thống Giao tiếp Thời gian thực (Real-time WebSockets với Socket.IO)

SmartSpec sử dụng `socket.io` được tích hợp trong `backend/executable/command-ingress/socket.ts`.

### 5.1. Cơ chế phòng (Rooms):
- `user_${userId}`: Phòng thông báo riêng cho từng người dùng (ví dụ: thông báo được mời vào dự án).
- `project_${projectId}`: Phòng của dự án. Khi người dùng mở một dự án, client sẽ gửi event `join_project(projectId)`.
- `system_logs`: Phòng nhận stream log toàn hệ thống dành cho Admin.

### 5.2. Các Socket Services chuyên trách:
1. **`presenceSocketService`**:
   - Khi user vào dự án: Broadcast danh sách các thành viên đang có mặt (`active_members`).
   - Khi user ngắt kết nối hoặc chuyển trang: Tự động dọn dẹp và thông báo cho các client khác.
2. **`inputSocketService`**:
   - Broadcast tiến trình phân tích: `emitIncrementalProgress(projectId, versionId, userId, progress, stage, isProcessing)`.
   - Giúp thanh tiến độ trên giao diện người dùng chuyển đổi mượt mà từ 0% -> 100%.
3. **`usecaseSocketService`**:
   - Đồng bộ ngay lập tức danh sách Use Case khi có người dùng thêm, sửa, xóa hoặc khi AI phân tích xong.
4. **`logSocketService`**:
   - Truyền tải logs hoạt động của project hoặc log hệ thống.

---

## 6. Cơ chế Xác thực và Bảo mật (Security & Authentication)

1. **JWT Dual-Token Mechanism**:
   - `accessToken`: Hạn ngắn (ví dụ: 15-60 phút), lưu trong Header `Authorization: Bearer <token>`.
   - `refreshToken`: Hạn dài (ví dụ: 7-30 ngày), dùng để cấp lại `accessToken` qua endpoint `POST /api/auth/token`.
2. **Phân quyền vai trò (Role-Based Access Control - RBAC)**:
   - **System Roles**: `USER`, `ADMIN`.
   - **Project Roles**: `owner`, `editor`, `viewer`.
   - Middlewares bảo vệ:
     - `requireAuth`: Kiểm tra token hợp lệ và giải mã thông tin user vào `req.user`.
     - `requireRole("ADMIN")`: Chặn truy cập nếu không phải ADMIN hệ thống.
3. **Xử lý lỗi tập trung (`recoverMiddleware`)**:
   - Bắt toàn bộ unhandled exceptions trong pipeline Express, log lỗi ra console và trả về cấu trúc lỗi chuẩn JSON:
     ```json
     {
       "success": false,
       "message": "Chi tiết lỗi",
       "error": "Tên mã lỗi"
     }
     ```
