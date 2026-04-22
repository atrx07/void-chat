import { getAuthUser, isAdmin, jsonResponse, errorResponse } from '../../utils.js';

export async function handleAdminDeleteMessage(request, env) {
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405, env);
  const user = await getAuthUser(request, env);
  if (!user || !isAdmin(user, env)) return errorResponse('Forbidden', 403, env);

  try {
    const body = await request.json();
    const id = parseInt(body.id, 10);
    if (!id) return errorResponse('Missing id', 400, env);

    await env.DB.prepare('DELETE FROM messages WHERE id = ?').bind(id).run();

    // Broadcast deletion to all WS clients
    try {
      const roomId = env.CHAT_ROOM.idFromName('global');
      const room = env.CHAT_ROOM.get(roomId);
      await room.fetch(new Request('http://do/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'delete', messageId: id }),
      }));
    } catch (_) {}

    return jsonResponse({ ok: true }, 200, env);
  } catch (e) {
    return errorResponse(e.message, 500, env);
  }
}
