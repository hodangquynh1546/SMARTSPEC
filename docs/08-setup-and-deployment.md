# 08. Hướng Dẫn Cài Đặt, Cấu Hình & Triển Khai (Setup & Deployment Guide)

Tài liệu này hướng dẫn chi tiết từng bước thiết lập môi trường phát triển cục bộ (Local Development) và triển khai hệ thống SmartSpec.

---

## 1. Yêu cầu Tiên quyết (Prerequisites)

| Công cụ / Dịch vụ | Phiên bản khuyến nghị | Mục đích |
| :--- | :--- | :--- |
| **Node.js** | `>= 20.x` (LTS) | Runtime chạy Backend Express và Frontend Vite |
| **npm** hoặc **yarn** | `>= 9.x` | Trình quản lý gói Node.js |
| **Python** | `3.10` hoặc `3.11` | Chạy các scripts Whisper STT, EasyOCR, PyMuPDF |
| **Docker & Docker Compose** | Phiên bản mới nhất | Chạy MongoDB Replica Set và Redis |
| **Tesseract OCR** (Tùy chọn) | `tesseract-ocr` | Hỗ trợ nhận dạng ký tự quang học qua CLI |
| **FFmpeg** (Bắt buộc cho Audio) | `ffmpeg` | Xử lý và convert các định dạng âm thanh cho Whisper |

> [!TIP]
> Cài đặt `ffmpeg` và `tesseract` trên macOS bằng Homebrew:
> ```bash
> brew install ffmpeg tesseract tesseract-lang
> ```
> Trên Ubuntu / Debian:
> ```bash
> sudo apt-get update && sudo apt-get install -y ffmpeg tesseract-ocr tesseract-ocr-vie
> ```

---

## 2. Khởi chạy Hạ tầng Dịch vụ Cơ sở Dữ liệu (Docker Compose)

SmartSpec yêu cầu **MongoDB dạng Replica Set** (để kích hoạt MongoDB Change Streams) và **Redis**.

1. Tại thư mục gốc repository, khởi động các container:
   ```bash
   docker compose up -d
   ```

2. Kiểm tra trạng thái:
   - MongoDB: Đang lắng nghe tại cổng `localhost:27017` với replica set tên `rs0`.
   - Redis: Đang lắng nghe tại cổng `localhost:6488` (mapping từ port 6379 trong container).

---

## 3. Cài đặt và Cấu hình Backend

### 3.1. Cài đặt Node.js dependencies
```bash
cd backend
npm ci
```

### 3.2. Cài đặt Môi trường Ảo Python (Python Virtual Environment)
Các tiến trình OCR và Speech-to-Text yêu cầu các thư viện Python:
```bash
# Đang đứng tại thư mục backend
python3 -m venv venv

# Kích hoạt môi trường ảo:
# Trên macOS / Linux:
source venv/bin/activate
# Trên Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Trên Windows (cmd):
.\venv\Scripts\activate.bat

# Cài đặt toàn bộ thư viện:
pip install --upgrade pip
pip install -r requirements.txt
```

### 3.3. Cấu hình biến môi trường
Tạo file `.env` từ template tại thư mục `backend/`:
```env
cp .env.example .env
```

Thay các placeholder JWT bằng secret ngẫu nhiên riêng; cấu hình Google OAuth credentials và giữ `GOOGLE_OAUTH_REDIRECT_URL` trùng với URL được khai báo trong Google Cloud. `.env.example` liệt kê toàn bộ biến bắt buộc. `REDIS_URI=redis://localhost:6488` là tùy chọn; khi không có Redis, Presence và stats cache bị tắt.

### 3.4. Khởi chạy Backend
```bash
# Chạy ở chế độ phát triển (Nodemon tự reload khi sửa code):
npm run dev
```
Lệnh backend phải chạy với working directory `backend/`, vì dotenv đọc `.env` từ thư mục hiện tại.
Backend sẽ khởi động và thông báo:
```
Server running on port http://localhost:8000
Connected to MongoDB replica set rs0
```

