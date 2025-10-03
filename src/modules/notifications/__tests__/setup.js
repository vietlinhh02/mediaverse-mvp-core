// Test setup for notifications module
const { PrismaClient } = require('@prisma/client');

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.EMAIL_FROM = 'test@mediaverse.com';
process.env.EMAIL_FROM_NAME = 'Mediaverse Test';

// Global test setup
beforeAll(() => {
  // Set up global mocks that should persist across all tests
  jest.setTimeout(10000); // 10 second timeout for tests
});

afterAll(async () => {
  // Cleanup after all tests
  jest.clearAllTimers();
  jest.restoreAllMocks();
});

// Mock Prisma globally
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn()
    },
    pushSubscription: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn()
    },
    profile: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn()
    },
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn()
    },
    $disconnect: jest.fn(),
    $connect: jest.fn(),
    $transaction: jest.fn()
  }))
}));

// Mock external dependencies
jest.mock('nodemailer', () => ({
  createTransporter: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
  }))
}));

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue(),
  setIpPoolId: jest.fn()
}));

jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn().mockResolvedValue()
}));

jest.mock('handlebars', () => ({
  compile: jest.fn(() => jest.fn().mockReturnValue('compiled template'))
}));

jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue('template content')
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({ userId: 'user123', type: 'unsubscribe' })
}));

// Mock notification queue
jest.mock('../../../jobs/notificationQueue', () => ({
  pushQueue: {
    add: jest.fn().mockResolvedValue({ id: 'job123' })
  },
  createJob: jest.fn().mockResolvedValue({ id: 'job123' }),
  createDelayedJob: jest.fn().mockResolvedValue({ id: 'job123' }),
  PRIORITY: {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
    CRITICAL: 'critical'
  }
}));

// Mock WebSocket manager
jest.mock('../websocket/webSocketManager', () => ({
  broadcast: jest.fn(),
  sendToUser: jest.fn(),
  sendToRoom: jest.fn()
}));

// Global test utilities
global.createMockUser = (overrides = {}) => ({
  id: 'user123',
  userId: 'user123',
  username: 'testuser',
  email: 'test@example.com',
  role: 'user',
  ...overrides
});

global.createMockNotification = (overrides = {}) => ({
  id: 'notif123',
  userId: 'user123',
  type: 'info',
  title: 'Test Notification',
  message: 'Test message',
  status: 'unread',
  category: 'general',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

global.createMockSubscription = (overrides = {}) => ({
  id: 'sub123',
  userId: 'user123',
  endpoint: 'https://example.com/endpoint',
  keys: {
    p256dh: 'test-p256dh-key',
    auth: 'test-auth-key'
  },
  isActive: true,
  createdAt: new Date(),
  lastActive: new Date(),
  ...overrides
});

global.createMockPreferences = (overrides = {}) => ({
  notifications: {
    emailNotifications: true,
    pushNotifications: true,
    inAppNotifications: true,
    categories: {
      likes: { email: true, push: true, inApp: true },
      comments: { email: true, push: true, inApp: true },
      follows: { email: true, push: true, inApp: true },
      uploads: { email: true, push: true, inApp: true },
      system: { email: true, push: false, inApp: true },
      marketing: { email: false, push: false, inApp: false }
    },
    frequency: {
      digest: 'weekly',
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    }
  },
  privacy: {
    showOnlineStatus: true,
    allowDirectMessages: true
  },
  ...overrides
});

// Console mock to reduce noise in tests
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Restore console for debugging when needed
global.restoreConsole = () => {
  global.console = originalConsole;
};

module.exports = {
  createMockUser: global.createMockUser,
  createMockNotification: global.createMockNotification,
  createMockSubscription: global.createMockSubscription,
  createMockPreferences: global.createMockPreferences,
  restoreConsole: global.restoreConsole
};
