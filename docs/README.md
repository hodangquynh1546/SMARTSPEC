# Thư Viện Tài Liệu Dự Án SmartSpec (SmartSpec Technical Documentation)

Đây là mục lục tài liệu kỹ thuật của **SmartSpec**. Bắt đầu với [README và quick start](../README.md), sau đó dùng các tài liệu dưới đây để tra cứu theo module.

---

## 📚 Danh mục Tài liệu (Table of Contents)

1. [01. Tổng quan Kiến trúc Hệ thống (Architecture Overview)](./01-architecture-overview.md)
   - Sứ mệnh dự án, các bài toán cốt lõi.
   - Sơ đồ kiến trúc tổng thể (C4 Architecture).
   - Mô hình tương tác dữ liệu và luồng chạy end-to-end.

2. [02. Hướng dẫn Kỹ thuật Backend (Backend Architecture & Implementation Guide)](./02-backend-guide.md)
   - Cấu trúc Modular Monolith & Clean Architecture (Ports & Adapters).
   - Bảng ánh xạ các Feature Slices (`adapter/` vs `domain/`).
   - Quản lý Pool API Key thông minh (`ApiKeyService`).
   - Hệ thống WebSockets và phòng sự kiện thời gian thực (Socket.IO).
   - Cơ chế bảo mật và xác thực JWT Dual-Token.

3. [03. Pipeline Xử lý Dữ liệu Đa Nguồn (Multi-Source Ingestion Pipeline)](./03-multi-source-pipeline.md)
   - Xử lý âm thanh Speech-to-Text (OpenAI Whisper + Librosa + Noisereduce).
   - Xử lý ảnh chụp OCR (EasyOCR + PyTesseract + OpenCV).
   - Bóc tách tài liệu Word (.docx) và PDF (PyMuPDF + Fallback OCR).
   - Cơ chế băm SHA-256 và khử trùng lặp dữ liệu (`HashUtil`).

4. [04. AI Orchestration & Tính Năng Nghiệp Vụ Cốt Lõi (AI Engines & Business Features)](./04-ai-orchestration-and-features.md)
   - Orchestrator Service và Prompt Engineering cho Gemini AI.
   - Cấu trúc chuẩn hóa Use Case Schema (`RequirementModel`).
   - Phân tích gia tăng & Giải quyết xung đột (Incremental Analysis & Conflict Resolution).
   - Tự động sinh mô hình UML: Use Case Diagram, Activity Diagram, Sequence Diagram.
   - Tự động thiết kế CSDL (AI Database Design & ERD Canvas).
   - Tự động sinh và thực thi kịch bản kiểm thử (Test Cases Execution & Multi-format Export).

5. [05. Hướng dẫn Kỹ thuật Frontend (Frontend Architecture & UI Components)](./05-frontend-guide.md)
   - Cấu trúc thư mục Vue 3 + Vite + Tailwind CSS.
   - Quản lý trạng thái với Pinia và Vue Router navigation guards.
   - Kiến trúc UI Components phân theo domain nghiệp vụ.
   - Cơ chế tương tác Canvas ERD và kết nối Socket.IO thời gian thực.

6. [06. Thiết kế Cơ sở Dữ liệu & Mongoose Schemas (Database Schema Reference)](./06-database-schema.md)
   - Sơ đồ quan hệ thực thể tổng thể (ERD).
   - Chi tiết cấu trúc các Collections: `projects`, `versions`, `inputs`, `outputs`, `databases`, `testcases`, `usecase_diagrams`, `sequence_diagrams`, `activity_diagrams`, `users`, `api_keys`.

7. [07. Danh Mục API Endpoints & WebSocket Events (API Reference)](./07-api-reference.md)
   - Danh sách REST APIs: Auth, Projects, Versions, Orchestrate, Input, Usecase, UML, Database, Testcase.
   - Danh sách WebSocket Events (Emit & Listen).
   - Trạng thái các API Admin frontend/backend đã đối chiếu.

8. [08. Hướng Dẫn Cài Đặt, Cấu Hình & Triển Khai (Setup & Deployment Guide)](./08-setup-and-deployment.md)
   - Yêu cầu tiên quyết môi trường (Node.js, Python, Docker, FFmpeg, Tesseract).
   - Khởi chạy MongoDB Replica Set và Redis bằng Docker Compose.
   - Cài đặt backend/frontend từ lockfile và cấu hình `.env.example`.
   - Cài đặt frontend và khởi chạy môi trường dev.
   - Hướng dẫn seed tài khoản Admin và cấu hình API Key.
   - Xử lý các lỗi thường gặp (Troubleshooting).

9. [09. Đánh Giá Hiện Trạng Dự Án & Lộ Trình Phát Triển (Project Review & Roadmap)](./09-project-review-and-roadmap.md)
   - Mức độ xác minh chức năng và các giới hạn hiện tại.
   - Nợ kỹ thuật, lint/test debt và roadmap.

## Hướng dẫn thao tác bổ sung

- [Tích hợp Admin](../ADMIN_INTEGRATION_GUIDE.md)
- [Cấu hình OpenRouter](../OPENROUTER_SETUP.md)
   - Lộ trình phát triển 3 giai đoạn (Roadmap ngắn hạn và dài hạn).
