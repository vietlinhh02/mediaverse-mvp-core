const express = require('express');
const PlaylistController = require('./playlistController');
const { authenticateToken, optionalAuth, validate } = require('../../middleware');
const {
  createPlaylistSchema, updatePlaylistSchema, addItemSchema, reorderItemsSchema
} = require('./validators/playlistValidator');

const router = express.Router();

// Route to create a new playlist
router.post(
  '/',
  authenticateToken,
  validate(createPlaylistSchema),
  PlaylistController.createPlaylist
);

// Routes for a specific playlist
router
  .route('/:id')
  .get(optionalAuth, PlaylistController.getPlaylistById)
  .put(
    authenticateToken,
    validate(updatePlaylistSchema),
    PlaylistController.updatePlaylist
  )
  .delete(authenticateToken, PlaylistController.deletePlaylist);

// Routes for managing playlist items
router
  .route('/:id/items')
  .post(
    authenticateToken,
    validate(addItemSchema),
    PlaylistController.addItemToPlaylist
  )
  .put(
    authenticateToken,
    validate(reorderItemsSchema),
    PlaylistController.reorderItems
  );

// Route for removing a specific playlist item
router.delete(
  '/:id/items/:itemId',
  authenticateToken,
  PlaylistController.removeItem
);

module.exports = router;
