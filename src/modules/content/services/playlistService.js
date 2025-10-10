const { PrismaClient } = require('@prisma/client');
const { AppError } = require('../../../middleware');
const { cache } = require('../../../config/redis');

const prisma = new PrismaClient();

const CACHE_TTL = 300; // 5 minutes

/**
 * Verifies that the user is the owner of the playlist.
 * Throws an error if the user is not the owner.
 * @param {string} playlistId - The ID of the playlist.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<object>} The playlist object if ownership is verified.
 * @private
 */
const _verifyPlaylistOwner = async (playlistId, userId) => {
  const playlist = await prisma.playlist.findUnique({
    where: { id: playlistId }
  });

  if (!playlist) {
    throw new AppError('Playlist not found', 404);
  }

  if (playlist.userId !== userId) {
    throw new AppError('You are not authorized to perform this action', 403);
  }

  return playlist;
};

class PlaylistService {
  /**
   * Creates a new playlist for a user's channel.
   * @param {string} userId - The ID of the user creating the playlist.
   * @param {object} data - The playlist data (title, description, etc.).
   * @returns {Promise<object>} The newly created playlist.
   */
  static async createPlaylist(userId, data) {
    const playlist = await prisma.playlist.create({
      data: {
        ...data,
        userId
      }
    });
    return playlist;
  }

  /**
   * Retrieves a playlist by its ID.
   * Handles visibility permissions.
   * @param {string} playlistId - The ID of the playlist.
   * @param {string|null} userId - The ID of the user requesting the playlist (can be null for guests).
   * @returns {Promise<object|null>} The playlist object or null if not found/not permitted.
   */
  static async getPlaylistById(playlistId, userId) {
    const cacheKey = `playlist:${playlistId}`;
    const cachedPlaylist = await cache.get(cacheKey);

    if (cachedPlaylist) {
      // Check visibility from cache before returning
      if (cachedPlaylist.visibility === 'PRIVATE' && (!userId || cachedPlaylist.userId !== userId)) {
        return null;
      }
      return cachedPlaylist;
    }

    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      include: {
        items: {
          orderBy: { order: 'asc' },
          include: {
            content: true // Include full content details for each item
          }
        }
      }
    });

    if (!playlist) {
      return null;
    }

    // Check visibility before caching and returning
    if (playlist.visibility === 'PRIVATE' && (!userId || playlist.userId !== userId)) {
      return null; // Don't even let them know it exists
    }

    await cache.set(cacheKey, playlist, CACHE_TTL);
    return playlist;
  }

  /**
   * Updates a playlist's details.
   * @param {string} playlistId - The ID of the playlist to update.
   * @param {string} userId - The ID of the user performing the update.
   * @param {object} data - The data to update.
   * @returns {Promise<object>} The updated playlist.
   */
  static async updatePlaylist(playlistId, userId, data) {
    await _verifyPlaylistOwner(playlistId, userId);

    const updatedPlaylist = await prisma.playlist.update({
      where: { id: playlistId },
      data
    });

    await cache.del(`playlist:${playlistId}`);
    return updatedPlaylist;
  }

  /**
   * Deletes a playlist.
   * @param {string} playlistId - The ID of the playlist to delete.
   * @param {string} userId - The ID of the user performing the deletion.
   * @returns {Promise<void>}
   */
  static async deletePlaylist(playlistId, userId) {
    await _verifyPlaylistOwner(playlistId, userId);

    // Deletion will cascade to PlaylistItem due to schema constraints
    await prisma.playlist.delete({
      where: { id: playlistId }
    });

    await cache.del(`playlist:${playlistId}`);
  }

  /**
   * Adds a content item to a playlist.
   * @param {string} playlistId - The ID of the playlist.
   * @param {string} userId - The ID of the user.
   * @param {string} contentId - The ID of the content to add.
   * @returns {Promise<object>} The newly created playlist item.
   */
  static async addItemToPlaylist(playlistId, userId, contentId) {
    const playlist = await _verifyPlaylistOwner(playlistId, userId);

    // Optional: Check if content exists and belongs to the user
    const content = await prisma.content.findUnique({ where: { id: contentId } });
    if (!content) {
      throw new AppError('Content not found', 404);
    }
    if (content.authorId !== playlist.channel.ownerId) {
      throw new AppError('You can only add your own content to a playlist', 403);
    }

    // Find the current max order
    const lastItem = await prisma.playlistItem.findFirst({
      where: { playlistId },
      orderBy: { order: 'desc' }
    });

    const newOrder = lastItem ? lastItem.order + 1 : 1;

    const newItem = await prisma.playlistItem.create({
      data: {
        playlistId,
        contentId,
        order: newOrder
      }
    });

    await cache.del(`playlist:${playlistId}`);
    return newItem;
  }

  /**
   * Reorders items within a playlist.
   * @param {string} playlistId - The ID of the playlist.
   * @param {string} userId - The ID of the user.
   * @param {Array<object>} items - An array of objects with { itemId, order }.
   * @returns {Promise<object>} The playlist with reordered items.
   */
  static async reorderItems(playlistId, userId, items) {
    await _verifyPlaylistOwner(playlistId, userId);

    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError('Invalid items array provided for reordering', 400);
    }

    // Perform updates in a transaction
    const updatePromises = items.map((item) => prisma.playlistItem.update({
      where: {
        id: item.itemId,
        playlistId // Ensure the item belongs to the playlist
      },
      data: {
        order: item.order
      }
    }));

    await prisma.$transaction(updatePromises);

    await cache.del(`playlist:${playlistId}`);

    // Return the updated playlist
    return this.getPlaylistById(playlistId, userId);
  }

  /**
   * Removes an item from a playlist.
   * @param {string} playlistId - The ID of the playlist.
   * @param {string} userId - The ID of the user.
   * @param {string} itemId - The ID of the playlist item to remove.
   * @returns {Promise<void>}
   */
  static async removeItem(playlistId, userId, itemId) {
    await _verifyPlaylistOwner(playlistId, userId);

    await prisma.playlistItem.delete({
      where: {
        id: itemId,
        playlistId // Ensure we only delete an item from the specified playlist
      }
    });

    await cache.del(`playlist:${playlistId}`);
  }
}

module.exports = PlaylistService;
