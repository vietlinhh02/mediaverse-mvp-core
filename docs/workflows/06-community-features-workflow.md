# Luồng Tương tác Cộng đồng (Community Features Workflow)

Tài liệu này mô tả các luồng tương tác tập trung vào việc xây dựng cộng đồng trên nền tảng, cho phép người dùng kết nối và khám phá nội dung theo chủ đề.

## 1. Bài đăng Cộng đồng (Community Posts)

Tính năng này cho phép người tạo nội dung giao tiếp trực tiếp với cộng đồng của họ thông qua các cập nhật ngắn gọn.

- **Mục tiêu:** Cung cấp một kênh giao tiếp nhanh chóng và trực tiếp giữa người tạo nội dung và những người theo dõi họ, tương tự như tab "Community" trên YouTube.
- **Endpoints:**
  - `POST /api/content/community/posts`: Tạo một bài đăng cộng đồng mới.
  - `GET /api/content/community/posts`: Lấy danh sách các bài đăng cộng đồng (ví dụ: cho một kênh cụ thể hoặc cho feed của người dùng).
- **Luồng Tương tác:**
  1. **Tạo bài đăng (Creator):**
     - Người tạo nội dung điều hướng đến trang quản lý kênh của họ và chọn tab "Cộng đồng".
     - Họ soạn một tin nhắn văn bản, có thể đính kèm hình ảnh hoặc tạo một cuộc thăm dò ý kiến (poll).
     - Khi nhấn "Đăng", một yêu cầu `POST` được gửi đến server.
  2. **Tiêu thụ (User):**
     - Các bài đăng mới từ những người tạo nội dung mà người dùng theo dõi sẽ xuất hiện trên trang feed chính của họ.
     - Người dùng cũng có thể truy cập trực tiếp vào tab "Cộng đồng" của một kênh để xem tất cả các bài đăng.
     - Người dùng có thể tương tác với bài đăng thông qua lượt thích và bình luận, tương tự như các loại nội dung khác.

## 2. Khám phá qua Hashtag

Tính năng này giúp người dùng khám phá nội dung từ nhiều người tạo khác nhau dựa trên các chủ đề và xu hướng chung.

- **Mục tiêu:** Cải thiện khả năng khám phá nội dung và kết nối các mẩu nội dung có liên quan với nhau.
- **Endpoints:**
  - `GET /api/content/hashtags`: Lấy danh sách các hashtag đang thịnh hành.
  - `GET /api/content/hashtags/:hashtag/content`: Lấy tất cả nội dung được gắn một hashtag cụ thể.
- **Luồng Tương tác:**
  1. **Gắn thẻ (Creator):**
     - Khi tạo hoặc chỉnh sửa bất kỳ loại nội dung nào (bài viết, video), người tạo nội dung có thể thêm các `#hashtag` vào phần mô tả hoặc một trường riêng.
  2. **Khám phá (User):**
     - Người dùng có thể thấy một mục "Xu hướng" hoặc "Chủ đề nổi bật" trên trang khám phá, được cung cấp bởi `GET /api/content/hashtags`.
     - Khi người dùng nhấp vào một hashtag (từ danh sách xu hướng hoặc từ một bài đăng), họ sẽ được chuyển đến một trang kết quả tìm kiếm chuyên dụng.
     - Trang này sử dụng `GET /api/content/hashtags/:hashtag/content` để hiển thị một feed gồm tất cả các nội dung (từ mọi người tạo) có chứa hashtag đó, thường được sắp xếp theo mức độ mới nhất hoặc phổ biến nhất.
