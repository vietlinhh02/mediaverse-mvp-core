# Luồng Tương Tác của Quản trị viên/Người kiểm duyệt (Admin/Moderator Workflow)

Quản trị viên (Admin) và Người kiểm duyệt (Moderator) có quyền truy cập vào các công cụ mạnh mẽ để quản lý nền tảng, đảm bảo an toàn và tuân thủ các quy tắc cộng đồng. Luồng công việc của họ diễn ra trong một khu vực quản trị riêng biệt.

## 1. Bảng điều khiển Kiểm duyệt (Moderation Dashboard)

Đây là trung tâm chỉ huy cho các hoạt động kiểm duyệt.

- **Mục tiêu:** Cung cấp một cái nhìn tổng quan về tình trạng kiểm duyệt của nền tảng.
- **Endpoint:** `GET /api/moderation/admin/dashboard`
- **Các bước:**
  1. Admin/Moderator đăng nhập bằng tài khoản có quyền quản trị.
  2. Họ truy cập vào khu vực "Admin Panel" hoặc "Moderation".
  3. Bảng điều khiển hiển thị các số liệu thống kê quan trọng như:
     - Tổng số báo cáo đang chờ xử lý.
     - Số lượng báo cáo đã giải quyết.
     - Các nội dung bị báo cáo nhiều nhất.
     - Thời gian phản hồi trung bình.

## 2. Quản lý Báo cáo Vi phạm (Reports)

Đây là quy trình xử lý các báo cáo từ người dùng.

- **Mục tiêu:** Xem xét và đưa ra quyết định đối với các nội dung bị người dùng báo cáo.
- **Endpoints:**
  - `GET /api/moderation/admin/reports`
  - `POST /api/moderation/admin/reports/:id/action`
- **Các bước:**
  1. Từ bảng điều khiển, người kiểm duyệt vào danh sách các báo cáo.
  2. Họ có thể lọc và sắp xếp các báo cáo theo trạng thái (đang chờ, đã xử lý), mức độ ưu tiên, lý do báo cáo, v.v.
  3. Khi chọn một báo cáo, họ sẽ thấy chi tiết về nội dung bị báo cáo, người báo cáo, lý do, và lịch sử của nội dung/người tạo.
  4. Dựa trên thông tin, họ đưa ra quyết định thông qua endpoint `action`:
     - **Approve (Chấp thuận):** Báo cáo bị bác bỏ, nội dung được giữ lại.
     - **Remove (Gỡ bỏ):** Nội dung vi phạm và bị xóa khỏi nền tảng.
     - **Warn (Cảnh cáo):** Gửi một cảnh cáo đến người tạo nội dung.
     - **Ban (Cấm):** Cấm tài khoản của người tạo nội dung (tạm thời hoặc vĩnh viễn).
  5. Hành động được ghi lại trong nhật ký kiểm duyệt.

## 3. Quản lý Người dùng (User Moderation)

Admin có quyền trực tiếp quản lý tài khoản người dùng khi cần thiết.

- **Mục tiêu:** Thực thi các quy tắc cộng đồng bằng cách áp dụng các biện pháp xử lý đối với người dùng vi phạm.
- **Endpoints:**
  - `POST /api/moderation/admin/users/:id/ban`
  - `POST /api/moderation/admin/users/:id/unban`
  - `POST /api/moderation/admin/users/:id/warn`
  - `GET /api/moderation/admin/users/banned`
- **Các bước:**
  1. Admin tìm kiếm một người dùng cụ thể hoặc truy cập từ một báo cáo.
  2. Trên trang quản lý người dùng, Admin có các tùy chọn:
     - **Cấm (Ban):** Admin có thể cấm người dùng, chỉ định lý do và thời hạn (ví dụ: 7 ngày, 30 ngày, vĩnh viễn).
     - **Bỏ cấm (Unban):** Gỡ bỏ lệnh cấm trước thời hạn.
     - **Cảnh cáo (Warn):** Gửi một thông báo cảnh cáo chính thức đến người dùng về hành vi vi phạm.
  3. Admin có thể xem danh sách tất cả người dùng đang bị cấm.
