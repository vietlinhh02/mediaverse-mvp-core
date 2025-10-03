# Luồng Tương Tác của Người tạo Nội dung (Creator Workflow)

Người tạo nội dung là những người dùng đã đăng ký và có thêm quyền tạo, quản lý và phân tích nội dung của riêng họ. Luồng này bao gồm tất cả các chức năng của người dùng đã đăng ký, cộng với các công cụ dành riêng cho việc sáng tạo.

## 1. Tạo và Tải lên Nội dung

Đây là chức năng cốt lõi của người tạo nội dung.

### a. Tạo Bài viết (Article)
- **Mục tiêu:** Cho phép người dùng viết và đăng tải các bài viết dạng văn bản.
- **Endpoint:** `POST /api/content/articles`
- **Các bước:**
  1. Người dùng truy cập trang "Tạo bài viết mới".
  2. Họ sử dụng một trình soạn thảo văn bản (rich-text editor) để viết tiêu đề, nội dung, thêm định dạng và có thể cả hình ảnh.
  3. Họ có thể lưu bài viết dưới dạng bản nháp hoặc xuất bản ngay lập tức.
  4. Khi gửi, dữ liệu bài viết được gửi đến server.

### b. Tải lên Video
- **Mục tiêu:** Cho phép người dùng tải lên và xử lý các tệp video.
- **Endpoint:** `POST /api/content/videos`
- **Các bước:**
  1. Người dùng chọn tệp video từ máy tính của họ.
  2. Họ điền các thông tin metadata như tiêu đề, mô tả, thẻ (tags), danh mục và chọn ảnh thumbnail.
  3. Tệp video được tải lên server.
  4. Sau khi tải lên hoàn tất, một công việc (job) xử lý video sẽ được đưa vào hàng đợi (queue) ở backend để chuyển mã (transcoding), tạo thumbnail, và chuẩn bị cho việc streaming.
  5. Người dùng có thể theo dõi trạng thái xử lý video.

### c. Tải lên Tài liệu (Document)
- **Mục tiêu:** Cho phép người dùng chia sẻ các tệp tài liệu (PDF, DOCX, v.v.).
- **Endpoint:** `POST /api/content/documents`
- **Các bước:**
  1. Tương tự như tải lên video, người dùng chọn tệp tài liệu.
  2. Họ cung cấp tiêu đề, mô tả và các thông tin liên quan khác.
  3. Tệp được tải lên và có thể được xử lý ở backend để tạo bản xem trước (preview).

## 2. Quản lý Nội dung

Người tạo nội dung có một bảng điều khiển để quản lý tất cả nội dung họ đã tạo.

### a. Chỉnh sửa và Cập nhật
- **Mục tiêu:** Cho phép người dùng sửa đổi nội dung đã đăng.
- **Endpoints:**
  - `PUT /api/content/articles/:id`
  - `PUT /api/content/videos/:id`
  - `PUT /api/content/documents/:id`
- **Các bước:**
  1. Từ trang quản lý nội dung, người dùng chọn "Chỉnh sửa" trên một mục nội dung.
  2. Họ được đưa đến trình soạn thảo/biểu mẫu tương ứng với dữ liệu đã có.
  3. Sau khi thực hiện các thay đổi, họ lưu lại và thông tin được cập nhật.

### b. Xuất bản và Hủy xuất bản
- **Mục tiêu:** Cho phép người dùng kiểm soát trạng thái hiển thị của nội dung.
- **Endpoints:**
  - `POST /api/content/articles/:id/publish`
  - `POST /api/content/videos/:id/publish`
- **Các bước:**
  1. Nội dung có thể ở trạng thái "Bản nháp" (Draft) hoặc "Đã xuất bản" (Published).
  2. Người dùng có thể chuyển đổi giữa các trạng thái này. Khi xuất bản, nội dung sẽ hiển thị công khai.

### c. Xóa Nội dung
- **Mục tiêu:** Cho phép người dùng xóa vĩnh viễn nội dung của họ.
- **Endpoint:** `DELETE /api/content/articles/:id`, `DELETE /api/content/videos/:id`, etc.
- **Các bước:**
  1. Người dùng chọn tùy chọn "Xóa".
  2. Một hộp thoại xác nhận sẽ xuất hiện để tránh xóa nhầm.
  3. Sau khi xác nhận, nội dung sẽ bị xóa khỏi hệ thống.

### d. Quản lý Nâng cao
- **Mục tiêu:** Cung cấp các công cụ mạnh mẽ để quản lý nội dung hiệu quả.
- **Endpoints:**
    - `PUT /api/content/videos/bulk-update`: Cập nhật hàng loạt nhiều video cùng lúc (ví dụ: thay đổi danh mục, trạng thái).
    - `POST /api/content/videos/:id/reprocess`: Yêu cầu hệ thống xử lý lại một video nếu có lỗi xảy ra trong quá trình transcoding ban đầu.

## 3. Phân tích và Thống kê (Analytics)

Người tạo nội dung có thể truy cập dữ liệu để hiểu hiệu suất nội dung và đối tượng khán giả của họ.

- **Mục tiêu:** Cung cấp thông tin chi tiết để giúp người tạo nội dung phát triển.
- **Endpoints:**
  - `GET /api/analytics/creator/dashboard`: Xem tổng quan (lượt xem, lượt thích, người theo dõi mới).
  - `GET /api/analytics/creator/content`: Xem hiệu suất chi tiết của từng bài viết/video.
  - `GET /api/analytics/creator/audience`: Xem thông tin nhân khẩu học của khán giả.
  - `GET /api/content/articles/:id/stats`, `GET /api/content/videos/:id/stats`: Lấy thống kê chi tiết cho một nội dung cụ thể.
  - `GET /api/content/articles/:id/related`: Lấy danh sách các bài viết liên quan.
  - `GET /api/analytics/export`: Xuất dữ liệu thô để phân tích sâu hơn.
  - `POST /api/analytics/export/schedule`: Lên lịch để hệ thống tự động gửi báo cáo định kỳ qua email.
- **Các bước:**
  1. Người dùng truy cập "Bảng điều khiển nhà sáng tạo" (Creator Dashboard).
  2. Họ có thể xem các biểu đồ và số liệu thống kê về hiệu suất nội dung của mình theo các khoảng thời gian khác nhau.
  3. Họ có thể xem danh sách nội dung được sắp xếp theo các chỉ số như lượt xem, lượt tương tác, v.v.
  4. Họ có thể lên lịch nhận báo cáo tự động hàng tuần hoặc hàng tháng.
