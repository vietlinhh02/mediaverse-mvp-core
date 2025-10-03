# Luồng Tương Tác của Người dùng đã đăng ký (Registered User Workflow)

Sau khi đăng nhập, người dùng có quyền truy cập vào nhiều tính năng tương tác và cá nhân hóa hơn. Luồng này xây dựng dựa trên các khả năng của khách.

## 1. Quản lý Tài khoản Cá nhân

Người dùng có toàn quyền kiểm soát thông tin cá nhân và cài đặt tài khoản của mình.

### a. Xem và Cập nhật Hồ sơ
- **Mục tiêu:** Cho phép người dùng chỉnh sửa thông tin cá nhân của họ.
- **Endpoints:**
  - `GET /api/auth/me`
  - `PUT /api/users/profile`
  - `POST /api/users/upload-avatar`
- **Các bước:**
  1. Người dùng truy cập trang "Hồ sơ của tôi" hoặc "Cài đặt".
  2. Hệ thống hiển thị thông tin hiện tại bằng cách gọi `GET /api/auth/me`.
  3. Người dùng chỉnh sửa các trường như tên hiển thị, tiểu sử, v.v.
  4. Khi lưu, ứng dụng gửi yêu cầu `PUT /api/users/profile` với dữ liệu mới.
  5. Người dùng cũng có thể tải lên ảnh đại diện mới qua `POST /api/users/upload-avatar`.

### b. Thay đổi Mật khẩu
- **Mục tiêu:** Cho phép người dùng thay đổi mật khẩu hiện tại.
- **Endpoint:** `POST /api/auth/change-password`
- **Các bước:**
  1. Người dùng vào phần "Bảo mật" trong cài đặt.
  2. Họ nhập mật khẩu hiện tại và mật khẩu mới (cùng với xác nhận).
  3. Hệ thống xác thực mật khẩu hiện tại và cập nhật mật khẩu mới.

### c. Đăng xuất
- **Mục tiêu:** Cho phép người dùng kết thúc phiên làm việc một cách an toàn.
- **Endpoint:** `POST /api/auth/logout`
- **Các bước:**
  1. Người dùng nhấp vào nút "Đăng xuất".
  2. Token của người dùng (cả access và refresh token) sẽ bị vô hiệu hóa ở phía server.
  3. Người dùng được chuyển hướng về trang chủ với trạng thái là khách.

## 2. Tương tác Xã hội và Cộng đồng

Đây là cốt lõi của trải nghiệm người dùng, cho phép họ tương tác với nội dung và những người dùng khác.

### a. Theo dõi (Follow)
- **Mục tiêu:** Cho phép người dùng theo dõi những người tạo nội dung mà họ yêu thích.
- **Endpoints:**
  - `POST /api/users/:id/follow`
  - `DELETE /api/users/:id/unfollow`
  - `GET /api/users/:id/follow-status`
- **Các bước:**
  1. Khi xem hồ sơ của người dùng khác, giao diện sẽ gọi `GET /api/users/:id/follow-status` để hiển thị nút "Theo dõi" hoặc "Bỏ theo dõi" một cách chính xác.
  2. Người dùng nhấp vào nút.
  3. Một yêu cầu `POST` (để theo dõi) hoặc `DELETE` (để bỏ theo dõi) được gửi đi.
  4. Trạng thái của nút được cập nhật tương ứng.

### b. Thích (Like) và Bình luận (Comment)
- **Mục tiêu:** Cho phép người dùng bày tỏ cảm xúc và tham gia thảo luận về nội dung.
- **Endpoints:**
  - `POST /api/content/:id/like`, `DELETE /api/content/:id/like`
  - `GET /api/content/:id/like-status`
  - `POST /api/content/:id/comments`
  - `PUT /api/comments/:commentId`, `DELETE /api/comments/:commentId`
- **Các bước:**
  1. **Thích:** Dưới mỗi nội dung, giao diện gọi `GET /api/content/:id/like-status` để xác định trạng thái ban đầu của nút "Thích". Nhấp vào đó sẽ gửi yêu cầu `POST`, và nút sẽ thay đổi trạng thái. Nhấp lại sẽ gửi `DELETE`.
  2. **Bình luận:** Người dùng nhập bình luận vào ô văn bản và gửi. Một yêu cầu `POST` được gửi để tạo bình luận mới.
  3. **Quản lý bình luận:** Người dùng có thể sửa (`PUT`) hoặc xóa (`DELETE`) các bình luận của chính mình.

