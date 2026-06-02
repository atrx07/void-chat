/**
 * ChatRoom Durable Object
 * Manages WebSocket connections for real-time messaging.
 * One instance handles all connected clients for the global chat.
 */
export class ChatRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    // Map of websocket -> { uid, displayName }
    this.sessions = new Map();
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/websocket') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected WebSocket', { status: 426 });
      }

      // Auth info is passed as query params after being verified at the Worker edge
      const uid = url.searchParams.get('uid');
      const displayName = url.searchParams.get('name') || 'user';

      const [client, server] = Object.values(new WebSocketPair());
      this.state.acceptWebSocket(server, [uid]);

      const session = { uid, displayName };
      this.sessions.set(server, session);

      // Notify others this user came online
      this.broadcast({
        type: 'presence',
        event: 'join',
        displayName,
        onlineCount: this.sessions.size,
      }, server);

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    // Internal HTTP endpoint: broadcast a message event to all WS clients
    if (url.pathname === '/broadcast' && request.method === 'POST') {
      const data = await request.json();
      this.broadcast(data);
      return new Response('ok');
    }

    // Online count / list
    if (url.pathname === '/online') {
      const users = [...this.sessions.values()].map(s => s.displayName);
      return Response.json({ users, count: users.length });
    }

    return new Response('Not found', { status: 404 });
  }

  // Called by the Workers runtime for each incoming WS message
  async webSocketMessage(ws, rawMessage) {
    const session = this.sessions.get(ws);
    if (!session) return;

    let msg;
    try { msg = JSON.parse(rawMessage); } catch { return; }

    if (msg.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong' }));
      return;
    }

    // Clients don't send chat messages over WS — they POST to the REST API.
    // WS is receive-only for clients. This handler is reserved for future use.
  }

  async webSocketClose(ws) {
    const session = this.sessions.get(ws);
    this.sessions.delete(ws);
    if (session) {
      this.broadcast({
        type: 'presence',
        event: 'leave',
        displayName: session.displayName,
        onlineCount: this.sessions.size,
      });
    }
  }

  async webSocketError(ws) {
    this.sessions.delete(ws);
  }

  broadcast(data, excludeWs = null) {
    const payload = JSON.stringify(data);
    const dead = [];
    for (const [ws] of this.sessions) {
      if (ws === excludeWs) continue;
      try {
        ws.send(payload);
      } catch {
        dead.push(ws);
      }
    }
    dead.forEach(ws => {
      this.sessions.delete(ws);
      try { ws.close(); } catch {}
    });
  }
}
