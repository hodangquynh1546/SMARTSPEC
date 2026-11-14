# SmartSpec

SmartSpec là nền tảng hỗ trợ tự động hóa quá trình phân tích yêu cầu nghiệp vụ và sinh ra các artifact kỹ thuật bằng trí tuệ nhân tạo, bao gồm:
- Use case
- Database schema
- UML diagrams
- Test cases
- Versioning và preview thay đổi
- Realtime collaboration

Dự án tập trung vào việc giảm thời gian chuyển từ yêu cầu nghiệp vụ thô sang các tài sản kỹ thuật có cấu trúc, dễ sử dụng và dễ kiểm tra.

> **Trạng thái hiện tại:** các luồng nghiệp vụ cốt lõi đã có, nhưng dự án chưa được xác nhận production-ready. Kiểm kê thiếu E2E, lint còn nhiều lỗi và một số API Admin chưa có backend; xem [đánh giá và roadmap](docs/09-project-review-and-roadmap.md).

---

## 1. Tổng quan dự án

SmartSpec không chỉ là một ứng dụng CRUD thông thường. Đây là một hệ thống AI-assisted engineering platform, nơi người dùng có thể:
- nhập yêu cầu dự án hoặc tài liệu đầu vào
- tạo use case từ đó
- sinh database schema
- sinh diagram UML (use case, activity, sequence)
- tạo testcase tự động
- theo dõi tiến độ, version và thay đổi theo thời gian thực

Mục tiêu của dự án là biến quá trình phân tích hệ thống từ việc làm thủ công, tốn thời gian thành một quy trình có cấu trúc, có AI hỗ trợ và có thể kiểm soát được chất lượng đầu ra.

---

## 2. Vấn đề cần giải quyết

Trong các dự án phần mềm thực tế, người phát triển thường phải làm nhiều bước liên tiếp từ khi nhận yêu cầu cho tới khi có được các tài sản kỹ thuật:
- phân tích nghiệp vụ
- xác định actors và use cases
- thiết kế dữ liệu
- vẽ diagram luồng xử lý
- viết testcase

Nhiều khi các bước này được thực hiện bằng tay, dẫn đến:
- mất thời gian
- dễ thiếu sót logic nghiệp vụ
- khó đồng bộ giữa các artifact
- khó cập nhật khi requirements thay đổi
- khó kiểm tra tính đầy đủ và đúng chuẩn của hệ thống

SmartSpec giải quyết vấn đề này bằng cách xây dựng pipeline AI: từ requirement → use case → database → UML → testcase.

---

## 3. Các tính năng chính

### 3.1 Quản lý dự án và phiên bản
- Tạo project
- Quản lý nhiều version của project
- Theo dõi trạng thái xử lý
- Preview thay đổi giữa các version
- Bump version khi có thay đổi quan trọng

### 3.2 Quản lý user và auth
- Đăng ký / đăng nhập
- OAuth Google
- JWT/refresh token
- Quản lý profile và cài đặt hệ thống
- Model LLM preference theo user

### 3.3 Xử lý đầu vào đa dạng
- text input
- PDF
- DOCX
- OCR image
- audio transcription
- extraction data từ tài liệu

### 3.4 Generate Use Case
- Phân tích requirement
- Sinh use case có cấu trúc chuẩn
- Tạo actor, goal, preconditions, steps, alternative flows
- Lưu vào MongoDB và liên kết với version của project

### 3.5 Generate Database Schema
- Từ use case và requirement, suy ra entities, relationships
- Sinh schema bảng, cột, khóa chính, khóa ngoại
- Validate mô hình dữ liệu
- Xuất SQL hoặc dùng cho phát triển tiếp theo

### 3.6 Generate UML
Hệ thống hỗ trợ sinh các loại sơ đồ UML sau:
- Use case diagram
- Activity diagram
- Sequence diagram

Mỗi diagram được sinh từ requirement/usecase và lưu dưới dạng cấu trúc dữ liệu, có thể render hoặc preview ngay trong hệ thống.

### 3.7 Generate Testcase
- Tạo testcase từ use case + database + requirement
- Chia batch để xử lý hiệu quả
- Validate cấu trúc đầu ra
- Retry khi thiếu hoặc sai
- Lưu testcase vào database

### 3.8 Realtime collaboration
- Socket.IO
- Theo dõi tiến độ xử lý ở thời gian thực
- Cập nhật trạng thái project, version, logs, presence

### 3.9 Logs và thống kê
- Ghi log hoạt động
- Lưu usage của LLM API
- Theo dõi token, provider, model, thời gian phản hồi
- Hỗ trợ thống kê và báo cáo

---

## 4. Kiến trúc hệ thống

Dự án chia thành 3 thành phần chính:

### Frontend
- Vue.js
- UI quản lý dự án, usecase, UML, database, testcase
- Hiển thị realtime và preview

### Backend
- Node.js / TypeScript
- Express
- Module feature-based architecture
- Nhiều route theo domain: auth, project, usecase, database, UML, testcase, llm, version, logs, notification...