## 3. Quản lý Kênh (Channels)

Người dùng có thể tạo các kênh để tổ chức nội dung của mình.

- **Mục tiêu:** Cung cấp một không gian để người dùng nhóm các nội dung liên quan.
- **Endpoints:**
  - `POST /api/users/channels`
  - `PUT /api/users/channels/:id`
  - `DELETE /api/users/channels/:id`
- **Các bước:**
  1. Người dùng truy cập trang quản lý kênh của họ.
  2. Họ có thể tạo một kênh mới bằng cách cung cấp tên và mô tả.
  3. Họ có thể chỉnh sửa thông tin của các kênh hiện có.
  4. Họ cũng có thể xóa các kênh không còn cần thiết.

## 4. Cá nhân hóa và Đề xuất

Hệ thống học hỏi từ hành vi của người dùng để cung cấp trải nghiệm phù hợp hơn.

- **Mục tiêu:** Cung cấp nội dung phù hợp và thú vị cho từng người dùng.
- **Endpoints:**
  - `GET /api/recommendations/feed`
  - `GET /api/users/preferences`, `PUT /api/users/preferences`, `PATCH /api/users/preferences/:section`, `DELETE /api/users/preferences`
  - `POST /api/recommendations/track-interaction`
- **Các bước:**
  1. Trang "Dành cho bạn" (`/feed/personalized`) sẽ hiển thị nội dung được đề xuất dựa trên lịch sử xem, lượt thích và các tương tác khác.
  2. Người dùng có thể vào cài đặt để quản lý sở thích của mình: cập nhật toàn bộ (`PUT`), cập nhật một phần (`PATCH`), hoặc xóa toàn bộ (`DELETE`).
  3. Mỗi khi người dùng xem, thích, hoặc chia sẻ một nội dung, một sự kiện sẽ được gửi đến `POST /api/recommendations/track-interaction` để cập nhật mô hình đề xuất.

## 5. Các Tính năng Cộng đồng

Ngoài các tương tác cơ bản, người dùng có thể tham gia sâu hơn vào cộng đồng.

### a. Bài đăng Cộng đồng (Community Posts)
- **Mục tiêu:** Cho phép người dùng (thường là người tạo nội dung) đăng các cập nhật ngắn, thông báo, hoặc cuộc thăm dò ý kiến cho những người theo dõi họ.
- **Endpoints:**
    - `POST /api/content/community/posts`
    - `GET /api/content/community/posts`
- **Các bước:**
    1. Người tạo nội dung vào tab "Cộng đồng" trên kênh của mình và tạo một bài đăng mới.
    2. Bài đăng này sẽ xuất hiện trên feed của những người theo dõi họ.
    3. Người dùng có thể xem và tương tác (thích, bình luận) với các bài đăng này.

### b. Khám phá qua Hashtag
- **Mục tiêu:** Cho phép người dùng tìm kiếm và khám phá nội dung dựa trên các chủ đề chung thông qua hashtags.
- **Endpoints:**
    - `GET /api/content/hashtags`
    - `GET /api/content/hashtags/:hashtag/content`
- **Các bước:**
    1. Người dùng có thể thấy các hashtag thịnh hành (`GET /api/content/hashtags`).
    2. Khi nhấp vào một hashtag trong mô tả nội dung hoặc từ danh sách thịnh hành, họ sẽ được đưa đến một trang hiển thị tất cả nội dung được gắn thẻ đó (`GET /api/content/hashtags/:hashtag/content`).

## 6. Báo cáo Vi phạm

Người dùng có thể giúp duy trì một môi trường an toàn bằng cách báo cáo nội dung không phù hợp.

- **Mục tiêu:** Cho phép người dùng báo cáo nội dung vi phạm tiêu chuẩn cộng đồng.
- **Endpoint:** `POST /api/moderation/reports`
- **Các bước:**
  1. Bên cạnh nội dung, có một tùy chọn "Báo cáo".
  2. Khi nhấp vào, một biểu mẫu sẽ hiện ra yêu cầu người dùng chọn lý do báo cáo (ví dụ: spam, quấy rối, bản quyền).
  3. Sau khi gửi, báo cáo sẽ được chuyển đến đội ngũ kiểm duyệt.
