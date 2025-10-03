// Notifications module index
const NotificationController = require('./controllers/notificationController');
const NotificationService = require('./services/notificationService');
const NotificationRoutes = require('./routes');
const WebSocketManager = require('./websocket/webSocketManager');

// Export all notification components
module.exports = {
  NotificationController,
  NotificationService,
  NotificationRoutes,
  WebSocketManager
};
