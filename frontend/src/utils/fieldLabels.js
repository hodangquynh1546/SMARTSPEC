// Nhãn tiếng Việt cho tên trường dữ liệu (dùng khi hiển thị thay đổi/chi tiết đối tượng).
const LABELS = {
  id: 'Mã', _id: 'Mã', project_id: 'Mã dự án', version_id: 'Mã phiên bản', lineage_id: 'Mã dòng dõi', implementation: 'Triển khai', type: 'Loại', level: 'Cấp độ', status: 'Trạng thái',
  name: 'Tên', title: 'Tiêu đề', description: 'Mô tả', actor: 'Tác nhân', goal: 'Mục tiêu', business_reason: 'Lý do nghiệp vụ', context: 'Ngữ cảnh', module: 'Phân hệ', scope: 'Phạm vi', system: 'Hệ thống',
  priority: 'Độ ưu tiên', frequency: 'Tần suất', trigger: 'Kích hoạt', event: 'Sự kiện', source: 'Nguồn', preconditions: 'Điều kiện tiên quyết', main_flow: 'Luồng chính', step: 'Bước', action: 'Hành động',
  inputs: 'Đầu vào', outputs: 'Đầu ra', rules_applied: 'Quy tắc áp dụng', expected_result: 'Kết quả mong đợi', alternative_flows: 'Luồng thay thế', exceptions: 'Ngoại lệ', postconditions: 'Điều kiện sau',
  rules: 'Quy tắc', non_functional_constraints: 'Ràng buộc phi chức năng', stakeholders: 'Các bên liên quan', audit: 'Kiểm toán', created_by: 'Người tạo', created_at: 'Tạo lúc', updated_by: 'Người cập nhật',
  updated_at: 'Cập nhật lúc', condition: 'Điều kiện', at_step: 'Tại bước', system_response: 'Phản hồi hệ thống', end_state: 'Trạng thái kết thúc', tasks: 'Các bước', role: 'Vai trò',
  tables: 'Bảng', columns: 'Cột', relationships: 'Quan hệ', primary_key: 'Khoá chính', is_primary_key: 'Là khoá chính', is_foreign_key: 'Là khoá ngoại', nullable: 'Cho phép rỗng', unique: 'Duy nhất',
  length: 'Độ dài', default: 'Mặc định', references: 'Tham chiếu', test_type: 'Loại kiểm thử', steps: 'Các bước', expected_results: 'Kết quả mong đợi', test_data: 'Dữ liệu kiểm thử', tags: 'Thẻ',
  source_requirement_ids: 'Mã yêu cầu nguồn', database_tables: 'Bảng dữ liệu', position: 'Vị trí', lifelines: 'Đường sống', messages: 'Thông điệp', fragments: 'Khối kết hợp', nodes: 'Nút', edges: 'Cạnh', lanes: 'Làn',
  actors: 'Tác nhân', usecases: 'Use case', associations: 'Liên kết', language: 'Ngôn ngữ', notes: 'Ghi chú', content: 'Nội dung', version_number: 'Số phiên bản', details: 'Chi tiết',
}
export function fieldLabel(key) {
  const k = String(key)
  if (LABELS[k]) return LABELS[k]
  const plain = k.replace(/_/g, ' ')
  return plain.charAt(0).toUpperCase() + plain.slice(1)
}
