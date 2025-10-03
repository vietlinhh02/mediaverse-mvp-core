const Queue = require('bull');
const {
  isSameDay,
  startOfYesterday,
  endOfYesterday
} = require('date-fns');
const prisma = require('../../prisma/prismaClient');

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  db: process.env.REDIS_DB_QUEUE || 2
};

const analyticsQueue = new Queue('analytics-summary', {
  redis: redisConfig
});

const getDomain = (referrer) => {
  if (!referrer) return 'direct';
  try {
    const url = new URL(referrer);
    if (url.hostname.includes('google')) return 'google';
    if (url.hostname.includes('facebook')) return 'facebook';
    if (url.hostname.includes('twitter')) return 'twitter';
    return url.hostname;
  } catch (error) {
    return 'unknown';
  }
};

const setupAnalyticsWorker = () => {
  analyticsQueue.process(async (job) => {
    console.log('Starting daily analytics summary job...');

    const targetDate = startOfYesterday();

    try {
      const views = await prisma.contentView.findMany({
        where: {
          viewedAt: {
            gte: targetDate,
            lt: endOfYesterday()
          }
        }
      });

      if (views.length === 0) {
        console.log('No new views to process for', targetDate);
        return {
          message: 'No new views to process.'
        };
      }

      const viewsByContent = views.reduce((acc, view) => {
        if (!acc[view.contentId]) {
          acc[view.contentId] = [];
        }
        acc[view.contentId].push(view);
        return acc;
      }, {});

      for (const contentId in viewsByContent) {
        const contentViews = viewsByContent[contentId];
        const totalViews = contentViews.length;
        const totalDuration = contentViews.reduce((sum, view) => sum + (view.duration || 0), 0);
        const averageViewDuration = totalViews > 0 ? totalDuration / totalViews : 0;

        const trafficSources = contentViews.reduce((acc, view) => {
          const source = getDomain(view.referrer);
          acc[source] = (acc[source] || 0) + 1;
          return acc;
        }, {});

        const demographics = contentViews.reduce((acc, view) => {
          if (view.country) {
            acc[view.country] = (acc[view.country] || 0) + 1;
          }
          return acc;
        }, {});

        const uniqueUserIds = new Set(contentViews.map((v) => v.userId).filter(Boolean));
        const uniqueVisitors = uniqueUserIds.size;

        await prisma.analyticsSummaryDaily.upsert({
          where: {
            date_contentId: {
              date: targetDate,
              contentId
            }
          },
          update: {
            totalViews: {
              increment: totalViews
            },
            averageViewDuration,
            trafficSources,
            demographics,
            uniqueVisitors
          },
          create: {
            date: targetDate,
            contentId,
            totalViews,
            averageViewDuration,
            trafficSources,
            demographics,
            uniqueVisitors
          }
        });
      }

      console.log(`Successfully processed analytics for ${Object.keys(viewsByContent).length} content items.`);
    } catch (error) {
      console.error('Error processing daily analytics summary:', error);
      throw error;
    }
  });
  console.log('Analytics worker is running...');
};

const scheduleDailyAnalytics = () => {
  // Run every day at 2 AM
  analyticsQueue.add({}, {
    repeat: {
      cron: '0 2 * * *'
    }
  });
  console.log('Daily analytics job scheduled.');
};

module.exports = {
  analyticsQueue,
  scheduleDailyAnalytics,
  setupAnalyticsWorker
};
