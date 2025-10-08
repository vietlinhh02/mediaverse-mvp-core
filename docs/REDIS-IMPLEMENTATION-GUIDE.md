# 🔍 HƯỚNG DẪN KIỂM TRA VÀ SỬ DỤNG REDIS TRONG MEDIACMS

## 📋 Mục lục
1. [Tổng quan Redis trong dự án](#tổng-quan)
2. [Cấu trúc Redis](#cấu-trúc-redis)
3. [Các modules sử dụng Redis](#các-modules-sử-dụng-redis)
4. [Cách kiểm tra Redis](#cách-kiểm-tra-redis)
5. [Troubleshooting](#troubleshooting)
6. [Best Practices](#best-practices)

---

## 🎯 Tổng quan

### Redis được sử dụng cho:
- ✅ **Caching**: User data, content, feed, recommendations
- ✅ **Session Management**: User sessions
- ✅ **Job Queue**: Background processing (Bull Queue)
- ✅ **Pub/Sub**: Real-time notifications và analytics
- ✅ **WebSocket Scaling**: Socket.io-Redis adapter

### Cấu hình hiện tại:
```env
REDIS_URL=redis://localhost:6379
REDIS_CLUSTER=false
```

---

## 🏗️ Cấu trúc Redis

### 5 Redis Clients riêng biệt

| Client | Database | Mục đích | Sử dụng ở |
|--------|----------|----------|-----------|
| **redisCache** | 0 | Cache dữ liệu | User data, content, feed, playlists |
| **redisSession** | 1 | Session management | User sessions, authentication |
| **redisQueue** | 2 | Job queue | Background jobs (Bull) |
| **redisPub** | 3 | Publish messages | Real-time events |
| **redisSub** | 3 | Subscribe messages | Real-time listeners |

### Tại sao tách riêng?
- **Isolation**: Mỗi client có namespace riêng
- **Performance**: Tránh conflict giữa các operations
- **Management**: Dễ dàng monitor và debug
- **Scalability**: Có thể scale từng loại riêng biệt

---

## 📦 Các modules sử dụng Redis

### 1. Content Management
```javascript
// src/modules/content/contentService.js
const { cache } = require('../../config/redis');

// Cache content
await cache.set(`content:${contentId}`, content, 3600);
const cached = await cache.get(`content:${contentId}`);
```

**Sử dụng:**
- Cache video metadata
- Cache article content
- Cache document info
- Cache trending content

### 2. Feed Controller
```javascript
// src/modules/content/feedController.js
const { cache } = require('../../config/redis');

// Cache user feed
await cache.set(`feed:user:${userId}`, feedItems, 300); // 5 min TTL
```

**Sử dụng:**
- Cache personalized feeds
- Cache trending feeds
- Cache category feeds

### 3. User Service
```javascript
// src/modules/users/userService.js
const { cache } = require('../../config/redis');

// Cache user profile
await cache.set(`user:${userId}`, user, 1800); // 30 min TTL
```

**Sử dụng:**
- Cache user profiles
- Cache user stats
- Cache follower counts

### 4. Recommendations
```javascript
// src/services/smartRecommendationService.js
const { cache } = require('../config/redis');

// Cache recommendations
await cache.set(`recommendations:${userId}`, recommendations, 3600);
```

**Sử dụng:**
- Cache personalized recommendations
- Cache similar content
- Cache trending recommendations

### 5. Authentication
```javascript
// src/modules/auth/authService.js
const { cache } = require('../../config/redis');

// Cache refresh tokens
await cache.set(`refresh_token:${userId}`, token, 2592000); // 30 days

// Cache password reset tokens
await cache.set(`reset_token:${token}`, { userId, email }, 3600); // 1 hour
```

**Sử dụng:**
- Store refresh tokens
- Store password reset tokens
- Store OAuth state

### 6. Real-time Analytics
```javascript
// src/modules/analytics/services/realtimeService.js
const { redisPub, redisSub } = require('../../../config/redis');

// Publish analytics event
await redisPub.publish('analytics:event', JSON.stringify(event));

// Subscribe to analytics events
await redisSub.subscribe('analytics:event');
```

**Sử dụng:**
- Real-time view counts
- Real-time interaction tracking
- Live statistics

### 7. Background Jobs (Bull Queue)
```javascript
// src/jobs/worker.js
const Queue = require('bull');
const { redisQueue } = require('../config/redis');

const videoQueue = new Queue('video-processing', {
  redis: process.env.REDIS_URL
});
```

**Job types:**
- Video transcoding
- Thumbnail generation
- Document processing
- Email notifications
- Analytics aggregation

### 8. WebSocket Scaling
```javascript
// src/modules/notifications/websocket/webSocketManager.js
const socketIoRedis = require('socket.io-redis');

io.adapter(socketIoRedis({ 
  host: 'localhost', 
  port: 6379 
}));
```

**Sử dụng:**
- Scale Socket.io across multiple servers
- Share WebSocket state
- Broadcast to all connected clients

---

## 🔍 Cách kiểm tra Redis

### 1. Kiểm tra Docker Container

```bash
# Xem trạng thái container
docker ps | grep redis

# Kiểm tra logs
docker logs redis

# Test ping
docker exec -it redis redis-cli ping
# Output: PONG
```

### 2. Kiểm tra kết nối từ Application

```bash
# Chạy test script
node test-redis-connection.js
```

**Kết quả mong đợi:**
```
✓ Redis initialization: SUCCESS
✓ pub: healthy
✓ sub: healthy
✓ cache: healthy
✓ queue: healthy
✓ session: healthy
```

### 3. Kiểm tra Health Endpoint

```bash
# Quick health check
curl http://localhost:5000/health

# Detailed health check
curl http://localhost:5000/health/detailed
```

**Response:**
```json
{
  "services": {
    "redis": {
      "cache": { "status": "healthy" },
      "session": { "status": "healthy" },
      "queue": { "status": "healthy" },
      "pub": { "status": "healthy" },
      "sub": { "status": "healthy" }
    }
  }
}
```

### 4. Monitor Redis trực tiếp

```bash
# Vào Redis CLI
docker exec -it redis redis-cli

# Xem tất cả keys
KEYS *

# Xem keys theo pattern
KEYS user:*
KEYS content:*

# Xem thông tin server
INFO

# Xem memory usage
INFO memory

# Monitor real-time commands
MONITOR
```

### 5. Test khi Redis không khả dụng

```bash
# Stop Redis
docker-compose stop redis

# Run test
node test-redis-without-docker.js

# Restart Redis
docker-compose start redis
```

---

## 🚨 Troubleshooting

### Vấn đề 1: "Redis vẫn báo đang chạy khi Docker chưa start"

**Nguyên nhân:**
```javascript
// src/config/redis.js
const baseRedisConfig = {
  lazyConnect: true,  // ← Client được tạo nhưng chưa connect
  // ...
}
```

**Giải pháp:**
- Sử dụng health check endpoint để kiểm tra chính xác
- Xem logs khi app khởi động
- Chạy test script `test-redis-connection.js`

### Vấn đề 2: Connection timeout

**Triệu chứng:**
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Giải pháp:**
```bash
# 1. Kiểm tra Docker
docker ps | grep redis

# 2. Start Redis nếu chưa chạy
docker-compose up -d redis

# 3. Kiểm tra port
netstat -an | grep 6379

# 4. Kiểm tra .env
cat .env | grep REDIS_URL
```

### Vấn đề 3: Redis running nhưng operations fail

**Triệu chứng:**
```
Cache set error: ReplyError: READONLY
```

**Giải pháp:**
```bash
# Restart Redis container
docker-compose restart redis

# Clear Redis data
docker exec -it redis redis-cli FLUSHALL
```

### Vấn đề 4: Memory issues

**Triệu chứng:**
```
OOM command not allowed when used memory > 'maxmemory'
```

**Giải pháp:**
```bash
# Check memory usage
docker exec -it redis redis-cli INFO memory

# Set eviction policy
docker exec -it redis redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Flush if needed
docker exec -it redis redis-cli FLUSHDB
```

---

## 💡 Best Practices

### 1. Key Naming Convention

```javascript
// ✅ GOOD - Có namespace rõ ràng
cache.set('user:123:profile', data);
cache.set('content:video:456', data);
cache.set('feed:user:123:page:1', data);

// ❌ BAD - Không rõ ràng
cache.set('u123', data);
cache.set('data456', data);
```

### 2. Set TTL cho tất cả keys

```javascript
// ✅ GOOD - Set TTL
await cache.set('user:123', data, 3600); // 1 hour

// ❌ BAD - Không set TTL (memory leak)
await cache.set('user:123', data);
```

### 3. Handle errors gracefully

```javascript
// ✅ GOOD
try {
  const data = await cache.get('user:123');
  return data || await fetchFromDatabase();
} catch (error) {
  console.error('Cache error:', error);
  return await fetchFromDatabase(); // Fallback
}

// ❌ BAD
const data = await cache.get('user:123'); // No error handling
```

### 4. Invalidate cache khi update

```javascript
// ✅ GOOD
async function updateUser(userId, updates) {
  const user = await prisma.user.update({...});
  
  // Invalidate cache
  await cache.del(`user:${userId}`);
  await cache.del(`user:${userId}:profile`);
  
  return user;
}
```

### 5. Use cache warming

```javascript
// ✅ GOOD - Warm cache on app start
async function warmCache() {
  const popularContent = await prisma.content.findMany({
    take: 100,
    orderBy: { viewCount: 'desc' }
  });
  
  for (const content of popularContent) {
    await cache.set(`content:${content.id}`, content, 3600);
  }
}
```

### 6. Monitor cache hit/miss rate

```javascript
// Track cache effectiveness
let cacheHits = 0;
let cacheMisses = 0;

async function getWithStats(key) {
  const value = await cache.get(key);
  if (value) {
    cacheHits++;
  } else {
    cacheMisses++;
  }
  return value;
}

// Log stats periodically
setInterval(() => {
  const hitRate = (cacheHits / (cacheHits + cacheMisses) * 100).toFixed(2);
  console.log(`Cache hit rate: ${hitRate}%`);
}, 60000);
```

---

## 📊 Redis Keys Pattern trong dự án

| Pattern | Ví dụ | TTL | Mục đích |
|---------|-------|-----|----------|
| `user:{id}` | `user:123` | 30m | User profile |
| `user:{id}:stats` | `user:123:stats` | 15m | User statistics |
| `content:{id}` | `content:456` | 1h | Content metadata |
| `feed:user:{id}` | `feed:user:123` | 5m | User feed |
| `recommendations:{id}` | `recommendations:123` | 1h | User recommendations |
| `session:{sessionId}` | `session:abc123` | 24h | User session |
| `refresh_token:{userId}` | `refresh_token:123` | 30d | Refresh token |
| `reset_token:{token}` | `reset_token:xyz` | 1h | Password reset |
| `queue:{name}` | `queue:video-processing` | - | Job queue |

---

## 🎓 Tài liệu tham khảo

- [Redis Official Docs](https://redis.io/documentation)
- [ioredis Documentation](https://github.com/redis/ioredis)
- [Bull Queue Docs](https://github.com/OptimalBits/bull)
- [Socket.io-Redis Adapter](https://socket.io/docs/v4/redis-adapter/)

---

## ✅ Checklist cho Production

- [ ] Set `maxmemory` và `maxmemory-policy`
- [ ] Enable Redis persistence (AOF/RDB)
- [ ] Set up Redis monitoring (RedisInsight, Grafana)
- [ ] Configure Redis backup strategy
- [ ] Use Redis Sentinel hoặc Cluster cho HA
- [ ] Set proper TTL cho tất cả keys
- [ ] Implement cache warming strategy
- [ ] Monitor memory usage
- [ ] Set up alerts cho Redis down
- [ ] Document cache invalidation strategy

---

**Tác giả:** Mediaverse Team  
**Ngày cập nhật:** October 6, 2025
