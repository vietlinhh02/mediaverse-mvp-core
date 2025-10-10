// Swagger configuration
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Import notification schemas
const notificationSchemas = require('../modules/notifications/schemas');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Mediaverse MVP API',
      version: '1.0.0',
      description: 'A multimedia content platform API that combines video sharing, article publishing, document sharing, and learning features',
      contact: {
        name: 'Mediaverse Team',
        email: 'support@mediaverse.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`,
        description: 'Development server'
      },
      {
        url: 'https://api.mediaverse.com',
        description: 'Production server'
      }
    ],
    tags: [
      {
        name: 'System',
        description: 'System endpoints for health checks and API information'
      },
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Users',
        description: 'User profile management endpoints'
      },
      {
        name: 'Follow',
        description: 'User follow/unfollow operations'
      },
      {
        name: 'Preferences',
        description: 'User preferences management endpoints'
      },
      {
        name: 'Content',
        description: 'Content creation, management, and interaction endpoints'
      },
      {
        name: 'Moderation',
        description: 'Content moderation and reporting endpoints'
      },
      {
        name: 'Recommendations',
        description: 'Content recommendation and discovery endpoints'
      },
      {
        name: 'Media',
        description: 'Media processing and management'
      },
      {
        name: 'Notifications',
        description: 'Notification management and delivery endpoints'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization header using the Bearer scheme'
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for service-to-service authentication'
        }
      },
      schemas: {
        // Notification schemas
        ...notificationSchemas,

        Error: {
          type: 'object',
          required: ['error', 'code', 'timestamp'],
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            code: {
              type: 'string',
              description: 'Error code'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Error timestamp'
            },
            path: {
              type: 'string',
              description: 'Request path'
            },
            method: {
              type: 'string',
              description: 'HTTP method'
            },
            traceId: {
              type: 'string',
              description: 'Request trace ID'
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                  value: { type: 'string' }
                }
              },
              description: 'Validation error details'
            }
          }
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'OK'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            },
            uptime: {
              type: 'number',
              description: 'Server uptime in seconds'
            }
          }
        },
        ApiInfo: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Mediaverse MVP API'
            },
            version: {
              type: 'string',
              example: '1.0.0'
            },
            status: {
              type: 'string',
              example: 'running'
            }
          }
        },
        User: {
          type: 'object',
          required: ['id', 'email', 'username'],
          properties: {
            id: {
              type: 'string',
              description: 'User unique identifier'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            username: {
              type: 'string',
              description: 'User username'
            },
            role: {
              type: 'string',
              enum: ['user', 'admin', 'moderator'],
              description: 'User role'
            },
            status: {
              type: 'string',
              enum: ['active', 'suspended', 'banned'],
              description: 'User status'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Profile: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Profile unique identifier'
            },
            userId: {
              type: 'string',
              description: 'Associated user ID'
            },
            displayName: {
              type: 'string',
              description: 'Display name'
            },
            bio: {
              type: 'string',
              nullable: true,
              description: 'User biography'
            },
            avatarUrl: {
              type: 'string',
              format: 'uri',
              nullable: true,
              description: 'Avatar image URL'
            },
            coverImageUrl: {
              type: 'string',
              format: 'uri',
              nullable: true,
              description: 'Cover image URL'
            },
            location: {
              type: 'string',
              nullable: true,
              description: 'User location'
            },
            website: {
              type: 'string',
              format: 'uri',
              nullable: true,
              description: 'User website URL'
            },
            phoneNumber: {
              type: 'string',
              nullable: true,
              description: 'User phone number'
            },
            dateOfBirth: {
              type: 'string',
              format: 'date',
              nullable: true,
              description: 'User date of birth'
            },
            gender: {
              type: 'string',
              nullable: true,
              description: 'User gender'
            },
            occupation: {
              type: 'string',
              nullable: true,
              description: 'User occupation'
            },
            company: {
              type: 'string',
              nullable: true,
              description: 'User company'
            },
            education: {
              type: 'string',
              nullable: true,
              description: 'User education background'
            },
            socialLinks: {
              type: 'object',
              description: 'Social media links (JSON object)',
              example: {
                twitter: 'https://twitter.com/username',
                linkedin: 'https://linkedin.com/in/username',
                github: 'https://github.com/username'
              }
            },
            preferences: {
              type: 'object',
              description: 'User preferences (JSON object)',
              example: {
                theme: 'dark',
                language: 'en',
                notifications: {
                  email: true,
                  push: false
                }
              }
            },
            stats: {
              type: 'object',
              description: 'User statistics (JSON object)',
              example: {
                followers: 150,
                following: 75,
                posts: 42,
                likes: 1250
              }
            },
            isVerified: {
              type: 'boolean',
              description: 'Whether the user is verified'
            },
            isPublic: {
              type: 'boolean',
              description: 'Whether the profile is public'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        MediaJobRequest: {
          type: 'object',
          required: ['input'],
          properties: {
            input: {
              type: 'string',
              description: 'Source media URL or storage key',
              example: 's3://mediaverse/uploads/video.mp4'
            },
            outputDir: {
              type: 'string',
              description: 'Destination directory for processed outputs',
              example: 's3://mediaverse/processed/video123'
            },
            options: {
              type: 'object',
              description: 'Operation specific options',
              additionalProperties: true,
              example: {
                resolution: '1080p',
                bitrate: '4500k'
              }
            }
          }
        },
        MediaJobResponse: {
          type: 'object',
          properties: {
            jobId: {
              type: 'string',
              description: 'Identifier of the enqueued job',
              example: '0199774e-3731-7cc2-8de4-b122ff7f4eb9'
            },
            status: {
              type: 'string',
              description: 'Current queue status',
              example: 'queued'
            }
          }
        },
        MediaJobStatus: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Job identifier' },
            type: { type: 'string', description: 'Job type identifier' },
            status: {
              type: 'string',
              description: 'Current processing status',
              example: 'active'
            },
            progress: {
              type: 'number',
              format: 'float',
              description: 'Progress percentage (0-100)',
              example: 65.5
            },
            payload: {
              type: 'object',
              additionalProperties: true,
              description: 'Original payload supplied when the job was queued'
            },
            result: {
              type: 'object',
              nullable: true,
              additionalProperties: true,
              description: 'Result data when available'
            },
            error: {
              type: 'object',
              nullable: true,
              additionalProperties: true,
              description: 'Error details if the job failed'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              description: 'Current page number',
              example: 1
            },
            limit: {
              type: 'integer',
              description: 'Number of items per page',
              example: 20
            },
            total: {
              type: 'integer',
              description: 'Total number of items',
              example: 150
            },
            pages: {
              type: 'integer',
              description: 'Total number of pages',
              example: 8
            }
          }
        },
        Content: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Content unique identifier'
            },
            type: {
              type: 'string',
              enum: ['video', 'article', 'document'],
              description: 'Content type'
            },
            title: {
              type: 'string',
              description: 'Content title'
            },
            description: {
              type: 'string',
              description: 'Content description'
            },
            body: {
              type: 'string',
              description: 'Content body (article content)'
            },
            content: {
              type: 'string',
              description: 'Content body (alias for body)'
            },
            category: {
              type: 'string',
              description: 'Content category'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Content tags'
            },
            visibility: {
              type: 'string',
              enum: ['public', 'private', 'unlisted'],
              description: 'Content visibility'
            },
            status: {
              type: 'string',
              enum: ['draft', 'published', 'archived'],
              description: 'Content status'
            },
            featuredImage: {
              type: 'string',
              description: 'Featured image URL'
            },
            authorId: {
              type: 'string',
              description: 'Author ID'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            },
            publishedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Publication timestamp'
            },
            author: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                username: { type: 'string' },
                profile: {
                  type: 'object',
                  properties: {
                    displayName: { type: 'string' },
                    avatarUrl: { type: 'string' }
                  }
                }
              }
            },
            stats: {
              type: 'object',
              description: 'Content statistics'
            },
            metadata: {
              type: 'object',
              description: 'Content metadata (processing info, duration, etc.)'
            },
            _count: {
              type: 'object',
              properties: {
                likes: { type: 'integer' },
                comments: { type: 'integer' }
              }
            }
          }
        }
      },
      responses: {
        BadRequest: {
          description: 'Bad Request',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        Unauthorized: {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        Forbidden: {
          description: 'Forbidden',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        NotFound: {
          description: 'Not Found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        InternalServerError: {
          description: 'Internal Server Error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/app.js',
    './src/modules/**/*.js',
    './src/middleware/**/*.js'
  ]
};

const specs = swaggerJsdoc(options);

const swaggerOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #3b82f6 }
  `,
  customSiteTitle: 'Mediaverse MVP API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true
  }
};

module.exports = {
  specs,
  swaggerUi,
  swaggerOptions
};
