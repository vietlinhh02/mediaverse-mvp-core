// scripts/sync-meilisearch.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const searchService = require('../src/services/searchService');

const prisma = new PrismaClient();
const BATCH_SIZE = 500; // Process 500 records at a time

/**
 * Transforms content data into a flat structure suitable for Meilisearch.
 * @param {object} content - The content object from Prisma.
 * @param {string} type - The type of content ('article', 'video', 'document').
 * @returns {object} - The transformed document for Meilisearch.
 */
function transformContentToDocument(content, type) {
  return {
    id: `${type}-${content.id}`, // Create a unique ID across content types
    contentType: type,
    title: content.title,
    description: content.description,
    content: type === 'article' ? content.content : undefined, // Only index full content for articles
    tags: content.tags || [],
    category: content.category?.name,
    authorId: content.authorId,
    authorName: content.author?.username,
    status: content.status,
    createdAt: Math.floor(new Date(content.createdAt).getTime() / 1000), // Meilisearch prefers Unix timestamps
    updatedAt: Math.floor(new Date(content.updatedAt).getTime() / 1000),
    thumbnailUrl: content.metadata?.thumbnailUrl, // Add thumbnail for search results
  };
}

/**
 * Transforms user data into a flat structure suitable for Meilisearch.
 * @param {object} user - The user object from Prisma.
 * @returns {object} - The transformed document for Meilisearch.
 */
function transformUserToDocument(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.profile?.displayName,
    bio: user.profile?.bio,
    avatarUrl: user.profile?.avatarUrl,
    isVerified: user.profile?.isVerified,
    role: user.role,
    status: user.status,
    createdAt: Math.floor(new Date(user.createdAt).getTime() / 1000),
  };
}

/**
 * Fetches and indexes all data from the database to Meilisearch in batches.
 */
async function syncAllData() {
  console.log('Starting data synchronization with Meilisearch...');

  try {
    // 1. Initialize Meilisearch indexes
    console.log('Initializing Meilisearch indexes...');
    await searchService.initIndex('content', {
      filterableAttributes: ['contentType', 'authorId', 'tags', 'category', 'createdAt'],
      sortableAttributes: ['createdAt', 'updatedAt'],
      searchableAttributes: ['title', 'description', 'tags', 'authorName', 'content'],
    });
    await searchService.initIndex('users', {
      filterableAttributes: ['status', 'role', 'isVerified'],
      sortableAttributes: ['createdAt'],
      searchableAttributes: ['username', 'displayName', 'bio'],
    });
    console.log('Meilisearch indexes are ready.');

    // 2. Sync all content types from the single Content model
    console.log('Syncing all content from Content model...');
    const totalContent = await prisma.content.count({
      where: { status: 'published' }, // Optional: only index published content
    });

    if (totalContent === 0) {
      console.log('No content to sync.');
      // return; // Keep this line commented out as it's not in the new_code
    }

    console.log(`Found ${totalContent} content items to sync.`);

    for (let i = 0; i < totalContent; i += BATCH_SIZE) {
      const contentBatch = await prisma.content.findMany({
        where: { status: 'published' },
        skip: i,
        take: BATCH_SIZE,
        include: { author: true }, // 'category' is a field, not a relation
      });

      const documents = contentBatch.map(content => {
        // We need to slightly adjust the transform function call
        // as the structure is a bit different now
        return {
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
          thumbnailUrl: content.metadata?.thumbnailUrl, // Add thumbnail for search results
        };
      });

      if (documents.length > 0) {
        await searchService.addOrUpdateDocuments(documents);
      }
      console.log(`  - Indexed ${i + contentBatch.length}/${totalContent} content items`);
    }

    // Sync Users
    console.log('Syncing users...');
    const totalUsers = await prisma.user.count();
    console.log(`Found ${totalUsers} users to sync.`);
    for (let i = 0; i < totalUsers; i += BATCH_SIZE) {
      const users = await prisma.user.findMany({
        skip: i,
        take: BATCH_SIZE,
        include: { profile: true },
      });
      const documents = users.map(transformUserToDocument);
      if (documents.length > 0) {
        await searchService.addOrUpdateDocuments('users', documents);
      }
      console.log(`  - Indexed ${i + users.length}/${totalUsers} users`);
    }

    console.log('\nSynchronization complete!');
  } catch (error) {
    console.error('An error occurred during synchronization:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Renaming the main function call
syncAllData();
