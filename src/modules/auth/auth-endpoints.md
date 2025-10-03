# Auth Module API Endpoints

## Tổng quan
Module Auth cung cấp các chức năng xác thực người dùng bao gồm đăng ký, đăng nhập, quên mật khẩu, OAuth và quản lý token.

## Base URL
```
/api/auth
```

## Rate Limiting
- **Auth endpoints**: 5 attempts per 15 minutes
- **Password reset**: 3 attempts per hour

---

## 1. Đăng ký tài khoản (Register)

### Endpoint
```
POST /api/auth/register
```

### Authentication
Không yêu cầu

### Request Body
```json
{
  "email": "user@example.com",
  "username": "john_doe",
  "password": "MyPassword123"
}
```

### Validation Rules
- **email**:
  - Bắt buộc
  - Phải là email hợp lệ
  - Tối đa 255 ký tự
  - Tự động normalize
- **username**:
  - Bắt buộc
  - Độ dài: 3-30 ký tự
  - Chỉ chứa: chữ cái, số, dấu gạch dưới
  - Không được dùng các từ khóa reserved: admin, api, www, mail, ftp, localhost, root, support, help, about, contact
- **password**:
  - Bắt buộc
  - Độ dài: 8-128 ký tự
  - Phải chứa ít nhất: 1 chữ thường, 1 chữ hoa, 1 số

