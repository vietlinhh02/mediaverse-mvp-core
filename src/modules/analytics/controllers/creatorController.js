const prisma = require('../../../../prisma/prismaClient');
const metricsService = require('../services/metricsService');

/**
 * @desc    Get dashboard analytics for a creator.
 * @route   GET /api/analytics/creator/dashboard
 * @access  Private (Creator only)
 */
exports.getDashboard = async (req, res, next) => {
  // const creatorId = req.user.id; // Assuming auth middleware provides user ID
  const creatorId = 'clxrf1l2b000010ust5310z5n';

  try {
    // 1. Aggregate core stats (views, likes, etc.)
    const stats = await prisma.content.aggregate({
      where: { authorId: creatorId },
      _sum: {
        views: true,
        likesCount: true,
        commentsCount: true
      }
    });

    // 2. Get subscriber count
    const subscriberCount = await prisma.follow.count({
      where: { followeeId: creatorId }
    });

    // 3. Get engagement trends (e.g., views over the last 30 days)
    // This is a simplified trend calculation. A real app would aggregate daily stats.
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentLikes = await prisma.like.count({
      where: {
        content: { authorId: creatorId },
        createdAt: { gte: thirtyDaysAgo }
      }
    });

    const recentComments = await prisma.comment.count({
      where: {
        content: { authorId: creatorId },
        createdAt: { gte: thirtyDaysAgo }
      }
    });

    res.status(200).json({
      totalViews: stats._sum.views || 0,
      totalLikes: stats._sum.likesCount || 0,
      totalComments: stats._sum.commentsCount || 0,
      subscriberCount,
      engagementTrends: {
        period: 'Last 30 Days',
        likes: recentLikes,
        comments: recentComments
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get content performance for a creator.
 * @route   GET /api/analytics/creator/content
 * @access  Private (Creator only)
 */
exports.getContentPerformance = async (req, res, next) => {
  // const creatorId = req.user.id;
  const creatorId = 'clxrf1l2b000010ust5310z5n';

  try {
    // 1. Get top performing content (e.g., by views)
    const topContent = await prisma.content.findMany({
      where: { authorId: creatorId },
      orderBy: { views: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        views: true,
        likesCount: true,
        commentsCount: true
      }
    });

    // 2. Get recent content performance
    const recentContent = await prisma.content.findMany({
      where: { authorId: creatorId },
      orderBy: { publishedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        views: true,
        likesCount: true,
        commentsCount: true,
        publishedAt: true
      }
    });

    res.status(200).json({
      topPerforming: topContent,
      recentPerformance: recentContent
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get audience demographics for a creator.
 * @route   GET /api/analytics/creator/audience
 * @access  Private (Creator only)
 */
exports.getAudienceStats = (req, res, next) => {
  // This endpoint returns mock data as requested.
  // A real implementation would involve analyzing user data.
  const mockDemographics = {
    ageRange: {
      '18-24': 45,
      '25-34': 30,
      '35-44': 15,
      '45+': 10
    },
    gender: {
      male: 55,
      female: 43,
      other: 2
    }
  };

  const mockGeographics = {
    topCountries: [
      { code: 'US', name: 'United States', value: 40 },
      { code: 'IN', name: 'India', value: 15 },
      { code: 'BR', name: 'Brazil', value: 10 },
      { code: 'GB', name: 'United Kingdom', value: 8 },
      { code: 'DE', name: 'Germany', value: 5 }
    ]
  };

  res.status(200).json({
    demographics: mockDemographics,
    geographics: mockGeographics
  });
};

/**
 * @desc    Get audience retention data for a specific piece of content.
 * @route   GET /api/analytics/creator/content/:id/retention
 * @access  Private (Creator only)
 */
exports.getRetentionData = async (req, res, next) => {
  const {
    id: contentId
  } = req.params;
  const period = req.query.period || 30; // Default to 30 days

  try {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - period);

    const dailySummaries = await prisma.analyticsSummaryDaily.findMany({
      where: {
        contentId,
        date: {
          gte: sinceDate
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    const retentionData = {
      labels: dailySummaries.map((d) => d.date.toISOString().split('T')[0]),
      datasets: [{
        label: 'Average View Duration (s)',
        data: dailySummaries.map((d) => d.averageViewDuration),
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }]
    };

    res.status(200).json(retentionData);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get traffic source data for a specific piece of content.
 * @route   GET /api/analytics/creator/content/:id/traffic-sources
 * @access  Private (Creator only)
 */
exports.getTrafficSources = async (req, res, next) => {
  const {
    id: contentId
  } = req.params;
  const period = req.query.period || 30; // Default to 30 days

  try {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - period);

    const dailySummaries = await prisma.analyticsSummaryDaily.findMany({
      where: {
        contentId,
        date: {
          gte: sinceDate
        }
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

    const trafficData = {
      labels: Object.keys(sources),
      datasets: [{
        label: 'Views by Traffic Source',
        data: Object.values(sources),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)'
        ]
      }]
    };

    res.status(200).json(trafficData);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get demographic data for a specific piece of content.
 * @route   GET /api/analytics/creator/content/:id/demographics
 * @access  Private (Creator only)
 */
exports.getDemographics = async (req, res, next) => {
  const {
    id: contentId
  } = req.params;
  const period = req.query.period || 30; // Default to 30 days

  try {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - period);

    const dailySummaries = await prisma.analyticsSummaryDaily.findMany({
      where: {
        contentId,
        date: {
          gte: sinceDate
        }
      }
    });

    const countries = {};
    dailySummaries.forEach((summary) => {
      const { demographics } = summary;
      if (typeof demographics === 'object' && demographics !== null) {
        for (const country in demographics) {
          countries[country] = (countries[country] || 0) + demographics[country];
        }
      }
    });

    const demographicData = {
      labels: Object.keys(countries),
      datasets: [{
        label: 'Views by Country',
        data: Object.values(countries),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)'
        ]
      }]
    };

    res.status(200).json(demographicData);
  } catch (error) {
    next(error);
  }
};
