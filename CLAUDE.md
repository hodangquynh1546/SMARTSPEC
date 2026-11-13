# CLAUDE.md — Hướng Dẫn Dự Án SmartSpec Cho Claude & AI Coding Agents

> **SmartSpec**: Nền tảng Kỹ nghệ Yêu cầu Phần mềm Thông minh (AI-Powered Requirements Engineering Platform).  
> Tự động chuyển hóa tài liệu đa nguồn (Audio STT, Image OCR, DOCX, PDF, Text) thành bộ đặc tả Use Case, biểu đồ UML (Use Case, Activity, Sequence), thiết kế CSDL (ERD Canvas), và kịch bản kiểm thử (Test Cases).

---

## 1. Bản Đồ Dự Án & Cấu Trúc Mã Nguồn (Repository Layout)

```
SmartSpec/
├── CLAUDE.md / claude.md            # Tài liệu chỉ dẫn này cho Claude
├── docs/                            # 📚 Thư viện tài liệu kỹ thuật chi tiết (01 -> 09)
└── SMARTSPEC/                       # Thư mục chứa mã nguồn chính của dự án
    ├── docker-compose.yaml          # MongoDB Replica Set (rs0) + Redis
    ├── backend/                     # Node.js + TypeScript Backend (Modular Monolith)
    │   ├── executable/
    │   │   ├── command-ingress/     # Dịch vụ API Ingress chính (Port 8000)
    │   │   │   ├── app.ts           # Cấu hình Express app, middlewares, routes
    │   │   │   ├── main.ts          # Khởi động server HTTP & Socket.IO
    │   │   │   ├── socket.ts        # Socket.IO Realtime Hub & Rooms
    │   │   │   └── features/        # Các Feature Slices (Clean Architecture)
    │   │   │       ├── auth/        # Xác thực, JWT, 2FA, Google OAuth
    │   │   │       ├── orchestrator/# Điều phối bóc tách đa nguồn & gọi Gemini AI
    │   │   │       ├── handle_audio/# STT với Whisper + Librosa (Python)
    │   │   │       ├── handle_image/# OCR với EasyOCR + Tesseract (Python)
    │   │   │       ├── handle_docx/ # Bóc tách cấu trúc file Word (.docx)
    │   │   │       ├── handle_pdf/  # Bóc tách text & scan OCR file PDF
    │   │   │       ├── usecase/     # Quản lý CRUD & định dạng Use Case
    │   │   │       ├── uml/         # Sinh sơ đồ Use Case, Activity, Sequence
    │   │   │       ├── database/    # Thiết kế CSDL (Tables, Columns, Relationships)
    │   │   │       ├── testcase/    # Sinh kịch bản kiểm thử & Export báo cáo
    │   │   │       ├── project/     # Quản lý dự án, chia sẻ, thùng rác
    │   │   │       ├── version/     # Quản lý phiên bản đặc tả (Semantic Versioning)
    │   │   │       ├── api_key/     # Quản lý Pool API Key (Gemini, OpenAI, Claude)
    │   │   │       ├── presence/    # Trạng thái online thời gian thực của thành viên
    │   │   │       └── log/         # Ghi nhận và stream log hệ thống/dự án
    │   │   └── mongodb-redis-connector/ # CDC đồng bộ Mongo Change Streams -> Redis
    │   ├── internal/model/          # Mongoose Schemas & TypeScript Types
    │   └── requirements.txt         # Thư viện Python phục vụ AI/OCR/STT
    └── frontend/                    # Vue 3 + Vite + Tailwind CSS Frontend (Port 5173)
        └── src/
            ├── main.js              # Entry point Vue app
            ├── router/              # Vue Router 4 (authGuard & adminGuard)
            ├── stores/              # Pinia state stores
            ├── utils/               # axiosClient (auto refresh JWT), socket.js, authGuard
            ├── views/               # Các trang chính (Dashboard, Editor, UML, DB, Testcase, Admin)
            └── components/          # UI components phân theo domain (usecase, database, uml, testcase, admin)
```

---

## 2. Bảng Công Nghệ Sử Dụng (Tech Stack Matrix)

| Lĩnh vực | Công nghệ chính |
| :--- | :--- |
| **Frontend** | Vue 3 (Composition API `<script setup>`), Vite 7, Pinia 3, Vue Router 4, Tailwind CSS, Axios, Marked, PlantUML Encoder, HTML5 Canvas / SVG |
| **Backend** | Node.js 20+, TypeScript, Express.js, Socket.IO 4, Mongoose 7, Envalid, Dotenv, Bcrypt, JsonWebToken, ExcelJS, PDFKit |
| **AI & LLM** | Google Gemini API (`@google/genai`, `@google/generative-ai`), Pool API Key xoay vòng tự động |
| **Python Workers** | Python 3.10+, OpenAI Whisper, EasyOCR, PyTesseract, OpenCV, Librosa, Noisereduce, PyMuPDF, python-docx |
| **Cơ sở Dữ liệu** | MongoDB 7.0 Replica Set (`rs0`), Redis (Cache, Sessions, Mongo Change Streams) |
| **Container** | Docker & Docker Compose |

