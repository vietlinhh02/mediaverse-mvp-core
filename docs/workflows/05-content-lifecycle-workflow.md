# Luồng Vòng đời Nội dung (End-to-End Content Lifecycle)

Tài liệu này mô tả chi tiết toàn bộ hành trình của một mẩu nội dung (ví dụ: video) trên nền tảng, từ khi được tạo ra cho đến khi được người dùng cuối tiêu thụ, tương tác và có thể bị kiểm duyệt.

Luồng này cắt ngang qua nhiều vai trò người dùng (Người tạo, Người dùng, Quản trị viên) và các hệ thống backend.

## Giai đoạn 1: Sáng tạo và Tải lên (Creation & Upload)

- **Người thực hiện:** Người tạo Nội dung (Creator)
- **Các bước:**
  1. **Chuẩn bị:** Creator chuẩn bị tệp nội dung (ví dụ: quay và chỉnh sửa video).
  2. **Giao diện Tải lên:** Creator truy cập vào trang tải lên của nền tảng.
  3. **Điền Metadata:** Creator điền các thông tin cần thiết:
     - Tiêu đề, mô tả, thẻ (tags).
     - Chọn danh mục, kênh (channel).
     - Thiết lập quyền riêng tư (Công khai, Riêng tư, Không liệt kê).
     - Tải lên ảnh thumbnail tùy chỉnh.
  4. **Tải tệp:** Creator chọn tệp và bắt đầu quá trình tải lên.
- **Endpoint chính:** `POST /api/content/videos`
- **Kết quả:** Tệp video gốc và metadata được lưu trữ tạm thời trên server. Một bản ghi nội dung mới được tạo trong cơ sở dữ liệu với trạng thái "Đang xử lý" (Processing).

## Giai đoạn 2: Xử lý và Chuẩn bị (Processing & Preparation)

- **Người thực hiện:** Hệ thống Backend
- **Các bước:**
  1. **Kích hoạt Job:** Việc tải lên thành công sẽ kích hoạt một công việc (job) trong hàng đợi xử lý (processing queue, ví dụ: RabbitMQ, BullMQ).
  2. **Transcoding:** Worker xử lý job lấy tệp video gốc và chuyển mã (transcode) nó thành nhiều định dạng và độ phân giải khác nhau (ví dụ: 1080p, 720p, 480p) để tối ưu cho adaptive bitrate streaming.
  3. **Tạo Thumbnail:** Hệ thống tự động trích xuất một vài khung hình từ video để làm thumbnail mặc định.
  4. **Trích xuất Dữ liệu:** Hệ thống có thể thực hiện các tác vụ khác như:
     - Trích xuất âm thanh.
     - Tự động tạo phụ đề (nếu có tính năng này).
     - Phân tích nội dung để phát hiện các yếu tố vi phạm bản quyền hoặc tiêu chuẩn cộng đồng.
  5. **Lưu trữ:** Các tệp đã xử lý (video segments, playlists, thumbnails) được chuyển đến nơi lưu trữ lâu dài (ví dụ: AWS S3, Google Cloud Storage).
- **Endpoint liên quan:** `GET /api/media/jobs/:id` (để Creator theo dõi tiến trình)
- **Kết quả:** Nội dung đã sẵn sàng để được phân phối. Trạng thái trong cơ sở dữ liệu được cập nhật thành "Riêng tư" (Private) hoặc "Chưa xuất bản" (Unpublished).

## Giai đoạn 3: Xuất bản và Phân phối (Publication & Distribution)

- **Người thực hiện:** Người tạo Nội dung & Hệ thống
- **Các bước:**
  1. **Xuất bản:** Creator thay đổi trạng thái của nội dung thành "Công khai" (Published).
  2. **Lập chỉ mục (Indexing):** Hệ thống lập chỉ mục nội dung mới vào công cụ tìm kiếm (ví dụ: Elasticsearch) để người dùng có thể tìm thấy.
  3. **Cập nhật Feeds:** Nội dung mới được đưa vào các feed liên quan (feed của người theo dõi, feed danh mục, v.v.).
  4. **Thông báo:** Hệ thống có thể gửi thông báo (qua email, push notification) cho những người theo dõi Creator.
- **Endpoint chính:** `POST /api/content/videos/:id/publish`
- **Kết quả:** Nội dung hiện có thể được khám phá và xem bởi người dùng công khai.

## Giai đoạn 4: Tiêu thụ và Tương tác (Consumption & Interaction)

- **Người thực hiện:** Người dùng (Guest & Registered User)
- **Các bước:**
  1. **Khám phá:** Người dùng tìm thấy nội dung thông qua trang chủ, tìm kiếm, đề xuất, hoặc feed cá nhân.
  2. **Xem nội dung:** Người dùng nhấp vào để xem. Trình phát video sử dụng adaptive bitrate streaming để chọn chất lượng phù hợp nhất.
     - **Endpoint:** `GET /api/content/videos/:id/stream`
  3. **Tương tác:** Người dùng có thể:
     - **Thích/Bỏ thích:** `POST/DELETE /api/content/:id/like`
     - **Bình luận:** `POST /api/content/:id/comments`
     - **Chia sẻ:** `POST /api/content/:id/share`
  4. **Theo dõi:** Nếu thích nội dung, người dùng có thể theo dõi Creator.
     - **Endpoint:** `POST /api/users/:id/follow`
- **Kết quả:** Các tương tác được ghi lại, cung cấp dữ liệu cho hệ thống đề xuất và phân tích.

## Giai đoạn 5: Kiểm duyệt và Bảo trì (Moderation & Maintenance)

- **Người thực hiện:** Người dùng & Quản trị viên
- **Các bước:**
  1. **Báo cáo:** Một người dùng thấy nội dung vi phạm và gửi báo cáo.
     - **Endpoint:** `POST /api/moderation/reports`
  2. **Xem xét:** Báo cáo xuất hiện trên dashboard của Moderator. Họ xem xét nội dung và bằng chứng.
     - **Endpoint:** `GET /api/moderation/admin/reports`
  3. **Hành động:** Moderator đưa ra quyết định (gỡ bỏ, cảnh cáo, cấm người dùng).
     - **Endpoint:** `POST /api/moderation/admin/reports/:id/action`
  4. **Vòng đời kết thúc (có thể):** Nếu nội dung bị gỡ bỏ, nó sẽ không còn truy cập được công khai nữa. Dữ liệu có thể được lưu trữ (archived) hoặc xóa vĩnh viễn tùy theo chính sách.
- **Kết quả:** Nền tảng được giữ an toàn và tuân thủ các quy tắc.
