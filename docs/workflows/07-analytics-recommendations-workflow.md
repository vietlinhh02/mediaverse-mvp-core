# Luồng Phân tích & Đề xuất Nâng cao

Tài liệu này mô tả các luồng công việc liên quan đến các tính năng phân tích và đề xuất tự động, giúp nâng cao trải nghiệm cho cả người dùng và người tạo nội dung.

## 1. Báo cáo Phân tích Định kỳ

Tính năng này giúp người tạo nội dung tiết kiệm thời gian bằng cách tự động hóa việc thu thập và gửi dữ liệu phân tích.

- **Mục tiêu:** Cung cấp cho người tạo nội dung các báo cáo hiệu suất định kỳ (hàng tuần, hàng tháng) trực tiếp vào email của họ.
- **Endpoint:**
  - `POST /api/analytics/export/schedule`: Thiết lập hoặc cập nhật một lịch gửi báo cáo.
- **Luồng Tương tác:**
  1. **Thiết lập (Creator):**
     - Trong "Bảng điều khiển nhà sáng tạo", người dùng truy cập mục "Báo cáo".
     - Họ chọn tần suất (ví dụ: "hàng tuần vào thứ Hai"), định dạng (CSV, PDF), và các chỉ số họ muốn đưa vào báo cáo.
     - Khi lưu, một yêu cầu `POST` được gửi để tạo một cron job hoặc một tác vụ nền được lên lịch.
  2. **Thực thi (System):**
     - Hệ thống có một bộ lập lịch (scheduler) chạy định kỳ (ví dụ: mỗi giờ).
     - Bộ lập lịch kiểm tra xem có báo cáo nào cần được tạo và gửi hay không.
     - Nếu có, nó sẽ khởi tạo một job để thu thập dữ liệu, tạo tệp báo cáo, và gửi nó đến email của người tạo nội dung.

## 2. Email Tổng hợp (Digest) cho Người dùng

Đây là một công cụ mạnh mẽ để giữ chân người dùng và khuyến khích họ quay trở lại nền tảng.

- **Mục tiêu:** Tự động gửi email cho người dùng với một bản tóm tắt nội dung mới, thịnh hành, hoặc được cá nhân hóa mà họ có thể đã bỏ lỡ.
- **Endpoints:**
  - `GET /api/recommendations/digest/generate`: (Chủ yếu dùng nội bộ) Tạo dữ liệu cho một email tổng hợp.
  - `POST /api/recommendations/digest/send`: (Chủ yếu dùng nội bộ) Gửi email tổng hợp đến một người dùng.
- **Luồng Tương tác (Tự động):**
  1. **Lên lịch:** Hệ thống có một job được lên lịch chạy hàng tuần (ví dụ: vào cuối tuần).
  2. **Thu thập Dữ liệu:** Job này lặp qua danh sách người dùng đã chọn nhận email. Đối với mỗi người dùng, nó gọi logic nghiệp vụ tương tự `digest/generate` để lấy:
     - Các video/bài viết nổi bật từ các kênh họ theo dõi.
     - Nội dung thịnh hành trong các danh mục họ quan tâm.
     - Các đề xuất được cá nhân hóa.
  3. **Gửi Email:** Job sau đó sử dụng một dịch vụ email để gửi bản tin đã được cá nhân hóa cho từng người dùng.
- **Luồng Tương tác (Thủ công):**
  - Người dùng có thể có một nút trong phần cài đặt của họ, "Xem trước bản tin tuần này", để gọi `digest/generate` và xem nội dung sẽ được gửi.

## 3. Thống kê Khám phá Toàn cục

Tính năng này cung cấp một cái nhìn tổng quan về các xu hướng trên toàn bộ nền tảng.

- **Mục tiêu:** Cung cấp dữ liệu tổng hợp về những gì đang phổ biến trên nền tảng.
- **Endpoint:** `GET /api/recommendations/stats`
- **Luồng Tương tác:**
  - Dữ liệu từ endpoint này không nhất thiết phải hiển thị trực tiếp cho người dùng cuối. Nó có thể được sử dụng để:
    - Cung cấp năng lượng cho các mục "Thịnh hành" hoặc "Phổ biến" trên trang khám phá.
    - Hiển thị trên bảng điều khiển của quản trị viên để họ nắm bắt được tình hình hoạt động của nền tảng.
    - Cung cấp dữ liệu cho các thuật toán đề xuất khác.
