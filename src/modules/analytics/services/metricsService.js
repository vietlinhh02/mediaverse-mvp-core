const {
  startOfDay,
  endOfDay
} = require('date-fns');
const {
  redisCache
} = require('../../../config/redis');
const prisma = require('../../../../prisma/prismaClient');

/**
 * Calculates the engagement rate for a piece of content.
 * Engagement Rate = (Total Engagements / Total Views) * 100
 * @param {number} likes - Total number of likes.
 * @param {number} comments - Total number of comments.
 * @param {number} shares - Total number of shares.
 * @param {number} views - Total number of views.
 * @returns {number} The engagement rate as a percentage, rounded to 2 decimal places.
 */
exports.calculateEngagementRate = (likes = 0, comments = 0, shares = 0, views = 0) => {
  if (views === 0) {
    return 0;
  }
  const totalEngagements = likes + comments + shares;
  const rate = (totalEngagements / views) * 100;
  return parseFloat(rate.toFixed(2));
};

/**
 * Calculates the retention rate.
 * @param {number} sessions - Total number of sessions/starts.
 * @param {number} completed - Number of sessions that completed the action.
 * @returns {number} The retention rate as a percentage.
 */
exports.calculateRetentionRate = (sessions = 0, completed = 0) => {
  if (sessions === 0) {
    return 0;
  }
  const rate = (completed / sessions) * 100;
  return parseFloat(rate.toFixed(2));
};

/**
 * Calculates growth metrics between two periods.
 * @param {number} previousValue - The value from the previous period.
 * @param {number} currentValue - The value from the current period.
 * @returns {number} The growth percentage.
 */
exports.calculateGrowthMetrics = (previousValue = 0, currentValue = 0) => {
  if (previousValue === 0) {
    return currentValue > 0 ? 100.0 : 0.0;
  }
  const growth = ((currentValue - previousValue) / previousValue) * 100;
  return parseFloat(growth.toFixed(2));
};

/**
 * Aggregates view counts for a specific content ID over a given period.
 * This function assumes a background worker processes view events and stores them
 * in aggregated, time-bucketed keys in Redis (e.g., 'views:contentId:YYYY-MM-DD').
 * @param {string} contentId - The ID of the content.
 * @param {'hourly' | 'daily' | 'weekly' | 'monthly'} period - The aggregation period.
 * @returns {Promise<Object>} An object with timestamps as keys and view counts as values.
 */
