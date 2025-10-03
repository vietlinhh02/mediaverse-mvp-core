const searchService = require('../services/searchService');
const { logger } = require('./logger');

// The Prisma models that should be indexed in Meilisearch.
const SEARCHABLE_MODELS = {
  Content: {
    indexName: 'content',
    include: { author: true },
    transform: (content) => ({
      id: `${content.type}-${content.id}`,
      contentType: content.type,
      title: content.title,
      description: content.description,
      content: content.type === 'article' ? content.body : undefined,
      tags: content.tags || [],
      category: content.category,
      authorId: content.authorId,
      authorName: content.author?.username,
      status: content.status,
      createdAt: Math.floor(new Date(content.createdAt).getTime() / 1000),
      updatedAt: Math.floor(new Date(content.updatedAt).getTime() / 1000),
      thumbnailUrl: content.metadata?.thumbnailUrl // Add thumbnail for search results
    })
  },
  User: {
    indexName: 'users',
    include: { profile: true },
    transform: (user) => ({
      id: user.id,
      username: user.username,
      displayName: user.profile?.displayName,
      bio: user.profile?.bio,
      avatarUrl: user.profile?.avatarUrl,
      isVerified: user.profile?.isVerified,
      role: user.role,
      status: user.status,
      createdAt: Math.floor(new Date(user.createdAt).getTime() / 1000)
    })
  }
};

/**
 * Prisma middleware to sync data with Meilisearch on mutations.
 */
const prismaSearchSyncMiddleware = async (params, next) => {
  const result = await next(params);

  try {
    const { model, action, args } = params;

    // Handle Profile updates by re-indexing the parent User
    if (model === 'Profile' && ['update', 'upsert'].includes(action)) {
      const profile = result;
      if (profile.userId) {
        const user = await prisma.user.findUnique({
          where: { id: profile.userId },
          include: { profile: true }
        });
        if (user) {
          const userDoc = SEARCHABLE_MODELS.User.transform(user);
          await searchService.addOrUpdateDocuments('users', [userDoc]);
          logger.info(`Re-indexed User #${user.id} due to Profile update.`);
        }
      }
      return result;
    }

    const modelConfig = SEARCHABLE_MODELS[model];
    if (!modelConfig) {
      return result;
    }

    // Handle Content model logic (publish/unpublish)
    if (model === 'Content' && result.status !== 'published') {
      if (action === 'update') {
        const documentId = `${result.type}-${result.id}`;
        await searchService.deleteDocument(modelConfig.indexName, documentId);
        logger.info(`Removed unpublished ${model} #${result.id} from Meilisearch.`);
      }
      return result;
    }

    // --- Handle Create and Update ---
    if (['create', 'update', 'upsert'].includes(action)) {
      const recordId = result.id;
      if (!recordId) return result;

      const updatedRecord = await prisma[model.toLowerCase()].findUnique({
        where: { id: recordId },
        include: modelConfig.include
      });

      if (updatedRecord) {
        const document = modelConfig.transform(updatedRecord);
        await searchService.addOrUpdateDocuments(modelConfig.indexName, [document]);
        logger.info(`Synced [${action}] on ${model} #${recordId} with Meilisearch.`);
      }
    }

    // --- Handle Delete ---
    if (['delete'].includes(action)) {
      const recordId = args.where?.id;
      if (recordId) {
        const documentId = model === 'Content' ? `${result.type}-${recordId}` : recordId;
        await searchService.deleteDocument(modelConfig.indexName, documentId);
        logger.info(`Synced [delete] on ${model} #${recordId} with Meilisearch.`);
      }
    }
  } catch (error) {
    logger.error(`Meilisearch sync failed for action [${params.action}] on model [${params.model}]:`, error);
  }

  return result;
};

// We need a way to attach prisma client to this middleware.
function getSearchSyncMiddleware(prismaClient) {
  prisma = prismaClient;
  return prismaSearchSyncMiddleware;
}

let prisma; // Will be set by getSearchSyncMiddleware

module.exports = { getSearchSyncMiddleware };
