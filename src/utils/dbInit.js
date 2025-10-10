// Database initialization utilities
const { prisma } = require('../config/database');

/**
 * Initialize database with required indexes and constraints
 * This function creates indexes that are not handled by Prisma migrations
 */
const initializeDatabase = async () => {
  console.log('Initializing database indexes and constraints...');

  try {
    // Create GIN index for content tags (PostgreSQL specific)
    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_tags_gin 
      ON content USING GIN (tags);
    `;
    console.log('Created GIN index for content tags');

    // Create composite indexes for better query performance
    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_author_status 
      ON content ("authorId", status);
    `;
    console.log('Created composite index for content author and status');

    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_category_published 
      ON content (category, "publishedAt" DESC) 
      WHERE status = 'published';
    `;
    console.log('Created partial index for published content by category');

    // Create index for notifications
    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_status
      ON notifications ("userId", status, "createdAt" DESC);
    `;
    console.log('Created index for user notifications');

    // Create index for follows
    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_follows_followee 
      ON follows ("followeeId", "createdAt" DESC);
    `;
    console.log('Created index for follow relationships');

    // Create full-text search index for content
    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_fulltext 
      ON content USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));
    `;
    console.log('Created full-text search index for content');

    console.log('Database initialization completed successfully');
    return true;
  } catch (error) {
    // Handle cases where indexes already exist or database is not available
    if (error.code === '42P07' || error.message.includes('already exists')) {
      console.log('Database indexes already exist, skipping creation');
      return true;
    }

    if (error.code === 'P1001' || error.message.includes('database server')) {
      console.log('Database not available, skipping index creation');
      return false;
    }

    console.error('Database initialization failed:', error);
    throw error;
  }
};

/**
 * Verify database schema and indexes
 */
const verifyDatabaseSchema = async () => {
  console.log('Verifying database schema...');

  try {
    // Check if main tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE';
    `;

    const expectedTables = [
      'users', 'profiles', 'content',
      'likes', 'comments', 'follows', 'reports', 'notifications'
    ];

    const existingTables = tables.map((t) => t.table_name);
    const missingTables = expectedTables.filter((table) => !existingTables.includes(table));

    if (missingTables.length > 0) {
      console.log(`Missing tables: ${missingTables.join(', ')}`);
      return false;
    }

    // Check indexes
    const indexes = await prisma.$queryRaw`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public';
    `;

    const existingIndexes = indexes.map((i) => i.indexname);
    const expectedIndexes = [
      'idx_users_email', 'idx_users_username',
      'idx_content_author_id', 'idx_content_category',
      'idx_content_published_at'
    ];

    const missingIndexes = expectedIndexes.filter((index) => !existingIndexes.includes(index));

    if (missingIndexes.length > 0) {
      console.log(`Missing indexes: ${missingIndexes.join(', ')}`);
    }

    console.log('Database schema verification completed');
    return true;
  } catch (error) {
    if (error.code === 'P1001' || error.message.includes('database server')) {
      console.log('Database not available for schema verification');
      return false;
    }

    console.error('Schema verification failed:', error);
    return false;
  }
};

/**
 * Clean up test data (for development/testing)
 */
const cleanupTestData = async () => {
  console.log('Cleaning up test data...');

  try {
    // Delete in reverse order of dependencies
    await prisma.notification.deleteMany();
    await prisma.report.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.like.deleteMany();
    await prisma.follow.deleteMany();
    await prisma.content.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.user.deleteMany();

    console.log('Test data cleanup completed');
    return true;
  } catch (error) {
    console.error('Test data cleanup failed:', error);
    return false;
  }
};

/**
 * Get database statistics
 */
const getDatabaseStats = async () => {
  try {
    const stats = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_tuples,
        n_dead_tup as dead_tuples
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;

    return stats;
  } catch (error) {
    console.error('Failed to get database stats:', error);
    return [];
  }
};

module.exports = {
  initializeDatabase,
  verifyDatabaseSchema,
  cleanupTestData,
  getDatabaseStats
};
