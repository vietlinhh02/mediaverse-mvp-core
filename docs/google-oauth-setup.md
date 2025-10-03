# Hướng dẫn Setup Google OAuth Login

## Tổng quan
Hệ thống đã được implement sẵn chức năng đăng nhập bằng Google OAuth. Bạn chỉ cần làm theo các bước sau để kích hoạt.

## Bước 1: Tạo Google OAuth App

### 1.1 Truy cập Google Cloud Console
1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo mới hoặc chọn một project hiện có

### 1.2 Kích hoạt Google+ API
1. Vào **APIs & Services** > **Library**
2. Tìm và kích hoạt **Google+ API**

### 1.3 Tạo OAuth Credentials
1. Vào **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth 2.0 Client IDs**
3. Chọn **Web application**
4. Điền thông tin:
   - **Name**: Mediaverse App (hoặc tên bạn muốn)
   - **Authorized JavaScript origins**: `http://localhost:3001` (địa chỉ frontend)
   - **Authorized redirect URIs**: `http://localhost:3000/api/auth/google/callback`

### 1.4 Lấy Client ID và Client Secret
Sau khi tạo, bạn sẽ nhận được:
- **Client ID**: Dài khoảng 100 ký tự
- **Client Secret**: Dài khoảng 24 ký tự

## Bước 2: Cấu hình Environment Variables

### 2.1 Chỉnh sửa file `.env`
Đã có file `.env` được tạo với các biến mẫu. Bạn cần điền các giá trị thực:

```env
# Google OAuth - Thay thế bằng giá trị thực từ Google Cloud Console
GOOGLE_CLIENT_ID="123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="ABC123def456ghi789jkl"

# Client URL - Địa chỉ frontend của bạn
CLIENT_URL="http://localhost:3001"
```

### 2.2 Các biến môi trường quan trọng khác
```env
# JWT Secret - Đổi thành secret mạnh hơn cho production
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Database URL - Cấu hình PostgreSQL
DATABASE_URL="postgresql://username:password@localhost:5432/mediaverse_dev"

# Redis URL - Cần thiết cho session và token storage
REDIS_URL="redis://localhost:6379"
```

## Bước 3: Khởi động hệ thống

### 3.1 Khởi động Database và Redis
```bash
# Khởi động PostgreSQL và Redis (nếu dùng Docker)
docker-compose up -d

# Hoặc khởi động Redis riêng
redis-server
```

### 3.2 Cài đặt dependencies (nếu chưa)
```bash
npm install
```

### 3.3 Chạy Prisma migrations
```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push
```

### 3.4 Khởi động server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Bước 4: Test OAuth Login

### 4.1 Endpoint để test
```
GET http://localhost:3000/api/auth/google
```

### 4.2 Quy trình hoạt động
1. User click vào nút "Login with Google" trên frontend
2. Frontend redirect đến `/api/auth/google`
3. Server redirect đến Google OAuth
4. User đăng nhập và cho phép quyền
5. Google redirect về `/api/auth/google/callback`
6. Server tạo user mới hoặc link với user hiện có
7. Server redirect về frontend với access_token và refresh_token

### 4.3 Response URL sau khi thành công
```
http://localhost:3001/auth/success?accessToken={token}&refreshToken={token}&expiresIn=7200
```

### 4.4 Response URL khi thất bại
```
http://localhost:3001/auth/error?message={error_message}
```

## Bước 5: Frontend Integration

### 5.1 Tạo nút Login with Google
```html
<a href="http://localhost:3000/api/auth/google">
  <img src="https://developers.google.com/identity/images/btn_google_signin_dark_normal_web.png" alt="Sign in with Google">
</a>
```

### 5.2 Xử lý callback
```javascript
// Trong trang /auth/success
const urlParams = new URLSearchParams(window.location.search);
const accessToken = urlParams.get('accessToken');
const refreshToken = urlParams.get('refreshToken');

// Lưu tokens vào localStorage hoặc context
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);
```

### 5.3 Xử lý error
```javascript
// Trong trang /auth/error
const urlParams = new URLSearchParams(window.location.search);
const errorMessage = urlParams.get('message');

// Hiển thị error cho user
console.error('OAuth Error:', errorMessage);
```

## Troubleshooting

### Lỗi phổ biến

1. **Redirect URI mismatch**
   - Đảm bảo Authorized redirect URIs trong Google Console khớp với `GOOGLE_CALLBACK_URL`

2. **Invalid client**
   - Kiểm tra `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET` đúng

3. **Database connection error**
   - Đảm bảo PostgreSQL đang chạy và `DATABASE_URL` đúng

4. **Redis connection error**
   - Đảm bảo Redis đang chạy và `REDIS_URL` đúng

### Debug logs
Thêm logs để debug:
```javascript
console.log('OAuth callback received:', req.query);
console.log('User profile:', profile);
```

## Production Deployment

### 1. Cập nhật Authorized origins
- Thay `localhost:3001` bằng domain production
- Ví dụ: `https://yourdomain.com`

### 2. Cập nhật callback URL
```env
GOOGLE_CALLBACK_URL="https://yourdomain.com/api/auth/google/callback"
CLIENT_URL="https://yourdomain.com"
```

### 3. Bảo mật JWT Secret
- Đổi `JWT_SECRET` thành chuỗi ngẫu nhiên mạnh
- Sử dụng environment variables thay vì hardcode

### 4. HTTPS Required
Google OAuth yêu cầu HTTPS trong production. Đảm bảo:
- Server có SSL certificate
- Tất cả redirect URIs dùng HTTPS

## API Endpoints Reference

```
GET  /api/auth/google          # Initiate Google OAuth
GET  /api/auth/google/callback # Handle OAuth callback
GET  /api/auth/github          # Initiate GitHub OAuth
GET  /api/auth/github/callback # Handle GitHub callback
GET  /api/auth/facebook        # Initiate Facebook OAuth
GET  /api/auth/facebook/callback # Handle Facebook callback
```

## Support

Nếu gặp vấn đề, kiểm tra:
1. Console logs của server
2. Network tab trong browser dev tools
3. Google Cloud Console > APIs & Services > Credentials
4. Database và Redis connections