---

## 3. Lệnh Phát Triển & Vận Hành Nhanh (Essential Commands)

### 3.1. Khởi động Hạ tầng Database (Docker)
```bash
cd SMARTSPEC
docker compose up -d
# Kiểm tra: MongoDB port 27017, Redis port 6488
```

### 3.2. Chạy Backend (Node.js + Python venv)
```bash
cd SMARTSPEC/backend

# Kích hoạt virtualenv Python (chứa Whisper, EasyOCR, PyMuPDF)
source venv/bin/activate        # Trên macOS / Linux
# .\venv\Scripts\Activate.ps1   # Trên Windows

# Cài đặt thư viện (nếu chưa cài):
npm install
pip install -r requirements.txt

# Khởi động Backend Dev Server (Port 8000):
npm run dev
```

### 3.3. Chạy Frontend (Vue 3 + Vite)
```bash
cd SMARTSPEC/frontend

# Cài đặt thư viện:
npm install

# Khởi động Frontend Dev Server (Port 5173):
npm run dev

# Build sản phẩm:
npm run build

# Kiểm tra lint & format:
npm run lint
npm run format
```

### 3.4. Kiểm thử Backend (Tests)
```bash
cd SMARTSPEC/backend
npm run test
```

---

## 4. Quy Chuẩn Code & Kiến Trúc Cần Tuân Thủ (Conventions)

### 4.1. Quy chuẩn Backend (Express & TypeScript)
1. **Tuân thủ mô hình Feature Slice (Clean Architecture)**:
   - Mọi endpoint mới PHẢI nằm trong đúng feature folder (`features/<feature_name>/`).
   - Tách biệt rõ:
     - `adapter/controller.ts`: Chỉ nhận request, validate params, gọi service, trả response.
     - `adapter/route.ts`: Khai báo URL, apply auth/role middlewares, gắn controller.
     - `domain/service.ts`: Toàn bộ logic nghiệp vụ, gọi Model hoặc AI.
