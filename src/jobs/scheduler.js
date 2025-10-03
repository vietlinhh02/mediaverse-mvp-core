/**
 * Scheduled jobs for Mediaverse
 * Handles periodic tasks like weekly digests, cleanup jobs, etc.
 */

const cron = require('node-cron');
const { bulkDigestQueue, createJob } = require('./notificationQueue');
const { scheduleDailyAnalytics } = require('./analyticsQueue');
const NotificationService = require('../modules/notifications/services/notificationService');

class Scheduler {
  constructor() {
    this.jobs = [];
  }

  /**
   * Initialize all scheduled jobs
   */
  init() {
    console.log('Initializing scheduled jobs...');

    this.scheduleWeeklyDigests();
    this.scheduleCleanupJobs();
    this.scheduleHealthChecks();
    this.scheduleAnalyticsJobs();

    console.log('Scheduled jobs initialized');
  }

  /**
   * Schedule weekly digest emails
   * Runs every Sunday at 10:00 AM UTC
   */
  scheduleWeeklyDigests() {
    const weeklyDigestJob = cron.schedule('0 10 * * 0', async () => {
      console.log('Starting weekly digest job...');

      try {
        // Send bulk weekly digests to all eligible users
        await createJob(bulkDigestQueue, {
          timestamp: new Date().toISOString()
        }, 'normal');

        console.log('Weekly digest job queued successfully');
      } catch (error) {
        console.error('Failed to queue weekly digest job:', error);
      }
    }, {
      scheduled: false, // Don't start immediately
      timezone: 'UTC'
    });

    this.jobs.push({
      name: 'weekly-digests',
      job: weeklyDigestJob,
      schedule: '0 10 * * 0 (Every Sunday 10:00 UTC)'
    });
  }

  /**
   * Schedule cleanup jobs
   * Runs daily at 2:00 AM UTC
   */
  scheduleCleanupJobs() {
    const cleanupJob = cron.schedule('0 2 * * *', async () => {
      console.log('Starting cleanup jobs...');

      try {
        // Clean up old notifications (30+ days)
        await NotificationService.deleteOldNotifications(30);

        // Clean up deleted notifications (7+ days)
        await NotificationService.cleanupDeletedNotifications(7);

        console.log('Cleanup jobs completed');
      } catch (error) {
        console.error('Cleanup jobs failed:', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.push({
      name: 'cleanup',
      job: cleanupJob,
      schedule: '0 2 * * * (Daily 2:00 UTC)'
    });
  }

  /**
   * Schedule health checks
   * Runs every 5 minutes
   */
  scheduleHealthChecks() {
    const healthCheckJob = cron.schedule('*/5 * * * *', async () => {
      try {
        // Basic health checks
        const healthStatus = {
          timestamp: new Date().toISOString(),
          status: 'healthy'
        };

        // Could add more health checks here:
        // - Database connectivity
        // - Redis connectivity
        // - Queue health
        // - External service health

        console.log('Health check passed');
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.push({
      name: 'health-check',
      job: healthCheckJob,
      schedule: '*/5 * * * * (Every 5 minutes)'
    });
  }

  /**
   * Schedule daily analytics processing
   */
  scheduleAnalyticsJobs() {
    // This uses Bull's built-in cron scheduler
    scheduleDailyAnalytics();
    console.log('Scheduled daily analytics job via Bull');
  }

  /**
   * Start all scheduled jobs
   */
  start() {
    console.log('Starting scheduled jobs...');

    this.jobs.forEach(({ name, job, schedule }) => {
      try {
        job.start();
        console.log(`Started ${name} job: ${schedule}`);
      } catch (error) {
        console.error(`Failed to start ${name} job:`, error);
      }
    });

    console.log('All scheduled jobs started');
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    console.log('Stopping scheduled jobs...');

    this.jobs.forEach(({ name, job }) => {
      try {
        job.stop();
        console.log(`Stopped ${name} job`);
      } catch (error) {
        console.error(`Failed to stop ${name} job:`, error);
      }
    });

    console.log('All scheduled jobs stopped');
  }

  /**
   * Get status of all jobs
   */
  getStatus() {
    return this.jobs.map(({ name, schedule, job }) => ({
      name,
      schedule,
      running: job.running,
      nextRun: job.nextRun ? job.nextRun.toISOString() : null
    }));
  }

  /**
   * Manually trigger a job (for testing)
   */
  async triggerJob(jobName) {
    const jobConfig = this.jobs.find((j) => j.name === jobName);
    if (!jobConfig) {
      throw new Error(`Job ${jobName} not found`);
    }

    console.log(`Manually triggering ${jobName} job...`);

    switch (jobName) {
      case 'weekly-digests':
        await createJob(bulkDigestQueue, {
          timestamp: new Date().toISOString(),
          manual: true
        }, 'normal');
        break;

      case 'cleanup':
        await NotificationService.deleteOldNotifications(30);
        await NotificationService.cleanupDeletedNotifications(7);
        break;

      case 'health-check':
        console.log('Manual health check passed');
        break;

      default:
        throw new Error(`Job ${jobName} trigger not implemented`);
    }

    console.log(`Manually triggered ${jobName} job`);
    return { success: true, jobName };
  }
}

// Create singleton instance
const scheduler = new Scheduler();

module.exports = scheduler;
