// Nhãn tiếng Việt cho hành động / đối tượng trong nhật ký hoạt động.
export const ACTION_LABELS = {
  create_input: 'Thêm đầu vào', update_input: 'Sửa đầu vào', delete_input: 'Xoá đầu vào',
  generate_output: 'Tạo kết quả', update_output: 'Sửa kết quả', delete_output: 'Xoá kết quả', export_data: 'Xuất dữ liệu',
  create_version: 'Tạo phiên bản', update_version: 'Cập nhật phiên bản', delete_version: 'Xoá phiên bản', rollback: 'Quay lui phiên bản',
  create_project: 'Tạo dự án', update_project: 'Cập nhật dự án', delete_project: 'Xoá dự án', restore_project: 'Khôi phục dự án',
  create_user: 'Tạo người dùng', update_user: 'Cập nhật người dùng', failed_login: 'Đăng nhập thất bại', login: 'Đăng nhập', logout: 'Đăng xuất',
  performance: 'Hiệu năng', deploy: 'Triển khai', startup: 'Khởi động',
  generate_data: 'Tạo dữ liệu', update_data: 'Cập nhật dữ liệu', delete_data: 'Xoá dữ liệu', resolve_conflict: 'Xử lý xung đột',
  invite_member: 'Mời thành viên', accept_invite: 'Chấp nhận lời mời', reject_invite: 'Từ chối lời mời', cancel_invite: 'Huỷ lời mời',
  remove_member: 'Gỡ thành viên', leave_project: 'Rời dự án', change_member_role: 'Đổi vai trò thành viên',
  create_table: 'Tạo bảng', update_table: 'Sửa bảng', delete_table: 'Xoá bảng', create_column: 'Thêm cột', update_column: 'Sửa cột', delete_column: 'Xoá cột',
  create_relation: 'Tạo quan hệ', update_relation: 'Sửa quan hệ', delete_relation: 'Xoá quan hệ',
}
export const TARGET_LABELS = {
  testcases: 'Test case', databases: 'Cơ sở dữ liệu', usecase_diagrams: 'Sơ đồ use case', sequence_diagrams: 'Sơ đồ tuần tự', activity_diagrams: 'Sơ đồ hoạt động',
  requirement_model: 'Mô hình yêu cầu', inputs: 'Đầu vào', input: 'Đầu vào', versions: 'Phiên bản', version: 'Phiên bản', projects: 'Dự án', project: 'Dự án',
  system: 'Hệ thống', user: 'Người dùng', member: 'Thành viên', output: 'Kết quả', requirement: 'Yêu cầu', usecases: 'Use case', diagram: 'Sơ đồ', table: 'Bảng',
}
const plain = (s) => String(s || '').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
export const actionLabel = (a) => ACTION_LABELS[a] || plain(a)
export const targetLabel = (t) => TARGET_LABELS[t] || TARGET_LABELS[String(t || '').toLowerCase()] || plain(t)