2. **Quản lý AI Prompts**:
   - Mọi lời gọi Gemini LLM cần đặt trong `GeminiService.ts` của feature tương ứng.
   - Hỗ trợ đa ngôn ngữ (`vi-VN` và `en-US`).
   - Yêu cầu AI trả về định dạng JSON thuần để parse bằng `JSON.parse()`, loại bỏ markdown code fences (` ```json `).
   - Luôn sử dụng `ApiKeyService` để lấy active key thay vì hardcode key.
3. **Realtime Broadcast**:
   - Khi có thay đổi trạng thái tiến trình (progress), Use Case mới, hoặc sự kiện project, bắt buộc gọi hàm tương ứng trong `*.socket.service.ts` để đồng bộ xuống client.

### 4.2. Quy chuẩn Frontend (Vue 3)
1. **Sử dụng `<script setup>` và Composition API**:
   - Sử dụng `ref`, `reactive`, `computed`, `watch`.
   - Tránh Options API (`data()`, `methods`).
2. **Gọi API qua `axiosClient`**:
   - Luôn import từ `@/utils/axiosClient` hoặc `../utils/axiosClient.js`.
   - KHÔNG gọi trực tiếp thư viện `axios` gốc để đảm bảo interceptor gắn `Authorization: Bearer <token>` và auto refresh token khi bị 401.
3. **Phân loại Components**:
   - Các modals và bảng điều khiển chuyên biệt đặt trong thư mục domain tương ứng (`components/usecase/`, `components/database/`, `components/uml/`, `components/testcase/`, `components/admin/`).
4. **Phân quyền Giao diện**:
   - Các router cần bảo vệ phải có `meta: { requiresAuth: true }` hoặc `beforeEnter: authGuard`.
   - Các route quản trị bắt buộc có `beforeEnter: adminGuard`.

---

## 5. Luồng Nghiệp Vụ Cốt Lõi (Core Workflows)

```
[ User Uploads Multi-Source Files ] 
         │
         ▼
[ POST /api/orchestrate/run ]
         │
         ├─► Node.js tính SHA-256 hash của từng file (tránh chạy lại file đã xử lý)
         ├─► Version tự động bump (nếu không phải bản nháp) & status = 'processing'
         ├─► Socket.IO broadcast: progress = 15% (initializing)
         │
         ▼
[ Python Workers Subprocess ]
         ├─► Audio: Whisper lọc nhiễu + Speech-to-Text
         ├─► Image: EasyOCR + Tesseract bóc tách chữ
         ├─► Docx/PDF: python-docx + PyMuPDF trích xuất cấu trúc văn bản
         │
         ▼
[ AI Extraction Engine (Gemini) ]
         ├─► Socket.IO broadcast: progress = 50% (analyzing)
         ├─► Lọc bỏ thủ tục giấy tờ thực tế, chỉ giữ nghiệp vụ phần mềm
         ├─► Trích xuất Use Cases đầy đủ: id, name, role, goal, tasks, inputs, outputs, rules
         ├─► Incremental Mode: Phát hiện Use Cases mới hoặc Xung đột (Conflicts)
         │
         ▼
[ Lưu MongoDB & Broadcast 100% (completed) ]
         │
         ├──► [ Sinh UML Diagram ] (Use Case, Activity, Sequence via Mermaid/PlantUML)
         ├──► [ Sinh Thiết kế CSDL ] (Tables, Columns, PK/FK, Relationships -> ERD Canvas)
         ├──► [ Sinh Test Cases ] (Integration, UI, API, Security -> Chạy test & Xuất Excel/PDF)
         └──► [ Xuất Tài liệu Đặc tả ] (Markdown, Use Case Spec, User Story)
```

---

## 6. Biến Môi Trường Cần Thiết (`backend/.env`)

| Tên biến | Giá trị mẫu | Mục đích |
| :--- | :--- | :--- |
| `PORT` | `8000` | Cổng HTTP server backend |
| `MONGO_URI` | `mongodb://localhost:27017/smartspec?replicaSet=rs0` | Kết nối MongoDB Replica Set |
| `DEV` | `true` | Chế độ phát triển |
| `CLIENT_URL` | `http://localhost:5173` | Địa chỉ frontend cho CORS |
| `JWT_SECRET` | `secret_jwt_access_key` | Ký accessToken |
| `JWT_REFRESH_SECRET`| `secret_jwt_refresh_key`| Ký refreshToken |
| `JWT_OTP_SECRET` | `secret_jwt_otp_key` | Ký OTP xác thực email |
| `JWT_EMAIL_SECRET` | `secret_jwt_email_key` | Ký link xác thực email |
| `UPLOADS_PATH` | `./uploads` | Thư mục lưu file tạm |

---

## 7. Tài Liệu Chi Tiết Trong Thư Mục `docs/`

Để tìm hiểu sâu từng phân hệ, hãy tham khảo các file tương ứng trong `docs/`:
- [docs/01-architecture-overview.md](file:///Users/hodangquynh/Documents/SmartSpec/SMARTSPEC/docs/01-architecture-overview.md): Tổng quan kiến trúc & sơ đồ tương tác
- [docs/02-backend-guide.md](file:///Users/hodangquynh/Documents/SmartSpec/SMARTSPEC/docs/02-backend-guide.md): Hướng dẫn kỹ thuật Backend & Modular Monolith
- [docs/03-multi-source-pipeline.md](file:///Users/hodangquynh/Documents/SmartSpec/SMARTSPEC/docs/03-multi-source-pipeline.md): Pipeline bóc tách đa nguồn Audio, OCR, PDF, DOCX
- [docs/04-ai-orchestration-and-features.md](file:///Users/hodangquynh/Documents/SmartSpec/SMARTSPEC/docs/04-ai-orchestration-and-features.md): Chi tiết AI Orchestration, UML, DB, Testcase
- [docs/05-frontend-guide.md](file:///Users/hodangquynh/Documents/SmartSpec/SMARTSPEC/docs/05-frontend-guide.md): Hướng dẫn kỹ thuật Frontend Vue 3 & ERD Canvas
- [docs/06-database-schema.md](file:///Users/hodangquynh/Documents/SmartSpec/SMARTSPEC/docs/06-database-schema.md): Lược đồ MongoDB Mongoose Schemas đầy đủ
- [docs/07-api-reference.md](file:///Users/hodangquynh/Documents/SmartSpec/SMARTSPEC/docs/07-api-reference.md): Danh mục API Endpoints & Socket Events
- [docs/08-setup-and-deployment.md](file:///Users/hodangquynh/Documents/SmartSpec/SMARTSPEC/docs/08-setup-and-deployment.md): Hướng dẫn cài đặt và chạy hệ thống từ A-Z
- [docs/09-project-review-and-roadmap.md](file:///Users/hodangquynh/Documents/SmartSpec/SMARTSPEC/docs/09-project-review-and-roadmap.md): Đánh giá hiện trạng dự án & Lộ trình phát triển

---

## 8. Nguyên Tắc Cho Claude Khi Làm Việc Với Repository Này
1. **Luôn giữ tính nhất quán phân lớp**: Khi thêm tính năng backend, tạo đủ `controller.ts`, `route.ts`, `service.ts` và type definitions trong đúng feature slice.
2. **Không hardcode API Key**: Luôn gọi AI thông qua `ApiKeyService` để lấy key active từ pool CSDL.
3. **Bảo toàn cơ chế Realtime**: Khi chỉnh sửa logic Use Case hoặc Version, nhớ phát sóng Socket event tương ứng để giao diện người dùng không bị lệch trạng thái.
4. **Kiểm tra tương thích Python**: Khi chỉnh sửa các script Python trong `pythonScript/`, đảm bảo script in kết quả ra `stdout` dạng JSON sạch để Node.js parse được và in log lỗi ra `stderr`.
5. **Kiểm tra Token & Interceptors**: Khi viết API mới ở frontend, luôn dùng `axiosClient` từ `@/utils/axiosClient`.
