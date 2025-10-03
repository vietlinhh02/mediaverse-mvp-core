# Kế hoạch Nâng cấp Công cụ Tìm kiếm với Meilisearch

Tài liệu này đề xuất một kế hoạch chi tiết để thay thế công cụ tìm kiếm cơ bản hiện tại bằng Meilisearch, một giải pháp tìm kiếm mạnh mẽ, nhanh và dễ sử dụng.

## 1. Vấn đề Hiện tại

Công cụ tìm kiếm dựa trên truy vấn cơ sở dữ liệu truyền thống (ví dụ: `LIKE`) có nhiều hạn chế:
- Không xử lý được lỗi gõ phím (typos).
- Sắp xếp kết quả không theo độ liên quan.
- Khó khăn trong việc triển khai bộ lọc nâng cao.
- Hiệu suất kém khi dữ liệu lớn lên.

## 2. Giải pháp: Meilisearch

Meilisearch là một công cụ tìm kiếm mã nguồn mở, được xây dựng bằng Rust, nổi tiếng về tốc độ và sự đơn giản. Đây là lựa chọn lý tưởng để nâng cấp tính năng tìm kiếm mà không cần đến sự phức tạp của Elasticsearch.

## 3. Kế hoạch Triển khai

### Bước 1: Cài đặt Meilisearch
Chúng ta sẽ sử dụng Docker để việc cài đặt và quản lý trở nên đơn giản. Chỉ cần thêm một service mới vào tệp `docker-compose.yml` của bạn:

```yaml
services:
  # ... các services khác của bạn
  meilisearch:
    image: getmeili/meilisearch:latest
    container_name: meilisearch
    ports:
      - "7700:7700"
    volumes:
      - ./meili_data:/meili_data
    environment:
      - MEILI_MASTER_KEY=your_master_key_change_this # Thay đổi key này
      - MEILI_ENV=development
```
Sau đó, chỉ cần chạy `docker-compose up -d`.

### Bước 2: Đồng bộ hóa Dữ liệu (Indexing)
Đây là bước đưa dữ liệu từ cơ sở dữ liệu của bạn vào Meilisearch.

1.  **Tạo một `SearchService`:** Xây dựng một module hoặc service trong ứng dụng của bạn để giao tiếp với Meilisearch (sử dụng thư viện client chính thức của Meilisearch cho Node.js).
2.  **Viết Script Đồng bộ ban đầu:** Tạo một script riêng để đọc tất cả nội dung (bài viết, video, v.v.) từ cơ sở dữ liệu và đẩy chúng vào một "index" trong Meilisearch.
3.  **Duy trì Đồng bộ theo thời gian thực:** Sử dụng các hook của model trong ORM của bạn (ví dụ: `afterCreate`, `afterUpdate`, `afterDelete`) để tự động cập nhật index trong Meilisearch mỗi khi có sự thay đổi về dữ liệu nội dung.

*Cấu trúc dữ liệu cho một document trong index có thể trông như sau:*
```json
{
  "id": "content-uuid-123",
  "title": "Hướng dẫn làm bánh mì",
  "description": "Một bài hướng dẫn chi tiết...",
  "contentType": "article",
  "authorName": "John Doe",
  "tags": ["nấu ăn", "bánh mì"],
  "createdAt": 1678886400
}
```

### Bước 3: Xây dựng lại API Tìm kiếm
1.  **Chỉnh sửa Controller:** Sửa lại logic trong controller xử lý endpoint `GET /api/recommendations/search`.
2.  **Gọi `SearchService`:** Thay vì truy vấn database, controller sẽ gọi phương thức tìm kiếm trong `SearchService` đã tạo ở Bước 2, truyền vào từ khóa và các bộ lọc.
3.  **Mở rộng Tham số API:** API giờ đây có thể hỗ trợ các bộ lọc mạnh mẽ do Meilisearch cung cấp, ví dụ:
    `GET /api/recommendations/search?q=bánh&filters=contentType=video AND authorName='John Doe'`

### Bước 4: Cập nhật Giao diện Người dùng
Giao diện người dùng bây giờ có thể được nâng cấp để bao gồm:
- Một ô tìm kiếm "sống" (instant search) hiển thị kết quả ngay khi người dùng gõ.
- Các bộ lọc (checkbox, dropdown) cho phép người dùng thu hẹp kết quả tìm kiếm theo loại nội dung, tác giả, thẻ, v.v.
