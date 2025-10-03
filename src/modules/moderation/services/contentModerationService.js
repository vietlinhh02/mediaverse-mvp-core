const prisma = require('../../../../prisma/prismaClient.js');

/**
 * Helper function to create an audit log for content actions.
 */
const createContentAuditLog = (details) => {
  const {
    moderatorId, content, action, reason
  } = details;
  return prisma.moderationLog.create({
    data: {
      moderatorId,
      userId: content.authorId,
      action: action === 'remove' ? 'REMOVE_CONTENT' : 'APPROVE_CONTENT',
      reason,
      notes: `Action on content ID: ${content.id}`
    }
  });
};

/**
 * @summary Processes a moderation action on a piece of content.
 * @description Handles actions like 'remove' or 'approve', updates content status,
 * resolves the associated report, and creates an audit log.
 * @param {string} contentId - The ID of the content to action upon.
 * @param {('remove'|'approve')} action - The action to perform.
 * @param {object} details - Additional details including reportId, moderatorId, and reason.
 * @returns {Promise<object>} Result of the operation.
 */
const processContentAction = async (contentId, action, details) => {
  const { reportId, moderatorId, reason } = details;

  const content = await prisma.content.findUnique({ where: { id: contentId } });
  if (!content) {
    throw new Error('Content not found.');
  }

  const transactions = [];

  // 1. Update content status if action is 'remove'
  if (action === 'remove') {
    transactions.push(
      prisma.content.update({
        where: { id: contentId },
        data: { status: 'removed' }
      })
    );
  }

  // 2. Resolve the report
  transactions.push(
    prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'RESOLVED',
        reviewedBy: moderatorId,
        reviewedAt: new Date(),
        decision: action
      }
    })
  );

  // 3. Create an audit log
  transactions.push(createContentAuditLog({
    moderatorId, content, action, reason
  }));

  // Execute all operations in a single transaction
  try {
    const transactionResult = await prisma.$transaction(transactions);
    const updatedContent = action === 'remove' ? transactionResult[0] : content;
    const updatedReport = action === 'remove' ? transactionResult[1] : transactionResult[0];
    const log = action === 'remove' ? transactionResult[2] : transactionResult[1];

    return {
      success: true,
      message: `Content successfully ${action}d.`,
      updatedContent,
      updatedReport,
      log
    };
  } catch (error) {
    console.error(`Transaction failed for action '${action}' on content '${contentId}':`, error);
    // Implement rollback logic if necessary, though Prisma handles atomic transactions.
    throw new Error(`Failed to process action: ${error.message}`);
  }
};

/**
 * @summary (STUB) Placeholder for restoring content.
 */
const restoreContent = async (contentId) => {
  console.log(`[STUB] Restoring content ${contentId}`);
  return { success: true, message: 'Content restored (stub).' };
};

module.exports = {
  processContentAction,
  restoreContent
};
