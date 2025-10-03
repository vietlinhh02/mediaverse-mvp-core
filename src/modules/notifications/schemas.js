// Swagger schemas for notification module
// These schemas are used by the main swagger configuration

const notificationSchemas = {
  // Request schemas
  NotificationRequest: {
    type: 'object',
    required: ['userId', 'type', 'title', 'content'],
    properties: {
      userId: {
        type: 'string',
        description: 'Target user ID',
        example: 'usr_123'
      },
      type: {
        type: 'string',
        enum: ['system', 'like', 'comment', 'follow', 'upload', 'custom'],
        description: 'Notification type',
        example: 'like'
      },
      title: {
        type: 'string',
        description: 'Notification title',
        example: 'Someone liked your post'
      },
      content: {
        type: 'string',
        description: 'Notification content',
        example: 'John Doe liked your video "React Tutorial"'
      },
      data: {
        type: 'object',
        description: 'Additional notification data',
        example: {
          contentId: 'vid_123',
          likerName: 'John Doe',
          actionUrl: '/videos/vid_123'
        }
      },
      options: {
        type: 'object',
        description: 'Notification delivery options',
        properties: {
          sendEmail: {
            type: 'boolean',
            default: false,
            description: 'Send via email'
          },
          sendPush: {
            type: 'boolean',
            default: false,
            description: 'Send via push notification'
          },
          sendInApp: {
            type: 'boolean',
            default: true,
            description: 'Send in-app notification'
          },
          priority: {
            type: 'string',
            enum: ['low', 'normal', 'high'],
            default: 'normal',
            description: 'Notification priority'
          },
          delay: {
            type: 'number',
            description: 'Delay in milliseconds'
          }
        },
        example: {
          sendEmail: false,
          sendPush: true,
          sendInApp: true,
          priority: 'normal'
        }
      }
    }
  },

  AdvancedNotificationRequest: {
    type: 'object',
    required: ['userId', 'type', 'title', 'content'],
    properties: {
      userId: {
        type: 'string',
        description: 'Target user ID',
        example: 'usr_123'
      },
      type: {
        type: 'string',
        enum: ['system', 'like', 'comment', 'follow', 'upload', 'custom'],
        example: 'system'
      },
      title: {
        type: 'string',
        example: 'System Maintenance'
      },
      content: {
        type: 'string',
        example: 'The system will be down for maintenance at 2 AM UTC'
      },
      data: {
        type: 'object',
        example: {
          maintenanceStart: '2024-01-15T02:00:00Z',
          estimatedDowntime: '30 minutes'
        }
      },
      options: {
        type: 'object',
        properties: {
          priority: {
            type: 'string',
            enum: ['low', 'normal', 'high'],
            default: 'normal',
            example: 'high'
          },
          delay: {
            type: 'number',
            description: 'Delay in milliseconds',
            example: 3600000
          },
          sendEmail: { type: 'boolean', default: false, example: true },
          sendPush: { type: 'boolean', default: false, example: true },
          sendInApp: { type: 'boolean', default: true, example: true }
        }
      }
    }
  },

  BatchNotificationRequest: {
    type: 'object',
    required: ['notifications'],
    properties: {
      notifications: {
        type: 'array',
        description: 'Array of notification objects',
        items: {
          type: 'object',
          required: ['userId', 'type', 'title', 'content'],
          properties: {
            userId: { type: 'string', example: 'usr_123' },
            type: { type: 'string', enum: ['system', 'like', 'comment', 'follow', 'upload'], example: 'like' },
            title: { type: 'string', example: 'New Like' },
            content: { type: 'string', example: 'Someone liked your video' },
            data: { type: 'object', example: { contentId: 'vid_123' } }
          }
        },
        example: [
          {
            userId: 'usr_123',
            type: 'like',
            title: 'New Like',
            content: 'Alice liked your video',
            data: { contentId: 'vid_456' }
          },
          {
            userId: 'usr_456',
            type: 'comment',
            title: 'New Comment',
            content: 'Bob commented on your post',
            data: { contentId: 'vid_789' }
          }
        ]
      }
    }
  },

  BulkNotificationRequest: {
    type: 'object',
    required: ['type', 'title', 'content'],
    properties: {
      criteria: {
        type: 'object',
        description: 'User filtering criteria',
        example: {
          role: 'user',
          status: 'active',
          lastActiveAfter: '2024-01-01'
        }
      },
      type: {
        type: 'string',
        enum: ['system', 'marketing', 'announcement'],
        example: 'system'
      },
      title: {
        type: 'string',
        example: 'System Update Available'
      },
      content: {
        type: 'string',
        example: 'A new version of the platform is now available'
      },
      data: {
        type: 'object',
        example: {
          version: '2.1.0',
          releaseNotesUrl: '/changelog'
        }
      },
      options: {
        type: 'object',
        properties: {
          sendEmail: { type: 'boolean', default: true, example: true },
          sendPush: { type: 'boolean', default: true, example: true },
          sendInApp: { type: 'boolean', default: true, example: true }
        }
      }
    }
  },

  DigestNotificationRequest: {
    type: 'object',
    properties: {
      userIds: {
        type: 'array',
        description: 'Specific user IDs to send digest to (optional)',
        items: { type: 'string' },
        example: ['usr_123', 'usr_456']
      },
      frequency: {
        type: 'string',
        enum: ['daily', 'weekly', 'monthly'],
        default: 'weekly',
        example: 'weekly'
      },
      options: {
        type: 'object',
        properties: {
          includeStats: { type: 'boolean', default: true },
          includeRecommendations: { type: 'boolean', default: true }
        }
      }
    }
  },

  EmailRequest: {
    type: 'object',
    required: ['to', 'subject', 'template'],
    properties: {
      to: {
        type: 'string',
        format: 'email',
        description: 'Recipient email address',
        example: 'user@example.com'
      },
      subject: {
        type: 'string',
        description: 'Email subject',
        example: 'Welcome to Mediaverse!'
      },
      template: {
        type: 'string',
        enum: ['notification', 'welcome', 'password-reset', 'email-verification', 'content-notification', 'weekly-digest'],
        description: 'Email template to use',
        example: 'welcome'
      },
      data: {
        type: 'object',
        description: 'Template data',
        example: {
          title: 'Welcome to Mediaverse!',
          message: 'Thank you for joining our community.',
          actionUrl: '/dashboard',
          userName: 'John Doe'
        }
      },
      options: {
        type: 'object',
        properties: {
          priority: {
            type: 'string',
            enum: ['low', 'normal', 'high'],
            default: 'normal'
          },
          tracking: {
            type: 'boolean',
            default: true,
            description: 'Enable email open tracking'
          }
        }
      }
    }
  },

  PushNotificationRequest: {
    type: 'object',
    required: ['userId', 'title', 'content'],
    properties: {
      userId: {
        type: 'string',
        description: 'Target user ID',
        example: 'usr_123'
      },
      title: {
        type: 'string',
        description: 'Push notification title',
        example: 'New Message'
      },
      content: {
        type: 'string',
        description: 'Push notification content',
        example: 'You have a new message from Alice'
      },
      data: {
        type: 'object',
        description: 'Additional push data',
        example: {
          type: 'message',
          senderId: 'usr_456',
          actionUrl: '/messages/usr_456'
        }
      },
      options: {
        type: 'object',
        properties: {
          ttl: {
            type: 'number',
            description: 'Time to live in seconds',
            default: 86400,
            example: 3600
          },
          badge: {
            type: 'number',
            description: 'Badge count',
            example: 5
          },
          sound: {
            type: 'string',
            description: 'Notification sound',
            example: 'default'
          },
          icon: {
            type: 'string',
            description: 'Notification icon URL',
            example: '/favicon.ico'
          }
        }
      }
    }
  },

  NotificationPreferencesRequest: {
    type: 'object',
    properties: {
      notifications: {
        type: 'object',
        description: 'Notification preferences',
        properties: {
          global: {
            type: 'boolean',
            description: 'Master toggle for all notifications',
            default: true,
            example: true
          },
          categories: {
            type: 'object',
            description: 'Category-specific preferences',
            properties: {
              likes: {
                type: 'object',
                properties: {
                  email: { type: 'boolean', default: false },
                  push: { type: 'boolean', default: false },
                  inApp: { type: 'boolean', default: true }
                }
              },
              comments: {
                type: 'object',
                properties: {
                  email: { type: 'boolean', default: false },
                  push: { type: 'boolean', default: true },
                  inApp: { type: 'boolean', default: true }
                }
              },
              follows: {
                type: 'object',
                properties: {
                  email: { type: 'boolean', default: false },
                  push: { type: 'boolean', default: false },
                  inApp: { type: 'boolean', default: true }
                }
              },
              uploads: {
                type: 'object',
                properties: {
                  email: { type: 'boolean', default: true },
                  push: { type: 'boolean', default: true },
                  inApp: { type: 'boolean', default: true }
                }
              },
              system: {
                type: 'object',
                properties: {
                  email: { type: 'boolean', default: true },
                  push: { type: 'boolean', default: true },
                  inApp: { type: 'boolean', default: true }
                }
              },
              marketing: {
                type: 'object',
                properties: {
                  email: { type: 'boolean', default: false },
                  push: { type: 'boolean', default: false },
                  inApp: { type: 'boolean', default: false }
                }
              }
            }
          },
          frequency: {
            type: 'object',
            description: 'Digest frequency preferences',
            properties: {
              digest: {
                type: 'string',
                enum: ['never', 'daily', 'weekly', 'monthly'],
                default: 'weekly',
                example: 'weekly'
              }
            }
          },
          quietHours: {
            type: 'object',
            description: 'Quiet hours configuration',
            properties: {
              enabled: { type: 'boolean', default: false },
              start: { type: 'string', format: 'time', example: '22:00' },
              end: { type: 'string', format: 'time', example: '08:00' },
              timezone: { type: 'string', example: 'UTC' }
            }
          }
        }
      }
    }
  },

  TestEmailRequest: {
    type: 'object',
    required: ['to', 'subject'],
    properties: {
      to: {
        type: 'string',
        format: 'email',
        example: 'test@example.com'
      },
      subject: {
        type: 'string',
        example: 'Test Email'
      },
      template: {
        type: 'string',
        enum: ['notification', 'welcome', 'password-reset', 'email-verification', 'content-notification', 'weekly-digest'],
        default: 'notification',
        example: 'notification'
      },
      data: {
        type: 'object',
        example: {
          title: 'Test Email',
          message: 'This is a test email to verify the email system is working.',
          userName: 'Test User'
        }
      }
    }
  },

  TestPushRequest: {
    type: 'object',
    required: ['message'],
    properties: {
      message: {
        type: 'string',
        description: 'Test message to send',
        example: 'This is a test push notification'
      },
      title: {
        type: 'string',
        default: 'Test Notification',
        example: 'Test Notification'
      },
      data: {
        type: 'object',
        example: {
          type: 'test',
          timestamp: '2024-01-15T10:00:00Z'
        }
      }
    }
  },

  PushSubscriptionRequest: {
    type: 'object',
    required: ['subscription'],
    properties: {
      subscription: {
        type: 'object',
        description: 'Push subscription object from browser',
        required: ['endpoint', 'keys'],
        properties: {
          endpoint: {
            type: 'string',
            description: 'Push service endpoint URL',
            example: 'https://fcm.googleapis.com/fcm/send/...'
          },
          keys: {
            type: 'object',
            required: ['p256dh', 'auth'],
            properties: {
              p256dh: {
                type: 'string',
                description: 'P-256 DH key for encryption',
                example: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8nJy...'
              },
              auth: {
                type: 'string',
                description: 'Authentication secret',
                example: 'kT-KjBw8fW8W8W8W8W8W...'
              }
            }
          }
        }
      },
      deviceInfo: {
        type: 'object',
        description: 'Device information',
        properties: {
          userAgent: {
            type: 'string',
            example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...'
          },
          platform: {
            type: 'string',
            enum: ['web', 'mobile'],
            default: 'web',
            example: 'web'
          },
          deviceName: {
            type: 'string',
            example: 'Chrome on Windows'
          },
          appVersion: {
            type: 'string',
            example: '1.0.0'
          }
        }
      }
    }
  },

  // Response schemas
  NotificationResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: true
      },
      message: {
        type: 'string',
        example: 'Notification queued successfully'
      },
      data: {
        type: 'object',
        properties: {
          notificationId: {
            type: 'string',
            example: 'not_123'
          },
          status: {
            type: 'string',
            example: 'queued'
          }
        }
      }
    }
  },

  NotificationListResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: true
      },
      data: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'not_123' },
            type: { type: 'string', example: 'like' },
            category: { type: 'string', example: 'likes' },
            title: { type: 'string', example: 'Someone liked your post' },
            content: { type: 'string', example: 'John liked your video' },
            status: { type: 'string', example: 'unread' },
            createdAt: { type: 'string', format: 'date-time' },
            readAt: { type: 'string', format: 'date-time', nullable: true }
          }
        }
      },
      pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 150 },
          pages: { type: 'integer', example: 8 },
          hasNext: { type: 'boolean', example: true },
          hasPrev: { type: 'boolean', example: false }
        }
      }
    }
  },

  NotificationStatsResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: true
      },
      data: {
        type: 'object',
        properties: {
          stats: {
            type: 'object',
            properties: {
              total: { type: 'integer', example: 47 },
              unread: { type: 'integer', example: 12 },
              read: { type: 'integer', example: 30 },
              archived: { type: 'integer', example: 5 },
              byCategory: {
                type: 'object',
                example: {
                  likes: 15,
                  comments: 20,
                  uploads: 8,
                  system: 4
                }
              },
              byType: {
                type: 'object',
                example: {
                  like: 15,
                  comment: 20,
                  upload: 8,
                  system: 4
                }
              }
            }
          }
        }
      }
    }
  },

  NotificationPreferencesResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: true
      },
      data: {
        type: 'object',
        properties: {
          notifications: {
            type: 'object',
            description: 'User notification preferences'
          }
        }
      }
    }
  },

  PushSubscriptionsResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: true
      },
      data: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'sub_123' },
            endpoint: { type: 'string', example: 'https://fcm.googleapis.com/fcm/send/...' },
            platform: { type: 'string', example: 'web' },
            deviceName: { type: 'string', example: 'Chrome on Windows' },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            lastUsed: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  },

  VapidKeyResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: true
      },
      data: {
        type: 'object',
        properties: {
          publicKey: {
            type: 'string',
            description: 'VAPID public key for push subscriptions',
            example: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8nJy...'
          }
        }
      }
    }
  },

  BatchOperationResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: true
      },
      message: {
        type: 'string',
        example: 'Batch operation completed successfully'
      },
      data: {
        type: 'object',
        properties: {
          count: {
            type: 'integer',
            description: 'Number of items processed',
            example: 25
          },
          processed: {
            type: 'array',
            items: { type: 'string' },
            description: 'IDs of successfully processed items'
          },
          failed: {
            type: 'array',
            items: { type: 'string' },
            description: 'IDs of failed items'
          }
        }
      }
    }
  }
};

module.exports = notificationSchemas;
