// WebSocket Manager for real-time notifications
const socketIo = require('socket.io');
const socketIoRedis = require('socket.io-redis');
const jwt = require('jsonwebtoken');

class WebSocketManager {
  constructor(server) {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socket.id
    this.userSockets = new Map(); // userId -> Set of socket IDs
    this.socketUsers = new Map(); // socket.id -> userId
    this.heartbeatIntervals = new Map(); // socket.id -> interval ID

    if (server) {
      this.initialize(server);
    }
  }

  /**
   * Initialize Socket.IO server
   */
  initialize(server) {
    this.io = socketIo(server, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      // Connection settings
      pingTimeout: 60000, // 60 seconds
      pingInterval: 25000, // 25 seconds
      // Authentication middleware
      allowRequest: this.authenticateConnection.bind(this)
    });

    // Setup Redis adapter for scaling across multiple instances
    if (process.env.REDIS_HOST) {
      this.io.adapter(socketIoRedis({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined
      }));
      console.log('WebSocket Redis adapter enabled');
    }

    this.setupMiddleware();
    this.setupEventHandlers();
    console.log('WebSocket notification server initialized');
  }

  /**
   * Setup Socket.IO middleware
   */
  setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token
                     || socket.handshake.headers?.authorization?.replace('Bearer ', '')
                     || socket.handshake.query?.token;

        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');

        // Attach user info to socket
        socket.userId = decoded.userId;
        socket.userEmail = decoded.email;
        socket.userRole = decoded.role;

        next();
      } catch (error) {
        console.error('Socket authentication failed:', error.message);
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Authenticate WebSocket connection using JWT (for allowRequest)
   */
  async authenticateConnection(req, callback) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '')
                   || req._query?.token
                   || req.headers['sec-websocket-protocol'];

      if (!token) {
        return callback(new Error('Authentication token required'), false);
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');

      // Attach user info to request
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };

      callback(null, true);
    } catch (error) {
      console.error('WebSocket authentication failed:', error.message);
      callback(new Error('Authentication failed'), false);
    }
  }

  /**
   * Setup socket event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User ${socket.userId} connected: ${socket.id}`);

      // User is already authenticated via middleware
      this.addUserSocket(socket.userId, socket.id);
      socket.join(`user_${socket.userId}`);

      // Setup heartbeat mechanism
      this.setupHeartbeat(socket);

      // Handle client events
      this.setupClientEvents(socket);

      // Send welcome message
      socket.emit('connected', {
        userId: socket.userId,
        message: 'Successfully connected to notification server',
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Setup heartbeat mechanism for connection monitoring
   */
  setupHeartbeat(socket) {
    const HEARTBEAT_INTERVAL = 30000; // 30 seconds
    const HEARTBEAT_TIMEOUT = 60000; // 60 seconds

    // Send heartbeat ping
    const heartbeatInterval = setInterval(() => {
      socket.emit('ping', { timestamp: Date.now() });
    }, HEARTBEAT_INTERVAL);

    // Handle pong response
    socket.on('pong', (data) => {
      const latency = Date.now() - data.timestamp;
      socket.lastHeartbeat = Date.now();
      // Optional: store latency for monitoring
    });

    // Handle heartbeat timeout
    const timeoutCheck = setInterval(() => {
      if (socket.lastHeartbeat && (Date.now() - socket.lastHeartbeat) > HEARTBEAT_TIMEOUT) {
        console.log(`Heartbeat timeout for socket ${socket.id}, disconnecting`);
        socket.disconnect(true);
        clearInterval(timeoutCheck);
        clearInterval(heartbeatInterval);
        this.heartbeatIntervals.delete(socket.id);
      }
    }, HEARTBEAT_TIMEOUT);

    this.heartbeatIntervals.set(socket.id, { heartbeatInterval, timeoutCheck });
  }

  /**
   * Setup client event handlers
   */
  setupClientEvents(socket) {
    // Handle notification events
    socket.on('notification:mark_read', async (data) => {
      try {
        const { notificationId } = data;
        if (notificationId && socket.userId) {
          // Mark notification as read
          await require('../services/notificationService').markAsRead(notificationId, socket.userId);
          socket.emit('notification:read_success', { notificationId });
        }
      } catch (error) {
        socket.emit('notification:error', { message: error.message });
      }
    });

    socket.on('notification:mark_all_read', async () => {
      try {
        if (socket.userId) {
          const count = await require('../services/notificationService').markAllAsRead(socket.userId);
          socket.emit('notification:all_read_success', { count });
        }
      } catch (error) {
        socket.emit('notification:error', { message: error.message });
      }
    });

    // Handle typing indicators
    socket.on('typing', (data) => {
      socket.to(data.room || `user_${socket.userId}`).emit('user_typing', {
        userId: socket.userId,
        isTyping: data.isTyping,
        room: data.room
      });
    });

    // Handle presence/online status
    socket.on('presence:online', () => {
      this.broadcastPresence(socket.userId, true);
    });

    socket.on('presence:away', () => {
      this.broadcastPresence(socket.userId, false);
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`User ${socket.userId} disconnected (${reason}): ${socket.id}`);

      // Clear heartbeat intervals
      const intervals = this.heartbeatIntervals.get(socket.id);
      if (intervals) {
        clearInterval(intervals.heartbeatInterval);
        clearInterval(intervals.timeoutCheck);
        this.heartbeatIntervals.delete(socket.id);
      }

      // Remove from user socket tracking
      this.removeUserSocket(socket.userId, socket.id);

      // Broadcast offline status
      this.broadcastPresence(socket.userId, false);
    });
  }

  /**
   * Add socket to user tracking
   */
  addUserSocket(userId, socketId) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socketId);
    this.socketUsers.set(socketId, userId);

    // Update legacy connectedUsers map (keep for backward compatibility)
    this.connectedUsers.set(userId, socketId);
  }

  /**
   * Remove socket from user tracking
   */
  removeUserSocket(userId, socketId) {
    if (this.userSockets.has(userId)) {
      this.userSockets.get(userId).delete(socketId);
      if (this.userSockets.get(userId).size === 0) {
        this.userSockets.delete(userId);
      }
    }
    this.socketUsers.delete(socketId);
    this.connectedUsers.delete(userId);
  }

  /**
   * Broadcast presence status
   */
  broadcastPresence(userId, isOnline) {
    const presenceData = {
      userId,
      isOnline,
      timestamp: new Date().toISOString()
    };

    // Broadcast to all users (or specific friends/followers)
    this.io.emit('presence:update', presenceData);
  }

  /**
   * Send notification to specific user
   */
  async sendToUser(userId, event, data) {
    try {
      // Send via WebSocket room if user is online
      this.io.to(`user_${userId}`).emit(event, {
        ...data,
        timestamp: new Date().toISOString(),
        userId
      });

      console.log(`Sent ${event} to user ${userId} (${this.userSockets.get(userId)?.size || 0} sockets)`);
      return true;
    } catch (error) {
      console.error(`Failed to send ${event} to user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendToUsers(userIds, event, data) {
    const promises = userIds.map((userId) => this.sendToUser(userId, event, data));
    const results = await Promise.allSettled(promises);
    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    console.log(`Sent ${event} to ${successCount}/${userIds.length} users`);
    return successCount;
  }

  /**
   * Broadcast to all connected users
   */
  async broadcast(event, data) {
    this.io.emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
    console.log(`Broadcasted ${event} to all users`);
  }

  /**
   * Send to users in a specific room/channel
   */
  async sendToRoom(room, event, data) {
    this.io.to(room).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
    console.log(`Sent ${event} to room ${room}`);
  }

  /**
   * Send new notification event
   */
  async sendNotification(userId, notification) {
    return this.sendToUser(userId, 'notification:new', {
      notification,
      type: 'notification'
    });
  }

  /**
   * Send notification read event
   */
  async sendNotificationRead(userId, notificationId) {
    return this.sendToUser(userId, 'notification:read', {
      notificationId,
      type: 'read'
    });
  }

  /**
   * Send bulk notification read event
   */
  async sendBulkNotificationRead(userId, count) {
    return this.sendToUser(userId, 'notification:bulk_read', {
      count,
      type: 'bulk_read'
    });
  }

  /**
   * Send typing indicator
   */
  async sendTyping(userId, room, isTyping) {
    return this.sendToRoom(room || `user_${userId}`, 'user_typing', {
      userId,
      isTyping,
      room
    });
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId) {
    return this.userSockets.has(userId) && this.userSockets.get(userId).size > 0;
  }

  /**
   * Get online user count
   */
  getOnlineUserCount() {
    return this.userSockets.size;
  }

  /**
   * Get list of online users
   */
  getOnlineUsers() {
    return Array.from(this.userSockets.keys());
  }

  /**
   * Get user's active socket count
   */
  getUserSocketCount(userId) {
    return this.userSockets.get(userId)?.size || 0;
  }

  /**
   * Disconnect all users (for graceful shutdown)
   */
  async disconnectAll() {
    if (this.io) {
      this.io.disconnectSockets(true);
      console.log('Disconnected all WebSocket connections');
    }
  }
}

module.exports = WebSocketManager;