exports.aggregateViewsByPeriod = async (contentId, period) => {
  const now = new Date();
  const keysToFetch = [];
  // A real-world implementation should use a robust date library like date-fns or moment.js
  // to handle timezones and complex date calculations correctly.

  switch (period) {
    case 'hourly': // Last 24 hours
      for (let i = 0; i < 24; i++) {
        const date = new Date(now.getTime() - i * 60 * 60 * 1000);
        const key = `views:${contentId}:${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}:${String(date.getUTCHours()).padStart(2, '0')}`;
        keysToFetch.push({ timestamp: date.toISOString(), key });
      }
      break;

    case 'daily': // Last 30 days
      for (let i = 0; i < 30; i++) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = `views:${contentId}:${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
        keysToFetch.push({ timestamp: date.toISOString().split('T')[0], key });
      }
      break;

    // Weekly and monthly aggregations require more complex logic to define period boundaries
    // and would typically be pre-aggregated by a worker process.
    case 'weekly':
    case 'monthly':
      throw new Error(`Period '${period}' requires pre-aggregated data which is not implemented in this example.`);

    default:
      throw new Error('Invalid period specified. Use "hourly" or "daily".');
  }

  const redisKeys = keysToFetch.map((k) => k.key);
  if (redisKeys.length === 0) {
    return {};
  }

  // mGet returns an array of values which can be null if key doesn't exist
  const values = await redisCache.mGet(redisKeys);

  const results = {};
  keysToFetch.forEach((k, index) => {
    results[k.timestamp] = parseInt(values[index] || '0', 10);
  });

  return results;
};

/**
 * Fetches audience retention data from daily summaries.
 * @param {string} contentId - The ID of the content.
 * @param {{startDate: Date, endDate: Date}} dateRange - The date range to query.
 * @returns {Promise<Object>} Data formatted for retention chart.
 */
exports.getRetentionData = async (contentId, dateRange) => {
  const dailySummaries = await prisma.analyticsSummaryDaily.findMany({
    where: {
      contentId,
      date: {
        gte: dateRange.startDate,
        lte: dateRange.endDate
      }
    },
    orderBy: {
      date: 'asc'
    },
    select: {
      date: true,
      averageViewDuration: true
    }
  });

  return {
    labels: dailySummaries.map((d) => d.date.toISOString().split('T')[0]),
    datasets: [{
      label: 'Average View Duration (s)',
      data: dailySummaries.map((d) => d.averageViewDuration)
    }]
  };
};

/**
 * Fetches and aggregates traffic source data from daily summaries.
 * @param {string} contentId - The ID of the content.
 * @param {{startDate: Date, endDate: Date}} dateRange - The date range to query.
 * @returns {Promise<Object>} Data formatted for traffic source chart.
 */
exports.getTrafficSources = async (contentId, dateRange) => {
  const dailySummaries = await prisma.analyticsSummaryDaily.findMany({
    where: {
      contentId,
      date: {
        gte: dateRange.startDate,
        lte: dateRange.endDate
      }
    },
    select: {
      trafficSources: true
    }
  });

  const sources = {};
  dailySummaries.forEach((summary) => {
    const { trafficSources } = summary;
    if (typeof trafficSources === 'object' && trafficSources !== null) {
      for (const source in trafficSources) {
        sources[source] = (sources[source] || 0) + trafficSources[source];
      }
    }
  });

  return {
    labels: Object.keys(sources),
    datasets: [{
      label: 'Views by Traffic Source',
      data: Object.values(sources)
    }]
  };
};

/**
 * Fetches and aggregates demographic data from daily summaries.
 * @param {string} contentId - The ID of the content.
 * @param {{startDate: Date, endDate: Date}} dateRange - The date range to query.
 * @returns {Promise<Object>} Data formatted for demographics chart.
 */
exports.getDemographics = async (contentId, dateRange) => {
  const dailySummaries = await prisma.analyticsSummaryDaily.findMany({
    where: {
      contentId,
      date: {
        gte: dateRange.startDate,
        lte: dateRange.endDate
      }
    },
    select: {
      demographics: true
    }
  });

  const demographics = {};
  dailySummaries.forEach((summary) => {
    const demoData = summary.demographics;
    if (typeof demoData === 'object' && demoData !== null) {
      for (const key in demoData) {
        demographics[key] = (demographics[key] || 0) + demoData[key];
      }
    }
  });

  return {
    labels: Object.keys(demographics),
    datasets: [{
      label: 'Views by Country',
      data: Object.values(demographics)
    }]
  };
};

/**
 * Aggregates raw ContentView data for a specific content and date, then saves it to the summary table.
 * @param {string} contentId - The ID of the content to aggregate.
 * @param {Date} date - The date to aggregate data for.
 */
exports.aggregateDaily = async (contentId, date) => {
  const targetDate = startOfDay(date);

  const views = await prisma.contentView.findMany({
    where: {
      contentId,
      viewedAt: {
        gte: targetDate,
        lt: endOfDay(date)
      }
    }
  });

  if (views.length === 0) {
    return; // No views to process
  }

  const totalViews = views.length;
  const totalDuration = views.reduce((sum, view) => sum + (view.duration || 0), 0);
  const averageViewDuration = totalViews > 0 ? totalDuration / totalViews : 0;

  const getDomain = (referrer) => {
    if (!referrer) return 'direct';
    try {
      const url = new URL(referrer);
      if (url.hostname.includes('google')) return 'google';
      if (url.hostname.includes('facebook')) return 'facebook';
      return url.hostname;
    } catch (e) {
      return 'unknown';
    }
  };

  const trafficSources = views.reduce((acc, view) => {
    const source = getDomain(view.referrer);
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});

  const demographics = views.reduce((acc, view) => {
    if (view.country) {
      acc[view.country] = (acc[view.country] || 0) + 1;
    }
    return acc;
  }, {});

  const uniqueUserIds = new Set(views.map((v) => v.userId).filter(Boolean));
  const uniqueVisitors = uniqueUserIds.size;

  await prisma.analyticsSummaryDaily.upsert({
    where: {
      date_contentId: {
        date: targetDate,
        contentId
      }
    },
    update: {
      totalViews,
      uniqueVisitors,
      averageViewDuration,
      trafficSources,
      demographics
    },
    create: {
      date: targetDate,
      contentId,
      totalViews,
      uniqueVisitors,
      averageViewDuration,
      trafficSources,
      demographics
    }
  });

  console.log(`Aggregated daily analytics for content ${contentId} on ${targetDate.toISOString().split('T')[0]}`);
};
