/*
  Migration runner for removing Channel entity and channelId references.
  - Backfills playlists.userId from channels.ownerId
  - Drops content.channelId and channels table

  Usage:
    node scripts/migrate_remove_channels.js
*/

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('[Migration] Removing Channel entity and channelId references...');

  const statements = [
    // Playlists: add userId
    `ALTER TABLE "playlists" ADD COLUMN IF NOT EXISTS "userId" TEXT;`,
    // Backfill userId from channels.ownerId
    `UPDATE "playlists" p SET "userId" = c."ownerId" FROM "channels" c WHERE p."channelId" = c."id" AND (p."userId" IS NULL OR p."userId" = '')`,
    // Drop FK to channels if present
    `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'playlists_channelId_fkey') THEN ALTER TABLE "playlists" DROP CONSTRAINT "playlists_channelId_fkey"; END IF; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
    // Drop old column
    `ALTER TABLE "playlists" DROP COLUMN IF EXISTS "channelId";`,
    // Ensure NOT NULL on userId
    `ALTER TABLE "playlists" ALTER COLUMN "userId" SET NOT NULL;`,
    // Add FK to users
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'playlists_userId_fkey') THEN ALTER TABLE "playlists" ADD CONSTRAINT "playlists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
    // Content: drop FK and column channelId
    `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'content_channelId_fkey') THEN ALTER TABLE "content" DROP CONSTRAINT "content_channelId_fkey"; END IF; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
    `ALTER TABLE "content" DROP COLUMN IF EXISTS "channelId";`,
    // Drop channels table
    `DROP TABLE IF EXISTS "channels" CASCADE;`
  ];

  for (const sql of statements) {
    console.log('[Migration] Executing:', sql);
    await prisma.$executeRawUnsafe(sql);
  }

  console.log('[Migration] Completed successfully.');
}

main()
  .catch((e) => { console.error('[Migration] Failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

