const prisma = require('../../../../prisma/prismaClient.js');

/**
 * Helper function to create an audit log.
 * @param {string} moderatorId - The ID of the admin performing the action.
 * @param {string} userId - The ID of the user being actioned upon.
 * @param {string} action - The moderation action (e.g., 'ban', 'warn', 'unban').
 * @param {object} details - Additional details like reason, duration.
 * @returns {Promise} A prisma create promise for the log.
 */
const createAuditLog = (moderatorId, userId, action, details = {}) => prisma.moderationLog.create({
  data: {
    moderatorId,
    userId,
    action,
    reason: details.reason,
    duration: details.duration,
    notes: details.notes
  }
});

const banUser = async (req, res) => {
  const { id: userId } = req.params;
  const { reason, duration } = req.body;
  const moderatorId = req.user.id; // Assuming auth middleware provides req.user

  if (!reason) {
    return res.status(400).json({ error: 'A reason for the ban is required.' });
  }

  try {
    const [_, user] = await prisma.$transaction([
      createAuditLog(moderatorId, userId, 'BAN', { reason, duration }),
      prisma.user.update({
        where: { id: userId },
        data: { status: 'banned' }
      })
    ]);

    res.status(200).json({ message: 'User has been successfully banned.', user });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found.' });
    }
    console.error(`Error banning user ${userId}:`, error);
    res.status(500).json({ error: 'An error occurred while banning the user.' });
  }
};

const warnUser = async (req, res) => {
  const { id: userId } = req.params;
  const { reason } = req.body;
  const moderatorId = req.user.id; // Assuming auth middleware provides req.user

  if (!reason) {
    return res.status(400).json({ error: 'A reason for the warning is required.' });
  }

  try {
    await createAuditLog(moderatorId, userId, 'WARN', { reason });
    res.status(200).json({ message: 'User has been successfully warned.' });
  } catch (error) {
    if (error.code === 'P2003') { // Foreign key constraint failed
      return res.status(404).json({ error: 'User or moderator not found.' });
    }
    console.error(`Error warning user ${userId}:`, error);
    res.status(500).json({ error: 'An error occurred while warning the user.' });
  }
};

const unbanUser = async (req, res) => {
  const { id: userId } = req.params;
  const { reason } = req.body;
  const moderatorId = req.user.id; // Assuming auth middleware provides req.user

  try {
    const [_, user] = await prisma.$transaction([
      createAuditLog(moderatorId, userId, 'UNBAN', { reason }),
      prisma.user.update({
        where: { id: userId },
        data: { status: 'active' }
      })
    ]);
    res.status(200).json({ message: 'User has been successfully unbanned.', user });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found.' });
    }
    console.error(`Error unbanning user ${userId}:`, error);
    res.status(500).json({ error: 'An error occurred while unbanning the user.' });
  }
};

const getBannedUsers = async (req, res) => {
  try {
    const bannedUsers = await prisma.user.findMany({
      where: {
        status: 'banned'
      },
      select: {
        id: true,
        username: true,
        email: true,
        updatedAt: true
      }
    });
    res.status(200).json(bannedUsers);
  } catch (error) {
    console.error('Error fetching banned users:', error);
    res.status(500).json({ error: 'An error occurred while fetching banned users.' });
  }
};

module.exports = {
  banUser,
  warnUser,
  unbanUser,
  getBannedUsers
};
