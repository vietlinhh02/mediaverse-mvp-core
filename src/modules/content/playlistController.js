const { asyncHandler, validate, AppError } = require('../../middleware');
const playlistService = require('./services/playlistService');
const {
  createPlaylistSchema, updatePlaylistSchema, addItemSchema, reorderItemsSchema
} = require('./validators/playlistValidator');

/**
 * @swagger
 * components:
 *   schemas:
 *     Playlist:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The playlist's unique identifier.
 *         channelId:
 *           type: string
 *           description: The ID of the channel that owns the playlist.
 *         title:
 *           type: string
 *           description: The title of the playlist.
 *         description:
 *           type: string
 *           description: A description of the playlist.
 *         visibility:
 *           type: string
 *           enum: [PUBLIC, PRIVATE, UNLISTED]
 *           description: The visibility status of the playlist.
 *         type:
 *           type: string
 *           enum: [PLAYLIST, SERIES]
 *           description: The type of the playlist.
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time the playlist was created.
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PlaylistItem'
 *
 *     PlaylistItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The playlist item's unique identifier.
 *         playlistId:
 *           type: string
 *           description: The ID of the playlist this item belongs to.
 *         contentId:
 *           type: string
 *           description: The ID of the content item.
 *         order:
 *           type: integer
 *           description: The order of the item within the playlist.
 *         content:
 *           $ref: '#/components/schemas/Content'
 *
 * tags:
 *   - name: Playlists
 *     description: Playlist management
 */
class PlaylistController {
  /**
   * @swagger
   * /api/playlists:
   *   post:
   *     summary: Create a new playlist
   *     tags: [Playlists]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               title:
   *                 type: string
   *               description:
   *                 type: string
   *               visibility:
   *                 type: string
   *                 enum: [PUBLIC, PRIVATE, UNLISTED]
   *               type:
   *                 type: string
   *                 enum: [PLAYLIST, SERIES]
   *     responses:
   *       201:
   *         description: Playlist created successfully.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Playlist'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   */
  static createPlaylist = asyncHandler(async (req, res) => {
    await validate(createPlaylistSchema, req.body);
    const { id: userId } = req.user;
    const playlistData = req.body;

    const playlist = await playlistService.createPlaylist(userId, playlistData);

    res.status(201).json({
      success: true,
      message: 'Playlist created successfully',
      data: playlist
    });
  });

  /**
   * @swagger
   * /api/playlists/{id}:
   *   get:
   *     summary: Get a playlist by ID
   *     tags: [Playlists]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Successfully retrieved playlist.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Playlist'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  static getPlaylistById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const playlist = await playlistService.getPlaylistById(id, req.user?.id);

    if (!playlist) {
      throw new AppError('Playlist not found or you do not have permission to view it', 404);
    }

    res.status(200).json({
      success: true,
      data: playlist
    });
  });

  /**
   * @swagger
   * /api/playlists/{id}:
   *   put:
   *     summary: Update a playlist
   *     tags: [Playlists]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               title:
   *                 type: string
   *               description:
   *                 type: string
   *               visibility:
   *                 type: string
   *                 enum: [PUBLIC, PRIVATE, UNLISTED]
   *               type:
   *                 type: string
   *                 enum: [PLAYLIST, SERIES]
   *     responses:
   *       200:
   *         description: Playlist updated successfully.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Playlist'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  static updatePlaylist = asyncHandler(async (req, res) => {
    await validate(updatePlaylistSchema, req.body);
    const { id: playlistId } = req.params;
    const { id: userId } = req.user;
    const updateData = req.body;

    const updatedPlaylist = await playlistService.updatePlaylist(playlistId, userId, updateData);

    res.status(200).json({
      success: true,
      message: 'Playlist updated successfully',
      data: updatedPlaylist
    });
  });

  /**
   * @swagger
   * /api/playlists/{id}:
   *   delete:
   *     summary: Delete a playlist
   *     tags: [Playlists]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       204:
   *         description: Playlist deleted successfully.
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  static deletePlaylist = asyncHandler(async (req, res) => {
    const { id: playlistId } = req.params;
    const { id: userId } = req.user;

    await playlistService.deletePlaylist(playlistId, userId);

    res.status(204).send();
  });

  /**
   * @swagger
   * /api/playlists/{id}/items:
   *   post:
   *     summary: Add an item to a playlist
   *     tags: [Playlists]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               contentId:
   *                 type: string
   *     responses:
   *       201:
   *         description: Item added successfully.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PlaylistItem'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  static addItemToPlaylist = asyncHandler(async (req, res) => {
    await validate(addItemSchema, req.body);
    const { id: playlistId } = req.params;
    const { id: userId } = req.user;
    const { contentId } = req.body;

    const newItem = await playlistService.addItemToPlaylist(playlistId, userId, contentId);

    res.status(201).json({
      success: true,
      message: 'Item added to playlist successfully',
      data: newItem
    });
  });

  /**
   * @swagger
   * /api/playlists/{id}/items:
   *   put:
   *     summary: Reorder items in a playlist
   *     tags: [Playlists]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               items:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     itemId:
   *                       type: string
   *                     order:
   *                       type: integer
   *     responses:
   *       200:
   *         description: Items reordered successfully.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Playlist'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  static reorderItems = asyncHandler(async (req, res) => {
    await validate(reorderItemsSchema, req.body);
    const { id: playlistId } = req.params;
    const { id: userId } = req.user;
    const { items } = req.body;

    const updatedPlaylist = await playlistService.reorderItems(playlistId, userId, items);

    res.status(200).json({
      success: true,
      message: 'Playlist items reordered successfully',
      data: updatedPlaylist
    });
  });

  /**
   * @swagger
   * /api/playlists/{id}/items/{itemId}:
   *   delete:
   *     summary: Remove an item from a playlist
   *     tags: [Playlists]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: itemId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       204:
   *         description: Item removed successfully.
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  static removeItem = asyncHandler(async (req, res) => {
    const { id: playlistId, itemId } = req.params;
    const { id: userId } = req.user;

    await playlistService.removeItem(playlistId, userId, itemId);

    res.status(204).send();
  });
}

module.exports = PlaylistController;
