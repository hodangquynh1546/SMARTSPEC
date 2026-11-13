# 03. Pipeline Xử lý Dữ liệu Đa Nguồn (Multi-Source Ingestion Pipeline)

## 1. Tổng quan bài toán Đa Nguồn (Multi-Source Ingestion)

Trong các dự án phát triển phần mềm thực tế, yêu cầu của khách hàng và các bên liên quan thường không nằm ở một định dạng thống nhất mà phân mảnh ở nhiều dạng:
- **Biên bản ghi âm cuộc họp** (Audio: .mp3, .wav, .m4a) giữa BA và khách hàng.
- **Sơ đồ phác thảo trên bảng trắng hoặc bản thảo viết tay** được chụp lại (Images: .png, .jpg, .jpeg).
- **Tài liệu đặc tả nghiệp vụ dạng Word** (DOCX: .docx) chứa bảng biểu và danh sách gạch đầu dòng.
- **Tài liệu quy trình hiện tại dạng PDF** (PDF: .pdf) có thể là PDF văn bản số hóa hoặc scan từ bản cứng.
- **Văn bản trao đổi nhanh** (Raw Text) qua email hoặc chat.

SmartSpec xây dựng một pipeline chuyên dụng để tiếp nhận, tiền xử lý, khử nhiễu và bóc tách toàn bộ các nguồn dữ liệu này về dạng **văn bản chuẩn hóa có cấu trúc (Structured Normalized Text)** trước khi chuyển tiếp cho mô hình ngôn ngữ lớn (LLM).

```
[ Đa nguồn đầu vào ]
   ├─ File Âm thanh (.mp3, .wav) ──► SpeechToTextService (Whisper + Librosa)
   ├─ File Ảnh chụp (.png, .jpg)  ──► OcrService (EasyOCR + PyTesseract + OpenCV)
   ├─ File Word (.docx)           ──► ReadDocxService (python-docx)
   ├─ File PDF (.pdf)             ──► PdfService (PyMuPDF + Fallback OCR)
   └─ Văn bản thô (Text)          ──► TextService (String Normalization)
                                          │
                                          ▼
                               [ ExtractorService ]
                                 - Tính Hash SHA-256
                                 - Kiểm tra Cache / Bỏ qua file trùng
                                 - Gom nhóm kết quả
                                          │
                                          ▼
                               [ Raw Context Text ]
```

---

## 2. Chi tiết từng dịch vụ xử lý định dạng

### 2.1. Xử lý Âm thanh (Speech-to-Text Pipeline - `handle_audio`)
- **Tầng Node.js**: `features/handle_audio/domain/service.ts`
- **Tầng Python**: `features/handle_audio/pythonScript/process_STT.py`
- **Thư viện sử dụng**:
  - `openai-whisper` (Mô hình nhận dạng giọng nói tiên tiến đa ngôn ngữ)
  - `librosa` (Xử lý tín hiệu âm thanh kỹ thuật số)
  - `soundfile` (Đọc/ghi file âm thanh định dạng WAV/FLAC)
  - `noisereduce` (Giảm nhiễu quang phổ)
  - `torch` (Tính toán tensor GPU/CPU)

#### Quy trình xử lý:
1. **Tiền xử lý âm thanh (Advanced Preprocessing)**:
   - Tải file âm thanh bằng `librosa.load(sr=16000)` (resample về tần số chuẩn 16kHz).
   - Chuyển sang kênh Mono (1 channel).
   - Áp dụng **Band-pass filter** (lọc dải tần số người nói từ 80Hz - 8000Hz).
   - Áp dụng thuật toán **Spectral Gating Noise Reduction** (`noisereduce`) để triệt tiêu tiếng ồn nền (quạt, xe cộ, tiếng ồn phòng họp).
   - Chuẩn hóa biên độ âm thanh (Normalization về ngưỡng tối ưu để tránh vỡ âm).
2. **Nhận dạng giọng nói (Whisper Transcription)**:
   - Nạp mô hình Whisper (`base` hoặc `small`).
   - Tự động nhận diện ngôn ngữ nói (hỗ trợ tiếng Việt `vi` và tiếng Anh `en`).
   - Xuất transcript kèm timestamp của từng câu thoại.
3. **Định dạng kết quả trả về**:
   - Trả về JSON trên stdout chứa: `transcript`, `language`, `confidence_score`.

---

### 2.2. Xử lý Hình ảnh (Optical Character Recognition - `handle_image`)
- **Tầng Node.js**: `features/handle_image/domain/service.ts`
- **Tầng Python**: `features/handle_image/pythonScript/process_OCR.py`
- **Thư viện sử dụng**:
  - `easyocr` (Thư viện Deep Learning OCR hỗ trợ tiếng Việt rất tốt)
  - `pytesseract` (Tesseract OCR cho văn bản in tiêu chuẩn)
  - `opencv-python` (OpenCV xử lý ảnh kỹ thuật số)
  - `Pillow` (PIL)

