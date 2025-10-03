const prisma = require('../../../../prisma/prismaClient.js');

const SLA_HOURS = 24;

/**
 * (Helper) Fetches a mock user reputation score.
 * In a real application, this would involve a more complex calculation
 * based on the user's history, role, etc.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<number>} A reputation score, e.g., from 0 to 1.
 */
const getUserReputation = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  // Example logic: admins/moderators have higher reputation
  if (user && (user.role === 'admin' || user.role === 'moderator')) {
    return 1.0;
  }
  // Verified users might have a slightly higher score
  // For now, default to a neutral score
  return 0.5;
};

/**
 * (Helper) Calculates the priority for a new report.
 * @param {object} report - The report object, must include contentId and reporterId.
 * @returns {Promise<('LOW'|'MEDIUM'|'HIGH')>} The calculated priority level.
 */
const calculatePriority = async (report) => {
  if (!report.contentId) return 'LOW';

  // Factor 1: How many times has this content been reported?
  const reportCount = await prisma.report.count({
    where: { contentId: report.contentId }
  });

  // Factor 2: What type of content is it? (e.g., video might be higher priority)
  const content = await prisma.content.findUnique({
    where: { id: report.contentId },
    select: { type: true }
  });
  const contentTypeWeight = (content && content.type === 'video') ? 1.5 : 1.0;

  // Factor 3: Reputation of the reporter
  const userReputation = await getUserReputation(report.reporterId);

  // Simple scoring algorithm
  const score = (reportCount * 0.5) + (contentTypeWeight * 0.2) + (userReputation * 0.3);

  if (score > 3.0) return 'HIGH';
  if (score > 1.5) return 'MEDIUM';
  return 'LOW';
};

/**
 * @summary Enqueues a report by calculating its priority and saving it.
 * @description Takes a newly created report, calculates its initial priority based on
 * multiple factors, and updates the report record in the database.
 * @param {object} report - The report object from the database.
 * @returns {Promise<object>} The updated report with its new priority.
 */
const enqueueReport = async (report) => {
  const priority = await calculatePriority(report);

  return prisma.report.update({
    where: { id: report.id },
    data: { priority }
  });
};

/**
 * @summary Finds and escalates overdue reports.
 * @description Scans for pending reports that are older than the defined SLA (24 hours)
 * and updates their priority to 'high'. This function should be run
 * periodically by a scheduler (e.g., a cron job).
 * @returns {Promise<number>} The number of reports that were escalated.
 */
const escalateOverdueReports = async () => {
  const slaThreshold = new Date(Date.now() - SLA_HOURS * 60 * 60 * 1000);

  const { count } = await prisma.report.updateMany({
    where: {
      status: 'PENDING',
      priority: { not: 'HIGH' },
      createdAt: {
        lt: slaThreshold
      }
    },
    data: {
      priority: 'HIGH'
    }
  });

  if (count > 0) {
    console.log(`Escalated ${count} overdue reports.`);
    // Here you could also trigger a notification to an admin channel.
  }

  return count;
};

/**
 * @summary Gets a batch of reports for an admin to process.
 * @description Loads a list of pending reports, prioritizing the most critical ones first
 * (by 'high' priority, then by oldest creation date).
 * @param {number} [limit=10] - The maximum number of reports to retrieve.
 * @returns {Promise<Array<object>>} A list of report objects.
 */
const getReportBatch = async (limit = 10) => prisma.report.findMany({
  where: {
    status: 'PENDING'
  },
  orderBy: [
    { priority: 'desc' }, // 'high' -> 'medium' -> 'low'
    { createdAt: 'asc' } // Oldest first
  ],
  take: limit,
  include: {
    reporter: { select: { id: true, username: true } },
    reportedContent: { select: { id: true, title: true, type: true } }
  }
});

module.exports = {
  enqueueReport,
  escalateOverdueReports,
  getReportBatch
};
