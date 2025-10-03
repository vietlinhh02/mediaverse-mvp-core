const prisma = require('../../../../prisma/prismaClient.js');
const contentModerationService = require('../services/contentModerationService.js');

const getDashboard = async (req, res) => {
  try {
    const totalReports = await prisma.report.count();
    const pendingReports = await prisma.report.count({ where: { status: 'PENDING' } });
    const resolvedReports = await prisma.report.count({ where: { status: 'RESOLVED' } });

    res.status(200).json({
      totalReports,
      pendingReports,
      resolvedReports
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'An error occurred while fetching dashboard statistics.' });
  }
};

const getReports = async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    status,
    priority,
    reason
  } = req.query;

  const where = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (reason) where.reason = reason;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  try {
    const reports = await prisma.report.findMany({
      where,
      orderBy: {
        [sortBy]: sortOrder
      },
      skip,
      take,
      include: {
        reporter: { select: { id: true, username: true } },
        reportedContent: { select: { id: true, title: true } }
      }
    });

    const totalReports = await prisma.report.count({ where });

    res.status(200).json({
      data: reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalItems: totalReports,
        totalPages: Math.ceil(totalReports / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'An error occurred while fetching reports.' });
  }
};

const takeAction = async (req, res) => {
  const { id } = req.params;
  const { action, reason, details } = req.body; // e.g., details for a warning message or ban duration
  const moderatorId = req.user.id; // Assuming auth middleware provides req.user

  if (!action) {
    return res.status(400).json({ error: 'Action is required.' });
  }

  try {
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    let result;
    const { contentId, userId } = report;

    switch (action) {
      case 'approve':
      case 'remove':
        if (!contentId) return res.status(400).json({ error: 'Report is not associated with any content.' });
        result = await contentModerationService.processContentAction(contentId, action, {
          reportId: id, moderatorId, reason, details
        });
        break;

      case 'warn':
      case 'ban':
        if (!userId) return res.status(400).json({ error: 'Report is not associated with any user.' });
        // result = await userService.processUserAction(userId, action, { reportId: id, reason, details }); // Uncomment when userService is created
        console.log(`Action: ${action} on user ${userId} requested. Implement userService.processUserAction.`);
        result = { success: true, message: `User action '${action}' logged. Service not yet implemented.` };
        break;

      default:
        return res.status(400).json({ error: 'Invalid action specified.' });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error(`Error taking action on report ${id}:`, error);
    res.status(500).json({ error: 'An error occurred while taking action on the report.' });
  }
};

module.exports = {
  getDashboard,
  getReports,
  takeAction
};
