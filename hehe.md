# 🌟 TỔNG QUAN PROJECT MEDIAVERSE (Monolith Architecture)

> **Ngày tạo**: 20/09/2025  
> **Người phân tích**: Nguyễn Viết Linh  

## 📋 TÓM TẮT EXECUTIVE SUMMARY
Mediaverse là một nền tảng truyền thông đa phương tiện kết hợp tính năng của YouTube (video), Medium (bài viết), SlideShare (tài liệu), và LinkedIn Learning (khóa học).  

Trong giai đoạn MVP, Mediaverse được xây dựng theo mô hình Monolith/Hybrid:
- Một core monolith service quản lý Auth, User, Content, Moderation, Recommendation cơ bản.  
- Một số microservices độc lập cho các tác vụ nặng như Media Processing và Notification.  

## 🎯 TẦM NHÌN VÀ MỤC TIÊU
- Tích hợp đa nền tảng trong một hệ sinh thái duy nhất.  
- Tạo cộng đồng sáng tạo và học tập chuyên sâu.  
- Mở rộng dần: từ MVP → Growth → Scale toàn cầu.  

## 🏗️ KIẾN TRÚC TECHNICAL

### 1. Monolith Core
- Bao gồm: Auth, User, Content, Moderation, Recommendation cơ bản.  
- Stack:
  - Backend: NestJS / Express.js (Node.js)
  - Database: PostgreSQL (1 schema chính)
  - ORM: Prisma
  - Cache: Redis (sessions, caching, job queue)
  - Storage: AWS S3 / MinIO (lưu file gốc)

### 2. Microservices Tách Riêng
- Media Processing Service:
  - Xử lý video/audio (FFmpeg).
  - Thumbnail, adaptive streaming (HLS/DASH).
  - Scale độc lập theo nhu cầu.
- Notification Service:
  - Push/email/SMS/in-app notifications.
  - Dùng Redis Bull / Kafka queue.

### 3. Frontend
- Next.js + TypeScript (SSR/SSG).
- UI Library: shadcn/ui, TailwindCSS.
- Player/Viewer: video.js, PDF.js.

## 🔧 MODULES TRONG MONOLITH CORE

### 1. Auth Module
- JWT token management
- OAuth (Google, GitHub, Facebook)
- RBAC (Role-Based Access Control)

### 2. User Module
- Quản lý profile, avatar
- Follow/Subscribe
- Channel management
- User preferences

### 3. Content Module
- Bài viết (rich text/markdown)
- Community posts, comments, hashtags
- Category & tagging system

### 4. Moderation Module
- User report queue
- Admin dashboard
- AI filtering (basic)

### 5. Recommendation Module (Basic)
- Trending feeds
- Content-based filtering
- Personalized feeds (phase sau)

## 🚀 TÍNH NĂNG CHÍNH
- Media: upload video/audio, PDF, hình ảnh.
- Social: like, comment, share, hashtags, community posts.
- Notifications: real-time & email.
- Moderation: user reports, AI filtering.

## 💡 ROADMAP PHÁT TRIỂN

### Phase 1: MVP (3–6 tháng)
- Monolith core (Auth, User, Content).
- Media Service (video upload & playback cơ bản).
- Notification Service (email + in-app).
- Frontend Next.js dashboard.

### Phase 2: Growth (6–12 tháng)
- Nâng cấp Media (adaptive streaming, CDN).
- Social features (stories, polls, trending).
- Mobile app (React Native).
- Basic AI Recommendation.

### Phase 3: Scale (12+ tháng)
- AI/ML full (recommendation, moderation).
- Enterprise analytics.
- Monetization (ads, subs, creator funds).
- Global expansion.

## 🔥 LỢI ÍCH CỦA MÔ HÌNH MONOLITH/HYBRID
1. Phát triển nhanh MVP: không bị overhead 9 microservices.
2. Đơn giản vận hành: dễ CI/CD, logging, monitoring.
3. Linh hoạt: các tác vụ nặng (Media, Notification) vẫn scale riêng.
4. Chuẩn bị cho tương lai: kiến trúc sẵn sàng tách thành microservices khi cần.

## ⚠️ RỦI RO CẦN QUẢN LÝ
- Monolith cần codebase modular, bounded context rõ ràng để dễ tách sau này.
- Media processing & storage có thể trở thành bottleneck nếu không scale kịp.
- Cạnh tranh lớn (YouTube, Medium, Coursera).

## 📊 KẾT LUẬN
- Nên bắt đầu với kiến trúc Monolith/Hybrid để ra MVP nhanh chóng.
- Tách microservices dần (Media, Notification, Recommendation) khi user & traffic tăng.
- Chiến lược phát triển linh hoạt giúp Mediaverse vừa tiết kiệm tài nguyên, vừa đảm bảo scalable lâu dài.
