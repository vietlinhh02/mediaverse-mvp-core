# Interactions API (Like • Comment • Share)

Áp dụng cho `content` các loại: `video`, `article`, `document`.

- Base URL: `/api`
- Auth:
  - "Required": cần Bearer token
  - "Optional": có thể có hoặc không; nếu có token sẽ ảnh hưởng một số trạng thái (ví dụ follow-status)
- Visibility/Status: Backend đã ẩn nội dung không có quyền xem trong danh sách; GET đơn lẻ trả 404 nếu không có quyền.

---

## 1) Like

### 1.1 Like content
- Method: POST
- URL: `/api/content/{contentId}/like`
- Auth: Required
- Request Body: none
- Validation:
  - `contentId` (path): UUID v7 hợp lệ; must exist and be viewable by caller
- Responses:
  - 200 OK
  ```json
  {
    "success": true,
    "message": "Content liked successfully",
    "data": { "id": "like_123", "userId": "me", "contentId": "..." }
  }
  ```
  - 404 NOT_FOUND: content không tồn tại/không có quyền xem
  - 409 ALREADY_LIKED: user đã like trước đó
  - 401 UNAUTHORIZED: thiếu token

### 1.2 Unlike content
- Method: DELETE
- URL: `/api/content/{contentId}/unlike`
- Auth: Required
- Request Body: none
- Validation:
  - `contentId` (path): UUID hợp lệ; like phải tồn tại bởi user hiện tại
- Responses:
  - 200 OK
  ```json
  { "success": true, "message": "Content unliked successfully" }
  ```
  - 404 NOT_FOUND: chưa từng like hoặc content không tồn tại
  - 401 UNAUTHORIZED

### 1.3 Get likers (optional)
- Method: GET
- URL: `/api/content/{contentId}/likes?page=1&limit=20`
- Auth: Optional
- Query Validation:
  - `page`: integer ≥ 1, default 1
  - `limit`: integer 1..100, default 20
- Responses:
  - 200 OK
  ```json
  {
    "success": true,
    "data": [
      { "id": "userId", "username": "john", "profile": { "displayName": "John", "avatarUrl": null } }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 3, "pages": 1 }
  }
  ```
  - 404 NOT_FOUND: content không tồn tại/không có quyền

---

## 2) Comment

### 2.1 List comments
- Method: GET
- URL: `/api/content/{contentId}/comments?page=1&limit=20&sortBy=createdAt|likes|replies&sortOrder=asc|desc&includeReplies=false`
- Auth: Optional
- Query Validation:
  - `page`: integer ≥ 1, default 1
  - `limit`: integer 1..100, default 20
  - `sortBy`: enum `createdAt|likes|replies`, default `createdAt`
  - `sortOrder`: enum `asc|desc`, default `desc`
  - `includeReplies`: boolean, default false
