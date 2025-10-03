// Email Service for notifications
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../../../../prisma/prismaClient');
const behaviorService = require('../../analytics/services/behaviorService');
const { logger } = require('../../../utils');

class EmailService {
  constructor() {
    this.templates = new Map();
    this.textTemplates = new Map();
    this.transporter = null;
    this.baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@mediaverse.com';

    this.initialize();
  }

  /**
   * Initialize email service with enhanced configuration
   */
  initialize() {
    // Use nodemailer for development/local with enhanced settings
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      // Enhanced settings for better deliverability
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 5,
      // DKIM settings if available
      dkim: process.env.DKIM_PRIVATE_KEY ? {
        domainName: process.env.DKIM_DOMAIN,
        keySelector: process.env.DKIM_SELECTOR,
        privateKey: process.env.DKIM_PRIVATE_KEY
      } : undefined
    });

    console.log(' Email service initialized with nodemailer');

    // Load email templates
    this.loadTemplates();
  }

  /**
   * Load email templates (both HTML and text versions)
   */
  async loadTemplates() {
    const templateDir = path.join(__dirname, '../templates/email');

    try {
      // Available templates with both HTML and text versions
      const templates = [
        'welcome',
        'password-reset',
        'content-notification',
        'weekly-digest',
        'system-notification',
        'login-otp'
      ];

      let loadedCount = 0;

      for (const template of templates) {
        try {
          // Load HTML template
          const htmlTemplatePath = path.join(templateDir, `${template}.hbs`);
          const htmlContent = await fs.readFile(htmlTemplatePath, 'utf8');
          this.templates.set(template, handlebars.compile(htmlContent));

          // Load text template if exists
          try {
            const textTemplatePath = path.join(templateDir, `${template}.txt.hbs`);
            const textContent = await fs.readFile(textTemplatePath, 'utf8');
            this.textTemplates.set(template, handlebars.compile(textContent));
          } catch (textError) {
            // Text template is optional, create basic text version from HTML
            const basicText = this.htmlToText(htmlContent);
            this.textTemplates.set(template, handlebars.compile(basicText));
          }

          loadedCount++;
          console.log(`Loaded email template: ${template}`);
        } catch (error) {
          console.warn(`Email template ${template} not found: ${error.message}`);
        }
      }

      console.log(`Loaded ${loadedCount} email template pairs (HTML + Text)`);
    } catch (error) {
      console.warn('Email templates directory not found:', error.message);
    }
  }

  /**
   * Convert basic HTML to text for fallback
   */
  htmlToText(html) {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Send email notification with enhanced features
   */
  async sendNotification(to, subject, data, template = 'content-notification', options = {}) {
    try {
      // Generate unsubscribe token if userId provided
      let unsubscribeToken = null;
      if (data.userId) {
        unsubscribeToken = this.generateUnsubscribeToken(data.userId);
      }

      // Prepare template data with common variables
      const templateData = {
        ...data,
        baseUrl: this.baseUrl,
        unsubscribeUrl: unsubscribeToken ? `${this.baseUrl}/unsubscribe?token=${unsubscribeToken}` : null,
        preferencesUrl: `${this.baseUrl}/settings/notifications`,
        year: new Date().getFullYear(),
        // Add tracking pixel if enabled
        trackingPixel: options.enableTracking ? this.generateTrackingPixel(data.notificationId) : null
      };

      // Render HTML and text versions
      const html = this.renderTemplate(template, templateData);
      const text = this.renderTextTemplate(template, templateData);

      // Prepare mail options with enhanced features
      const mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'Mediaverse',
          address: this.fromEmail
        },
        to,
        subject,
        html,
        text,
        // Enhanced headers for better deliverability
        headers: {
          'X-Mailer': 'Mediaverse Notification System',
          'List-Unsubscribe': unsubscribeToken ? `<${this.baseUrl}/unsubscribe?token=${unsubscribeToken}>` : undefined,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        },
        // Custom metadata for tracking
        metadata: {
          template,
          userId: data.userId,
          notificationId: data.notificationId
        }
      };

      // Nodemailer specific handling
      const info = await this.transporter.sendMail(mailOptions);

      // Log delivery info
      if (info.messageId) {
        console.log(`Email queued with messageId: ${info.messageId}`);
      }

      console.log(`Email sent to ${to}: ${subject} (${template})`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`Failed to send email to ${to}:`, error);

      // Enhanced error handling
      if (error.code === 'EENVELOPE' || error.responseCode === 550) {
        // Hard bounce - invalid email
        await this.handleBounce(to, 'hard', error.message);
      } else if (error.responseCode >= 400) {
        // Soft bounce or temporary failure
        await this.handleBounce(to, 'soft', error.message);
      }

      throw error;
    }
  }

  /**
   * Send email with attachments.
   * @param {string} to - Recipient email address.
   * @param {string} subject - Email subject.
   * @param {object} data - Data for the email template.
   * @param {string} template - Name of the email template.
   * @param {Array} attachments - Array of attachment objects for nodemailer.
   * @param {object} options - Additional sending options.
   */
  async sendWithAttachment(to, subject, data, template = 'system-notification', attachments = [], options = {}) {
    try {
      const templateData = {
        ...data,
        baseUrl: this.baseUrl,
        year: new Date().getFullYear()
      };

      const html = this.renderTemplate(template, templateData);
      const text = this.renderTextTemplate(template, templateData);

      const mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'Mediaverse',
          address: this.fromEmail
        },
        to,
        subject,
        html,
        text,
        attachments, // e.g., [{ filename: 'report.csv', content: '...', contentType: 'text/csv' }]
        headers: {
          'X-Mailer': 'Mediaverse Notification System'
        }
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email with attachment sent to ${to}: ${subject}. MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`Failed to send email with attachment to ${to}:`, error);
      throw error;
    }
  }

  /**
   * Send bulk emails with rate limiting
   */
  async sendBulkNotifications(emails, subject, data, template = 'content-notification', options = {}) {
    const batchSize = options.batchSize || 10;
    const delay = options.delay || 1000; // 1 second delay between batches

    console.log(`Sending bulk email to ${emails.length} recipients in batches of ${batchSize}`);

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const promises = batch.map((email) => this.sendNotification(email, subject, data, template, options));

      await Promise.allSettled(promises);

      // Add delay between batches to avoid rate limits
      if (i + batchSize < emails.length) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(emails.length / batchSize)}`);
    }

    console.log(`Bulk email completed for ${emails.length} recipients`);
  }

  /**
   * Render HTML template with data
   */
  renderTemplate(templateName, data) {
    const template = this.templates.get(templateName);

    if (!template) {
      // Fallback to basic HTML
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>${data.title || 'Notification'}</h2>
          <p>${data.message || data.body || 'You have a new notification.'}</p>
          ${data.actionUrl ? `<p style="text-align: center;"><a href="${data.actionUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View Details</a></p>` : ''}
          ${data.unsubscribeUrl ? `<p style="font-size: 12px; color: #666;"><a href="${data.unsubscribeUrl}">Unsubscribe</a></p>` : ''}
        </div>
      `;
    }

    return template(data);
  }

  /**
   * Render text template with data
   */
  renderTextTemplate(templateName, data) {
    const template = this.textTemplates.get(templateName);

    if (!template) {
      // Fallback to basic text
      return `${data.title || 'Notification'}

