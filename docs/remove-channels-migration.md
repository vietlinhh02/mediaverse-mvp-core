Title: Remove Channel Entity – Backend Changes and Frontend Update Guide

Summary
- Removed content “Channel” entity from the backend. All content is now uploaded and owned directly by the user (`authorId`).
- Request payloads and responses no longer include any `channelId` or `channel` object.
- All channel management endpoints are removed.
- Playlists now belong to a `userId` instead of a `channelId`.

What Was Removed
- Database:
  - Dropped table `channels`.
  - Dropped column `content.channelId` and its foreign key.
  - Migrated `playlists.channelId` -> `playlists.userId` (FK to `users`).
- API routes (removed):
  - `POST /api/users/channels`
  - `PUT /api/users/channels/:id`
  - `GET /api/users/channels/:id`
  - `GET /api/users/:id/channels`
  - `DELETE /api/users/channels/:id`
  - `GET /api/users/channels`
- Request bodies (removed fields):
  - Content create/update (articles, documents, videos): remove `channelId`.
  - Upload endpoints (chunk, TUS): remove `channelId` from metadata/body.
- Response payloads (removed fields):
  - Content objects no longer include `channel` object. Only `author` is returned.
- Swagger/OpenAPI:
  - Removed tag “Channels”.
  - Removed `channelId` and `channel` from content schemas.

Endpoints Affected (Frontend Changes)
- Content create/update
  - Before: `{ title, ..., channelId? }`
  - After: `{ title, ... }` (no `channelId`). The backend uses the authenticated user (`authorId`).
- Upload – Chunked (`/api/uploads/chunks/*`)
  - Before: init body may include `channelId`.
  - After: remove `channelId`. Ownership is inferred from JWT (`req.user`).
- Upload – TUS (`/api/uploads/tus`)
  - Before: `Upload-Metadata` had `channelId`.
  - After: remove `channelId`. Only include: `title`, `description`, `category`, `tags`, `status`, `visibility`, `filename`, `contentType`, `useAdaptiveStorage`.
- Content GET/List (feed/search/recommendations)
  - Before: each content item could include `channel: { id, name }`.
  - After: `channel` removed. Use `author: { id, username, profile: { displayName, avatarUrl } }`.
- Playlists
  - Ownership changed to `userId`. No channel dependency on create/update. No change required in body unless you previously passed any channel reference (now invalid).

DB Migration Instructions
Option A: Prisma migration SQL
- File: `prisma/migrations/20251010_remove_channels/migration.sql`
  - Backfills `playlists.userId` from `channels.ownerId`.
  - Drops `content.channelId` and `channels` table.
  - Adds FK `playlists.userId` -> `users.id`.
Run:
- Ensure `DATABASE_URL` is set.
- Use your normal Prisma workflow (e.g., `npx prisma migrate deploy`).

Option B: Node script (idempotent)
- File: `scripts/migrate_remove_channels.js`
Run:
- `node scripts/migrate_remove_channels.js`

Code Touchpoints (for reference)
- Schema: `prisma/schema.prisma` (removed model `Channel`, removed `Content.channelId`, updated `Playlist` -> `userId`).
- Uploads: `src/modules/uploads/chunkUploadController.js`, `src/modules/uploads/tusServer.js` (no `channelId`).
- Content services/controllers: `src/modules/content/contentService.js`, `src/modules/content/*Controller.js` (no channel usage).
- Feed/Recommendations: `src/modules/content/feedController.js`, `src/modules/recommendations/recommendationService.js` (no channel in includes).
- Users module: removed `src/modules/users/channelController.js`; routes/validation updated.
- DB init/seed updated to not reference channels.

Frontend Checklist
- Remove `channelId` everywhere in content creation forms.
- Stop reading `content.channel` in content cards, detail pages, lists. Use `content.author` instead.
- Update any UI that listed “channels” under users (these endpoints are gone).
- If any playlist UI assumed channel context, switch to user-owned playlists.

Notes
- Notification “channels” (inApp/email/push) remain unchanged; only the content Channel entity was removed.
- If you have existing data relying on channels, run the migration before deploying the new backend.