---

## 4. Cài đặt và Cấu hình Frontend

### 4.1. Cài đặt Node.js Dependencies
Mở một cửa sổ Terminal mới:
```bash
cd frontend
npm ci
```

### 4.2. Cấu hình Môi trường Frontend (Tùy chọn)
Tạo file `.env` từ template nếu cần cấu hình backend URL hoặc Google sign-in:
```env
VITE_BACKEND_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```
Có thể tạo file bằng `cp .env.example .env` trong `frontend/`. `VITE_GOOGLE_CLIENT_ID` phải cùng OAuth client với backend.

### 4.3. Khởi chạy Frontend
```bash
npm run dev
```
Ứng dụng web sẽ chạy tại địa chỉ: `http://localhost:5173`.

### 4.4. Cài Python workers (Audio/OCR)
Chỉ cần bước này khi dùng Audio, OCR hoặc xử lý tài liệu bằng Python:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## 5. Khởi tạo Dữ liệu Ban Đầu (Seeding Initial Data)

### 5.1. Tạo Tài khoản Quản trị viên (ADMIN)
Để truy cập vào trang quản trị `/admin`:
1. Mở trình duyệt vào `http://localhost:5173/register` để đăng ký một tài khoản thông thường (ví dụ: `admin@smartspec.io`).
2. Mở công cụ quản lý MongoDB (MongoDB Compass hoặc `mongosh`):
   ```javascript
   use smartspec;
   db.users.updateOne(
     { email: "admin@smartspec.io" },
     { $set: { system_role: "ADMIN", is_email_verified: true } }
   );
   ```
3. Đăng xuất và đăng nhập lại trên web, menu Admin sẽ xuất hiện trên Sidebar.

### 5.2. Thêm Gemini API Key vào Hệ thống
Để các tính năng AI hoạt động:
1. Đăng nhập với tài khoản ADMIN.
2. Truy cập `/admin` -> Chọn mục **API Keys Management**.
3. Thêm mới một API Key:
   - **Provider**: `gemini`
   - **Model Name**: `gemini-1.5-flash` hoặc `gemini-1.5-pro` (hoặc `gemini-2.5-flash`)
   - **Key Value**: Nhập Google Gemini API Key của bạn (lấy từ Google AI Studio).
   - **Status**: `Active`.
4. Hoặc chèn trực tiếp bằng MongoDB:
   ```javascript
   db.api_keys.insertOne({
     provider: "gemini",
     model_name: "gemini-1.5-flash",
     key_value: "AIzaSy...",
     is_active: true,
     usage_count: 0,
     createdAt: new Date(),
     updatedAt: new Date()
   });
   ```

---

## 6. Các sự cố thường gặp & Khắc phục (Troubleshooting)

### 6.1. Lỗi Python subprocess không tìm thấy lệnh `python`
- **Nguyên nhân**: Trong `domain/service.ts`, lệnh gọi subprocess sử dụng `spawn('python', args)`. Trên một số hệ điều hành (macOS/Linux), binary có tên là `python3`.
- **Cách khắc phục**:
  - Đảm bảo đã kích hoạt virtualenv trước khi chạy `npm run dev`: `source venv/bin/activate`.
   - Kích hoạt virtualenv trước khi chạy backend và xác minh `which python` trỏ tới `backend/venv/bin/python`.

### 6.2. Lỗi CORS khi gọi từ Frontend
- Kiểm tra `CLIENT_URL` trong file `.env` của Backend phải khớp với địa chỉ chạy của Frontend (ví dụ: `http://localhost:5173`).
- Đảm bảo header `Authorization` được liệt kê trong `allowedHeaders` của Express CORS middleware.

### 6.3. Lỗi MongoDB Change Streams: "The $changeStream stage is only supported on replica sets"
- Đảm bảo MongoDB được khởi động thông qua `docker-compose.yaml` có cờ `--replSet rs0` và đã hoàn thành lệnh `rs.initiate()`.
