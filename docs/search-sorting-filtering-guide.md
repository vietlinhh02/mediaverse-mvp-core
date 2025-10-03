# MeiliSearch Sorting & Filtering Guide

## Tổng quan

Hệ thống sử dụng MeiliSearch để tìm kiếm nội dung với khả năng sắp xếp (sorting) và lọc (filtering) mạnh mẽ.

---

## Sorting (Sắp xếp)

### Các tùy chọn sortBy có sẵn:

1. **`relevance`** (mặc định)
   - Sắp xếp theo độ liên quan với từ khóa tìm kiếm
   - MeiliSearch tự động tính toán relevance score
   - Không cần truyền tham số sort

2. **`recent`**
   - Sắp xếp theo thời gian tạo mới nhất
   - Format: `createdAt:desc`

3. **`popular`**
   - Sắp xếp theo độ phổ biến
   - Hiện tại fallback về `createdAt:desc`
   - TODO: Thêm trường `popularityScore` để tính dựa trên likes, views, comments

### Cách sử dụng:

```javascript
// Tìm kiếm với sắp xếp theo độ liên quan (mặc định)
GET /api/content/articles/search?q=javascript&sortBy=relevance

// Tìm kiếm với sắp xếp theo mới nhất
GET /api/content/articles/search?q=javascript&sortBy=recent

// Tìm kiếm với sắp xếp theo phổ biến
GET /api/content/articles/search?q=javascript&sortBy=popular
```

### Ví dụ code:

```javascript
const searchArticles = async (query, options = {}) => {
  const params = new URLSearchParams({
    q: query,
    sortBy: options.sortBy || 'relevance', // relevance | recent | popular
    limit: options.limit || 20,
    offset: options.offset || 0
  });
  
  const response = await fetch(`/api/content/articles/search?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return await response.json();
};

// Sử dụng
const results = await searchArticles('javascript', { sortBy: 'recent' });
```

---

## Filtering (Lọc)

### Các tham số filter có sẵn:

#### 1. **Content Type Filter** (Tự động trong các endpoint riêng)
- Articles: `contentType = article`
- Videos: `contentType = video`
- Documents: `contentType = document`

#### 2. **Category Filter**
```javascript
GET /api/content/articles/search?q=coding&category=technology
```

Các category hợp lệ:
- `technology`
- `education`
- `entertainment`
- `business`
- `health`
- `lifestyle`
- `science`
- `sports`
- `politics`
- `travel`
- `other`

#### 3. **Tags Filter**
```javascript
GET /api/content/articles/search?q=programming&tags=javascript,nodejs
```

#### 4. **Author Filter** (trong recommendation search)
```javascript
GET /api/recommendations/search?q=tutorial&authorId=user-uuid-here
```

### Custom Filters (Advanced)

Có thể truyền filter tùy chỉnh cho MeiliSearch:

```javascript
GET /api/content/articles/search?q=tutorial&filters=category=technology AND tags=javascript
```

---

## Pagination

### Sử dụng offset-based pagination:

```javascript
// Page 1 (0-19)
GET /api/content/articles/search?q=javascript&limit=20&offset=0

// Page 2 (20-39)
GET /api/content/articles/search?q=javascript&limit=20&offset=20

// Page 3 (40-59)
GET /api/content/articles/search?q=javascript&limit=20&offset=40
```

### Hoặc page-based:

```javascript
// Page 1
GET /api/content/articles/search?q=javascript&limit=20&page=1