### Response Success (201)
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "username": "john_doe",
    "role": "user",
    "status": "active",
    "profile": {
      // profile object
    }
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "tokenType": "Bearer"
}
```

### Error Responses
- **400**: Dữ liệu không hợp lệ
- **409**: Email hoặc username đã tồn tại
- **429**: Quá nhiều lần thử (rate limit)
- **500**: Lỗi server

---

## 2. Đăng nhập (Login)

### Endpoint
```
POST /api/auth/login
```

### Authentication
Không yêu cầu

### Request Body
```json
{
  "identifier": "user@example.com",
  "password": "MyPassword123"
}
```

### Validation Rules
- **identifier**: Bắt buộc, email hoặc username, tối đa 255 ký tự
- **password**: Bắt buộc, tối đa 128 ký tự

### Response Success (200)
```json
{
  "message": "Login successful",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "username": "john_doe",
    "role": "user",
    "status": "active",
    "profile": {
      // profile object
    }
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "tokenType": "Bearer"
}
```

### Error Responses
- **400**: Dữ liệu không hợp lệ
- **401**: Thông tin đăng nhập không đúng
- **403**: Tài khoản bị khóa
- **429**: Quá nhiều lần thử
- **500**: Lỗi server

---

## 3. Refresh Token

### Endpoint
```
POST /api/auth/refresh
```

### Authentication
Không yêu cầu

### Request Body
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Validation Rules
- **refreshToken**: Bắt buộc, phải là JWT token hợp lệ

### Response Success (200)
```json
{
  "message": "Token refreshed successfully",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "username": "john_doe",
    "role": "user",
    "status": "active",
    "profile": {
      // profile object
    }
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "tokenType": "Bearer"
}
```

### Error Responses
- **400**: Dữ liệu không hợp lệ
- **401**: Refresh token không hợp lệ hoặc hết hạn
- **500**: Lỗi server

---

## 4. Đăng xuất (Logout)

### Endpoint
```
POST /api/auth/logout
```

### Authentication
Yêu cầu Bearer token

### Request Body (Optional)
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Response Success (200)
```json
{
  "message": "Logout successful"
}
```

### Error Responses
- **400**: Dữ liệu không hợp lệ
- **401**: Token không hợp lệ
- **500**: Lỗi server

---

## 5. Lấy thông tin user hiện tại (Get Current User)

### Endpoint
```
GET /api/auth/me
```

### Authentication
Yêu cầu Bearer token

### Response Success (200)
```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "username": "john_doe",
    "role": "user",
    "status": "active",
    "profile": {
      // profile object
    }
  }
}
```

### Error Responses
- **401**: Token không hợp lệ
- **404**: User không tồn tại
- **500**: Lỗi server

---

## 6. Validate Token

### Endpoint
```
POST /api/auth/validate
```

### Authentication
Không yêu cầu

### Request Body
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Validation Rules
- **token**: Bắt buộc, phải là JWT token hợp lệ

### Response Success (200)
```json
{
  "valid": true,
  "user": {
    "userId": "user-123",
    "email": "user@example.com",
    "username": "john_doe",
    "role": "user",
    "status": "active"
  },
  "decoded": {
    "userId": "user-123",
    "email": "user@example.com",
    "username": "john_doe",
    "role": "user",
    "status": "active"
  }
}
```

### Error Responses
- **400**: Token không được cung cấp
- **401**: Token không hợp lệ
- **500**: Lỗi server

---

## 7. Quên mật khẩu (Forgot Password)

### Endpoint
```
POST /api/auth/forgot-password
```

### Authentication
Không yêu cầu

### Request Body
```json
{
  "email": "user@example.com"
}
```

### Validation Rules
- **email**: Bắt buộc, email hợp lệ, tối đa 255 ký tự

### Response Success (200)
```json
{
  "success": true,
  "message": "If an account with that email exists, a password reset link has been sent"
}
```

### Error Responses
- **400**: Email không hợp lệ
- **429**: Quá nhiều lần thử reset password
- **500**: Lỗi server

---

## 8. Reset Password

### Endpoint
```
POST /api/auth/reset-password
```

### Authentication
Không yêu cầu

### Request Body
```json
{
  "resetToken": "550e8400-e29b-41d4-a716-446655440000",
  "newPassword": "NewPassword123"
}
```

### Validation Rules
- **resetToken**: Bắt buộc, phải là UUID hợp lệ
- **newPassword**: Bắt buộc, 8-128 ký tự, chứa ít nhất 1 chữ thường, 1 chữ hoa, 1 số

### Response Success (200)
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

### Error Responses
- **400**: Token hoặc password không hợp lệ
- **429**: Quá nhiều lần thử
- **500**: Lỗi server

---

## 9. Validate Reset Token

### Endpoint
```
GET /api/auth/validate-reset-token/{token}
```

### Authentication
Không yêu cầu

### Path Parameters
- **token**: Reset token (UUID)

### Response Success (200)
```json
{
  "valid": true,
  "message": "Reset token is valid"
}
```

### Error Responses
- **400**: Token không hợp lệ hoặc hết hạn
- **500**: Lỗi server

---

## 10. Send OTP

### Endpoint
```
POST /api/auth/send-otp
```

### Authentication
Không yêu cầu

### Request Body
```json
{
  "email": "user@example.com"
}
```

### Validation Rules
- **email**: Bắt buộc, email hợp lệ, tối đa 255 ký tự

### Response Success (200)
```json
{
  "message": "If an account with that email exists, an OTP has been sent"
}
```

### Error Responses
- **400**: Email không hợp lệ
- **429**: Rate limit
- **500**: Lỗi server

---

## 11. Verify OTP

### Endpoint
```
POST /api/auth/verify-otp
```

### Authentication
Không yêu cầu

### Request Body
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

### Validation Rules
- **email**: Bắt buộc, email hợp lệ, tối đa 255 ký tự
- **otp**: Bắt buộc, đúng 6 chữ số

### Response Success (200)
```json
{
  "message": "Login successful",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "username": "john_doe",
    "role": "user",
    "status": "active",
    "profile": {
      // profile object
    }
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "tokenType": "Bearer"
}
```

### Error Responses
- **400**: OTP hoặc email không hợp lệ
- **429**: Rate limit
- **500**: Lỗi server

---

## 12. Change Password

### Endpoint
```
POST /api/auth/change-password
```

### Authentication
Yêu cầu Bearer token

### Request Body
```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword123"
}
```

### Validation Rules
- **currentPassword**: Bắt buộc, tối đa 128 ký tự
- **newPassword**: Bắt buộc, 8-128 ký tự, chứa ít nhất 1 chữ thường, 1 chữ hoa, 1 số, khác với current password

### Response Success (200)
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### Error Responses
- **400**: Dữ liệu không hợp lệ
- **401**: Current password sai
- **500**: Lỗi server

---

## OAuth Endpoints

## 13. Google OAuth

### Initiate
```
GET /api/auth/google
```

### Callback
```
GET /api/auth/google/callback?code={code}&state={state}
```

## 14. GitHub OAuth

### Initiate
```
GET /api/auth/github
```

### Callback
```
GET /api/auth/github/callback?code={code}&state={state}
```

## 15. Facebook OAuth

### Initiate
```
GET /api/auth/facebook
```

### Callback
```
GET /api/auth/facebook/callback?code={code}&state={state}
```

### OAuth Response Success (200)
```json
{
  "message": "OAuth authentication successful",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "username": "john_doe",
    "role": "user",
    "status": "active",
    "profile": {
      // profile object
    }
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "tokenType": "Bearer"
}
```

---

## Authentication Headers

### Bearer Token
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Content Type
```
Content-Type: application/json
```

## Error Response Format
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "retryAfter": 900  // chỉ có với rate limit
}
```

---

## Notes
- Tất cả request body đều là JSON
- Password phải có độ dài tối thiểu 8 ký tự và chứa ít nhất 1 chữ thường, 1 chữ hoa, 1 số
- Email được normalize tự động
- Rate limiting áp dụng cho các endpoint nhạy cảm
- Reset password luôn trả về success message để tránh enumeration attack
- Token validation có thể được sử dụng để kiểm tra token mà không cần gọi protected endpoint
