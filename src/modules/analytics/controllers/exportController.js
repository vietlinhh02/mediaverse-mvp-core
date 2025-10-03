const { Parser } = require('json2csv');
const prisma = require('../../../../prisma/prismaClient');
const { reportingQueue } = require('../../../jobs/reportingQueue');

/**
 * Fetches analytics data based on specified criteria.
 */
const fetchAnalyticsData = async (dateRange, aggregationLevel) => {
  const { startDate, endDate } = dateRange;

  if (aggregationLevel === 'raw') {
    const likes = await prisma.like.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: { contentId: true, userId: true, createdAt: true }
    });
    const comments = await prisma.comment.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: {
        contentId: true, userId: true, text: true, createdAt: true
      }
    });
    const shares = await prisma.share.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: {
        contentId: true, userId: true, platform: true, createdAt: true
      }
    });
    const views = await prisma.contentView.findMany({
      where: { viewedAt: { gte: startDate, lte: endDate } },
      select: {
        contentId: true, userId: true, duration: true, country: true, referrer: true, viewedAt: true
      }
    });

    return [
      ...likes.map((i) => ({ ...i, type: 'like' })),
      ...comments.map((i) => ({ ...i, type: 'comment' })),
      ...shares.map((i) => ({ ...i, type: 'share' })),
      ...views.map((i) => ({ ...i, type: 'view', createdAt: i.viewedAt }))
    ];
  }

  // For aggregated levels, use the AnalyticsSummaryDaily table for performance
  const dailySummaries = await prisma.analyticsSummaryDaily.findMany({
    where: { date: { gte: startDate, lte: endDate } },
    select: {
      date: true,
      contentId: true,
      totalViews: true,
      uniqueVisitors: true,
      averageViewDuration: true,
      demographics: true,
      trafficSources: true
    },
    orderBy: {
      date: 'asc'
    }
  });
  return dailySummaries;
};

/**
 * @desc    Export analytics data to CSV or JSON.
 * @route   GET /api/analytics/export
 * @access  Private
 */
exports.exportData = async (req, res, next) => {
  const { format = 'json', aggregationLevel = 'daily' } = req.query;

  // Basic date range handling (default to last 30 days)
  const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
  const startDate = req.query.startDate
    ? new Date(req.query.startDate)
    : new Date(new Date().setDate(endDate.getDate() - 30));

  try {
    const data = await fetchAnalyticsData({ startDate, endDate }, aggregationLevel);

    if (format.toLowerCase() === 'csv') {
      if (data.length === 0) {
        res.header('Content-Type', 'text/csv');
        res.attachment('export.csv');
        return res.send('');
      }
      const parser = new Parser();
      const csv = parser.parse(data);
      res.header('Content-Type', 'text/csv');
      res.attachment('export.csv');
      res.send(csv);
    } else {
      res.header('Content-Type', 'application/json');
      res.attachment('export.json');
      res.json(data);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Schedule a recurring analytics report to be sent via email.
 * @route   POST /api/analytics/export/schedule
 * @access  Private
 */
exports.scheduleReport = async (req, res, next) => {
  const { email, cronPattern, reportParams } = req.body;

  if (!email || !cronPattern || !reportParams) {
    return res.status(400).json({ message: 'Email, cronPattern, and reportParams are required.' });
  }

  try {
    const job = await reportingQueue.add(
      'generate-and-send-report',
      { email, reportParams },
      {
        repeat: { cron: cronPattern },
        // Create a unique job ID to prevent scheduling duplicates
        jobId: `report-${email}-${reportParams.aggregationLevel || 'daily'}`
      }
    );
    console.log(`Scheduled report job with ID: ${job.id}`);

    res.status(202).json({ message: 'Report scheduled successfully.' });
  } catch (error) {
    next(error);
  }
};
