import { getAuthUser, isAdmin, jsonResponse, errorResponse } from '../utils.js';

export async function handleMessages(request, env) {
  if (request.method === 'GET') {
    const user = await getAuthUser(request, env);
    if (!user) return errorResponse('Unauthorized', 401, env);

    const url = new URL(request.url);
    const since = parseInt(url.searchParams.get('since') || '0', 10);

    try {
      const r = await env.DB.prepare(
        'SELECT id, uid, display_name, message, created_at, type FROM messages WHERE id > ? ORDER BY id ASC LIMIT 200'
      ).bind(since).all();
      return jsonResponse({ messages: r.results || [] }, 200, env);
    } catch (e) {
      return errorResponse(e.message, 500, env);
    }
  }

  if (request.method === 'POST') {
    const user = await getAuthUser(request, env);
    if (!user) return errorResponse('Unauthorized', 401, env);

    try {
      const body = await request.json();
      const message = (body.message || '').trim().slice(0, 500);
      if (!message) return errorResponse('Empty message', 400, env);

      const banned = await env.DB.prepare('SELECT 1 FROM banned_users WHERE uid = ?').bind(user.uid).first();
      if (banned) return errorResponse('You are banned', 403, env);

      const now = Date.now();
      const displayName = user.name || user.email?.split('@')[0] || 'user';

      const result = await env.DB.prepare(
        'INSERT INTO messages (uid, display_name, message, created_at, type) VALUES (?, ?, ?, ?, ?)'
      ).bind(user.uid, displayName, message, now, 'chat').run();

      await env.DB.prepare(
        'DELETE FROM messages WHERE id NOT IN (SELECT id FROM messages ORDER BY id DESC LIMIT 200)'
      ).run();

      // Broadcast to all connected WebSocket clients via Durable Object
      const newMsg = {
        id: result.meta?.last_row_id,
        uid: user.uid,
        display_name: displayName,
        message,
        created_at: now,
        type: 'chat',
        isAdmin: isAdmin(user, env),
      };

      try {
        const roomId = env.CHAT_ROOM.idFromName('global');
        const room = env.CHAT_ROOM.get(roomId);
        await room.fetch(new Request('http://do/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'message', message: newMsg }),
        }));
      } catch (_) { /* non-fatal — WS broadcast best-effort */ }

      return jsonResponse({ ok: true, message: newMsg }, 200, env);
    } catch (e) {
      return errorResponse(e.message, 500, env);
    }
  }

  return errorResponse('Method not allowed', 405, env);
}
