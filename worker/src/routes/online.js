import { getAuthUser, jsonResponse, errorResponse } from '../utils.js';

export async function handleOnline(request, env) {
  if (request.method === 'POST') {
    const user = await getAuthUser(request, env);
    if (!user) return errorResponse('Unauthorized', 401, env);

    try {
      const now = Date.now();
      const displayName = user.name || user.email?.split('@')[0] || 'user';
      await env.DB.prepare(
        'INSERT INTO online_users (uid, display_name, last_seen) VALUES (?, ?, ?) ON CONFLICT(uid) DO UPDATE SET last_seen = excluded.last_seen, display_name = excluded.display_name'
      ).bind(user.uid, displayName, now).run();
      return jsonResponse({ ok: true }, 200, env);
    } catch (e) {
      return errorResponse(e.message, 500, env);
    }
  }

  if (request.method === 'GET') {
    const user = await getAuthUser(request, env);
    if (!user) return errorResponse('Unauthorized', 401, env);

    try {
      const cutoff = Date.now() - 30000; // 30s window
      const r = await env.DB.prepare(
        'SELECT display_name FROM online_users WHERE last_seen > ? ORDER BY last_seen DESC LIMIT 50'
      ).bind(cutoff).all();
      return jsonResponse({ users: (r.results || []).map(u => u.display_name) }, 200, env);
    } catch (e) {
      return errorResponse(e.message, 500, env);
    }
  }

  return errorResponse('Method not allowed', 405, env);
}