${data.message || data.body || 'You have a new notification.'}

${data.actionUrl ? `View Details: ${data.actionUrl}` : ''}

${data.unsubscribeUrl ? `Unsubscribe: ${data.unsubscribeUrl}` : ''}`;
    }

    return template(data);
  }

  /**
   * Generate unsubscribe token
   */
  generateUnsubscribeToken(userId) {
    const payload = {
      userId,
      type: 'unsubscribe',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year expiry
    };

    return jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret');
  }

  /**
   * Generate tracking pixel for email opens
   */
  generateTrackingPixel(notificationId) {
    if (!notificationId) return null;
    const trackingUrl = `${this.baseUrl}/api/notifications/track/${notificationId}/open.gif`;
    return `<img src="${trackingUrl}" width="1" height="1" style="display:none;" alt="" />`;
  }

  /**
   * Handle bounced emails
   */
  async handleBounce(email, type, reason) {
    try {
      console.log(`${type === 'hard' ? 'Hard' : 'Soft'} bounce detected for ${email}: ${reason}`);

      // In a real implementation, you would:
      // 1. Store bounce information in database
      // 2. Update user's email status
      // 3. Remove from mailing lists for hard bounces
      // 4. Implement retry logic for soft bounces

      // For now, just log the bounce
      const bounceData = {
        email,
        type, // 'hard' or 'soft'
        reason,
        timestamp: new Date().toISOString(),
        source: 'email-service'
      };

      // TODO: Store in database or send to monitoring service
      console.log('Bounce recorded:', bounceData);
    } catch (error) {
      console.error('Failed to handle bounce:', error);
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(to, userData) {
    await this.sendNotification(
      to,
      'Welcome to Mediaverse!',
      {
        ...userData,
        userName: userData.displayName || userData.username || 'User',
        title: 'Welcome to Mediaverse!',
        message: 'Welcome to our community! Get started by exploring content and connecting with creators.',
        actionUrl: `${this.baseUrl}/dashboard`,
        actionText: 'Explore Mediaverse'
      },
      'welcome',
      { categories: ['welcome', 'onboarding'] }
    );
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to, resetToken) {
    await this.sendNotification(
      to,
      'Reset Your Password',
      {
        title: 'Password Reset Request',
        message: 'You requested a password reset. Click the link below to set a new password.',
        actionUrl: `${this.baseUrl}/reset-password?token=${resetToken}`,
        actionText: 'Reset Password',
        warning: 'This link will expire in 1 hour for security reasons.'
      },
      'password-reset',
      {
        categories: ['security', 'password-reset'],
        enableTracking: true
      }
    );
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(to, verificationToken) {
    await this.sendNotification(
      to,
      'Verify Your Email Address',
      {
        title: 'Email Verification',
        message: 'Please verify your email address to complete your registration.',
        actionUrl: `${this.baseUrl}/verify-email?token=${verificationToken}`,
        actionText: 'Verify Email',
        note: 'If you didn\'t create an account, you can safely ignore this email.'
      },
      'email-verification',
      {
        categories: ['verification', 'onboarding'],
        enableTracking: true
      }
    );
  }

  /**
   * Send content notification (likes, comments, etc.)
   */
  async sendContentNotification(to, data) {
    const {
      type, contentTitle, userName, actionUrl
    } = data;

    let subject; let
      message;
    switch (type) {
      case 'like':
        subject = 'Someone Liked Your Content';
        message = `${userName} liked your content "${contentTitle}"`;
        break;
      case 'comment':
        subject = 'New Comment on Your Content';
        message = `${userName} commented on your content "${contentTitle}"`;
        break;
      case 'follow':
        subject = 'New Follower';
        message = `${userName} started following you`;
        break;
      default:
        subject = 'Content Activity';
        message = `Activity on your content "${contentTitle}"`;
    }

    await this.sendNotification(
      to,
      subject,
      {
        ...data,
        title: subject,
        message,
        actionUrl,
        actionText: 'View Content',
        userName,
        contentTitle
      },
      'content-notification',
      {
        categories: ['content', type],
        enableTracking: true
      }
    );
  }

  /**
   * Send weekly digest
   */
  async sendWeeklyDigest(to, digestData) {
    const {
      userName, stats, topContent, newFollowers
    } = digestData;

    await this.sendNotification(
      to,
      'Your Weekly Mediaverse Digest',
      {
        userName,
        title: 'Your Weekly Digest',
        message: 'Here\'s what happened in your Mediaverse community this week.',
        stats,
        topContent: topContent || [],
        newFollowers: newFollowers || [],
        actionUrl: `${this.baseUrl}/activity`,
        actionText: 'View All Activity'
      },
      'weekly-digest',
      {
        categories: ['digest', 'weekly'],
        enableTracking: true
      }
    );
  }

  /**
   * Send system notification
   */
  async sendSystemNotification(to, systemData) {
    await this.sendNotification(
      to,
      systemData.subject || 'System Notification',
      {
        ...systemData,
        title: systemData.subject || 'System Notification',
        message: systemData.message,
        actionUrl: systemData.actionUrl,
        actionText: systemData.actionText || 'Learn More'
      },
      'system-notification',
      {
        categories: ['system'],
        enableTracking: true
      }
    );
  }

  /**
   * Process unsubscribe request
   */
  async processUnsubscribe(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');

      if (decoded.type !== 'unsubscribe') {
        throw new Error('Invalid unsubscribe token');
      }

      // Update user preferences to disable all email notifications
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      await prisma.profile.upsert({
        where: { userId: decoded.userId },
        update: {
          preferences: {
            notifications: {
              emailNotifications: false,
              pushNotifications: false,
              smsNotifications: false
            }
          }
        },
        create: {
          userId: decoded.userId,
          preferences: {
            notifications: {
              emailNotifications: false,
              pushNotifications: false,
              smsNotifications: false
            }
          }
        }
      });

      console.log(`User ${decoded.userId} unsubscribed from all email notifications`);
      return { success: true, userId: decoded.userId };
    } catch (error) {
      console.error('Failed to process unsubscribe:', error);
      throw error;
    }
  }

  /**
   * Track email open
   */
  async trackEmailOpen(notificationId) {
    try {
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
        select: { userId: true }
      });

      if (notification && notification.userId) {
        // Use behaviorService to track the action
        await behaviorService.trackUserAction(notification.userId, {
          type: 'email_open',
          notificationId
        });

        logger.info(`Email opened for notification ${notificationId}, user ${notification.userId}`);
      } else {
        logger.warn(`Could not find notification or user for tracking open event: ${notificationId}`);
      }
    } catch (error) {
      logger.error('Failed to track email open:', error);
    }
  }

  /**
   * Test email configuration
   */
  async testEmail(to = process.env.ADMIN_EMAIL) {
    if (!to) {
      console.log('  No test email address provided');
      return;
    }

    await this.sendNotification(
      to,
      'Email Service Test - Mediaverse',
      {
        userId: 'test-user',
        title: 'Email Service Test',
        message: 'This is a test email to verify your email configuration is working correctly.',
        actionUrl: this.baseUrl,
        actionText: 'Visit Mediaverse',
        testMode: true
      },
      'system-notification'
    );

    console.log('Test email sent successfully');
  }
}

module.exports = new EmailService();
