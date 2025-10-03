# Luồng Tương Tác của Khách (Guest Workflow)

Khách là những người dùng chưa đăng nhập vào hệ thống. Họ có quyền truy cập hạn chế, chủ yếu tập trung vào việc khám phá nội dung và các tính năng công khai.

## 1. Đăng ký và Đăng nhập

Đây là luồng quan trọng nhất để chuyển đổi một khách thành người dùng đã đăng ký.

### a. Đăng ký tài khoản mới
- **Mục tiêu:** Cho phép người dùng tạo tài khoản mới.
- **Endpoint:** `POST /api/auth/register`
- **Các bước:**
  1. Người dùng truy cập trang đăng ký.
  2. Họ điền vào biểu mẫu với các thông tin: `email`, `username`, `password`.
  3. Hệ thống xác thực thông tin (email và username chưa tồn tại, mật khẩu đủ mạnh).
  4. Nếu hợp lệ, hệ thống tạo tài khoản mới và trả về thông tin người dùng cùng với `accessToken` và `refreshToken`.
  5. Người dùng được tự động đăng nhập và chuyển hướng đến trang chính.

### b. Đăng nhập
- **Mục tiêu:** Cho phép người dùng hiện tại truy cập vào tài khoản của họ.
- **Endpoint:** `POST /api/auth/login`
- **Các bước:**
  1. Người dùng truy cập trang đăng nhập.
  2. Họ nhập `identifier` (có thể là email hoặc username) và `password`.
  3. Hệ thống xác thực thông tin đăng nhập.
  4. Nếu thành công, trả về thông tin người dùng và token.
  5. Người dùng được chuyển hướng đến trang chính với trạng thái đã đăng nhập.

### c. Đăng nhập qua Mạng xã hội (OAuth)
- **Mục tiêu:** Cung cấp phương thức đăng nhập tiện lợi qua Google, GitHub, Facebook.
- **Endpoints:**
  - `GET /api/auth/google`
  - `GET /api/auth/github`
  - `GET /api/auth/facebook`
- **Các bước:**
  1. Người dùng chọn một nhà cung cấp (ví dụ: Google).
  2. Họ được chuyển hướng đến trang xác thực của nhà cung cấp đó.
  3. Sau khi xác thực thành công, họ được chuyển hướng trở lại ứng dụng (`callback URL`).
  4. Hệ thống nhận thông tin người dùng từ nhà cung cấp, tạo tài khoản mới (nếu chưa tồn tại) hoặc đăng nhập cho người dùng hiện tại.
  5. Trả về token và thông tin người dùng.

### d. Quên mật khẩu
- **Mục tiêu:** Giúp người dùng lấy lại quyền truy cập vào tài khoản khi họ quên mật khẩu.
- **Endpoints:**
  - `POST /api/auth/forgot-password`
  - `GET /api/auth/validate-reset-token/:token`
  - `POST /api/auth/reset-password`
- **Các bước:**
  1. Người dùng nhấp vào liên kết "Quên mật khẩu".
  2. Họ nhập địa chỉ email của mình.
  3. Hệ thống gửi một email chứa liên kết đặt lại mật khẩu.
  4. Người dùng nhấp vào liên kết, được đưa đến trang đặt lại mật khẩu. Giao diện người dùng sẽ gọi `GET /api/auth/validate-reset-token/:token` để đảm bảo token hợp lệ trước khi hiển thị biểu mẫu.
  5. Họ nhập mật khẩu mới.
  6. Mật khẩu được cập nhật thành công, và người dùng có thể đăng nhập bằng mật khẩu mới.

---
*Ghi chú kỹ thuật:* Hệ thống cũng cung cấp endpoint `POST /api/auth/validate` để client có thể kiểm tra tính hợp lệ của một `accessToken` bất kỳ mà không cần thực hiện một yêu cầu được bảo vệ.

## 2. Khám phá Nội dung

Khách có thể duyệt xem nội dung công khai trên nền tảng.

- **Mục tiêu:** Cho phép người dùng xem và tìm kiếm nội dung mà không cần tài khoản.
- **Endpoints:**
  - `GET /api/content/articles`, `GET /api/content/videos`, `GET /api/content/documents`
  - `GET /api/content/articles/:id`, `GET /api/content/videos/:id`
  - `GET /api/content/feed/explore`, `GET /api/content/feed/trending`
  - `GET /api/recommendations/trending`
- **Các bước:**
  1. Người dùng truy cập trang chủ hoặc các trang danh mục.
  2. Họ có thể xem danh sách các nội dung nổi bật, mới nhất hoặc thịnh hành.
  3. Họ có thể sử dụng thanh tìm kiếm để tìm nội dung theo từ khóa.
  4. Nhấp vào một nội dung để xem chi tiết (đọc bài viết, xem video).
  5. Đối với video, họ có thể stream trực tiếp (`GET /api/content/videos/:id/stream`).

## 3. Xem Thông tin Người dùng khác

Khách có thể xem hồ sơ công khai của những người dùng khác.

- **Mục tiêu:** Cho phép khám phá cộng đồng và những người tạo nội dung.
- **Endpoints:**
  - `GET /api/users/profile/:id`
  - `GET /api/users/:id/followers`
  - `GET /api/users/:id/following`
  - `GET /api/users/:id/channels`
- **Các bước:**
  1. Người dùng nhấp vào tên hoặc ảnh đại diện của một tác giả từ một bài viết hoặc video.
  2. Họ được chuyển đến trang hồ sơ công khai của người dùng đó.
  3. Tại đây, họ có thể xem thông tin cơ bản, danh sách các kênh, số lượng người theo dõi và đang theo dõi.
  4. Họ có thể xem danh sách nội dung mà người dùng đó đã tạo.
