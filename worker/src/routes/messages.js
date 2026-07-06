import { getAuthUser, isAdmin, jsonResponse, errorResponse } from '../utils.js';

export async function handleMessages(request, env) {
  if (request.method === 'GET') {
    const user = await getAuthUser(request, env);
    if (!user) return errorResponse('Unauthorized', 401, env);

    const url = new URL(request.url);
    const since = parseInt(url.searchParams.get('since') || '0', 10);

    try {
      // Join with user_profiles so each message carries the sender's current color
      const r = await env.DB.prepare(`
        SELECT m.id, m.uid, m.display_name, m.message, m.created_at, m.type,
               p.name_color
        FROM   messages m
        LEFT JOIN user_profiles p ON p.uid = m.uid
        WHERE  m.id > ?
        ORDER  BY m.id ASC
        LIMIT  200
      `).bind(since).all();

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

      const banned = await env.DB.prepare(
        'SELECT 1 FROM banned_users WHERE uid = ?'
      ).bind(user.uid).first();

      if (banned) return errorResponse('You are banned', 403, env);

      const now = Date.now();
      const displayName = user.name || user.email?.split('@')[0] || 'user';

      const result = await env.DB.prepare(
        'INSERT INTO messages (uid, display_name, message, created_at, type) VALUES (?, ?, ?, ?, ?)'
      ).bind(user.uid, displayName, message, now, 'chat').run();

      await env.DB.prepare(
        'DELETE FROM messages WHERE id NOT IN (SELECT id FROM messages ORDER BY id DESC LIMIT 200)'
      ).run();

      const newMsg = {
        id: result.meta?.last_row_id,
        uid: user.uid,
        display_name: displayName,
        name_color: nameColor,
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
      } catch (broadcastError) {
        console.error('MESSAGES_BROADCAST_ERROR', {
          message: broadcastError?.message,
          stack: broadcastError?.stack,
          name: broadcastError?.name,
        });
      }

      return jsonResponse({ ok: true, message: newMsg }, 200, env);
    } catch (e) {
      console.error('MESSAGES_POST_ERROR', {
        message: e?.message,
        stack: e?.stack,
        name: e?.name,
      });

      return jsonResponse({
        error: e?.message || String(e),
        stack: e?.stack || null,
        name: e?.name || null,
      }, 500, env);
    }
  }

  return errorResponse('Method not allowed', 405, env);
}
