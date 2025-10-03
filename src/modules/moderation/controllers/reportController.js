const prisma = require('../../../../prisma/prismaClient.js');

const VALID_REASONS = ['SPAM', 'HARASSMENT', 'INAPPROPRIATE', 'COPYRIGHT', 'OTHER'];
const VALID_STATUSES_FOR_REVIEW = ['UNDER_REVIEW', 'RESOLVED'];

const createReport = async (req, res) => {
  const { contentId, userId, reason } = req.body;

  if (!contentId || !userId || !reason) {
    return res.status(400).json({ error: 'contentId, userId, and reason are required.' });
  }

  if (!VALID_REASONS.includes(reason)) {
    return res.status(400).json({ error: `Invalid reason. Valid reasons are: ${VALID_REASONS.join(', ')}` });
  }

  try {
    const report = await prisma.report.create({
      data: {
        contentId,
        reporterId: userId,
        reason
      }
    });
    res.status(201).json(report);
  } catch (error) {
    console.error('Error creating report:', error);
    // Check for foreign key constraint violation
    if (error.code === 'P2003') {
      return res.status(404).json({ error: 'Content or User not found.' });
    }
    res.status(500).json({ error: 'An error occurred while creating the report.' });
  }
};

const getReports = async (req, res) => {
  // Note: Add admin role check middleware before this controller.
  const { status, priority, date } = req.query;

  const where = {};

  if (status) {
    where.status = status;
  }
  if (priority) {
    where.priority = priority;
  }
  if (date) {
    // Assuming date is in ISO 8601 format (YYYY-MM-DD)
    const startDate = new Date(date);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1);

    where.createdAt = {
      gte: startDate,
      lt: endDate
    };
  }

  try {
    const reports = await prisma.report.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.status(200).json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'An error occurred while fetching reports.' });
  }
};

const reviewReport = async (req, res) => {
  // Note: Add admin role check middleware before this controller.
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !VALID_STATUSES_FOR_REVIEW.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Valid statuses for review are: ${VALID_STATUSES_FOR_REVIEW.join(', ')}` });
  }

  try {
    const updatedReport = await prisma.report.update({
      where: { id },
      data: {
        status: status === 'under review' ? 'reviewed' : status, // Map to schema value
        reviewedAt: new Date()
        // reviewedBy: req.user.id // This should come from the authenticated admin user
      }
    });
    res.status(200).json(updatedReport);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Report not found.' });
    }
    console.error('Error updating report:', error);
    res.status(500).json({ error: 'An error occurred while updating the report.' });
  }
};

module.exports = {
  createReport,
  getReports,
  reviewReport
};