// Page 2
GET /api/content/articles/search?q=javascript&limit=20&page=2
```

**Lưu ý:** API sẽ tự động convert `page` sang `offset`:
- `offset = (page - 1) × limit`

---

## Response Format

```json
{
  "success": true,
  "data": [
    {
      "id": "01999a89-a566-7d70-9240-2291b905cd0b",
      "contentType": "article",
      "title": "JavaScript Tutorial",
      "description": "Learn JavaScript basics",
      "content": "...",
      "tags": ["javascript", "tutorial"],
      "category": "technology",
      "authorId": "user-uuid",
      "authorName": "john_doe",
      "status": "published",
      "createdAt": 1759234336,
      "updatedAt": 1759237534
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 150,
    "hasMore": true
  }
}
```

---

## API Endpoints với Search

### 1. Search Articles
```
GET /api/content/articles/search
```

**Query Parameters:**
- `q` (required): Search query
- `sortBy` (optional): `relevance` | `recent` | `popular`
- `limit` (optional, default: 20, max: 50)
- `offset` (optional, default: 0)
- `category` (optional)
- `tags` (optional)

### 2. Search Videos
```
GET /api/content/videos/search
```

**Query Parameters:** (giống articles)

### 3. Search Documents
```
GET /api/content/documents/search
```

**Query Parameters:** (giống articles)

### 4. Search All Content
```
GET /api/recommendations/search
```

**Query Parameters:** (giống trên + có thể search across all types)

---

## MeiliSearch Configuration

### Index Settings:

```javascript
// Content Index
{
  filterableAttributes: [
    'contentType',
    'authorId',
    'tags',
    'category',
    'createdAt'
  ],
  sortableAttributes: [
    'createdAt',
    'updatedAt'
  ],
  searchableAttributes: [
    'title',
    'description',
    'tags',
    'authorName',
    'content'
  ]
}
```

---

## Best Practices

### 1. **Sử dụng sortBy phù hợp:**
- `relevance`: Khi user tìm kiếm với từ khóa cụ thể
- `recent`: Khi hiển thị nội dung mới nhất
- `popular`: Khi hiển thị nội dung được yêu thích

### 2. **Kết hợp filter và sort:**
```javascript
// Tìm bài viết về JavaScript, mới nhất, trong category Technology
GET /api/content/articles/search?q=javascript&sortBy=recent&category=technology
```

### 3. **Pagination hiệu quả:**
- Sử dụng `offset` thay vì `page` khi có thể
- Giới hạn `limit` ≤ 50 để tránh overload
- Kiểm tra `hasMore` để biết còn kết quả hay không

### 4. **Cache results:**
- Search results được cache tự động
- Cache invalidation khi có content mới được publish

---

## Troubleshooting

### 1. Không có kết quả
- Kiểm tra `q` có đúng định dạng không
- Kiểm tra filters có conflict không
- Thử tìm với `q=*` để lấy tất cả

### 2. Sắp xếp không đúng
- Kiểm tra `sortBy` có trong list hợp lệ không
- Kiểm tra MeiliSearch index có `sortableAttributes` chưa

### 3. Filter không hoạt động
- Kiểm tra field có trong `filterableAttributes` không
- Kiểm tra syntax filter đúng format MeiliSearch

---

## Future Enhancements

### 1. Popularity Score
Thêm trường `popularityScore` tính toán dựa trên:
```javascript
popularityScore = (likes × 2) + (views × 0.5) + (comments × 3)
```

### 2. Advanced Filters
- Date range filter: `createdAt > timestamp AND createdAt < timestamp`
- Content length filter
- Has media filter

### 3. Faceted Search
- Group by category
- Group by tags
- Count by content type

### 4. Autocomplete & Suggestions
- Search suggestions as user types
- Related searches
- Popular searches

---

## Example Use Cases

### 1. Search Page with All Options
```javascript
const searchConfig = {
  query: 'javascript tutorial',
  sortBy: 'recent',
  category: 'technology',
  tags: ['javascript', 'beginner'],
  limit: 20,
  offset: 0
};

const url = new URL('/api/content/articles/search', window.location.origin);
Object.entries(searchConfig).forEach(([key, value]) => {
  if (value) {
    if (Array.isArray(value)) {
      url.searchParams.set(key, value.join(','));
    } else {
      url.searchParams.set(key, value);
    }
  }
});

const response = await fetch(url);
const results = await response.json();
```

### 2. Infinite Scroll
```javascript
let offset = 0;
const limit = 20;

async function loadMore() {
  const response = await fetch(
    `/api/content/articles/search?q=coding&limit=${limit}&offset=${offset}`
  );
  const data = await response.json();
  
  // Append results to UI
  appendResults(data.data);
  
  // Update offset for next page
  offset += limit;
  
  // Check if there's more
  return data.pagination.hasMore;
}
```

### 3. Filter Chips UI
```javascript
const activeFilters = {
  category: 'technology',
  tags: ['javascript', 'nodejs'],
  sortBy: 'recent'
};

function buildSearchUrl(query, filters) {
  const params = new URLSearchParams({ q: query });
  
  if (filters.category) {
    params.set('category', filters.category);
  }
  
  if (filters.tags && filters.tags.length > 0) {
    params.set('tags', filters.tags.join(','));
  }
  
  if (filters.sortBy) {
    params.set('sortBy', filters.sortBy);
  }
  
  return `/api/content/articles/search?${params}`;
}
```