#### Quy trình xử lý:
1. **Tiền xử lý ảnh (Computer Vision Preprocessing)**:
   - Chuyển ảnh về ảnh xám (Grayscale).
   - Tăng độ tương phản bằng thuật toán **CLAHE** (Contrast Limited Adaptive Histogram Equalization).
   - Khử nhiễu ảnh bằng Gaussian Blur hoặc Median Blur.
   - Nhị phân hóa thích nghi (Adaptive Thresholding / Otsu Thresholding).
   - Tự động xoay ảnh (Deskew) nếu góc chụp bị nghiêng.
2. **Bóc tách văn bản (Hybrid OCR Strategy)**:
   - Ưu tiên sử dụng `easyocr` với cấu hình nhận dạng ngôn ngữ `['vi', 'en']`.
   - Kết hợp `pytesseract` khi nhận dạng văn bản tiếng Anh dạng bảng biểu chuẩn.
   - Sắp xếp các đoạn text theo thứ tự đọc tự nhiên từ trên xuống dưới, từ trái sang phải dựa trên tọa độ bounding box.
3. **Định dạng kết quả**:
   - Trả về danh sách khối văn bản đã được ghép nối ngữ nghĩa.

---

### 2.3. Xử lý Tài liệu Word (.docx - `handle_docx`)
- **Tầng Node.js**: `features/handle_docx/domain/service.ts`
- **Tầng Python**: `features/handle_docx/pythonScript/process_docx.py`
- **Thư viện sử dụng**: `python-docx`

#### Quy trình xử lý:
1. Đọc cây tài liệu XML của định dạng OpenXML (.docx).
2. Phân loại cấu trúc:
   - **Headings** (Tiêu đề các cấp Heading 1, 2, 3) để xác định phân vùng nghiệp vụ.
   - **Paragraphs & Bullet points** để giữ nguyên cấu trúc phân cấp danh mục công việc.
   - **Tables** (Bảng biểu): Tự động trích xuất các hàng/cột và chuyển đổi sang dạng bảng Markdown hoặc JSON có cấu trúc.
3. Loại bỏ khoảng trắng thừa, ký tự điều khiển rác, trả về văn bản sạch.

---

### 2.4. Xử lý Tài liệu PDF (`handle_pdf`)
- **Tầng Node.js**: `features/handle_pdf/domain/service.ts`
- **Tầng Python**: `features/handle_pdf/pythonScript/process_pdf.py`
- **Thư viện sử dụng**: `PyMuPDF` (fitz), `Pillow`

#### Quy trình xử lý:
1. Sử dụng `fitz` mở file PDF để trích xuất text trực tiếp từ các text layer.
2. **Cơ chế Fallback thông minh (Hybrid PDF)**:
   - Nếu một trang PDF không có text layer (ví dụ: PDF được tạo bằng cách scan từ máy in/máy ảnh), hệ thống tự động render trang đó thành ảnh độ phân giải cao (DPI 300).
   - Gọi module OCR để nhận dạng chữ trên trang đó.
3. Giữ nguyên cấu trúc trang và tổng hợp thành nội dung hoàn chỉnh.

---

### 2.5. Xử lý Văn bản thô (`handle_text`)
- **Tầng Node.js**: `features/handle_text/domain/service.ts`
- Xử lý các đoạn văn bản do người dùng copy-paste hoặc nhập trực tiếp từ bàn phím.
- Loại bỏ các ký tự vô hình, format các dấu xuống dòng và chuẩn hóa Unicode (NFC).

---

## 3. Cơ chế Khử trùng lặp và Băm dữ liệu (`HashUtil`)

Để tối ưu hóa hiệu năng, tiết kiệm chi phí gọi LLM và tránh xử lý lặp lại các file không thay đổi:
1. **Tính băm SHA-256**:
   - Mỗi file khi được upload lên sẽ được tính mã băm nội dung:
     ```typescript
     const fileHash = HashUtil.calculateFileHash(file);
     ```
2. **Kiểm tra Input History**:
   - Hệ thống đối chiếu `file_hash` với danh sách các input đã lưu trong `inputs` collection của MongoDB cho Version hiện tại.
   - Nếu file đã tồn tại và đã được trích xuất thành công (`is_processed: true`), hệ thống sẽ bỏ qua bước OCR/STT tốn kém và tái sử dụng kết quả đã bóc tách.
3. **Incremental Mode Integration**:
   - Khi chạy ở chế độ **Incremental**, chỉ những file có nội dung mới (hash chưa tồn tại) mới được đưa vào phân tích để bổ sung hoặc kiểm tra xung đột với tập Use Case hiện hữu.
