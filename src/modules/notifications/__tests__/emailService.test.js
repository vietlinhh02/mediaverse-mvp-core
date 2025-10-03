const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const EmailService = require('../services/emailService');

// Mock dependencies
jest.mock('nodemailer');
jest.mock('@sendgrid/mail');
jest.mock('fs/promises');
jest.mock('handlebars');

describe('EmailService Tests', () => {
  let emailService;
  let mockTransporter;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock nodemailer transporter
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
    };
    nodemailer.createTransporter = jest.fn().mockReturnValue(mockTransporter);

    // Mock SendGrid
    sgMail.setApiKey = jest.fn();
    sgMail.send = jest.fn().mockResolvedValue();

    // Create fresh instance
    emailService = new (require('../services/emailService').constructor)();

    // Mock template loading
    emailService.templates = new Map();
    emailService.textTemplates = new Map();
    emailService.templates.set('test-template', jest.fn().mockReturnValue('<html>Test HTML</html>'));
    emailService.textTemplates.set('test-template', jest.fn().mockReturnValue('Test Text'));
  });

  describe('initialize', () => {
    it('should initialize with SendGrid when API key is provided', () => {
      process.env.SENDGRID_API_KEY = 'test-key';

      const service = new (require('../services/emailService').constructor)();

      expect(sgMail.setApiKey).toHaveBeenCalledWith('test-key');
      delete process.env.SENDGRID_API_KEY;
    });

    it('should initialize with nodemailer when SendGrid key is not provided', () => {
      delete process.env.SENDGRID_API_KEY;

      const service = new (require('../services/emailService').constructor)();

      expect(nodemailer.createTransporter).toHaveBeenCalled();
    });
  });

  describe('sendNotification', () => {
    beforeEach(() => {
      emailService.useSendGrid = false;
      emailService.transporter = mockTransporter;
    });

    it('should send email with nodemailer successfully', async () => {
      const result = await emailService.sendNotification(
        'test@example.com',
        'Test Subject',
        { title: 'Test Title', message: 'Test Message' },
        'test-template'
      );

      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Test Subject',
          html: expect.any(String),
          text: expect.any(String)
        })
      );
    });

    it('should send email with SendGrid successfully', async () => {
      emailService.useSendGrid = true;

      const result = await emailService.sendNotification(
        'test@example.com',
        'Test Subject',
        { title: 'Test Title', message: 'Test Message' },
        'test-template'
      );

      expect(result.success).toBe(true);
      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Test Subject',
          html: expect.any(String),
          text: expect.any(String)
        })
      );
    });

    it('should generate unsubscribe token when userId provided', async () => {
      const spy = jest.spyOn(emailService, 'generateUnsubscribeToken').mockReturnValue('test-token');

      await emailService.sendNotification(
        'test@example.com',
        'Test Subject',
        { userId: 'user123', title: 'Test', message: 'Message' }
      );

      expect(spy).toHaveBeenCalledWith('user123');
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'List-Unsubscribe': expect.stringContaining('test-token')
          })
        })
      );

      spy.mockRestore();
    });

    it('should include tracking pixel when enabled', async () => {
      const spy = jest.spyOn(emailService, 'generateTrackingPixel').mockReturnValue('<img src="tracking.gif">');

      await emailService.sendNotification(
        'test@example.com',
        'Test Subject',
        { notificationId: 'notif123', title: 'Test', message: 'Message' },
        'test-template',
        { enableTracking: true }
      );

      expect(spy).toHaveBeenCalledWith('notif123');
      spy.mockRestore();
    });

    it('should handle email sending errors', async () => {
      const error = new Error('SMTP Error');
      error.responseCode = 550;
      mockTransporter.sendMail.mockRejectedValue(error);

      const spy = jest.spyOn(emailService, 'handleBounce').mockResolvedValue();

      await expect(
        emailService.sendNotification('test@example.com', 'Subject', { title: 'Test' })
      ).rejects.toThrow('SMTP Error');

      expect(spy).toHaveBeenCalledWith('test@example.com', 'hard', 'SMTP Error');
      spy.mockRestore();
    });
  });

  describe('sendBulkNotifications', () => {
    it('should send bulk emails in batches', async () => {
      const emails = ['test1@example.com', 'test2@example.com', 'test3@example.com'];
      const spy = jest.spyOn(emailService, 'sendNotification').mockResolvedValue({ success: true });

      await emailService.sendBulkNotifications(
        emails,
        'Bulk Subject',
        { title: 'Bulk Message' },
        'test-template',
        { batchSize: 2, delay: 100 }
      );

      expect(spy).toHaveBeenCalledTimes(3);
      expect(spy).toHaveBeenCalledWith(
        'test1@example.com',
        'Bulk Subject',
        { title: 'Bulk Message' },
        'test-template',
        { batchSize: 2, delay: 100 }
      );

      spy.mockRestore();
    });
  });

  describe('renderTemplate', () => {
    it('should render template with data', () => {
      const mockTemplate = jest.fn().mockReturnValue('<html>Rendered</html>');
      emailService.templates.set('test', mockTemplate);

      const result = emailService.renderTemplate('test', { name: 'John' });

      expect(result).toBe('<html>Rendered</html>');
      expect(mockTemplate).toHaveBeenCalledWith({ name: 'John' });
    });

    it('should return fallback HTML when template not found', () => {
      const result = emailService.renderTemplate('nonexistent', {
        title: 'Test Title',
        message: 'Test Message',
        actionUrl: 'https://example.com'
      });

      expect(result).toContain('Test Title');
      expect(result).toContain('Test Message');
      expect(result).toContain('https://example.com');
    });
  });

  describe('renderTextTemplate', () => {
    it('should render text template with data', () => {
      const mockTemplate = jest.fn().mockReturnValue('Rendered Text');
      emailService.textTemplates.set('test', mockTemplate);

      const result = emailService.renderTextTemplate('test', { name: 'John' });

      expect(result).toBe('Rendered Text');
      expect(mockTemplate).toHaveBeenCalledWith({ name: 'John' });
    });

    it('should return fallback text when template not found', () => {
      const result = emailService.renderTextTemplate('nonexistent', {
        title: 'Test Title',
        message: 'Test Message'
      });

      expect(result).toContain('Test Title');
      expect(result).toContain('Test Message');
    });
  });

  describe('generateUnsubscribeToken', () => {
    it('should generate valid unsubscribe token', () => {
      const jwt = require('jsonwebtoken');
      jest.spyOn(jwt, 'sign').mockReturnValue('test-token');

      const result = emailService.generateUnsubscribeToken('user123');

      expect(result).toBe('test-token');
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          type: 'unsubscribe'
        }),
        expect.any(String)
      );
    });
  });

  describe('generateTrackingPixel', () => {
    it('should generate tracking pixel HTML', () => {
      const result = emailService.generateTrackingPixel('notif123');

      expect(result).toContain('img');
      expect(result).toContain('notif123');
      expect(result).toContain('width="1"');
      expect(result).toContain('height="1"');
    });

    it('should return null when notificationId not provided', () => {
      const result = emailService.generateTrackingPixel(null);
      expect(result).toBeNull();
    });
  });

  describe('handleBounce', () => {
    it('should log bounce information', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await emailService.handleBounce('test@example.com', 'hard', 'Invalid email');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Hard bounce detected')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email with correct data', async () => {
      const spy = jest.spyOn(emailService, 'sendNotification').mockResolvedValue({ success: true });

      await emailService.sendWelcomeEmail('test@example.com', {
        displayName: 'John Doe',
        userId: 'user123'
      });

      expect(spy).toHaveBeenCalledWith(
        'test@example.com',
        'Welcome to Mediaverse!',
        expect.objectContaining({
          userName: 'John Doe',
          title: 'Welcome to Mediaverse!',
          actionText: 'Explore Mediaverse'
        }),
        'welcome',
        { categories: ['welcome', 'onboarding'] }
      );

      spy.mockRestore();
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email', async () => {
      const spy = jest.spyOn(emailService, 'sendNotification').mockResolvedValue({ success: true });

      await emailService.sendPasswordResetEmail('test@example.com', 'reset-token-123');

      expect(spy).toHaveBeenCalledWith(
        'test@example.com',
        'Reset Your Password',
        expect.objectContaining({
          title: 'Password Reset Request',
          actionUrl: expect.stringContaining('reset-token-123'),
          actionText: 'Reset Password'
        }),
        'password-reset',
        expect.objectContaining({
          categories: ['security', 'password-reset'],
          enableTracking: true
        })
      );

      spy.mockRestore();
    });
  });

  describe('sendContentNotification', () => {
    it('should send like notification', async () => {
      const spy = jest.spyOn(emailService, 'sendNotification').mockResolvedValue({ success: true });

      await emailService.sendContentNotification('test@example.com', {
        type: 'like',
        contentTitle: 'My Video',
        userName: 'John Doe',
        actionUrl: 'https://example.com/video/123'
      });

      expect(spy).toHaveBeenCalledWith(
        'test@example.com',
        'Someone Liked Your Content',
        expect.objectContaining({
          title: 'Someone Liked Your Content',
          message: 'John Doe liked your content "My Video"',
          actionText: 'View Content'
        }),
        'content-notification',
        expect.objectContaining({
          categories: ['content', 'like'],
          enableTracking: true
        })
      );

      spy.mockRestore();
    });

    it('should send comment notification', async () => {
      const spy = jest.spyOn(emailService, 'sendNotification').mockResolvedValue({ success: true });

      await emailService.sendContentNotification('test@example.com', {
        type: 'comment',
        contentTitle: 'My Video',
        userName: 'Jane Doe'
      });

      expect(spy).toHaveBeenCalledWith(
        'test@example.com',
        'New Comment on Your Content',
        expect.objectContaining({
          message: 'Jane Doe commented on your content "My Video"'
        }),
        'content-notification',
        expect.objectContaining({
          categories: ['content', 'comment']
        })
      );

      spy.mockRestore();
    });

    it('should send follow notification', async () => {
      const spy = jest.spyOn(emailService, 'sendNotification').mockResolvedValue({ success: true });

      await emailService.sendContentNotification('test@example.com', {
        type: 'follow',
        userName: 'New Follower'
      });

      expect(spy).toHaveBeenCalledWith(
        'test@example.com',
        'New Follower',
        expect.objectContaining({
          message: 'New Follower started following you'
        }),
        'content-notification',
        expect.objectContaining({
          categories: ['content', 'follow']
        })
      );

      spy.mockRestore();
    });
  });

  describe('sendWeeklyDigest', () => {
    it('should send weekly digest email', async () => {
      const spy = jest.spyOn(emailService, 'sendNotification').mockResolvedValue({ success: true });

      await emailService.sendWeeklyDigest('test@example.com', {
        userName: 'John Doe',
        stats: { views: 100, likes: 50 },
        topContent: [{ title: 'Video 1' }],
        newFollowers: [{ name: 'Follower 1' }]
      });

      expect(spy).toHaveBeenCalledWith(
        'test@example.com',
        'Your Weekly Mediaverse Digest',
        expect.objectContaining({
          userName: 'John Doe',
          title: 'Your Weekly Digest',
          stats: { views: 100, likes: 50 },
          actionText: 'View All Activity'
        }),
        'weekly-digest',
        expect.objectContaining({
          categories: ['digest', 'weekly'],
          enableTracking: true
        })
      );

      spy.mockRestore();
    });
  });

  describe('testEmail', () => {
    it('should send test email', async () => {
      const spy = jest.spyOn(emailService, 'sendNotification').mockResolvedValue({ success: true });

      await emailService.testEmail('admin@example.com');

      expect(spy).toHaveBeenCalledWith(
        'admin@example.com',
        'Email Service Test - Mediaverse',
        expect.objectContaining({
          title: 'Email Service Test',
          testMode: true
        }),
        'system-notification'
      );

      spy.mockRestore();
    });

    it('should handle missing test email address', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await emailService.testEmail();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No test email address provided')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('htmlToText', () => {
    it('should convert HTML to plain text', () => {
      const html = '<p>Hello <strong>world</strong>!</p><br><p>Another paragraph.</p>';

      const result = emailService.htmlToText(html);

      expect(result).toContain('Hello world!');
      expect(result).toContain('Another paragraph.');
      expect(result).not.toContain('<p>');
      expect(result).not.toContain('<strong>');
    });

    it('should handle HTML entities', () => {
      const html = 'Hello &amp; goodbye &lt;test&gt; &nbsp;';

      const result = emailService.htmlToText(html);

      expect(result).toBe('Hello & goodbye <test>  ');
    });
  });

  describe('Error Handling', () => {
    it('should handle nodemailer errors', async () => {
      const error = new Error('Network error');
      mockTransporter.sendMail.mockRejectedValue(error);

      await expect(
        emailService.sendNotification('test@example.com', 'Subject', { title: 'Test' })
      ).rejects.toThrow('Network error');
    });

    it('should handle SendGrid errors', async () => {
      emailService.useSendGrid = true;
      const error = new Error('SendGrid error');
      sgMail.send.mockRejectedValue(error);

      await expect(
        emailService.sendNotification('test@example.com', 'Subject', { title: 'Test' })
      ).rejects.toThrow('SendGrid error');
    });
  });
});
