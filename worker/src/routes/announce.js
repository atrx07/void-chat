import { getAuthUser, isAdmin, jsonResponse, errorResponse } from '../utils.js';

export async function handleAnnounce(request, env) {
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405, env);

  const user = await getAuthUser(request, env);
  if (!user) return errorResponse('Unauthorized', 401, env);
  if (!isAdmin(user, env)) return errorResponse('Forbidden', 403, env);

  try {
    const body = await request.json();
    const message = (body.message || '').trim().slice(0, 300);
    if (!message) return errorResponse('Empty message', 400, env);

    const now = Date.now();
    const result = await env.DB.prepare(
      'INSERT INTO messages (uid, display_name, message, created_at, type) VALUES (?, ?, ?, ?, ?)'
    ).bind(user.uid, 'admin', message, now, 'announce').run();

    await env.DB.prepare(
      'DELETE FROM messages WHERE id NOT IN (SELECT id FROM messages ORDER BY id DESC LIMIT 200)'
    ).run();

    const newMsg = {
      id: result.meta?.last_row_id,
      uid: user.uid,
      display_name: 'admin',
      message,
      created_at: now,
      type: 'announce',
    };

    try {
      const roomId = env.CHAT_ROOM.idFromName('global');
      const room = env.CHAT_ROOM.get(roomId);
      await room.fetch(new Request('http://do/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'message', message: newMsg }),
      }));
    } catch (_) {}

    return jsonResponse({ ok: true }, 200, env);
  } catch (e) {
    return errorResponse(e.message, 500, env);
  }
}