### Data layer
- MongoDB: lưu dữ liệu chính
- Redis: cache, realtime, presence, stats, session

---

## 5. Cấu trúc thư mục chính

```text
SmartSpec/
├── backend/
│   ├── executable/
│   │   ├── command-ingress/
│   │   │   ├── app.ts
│   │   │   ├── socket.ts
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   ├── project/
│   │   │   │   ├── usecase/
│   │   │   │   ├── database/
│   │   │   │   ├── uml/
│   │   │   │   ├── testcase/
│   │   │   │   ├── llm/
│   │   │   │   ├── orchestrator/
│   │   │   │   ├── input/
│   │   │   │   ├── version/
│   │   │   │   ├── log/
│   │   │   │   └── ...
│   │   │   └── shared/
│   │   │       └── LLMService.ts
│   │   └── mongodb-redis-connector/
│   └── internal/
│       └── model/
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
├── docker-compose.yaml
├── package.json
├── README.md
└── ...
```

---

## 6. Luồng xử lý AI/LLM trong dự án

LLM là núcleo của hệ thống. Tất cả các module sinh artifact đều dùng một service chung: `LLMService`.

### 6.1 Service LLM chung
File chính:
- `backend/executable/command-ingress/shared/LLMService.ts`

Service này chịu trách nhiệm:
- xác định provider: OpenRouter, Gemini, OpenAI, Claude...
- chọn model phù hợp
- ưu tiên model user đã chọn
- fallback sang model/provider khác nếu lỗi
- rotate API key
- log usage và token
- validate và xử lý lỗi

### 6.2 Sơ đồ luồng AI

```text
Requirement / Input
        ↓
Prompt Builder
        ↓
LLMService.callLLM()
        ↓
Provider API (OpenRouter / Gemini / AI provider)
        ↓
Structured Output JSON
        ↓
Validator / Normalizer
        ↓
Save to DB / Update version / Emit socket events
```

### 6.3 Cách chọn model
Logic hiện tại ưu tiên:
1. User-selected model
2. Model từ API key
3. OpenRouter nếu có key
4. Gemini nếu có key
5. Provider fallback khác

Điều này giúp hệ thống linh hoạt khi một provider có rate limit hoặc không hỗ trợ model cần dùng.

### 6.4 Fallback và retry
Service LLM có các cơ chế quan trọng:
- retry khi request lỗi
- fallback provider
- fallback model
- rate-limit handling
- key rotation để phân phối tải

Nội dung này rất quan trọng vì trong LLM production, vấn đề thường gặp không phải chỉ lỗi syntax mà là rate limit, quota, model invalid, JSON không đúng format.

---

## 7. Luồng chính của dự án

### 7.1 Tạo project
Người dùng tạo project, điền thông tin, đính kèm tài liệu hoặc source text. Sau đó backend khởi tạo version mới và bắt đầu pipeline xử lý.

### 7.2 Orchestrator workflow
Module orchestrator sẽ điều phối các bước sinh artifact:
- estimate number of use cases
- phân batch
- gọi LLM theo từng batch
- lưu tạm
- retry missing item
- validate toàn bộ output
- lưu vào DB

### 7.3 Generate usecase
- LLM đọc requirement
- trích xuất use case
- sinh object chuẩn
- lưu vào collection usecase

### 7.4 Generate database
- Dựa trên use case + requirement, LLM sinh schema DB
- Validate cấu trúc bảng, quan hệ, khóa chính, khóa ngoại
- lưu vào collection database

### 7.5 Generate UML
- Dựa trên use case hoặc requirement, LLM dựng đối tượng diagram
- Với use case diagram: actor + usecase + relationships
- Với activity diagram: nodes + transitions
- Với sequence diagram: lifeline + messages + fragments

### 7.6 Generate testcase
- Dùng requirement/use case/database schema làm input
- LLM bắt đầu sinh testcase theo batch
- Trước khi lưu, hệ thống kiểm tra: số lượng, duplicate, schema, missing item
- Nếu thiếu hoặc invalid, tự retry

### 7.7 Versioning
- Mỗi thay đổi tạo preview và version mới
- Frontend có thể hiển thị sự khác biệt giữa versions
- Dễ rollback hoặc review thay đổi

---

## 8. Cách AI được dùng trong dự án

SmartSpec không chỉ gọi LLM “để trả lời câu hỏi”. AI được dùng như một engine phân tích và sinh cấu trúc dữ liệu.

### Cách tiếp cận
- Input: requirements, documents, usecases, DB schema, project context
- AI Role: phân tích nghiệp vụ, suy luận, trích xuất entities và flows
- Output: JSON/schema chuẩn hóa
- Post-process: validate, normalize, save

### Tại sao cần structured output
Vì nếu AI trả về text tự do, rất khó:
- lưu trữ
- validate
- so sánh
- render diagram
- sinh testcase

Do đó, các prompt đều hướng LLM trả về JSON hoặc cấu trúc rõ ràng.

---

## 9. Thách thức kỹ thuật và giải pháp

