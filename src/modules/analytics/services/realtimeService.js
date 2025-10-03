const { WebSocketServer } = require('ws');
const { redisPub, redisSub } = require('../../../config/redis');

const REALTIME_ANALYTICS_CHANNEL = 'realtime-analytics-events';

class RealtimeService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // Use a Map to store clients and their subscriptions
    this._initializeRedisSubscriber();
  }

  /**
   * Initializes the WebSocket Server and attaches it to the HTTP server.
   * This should be called once from your main app file (e.g., app.js).
   * @param {http.Server} server - The HTTP server instance.
   */
  initialize(server) {
    this.wss = new WebSocketServer({ server, path: '/ws/analytics' });

    this.wss.on('connection', (ws, req) => {
      const clientId = new URLSearchParams(req.url.split('?')[1]).get('clientId') || Date.now().toString();
      console.log(`[RealtimeService] Client ${clientId} connected.`);

      this.clients.set(ws, { id: clientId, subscriptions: new Set() });

      ws.on('message', (message) => {
        this.handleMessage(ws, message);
      });

      ws.on('close', () => {
        console.log(`[RealtimeService] Client ${this.clients.get(ws)?.id} disconnected.`);
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('[RealtimeService] WebSocket error:', error);
      });
    });

    console.log('✅ Real-time Analytics Service initialized.');
  }

  /**
   * Handles incoming messages from WebSocket clients.
   * Clients can subscribe to specific topics.
   */
  handleMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      const clientInfo = this.clients.get(ws);

      if (data.action === 'subscribe' && data.topic) {
        console.log(`[RealtimeService] Client ${clientInfo.id} subscribed to ${data.topic}`);
        clientInfo.subscriptions.add(data.topic);
      } else if (data.action === 'unsubscribe' && data.topic) {
        console.log(`[RealtimeService] Client ${clientInfo.id} unsubscribed from ${data.topic}`);
        clientInfo.subscriptions.delete(data.topic);
      }
    } catch (error) {
      console.error('[RealtimeService] Failed to handle message:', message, error);
    }
  }

  /**
   * Subscribes to the Redis channel to receive events from other server instances.
   */
  _initializeRedisSubscriber() {
    redisSub.subscribe(REALTIME_ANALYTICS_CHANNEL, (message) => {
      try {
        const { event, payload } = JSON.parse(message);
        this._broadcast(event, payload);
      } catch (error) {
        console.error('[RealtimeService] Error processing Redis message:', error);
      }
    });
    console.log(`[RealtimeService] Subscribed to Redis channel: ${REALTIME_ANALYTICS_CHANNEL}`);
  }

  /**
   * Broadcasts a message to all relevant connected WebSocket clients.
   * @param {string} event - The event name (e.g., 'content:view_update').
   * @param {object} payload - The data to send.
   */
  _broadcast(event, payload) {
    if (!this.wss) return;

    const message = JSON.stringify({ event, payload });

    this.clients.forEach((clientInfo, ws) => {
      // Broadcast if the client is subscribed to the event's topic,
      // or if it has no specific subscriptions (general broadcast).
      // A topic could be e.g., 'content:contentId' or 'dashboard:creatorId'
      const { topic } = payload; // Assuming payload contains a topic for targeted broadcast
      if (ws.readyState === 1 && (!topic || clientInfo.subscriptions.has(topic))) {
        ws.send(message);
      }
    });
  }

  /**
   * Publishes a content view update to Redis for broadcasting.
   * @param {string} contentId - The ID of the content.
   * @param {number} viewCount - The new view count.
   */
  publishContentViewUpdate(contentId, viewCount) {
    const event = 'content:view_update';
    const payload = { contentId, viewCount, topic: `content:${contentId}` };
    redisPub.publish(REALTIME_ANALYTICS_CHANNEL, JSON.stringify({ event, payload }));
  }

  /**
   * Publishes a dashboard metrics update to Redis for broadcasting.
   * @param {string} creatorId - The ID of the creator.
   * @param {object} metrics - The updated dashboard metrics.
   */
  publishDashboardMetricsUpdate(creatorId, metrics) {
    const event = 'dashboard:metrics_update';
    const payload = { creatorId, metrics, topic: `dashboard:${creatorId}` };
    redisPub.publish(REALTIME_ANALYTICS_CHANNEL, JSON.stringify({ event, payload }));
  }
}

// Export a singleton instance
const realtimeService = new RealtimeService();
module.exports = realtimeService;
