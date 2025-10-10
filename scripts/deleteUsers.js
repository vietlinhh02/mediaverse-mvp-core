/*
  Delete specific users (and related data) from the database and Meilisearch.

  Usage:
    node scripts/deleteUsers.js            // uses default IDs below
    node scripts/deleteUsers.js id1 id2    // override via CLI args

  Environment:
    MEILI_HOST (default http://localhost:7700)
    MEILI_MASTER_KEY
*/

require('dotenv').config();

const { prisma } = require('../src/config/database');
const { cache } = require('../src/config/redis');
const { MeiliSearch } = require('meilisearch');

const DEFAULT_IDS = [
  '019986cb-f467-7d90-995a-e2426004bff9',
  '019986e4-c6ff-7981-b57b-71e4b0ad61c4',
  '01998af6-ac86-7253-b71a-211905508d3b',
  '0199a809-d31b-7de1-9b3d-936ad2f7a19c'
];

function getTargetIds() {
  const args = process.argv.slice(2).filter(Boolean);
  if (args.length > 0) return args;
  return DEFAULT_IDS;
}

function getMeiliClient() {
  const host = process.env.MEILI_HOST || 'http://localhost:7700';
  const apiKey = process.env.MEILI_MASTER_KEY || process.env.MEILI_API_KEY;
  return new MeiliSearch({ host, apiKey });
}

async function deleteFromMeilisearch(userIds) {
  const client = getMeiliClient();
  try {
    const index = client.index('users');
    await index.deleteDocuments(userIds);
    console.log(`[Meili] Deleted ${userIds.length} user documents from index 'users'.`);
  } catch (err) {
    console.warn('[Meili] Skipped deleting documents (index may not exist or credentials missing):', err.message);
  }
}

async function deleteUsersFromDb(userIds) {
  console.log(`[DB] Deleting ${userIds.length} users and related data...`);

  // Clear caches for these users (profiles, followers/following variants)
  const cacheKeys = [];
  for (const userId of userIds) {
    cacheKeys.push(`profile:${userId}`);
    for (let page = 1; page <= 10; page++) {
      for (const limit of [10, 20, 50]) {
        cacheKeys.push(`followers:${userId}:${page}:${limit}`);
        cacheKeys.push(`following:${userId}:${page}:${limit}`);
      }
    }
  }
  await Promise.all(cacheKeys.map((k) => cache.del(k).catch(() => {})));

  // Use explicit deletions to avoid FK issues if cascade is not everywhere
  await prisma.$transaction(async (tx) => {
    // Likes by these users
    await tx.like.deleteMany({ where: { userId: { in: userIds } } });
    // Comments by these users
    await tx.comment.deleteMany({ where: { userId: { in: userIds } } });
    // Follows where they are follower or followee
    await tx.follow.deleteMany({ where: { OR: [ { followerId: { in: userIds } }, { followeeId: { in: userIds } } ] } });
    // Channels owned by these users
    await tx.channel.deleteMany({ where: { ownerId: { in: userIds } } });
    // Content authored by these users (videos/articles/documents)
    await tx.content.deleteMany({ where: { authorId: { in: userIds } } });
    // Profiles of these users
    await tx.profile.deleteMany({ where: { userId: { in: userIds } } });
    // Finally, users
    const { count } = await tx.user.deleteMany({ where: { id: { in: userIds } } });
    console.log(`[DB] Deleted ${count} users.`);
  });
}

async function main() {
  const targetIds = getTargetIds();
  if (!Array.isArray(targetIds) || targetIds.length === 0) {
    console.error('No user IDs provided.');
    process.exit(1);
  }

  console.log('Target user IDs to delete:', targetIds);

  try {
    await deleteUsersFromDb(targetIds);
    await deleteFromMeilisearch(targetIds);
    console.log('Done.');
  } catch (err) {
    console.error('Error while deleting users:', err);
    process.exitCode = 1;
  } finally {
    try { await prisma.$disconnect(); } catch {}
    try { if (cache && cache.disconnect) await cache.disconnect(); } catch {}
  }
}

main();