- Responses:
  - 200 OK
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "commentId",
        "text": "Nice!",
        "user": { "id": "userId", "username": "jane", "profile": { "displayName": "Jane", "avatarUrl": null } },
        "likesCount": 5,
        "repliesCount": 2,
        "createdAt": "2025-10-09T04:05:34.048Z"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 10, "pages": 1 }
  }
  ```
  - 404 NOT_FOUND: content không tồn tại/không có quyền

### 2.2 Create comment
- Method: POST
- URL: `/api/content/{contentId}/comments`
- Auth: Required
- Body (JSON):
  ```json
  {
    "text": "Your comment here",
    "parentId": null
  }
  ```
- Body Validation:
  - `text`: string, required, length 1..5000
  - `parentId`: string UUID | null, optional (reply cho 1 bình luận)
- Responses:
  - 201 CREATED
  ```json
  {
    "success": true,
    "message": "Comment created successfully",
    "data": { "id": "commentId", "text": "Your comment here" }
  }
  ```
  - 400 BAD_REQUEST: text rỗng/vượt giới hạn; parentId không hợp lệ
  - 401 UNAUTHORIZED
  - 404 NOT_FOUND: content không tồn tại/không có quyền

### 2.3 Update comment
- Method: PUT
- URL: `/api/comments/{commentId}`
- Auth: Required (chủ comment hoặc moderator)
- Body (JSON):
  ```json
  { "text": "Updated comment" }
  ```
- Body Validation:
  - `text`: string, required, 1..5000
- Responses:
  - 200 OK
  ```json
  {
    "success": true,
    "message": "Comment updated successfully",
    "data": { "id": "commentId", "text": "Updated comment" }
  }
  ```
  - 400 BAD_REQUEST
  - 401 UNAUTHORIZED
  - 403 FORBIDDEN: không phải chủ/missing permission
  - 404 NOT_FOUND: comment không tồn tại/không có quyền

### 2.4 Delete comment
- Method: DELETE
- URL: `/api/comments/{commentId}`
- Auth: Required (chủ comment hoặc moderator)
- Request Body: none
- Responses:
  - 200 OK
  ```json
  { "success": true, "message": "Comment deleted successfully" }
  ```
  - 401 UNAUTHORIZED
  - 403 FORBIDDEN
  - 404 NOT_FOUND

### 2.5 Like/unlike a comment (optional)
- POST `/api/comments/{commentId}/like` (Auth: Required, Body: none)
- DELETE `/api/comments/{commentId}/unlike` (Auth: Required, Body: none)
- Responses:
  - 200 OK on success; 404 nếu comment không tồn tại; 409 nếu đã like

---

## 3) Share

### 3.1 Share content
- Method: POST
- URL: `/api/content/{contentId}/share`
- Auth: Required
- Body (JSON):
  ```json
  {
    "platform": "facebook",
    "message": "Check this out"
  }
  ```
- Body Validation:
  - `platform`: enum oneOf
    - `facebook`, `twitter`, `linkedin`, `whatsapp`, `telegram`, `copy`
  - `message`: string, optional, max 280 chars
- Responses:
  - 200 OK
  ```json
  { "success": true, "message": "Share recorded successfully" }
  ```
  - 400 BAD_REQUEST: platform không hợp lệ; message quá dài
  - 401 UNAUTHORIZED
  - 404 NOT_FOUND: content không tồn tại/không có quyền

---

## 4) Notes tích hợp UI

- Like button:
  - Nếu chưa like: POST `/content/{id}/like` → tăng state đếm +1
  - Nếu đã like: DELETE `/content/{id}/unlike` → giảm state đếm -1
- Comments:
  - List: GET `/content/{id}/comments?page=1&limit=20`
  - Create: POST `/content/{id}/comments` với `text`
  - Edit/Delete: PUT/DELETE `/comments/{commentId}`
- Share:
  - Gọi POST `/content/{id}/share` khi user bấm share (kể cả `platform=copy` để lưu thống kê)
- Refresh item:
  - Sau khi tương tác, refetch item hoặc đồng bộ thủ công `likesCount/commentsCount` trong UI.

---

## 5) Mã lỗi tiêu chuẩn

- 400 BAD_REQUEST: body/query không hợp lệ theo validate rules
- 401 UNAUTHORIZED: thiếu token hoặc token không hợp lệ
- 403 FORBIDDEN: không phải chủ hành động (sửa/xóa comment)
- 404 NOT_FOUND: content/comment không tồn tại hoặc không có quyền xem (ẩn tồn tại)
- 409 CONFLICT: hành động duplicate (ví dụ ALREADY_LIKED)
- 500 INTERNAL_ERROR: lỗi máy chủ

---

## 6) Subscriber (Follow User) — Đăng ký theo dõi tác giả

Cho phép người dùng đăng ký theo dõi tác giả để nhận cập nhật. Tận dụng hệ thống Follow hiện có.

### 6.1 Theo dõi (Subscribe)
- Method: POST
- URL: `/api/users/{userId}/follow`
- Auth: Required
- Request Body: none
- Validation:
  - `userId` (path): UUID hợp lệ, không được là chính mình
- Responses:
  - 200 OK
  ```json
  { "success": true, "message": "Followed successfully" }
  ```
  - 400 BAD_REQUEST: cố gắng theo dõi chính mình
  - 401 UNAUTHORIZED
  - 404 NOT_FOUND: user không tồn tại
  - 409 CONFLICT: đã theo dõi trước đó

### 6.2 Hủy theo dõi (Unsubscribe)
- Method: DELETE
- URL: `/api/users/{userId}/unfollow`
- Auth: Required
- Request Body: none
- Validation:
  - `userId` (path): UUID hợp lệ
- Responses:
  - 200 OK
  ```json
  { "success": true, "message": "Unfollowed successfully" }
  ```
  - 401 UNAUTHORIZED
  - 404 NOT_FOUND: chưa từng theo dõi hoặc user không tồn tại

### 6.3 Trạng thái theo dõi
- Method: GET
- URL: `/api/users/{userId}/follow-status`
- Auth: Optional (nếu có token, kiểm tra theo dõi theo user hiện tại)
- Responses:
  - 200 OK
  ```json
  { "success": true, "data": { "isFollowing": true } }
  ```

### 6.4 Danh sách người theo dõi (Followers)
- Method: GET
- URL: `/api/users/{userId}/followers?page=1&limit=20`
- Auth: Optional
- Query Validation:
  - `page`: integer ≥ 1, default 1
  - `limit`: integer 1..100, default 20
- Responses:
  - 200 OK
  ```json
  {
    "success": true,
    "data": [
      { "id": "uid", "username": "john", "displayName": "John", "avatarUrl": null }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 5, "pages": 1 }
  }
  ```

### 6.5 Danh sách đang theo dõi (Following)
- Method: GET
- URL: `/api/users/{userId}/following?page=1&limit=20`
- Auth: Optional
- Query Validation:
  - `page`: integer ≥ 1, default 1
  - `limit`: integer 1..100, default 20
- Responses:
  - 200 OK
  ```json
  {
    "success": true,
    "data": [
      { "id": "uid", "username": "creator", "displayName": "Creator", "avatarUrl": null }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 10, "pages": 1 }
  }
  ```

### 6.6 Gợi ý UI tích hợp
- Nút Subscribe/Unsubscribe tại trang tác giả `/users/:username`:
  - Nếu `follow-status.isFollowing === false` → hiển thị "Subscribe" (POST follow)
  - Nếu `true` → hiển thị "Subscribed" và menu "Unsubscribe" (DELETE unfollow)
- Hiển thị counters Followers/Following bằng 2 list ở trên.


