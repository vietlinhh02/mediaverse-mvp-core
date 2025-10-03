const { Parser } = require('json2csv');
const { reportingQueue } = require('./reportingQueue');
const EmailService = require('../modules/notifications/services/emailService');
const prisma = require('../../prisma/prismaClient');

// This function should be moved to a shared service (e.g., metricsService) to avoid duplication.
const fetchAnalyticsDataForReport = async (reportParams) => {
  const { startDate, endDate, aggregationLevel = 'daily' } = reportParams;
  const dateRange = {
    startDate: new Date(startDate),
    endDate: new Date(endDate)
  };

  if (aggregationLevel === 'raw') {
    // Combine multiple raw data sources
    const likes = await prisma.like.findMany({ where: { createdAt: { gte: dateRange.startDate, lte: dateRange.endDate } } });
    const comments = await prisma.comment.findMany({ where: { createdAt: { gte: dateRange.startDate, lte: dateRange.endDate } } });
    return [...likes.map((i) => ({ ...i, type: 'like' })), ...comments.map((i) => ({ ...i, type: 'comment' }))];
  }

  // Default to daily aggregated data
  return await prisma.analyticsSummaryDaily.findMany({
    where: { date: { gte: dateRange.startDate, lte: dateRange.endDate } },
    orderBy: { date: 'asc' }
  });
};

const setupReportingWorker = () => {
  reportingQueue.process(async (job) => {
    const { email, reportParams } = job.data;
    console.log(`Generating report for ${email} with params:`, reportParams);

    try {
      const data = await fetchAnalyticsDataForReport(reportParams);

      if (data.length === 0) {
        await EmailService.sendNotification(
          email,
          'Your Scheduled Analytics Report',
          {
            title: 'Analytics Report Ready',
            message: 'Your scheduled analytics report has been generated, but there was no data for the selected period.',
            userName: email
          },
          'system-notification'
        );
        return { success: true, message: 'No data available for the report.' };
      }

      const parser = new Parser();
      const csv = parser.parse(data);
      const attachment = {
        filename: `report-${reportParams.aggregationLevel}-${new Date().toISOString().split('T')[0]}.csv`,
        content: csv,
        contentType: 'text/csv'
      };

      await EmailService.sendWithAttachment(
        email,
        'Your Scheduled Analytics Report is Ready',
        {
          title: 'Analytics Report Ready',
          message: 'Please find your scheduled analytics report attached to this email.',
          userName: email
        },
        'system-notification',
        [attachment]
      );

      console.log(`Successfully generated and sent report to ${email}`);
      return { success: true };
    } catch (error) {
      console.error(`Failed to process report job ${job.id} for ${email}:`, error);
      // Optionally, send a failure notification email to the user or admin
      throw error;
    }
  });

  console.log('Reporting worker is running...');
};

module.exports = { setupReportingWorker };
