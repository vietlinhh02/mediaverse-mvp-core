# Mediaverse MVP

A multimedia content platform that combines video sharing, article publishing, document sharing, and learning features into a unified ecosystem.

## Features

- **Multi-format Content**: Support for videos, articles, documents, and images
- **Social Features**: User profiles, channels, following, likes, comments
- **Content Discovery**: Personalized feeds, trending content, search functionality
- **Moderation System**: Content reporting, admin dashboard, AI-powered filtering
- **Real-time Notifications**: In-app, email, and push notifications
- **Media Processing**: Video transcoding, thumbnail generation, adaptive streaming
- **Analytics**: Creator dashboard with engagement metrics and insights
- **API Documentation**: Interactive Swagger/OpenAPI documentation

## Architecture

The application follows a hybrid monolith/microservices architecture:

- **Core Monolith**: Handles authentication, user management, content operations, and moderation
- **Media Processing Service**: Handles video/audio processing and file operations
- **Notification Service**: Manages real-time notifications, email, and push notifications

## Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18+
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Cache**: Redis 7+
- **Queue**: Bull (Redis-based job queue)
- **Authentication**: JWT + Passport.js
- **File Processing**: FFmpeg, Sharp
- **Logging**: Winston
- **Testing**: Jest + Supertest

### External Services
- **File Storage**: AWS S3 or MinIO
- **Email**: SendGrid
- **Push Notifications**: Firebase Cloud Messaging
- **OAuth**: Google, GitHub, Facebook

## Prerequisites

Before running the application, ensure you have the following installed:

- Node.js 18+ and npm 8+
- PostgreSQL 15+
- Redis 7+
- FFmpeg (for media processing)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mediaverse-mvp-core
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` file with your configuration values.

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push database schema
   npm run db:push
   
   # Seed the database (optional)
   npm run db:seed
   ```

5. **Create required directories**
   ```bash
   mkdir -p logs uploads temp
   ```

## Development

### Running the application

```bash
# Development mode with hot reloading
npm run dev

# Production mode
npm start
```

The API will be available at `http://localhost:3000`

### API Documentation

Once the server is running, you can access:
- **API Documentation (Swagger)**: `http://localhost:3000/api-docs`
- **Health Check**: `http://localhost:3000/health`
- **API Info**: `http://localhost:3000/api`

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Database Management

### Migrations

```bash
# Create a new migration
npx prisma migrate dev --name migration-name

# Apply migrations
npm run db:migrate

# Reset database
npx prisma migrate reset
```

### Database Studio

```bash
# Open Prisma Studio
npx prisma studio
```

## Project Structure

```
src/
├── app.js                 # Main application entry point
├── config/               # Configuration files
│   ├── database.js       # Database configuration
│   ├── redis.js          # Redis configuration
│   ├── auth.js           # Authentication configuration
│   └── storage.js        # File storage configuration
├── middleware/           # Express middleware
│   ├── auth.js           # Authentication middleware
│   ├── validation.js     # Request validation
│   ├── errorHandler.js   # Error handling
│   └── logger.js         # Request logging
├── modules/              # Feature modules
│   ├── auth/             # Authentication module
│   ├── users/            # User management module
│   ├── content/          # Content management module
│   ├── moderation/       # Content moderation module
│   └── recommendations/  # Recommendation engine
├── services/             # Business logic services
├── models/               # Prisma models and database schemas
├── utils/                # Utility functions
├── jobs/                 # Background job definitions
└── tests/                # Test files
```

## Environment Variables

Key environment variables that need to be configured:

### Required
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret key for JWT tokens

### Optional
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `AWS_*`: AWS S3 configuration for file storage
- `SENDGRID_API_KEY`: For email notifications
- `FIREBASE_*`: For push notifications
- OAuth provider credentials for social login

## API Documentation

The API is fully documented using **Swagger/OpenAPI 3.0**. Once the server is running, you can access the interactive documentation at:

**📚 [http://localhost:3000/api-docs](http://localhost:3000/api-docs)**

### Features of the API Documentation:
- **Interactive Testing**: Try out API endpoints directly from the browser
- **Authentication Support**: Test authenticated endpoints with JWT tokens
- **Request/Response Examples**: See example payloads and responses
- **Schema Validation**: View detailed request and response schemas
- **Error Documentation**: Understand error codes and responses

### API Endpoints Overview

The API is organized into the following main categories:

#### System
- `GET /health` - Health check endpoint
- `GET /api` - API information

#### Authentication
- User registration, login, logout
- JWT token management
- OAuth integration (Google, GitHub, Facebook)
- Password reset and email verification

#### Users
- User profile management
- Channel creation and management
- Follow/unfollow functionality
- User statistics and analytics

#### Content - Articles
- Create, read, update, delete articles
- Article search and filtering
- Featured image upload
- Article revisions and history

#### Content - Videos
- Video upload with progress tracking
- Video transcoding and processing
- Adaptive streaming (HLS)
- Thumbnail generation
- Video statistics and analytics

#### Content - Documents ✨
- **Document Upload**: Support for PDF, Office files, text documents
- **Document Management**: CRUD operations with full validation
- **Text Extraction**: Extract and search text content from documents
- **Preview Generation**: Generate document previews
- **Download Control**: Temporary download links with expiration
- **Folder Organization**: Create folders to organize documents
- **Bulk Operations**: Move multiple documents at once
- **Search & Filter**: Advanced search with category and file type filters
- **Document Analytics**: View counts, downloads, and engagement metrics
- **Processing Status**: Track document processing in real-time

**🎯 Document API Demo**: [http://localhost:3000/document-demo.html](http://localhost:3000/document-demo.html)

**📖 Full Documentation**: See [docs/document-api-endpoints.md](docs/document-api-endpoints.md) for complete API reference

#### Content - Interactions
- Like/unlike content
- Comment on content
- Share content
- Content statistics

#### Feed System
- Personalized content feed
- Trending content discovery
- Category-based feeds
- Smart recommendation algorithm

#### Moderation
- Content reporting system
- Moderation dashboard
- Automated content filtering
- User management and banning

#### Notifications
- Real-time in-app notifications
- Email notifications
- Push notifications (Firebase)
- Notification preferences

#### Recommendations
- Personalized content recommendations
- Similar content discovery
- Trending content analysis

**Note**: The Swagger documentation at `/api-docs` always reflects the current state of the API with interactive testing capabilities.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the repository or contact the development team.