### 9.1 Rate limit / quota
Các provider LLM có thể giới hạn số request hoặc quota miễn phí.
- giải pháp: fallback provider, key rotation, retry logic

### 9.2 Output sai cấu trúc
LLM có thể trả về định dạng không chuẩn.
- giải pháp: validation layer, normalize output, repair prompt

### 9.3 Số lượng lớn output
Sinh quá nhiều usecase/testcase trong một request dễ bị timeout hoặc trả về không đủ.
- giải pháp: batch generation + temp storage + retry missing items

### 9.4 Đồng bộ dữ liệu và version
Khi nhiều người cùng làm việc trên project, cần đảm bảo cập nhật project/version đúng thời điểm.
- giải pháp: versioning + preview + realtime socket

### 9.5 Kiểm tra chất lượng
Không phải mọi output AI đều hợp lệ.
- giải pháp: validator, duplicate check, schema enforcement, manual review support

---

## 10. Công nghệ sử dụng

### Frontend
- Vue 3
- Vite
- JavaScript
- Socket.IO client

### Backend
- Node.js
- TypeScript
- Express
- Socket.IO
- MongoDB/Mongoose
- Redis

### AI / LLM
- Gemini
- OpenRouter
- OpenAI
- Claude
- Multi-provider routing

### DevOps / Tools
- Docker
- Docker Compose
- ESLint
- Jest

---

## 11. Quy trình phát triển của hệ thống

### Mức 1: Requirement intake
Nhận đầu vào từ người dùng hoặc file upload.

### Mức 2: AI interpretation
LLM hiểu context và tách thành các khối nghiệp vụ.

### Mức 3: Artifact generation
Sinh usecase, database, diagram, testcase.

### Mức 4: Validation and repair
Kiểm tra cấu trúc, số lượng, tính hợp lệ, duplicate.

### Mức 5: Persistence
Lưu kết quả lên MongoDB, cập nhật version, preview, logs.

### Mức 6: Collaboration
Hiển thị realtime cho user và team.

---

## 12. Giả định kinh doanh và giá trị thương mại

SmartSpec mang lại giá trị cho các nhóm như:
- Product owner
- BA (business analyst)
- Team lead
- Development team
- QA team

Nó giúp họ rút ngắn thời gian từ khâu lên ý tưởng, khai thác requirements, đến khi có được mô hình hệ thống, database, testcase và diagram khả dụng để triển khai.

---

## 13. Kết luận

SmartSpec là một hệ thống AI-powered software specification platform, giúp tự động hóa quy trình chuyển từ yêu cầu nghiệp vụ thô sang các sản phẩm kỹ thuật có cấu trúc. Dự án không chỉ dừng ở việc “gọi LLM”, mà xây dựng một pipeline hoàn chỉnh bao gồm:
- đầu vào đa dạng
- orchestrator nghiệp vụ
- sinh usecase/database/UML/testcase
- validation
- retry
- realtime tracking
- versioning

Đây là một nền tảng phù hợp cho việc tăng tốc khâu phân tích và thiết kế hệ thống, đồng thời giảm rủi ro do thiếu sót nghiệp vụ và lỗi trong giai đoạn đầu dự án.

---

## 14. Hướng dẫn chạy dự án

Chạy các lệnh sau từ thư mục gốc repository. Cần Node.js 20+, Python 3.10+ và Docker Compose.

### 1. Khởi động MongoDB và Redis
```bash
docker compose up
```

### 2. Cấu hình và chạy backend
```bash
cd backend
npm ci
cp .env.example .env
# Điền OAuth credentials và thay các JWT placeholder trong .env
npm run dev
```

### 3. Cấu hình và chạy frontend
```bash
# Mở terminal mới tại thư mục gốc repository
cd frontend
npm ci
cp .env.example .env
# Điền VITE_GOOGLE_CLIENT_ID nếu dùng Google sign-in
npm run dev
```

Mở `http://localhost:5173`. Xử lý Audio/OCR cần thêm Python dependencies trong `backend/requirements.txt`, FFmpeg và Tesseract. Hướng dẫn đầy đủ: [docs/08-setup-and-deployment.md](docs/08-setup-and-deployment.md).

---

## 15. Mục tiêu phát triển tiếp theo

- Tăng độ chính xác của AI output bằng cách thêm schema validation mạnh hơn
- Hỗ trợ nhiều loại model và provider hơn
- Bổ sung export PDF/Markdown/Excel
- Cho phép chỉnh sửa thủ công các artifact sau khi AI sinh
- Tích hợp CI/CD cho validation và automated testing
- Thêm dashboard phân tích chất lượng AI output

---

## 16. Tóm tắt ngắn

SmartSpec là platform sinh tự động requirements-to-implementation artifacts với AI, tối ưu cho việc phân tích hệ thống và kiểm thử từ đầu. Nó kết hợp:
- AI generation
- structured output
- validation
- versioning
- realtime collaboration

để tạo ra một hệ thống hỗ trợ công việc thiết kế phần mềm nhanh, nhất quán và đáng tin cậy hơn.
