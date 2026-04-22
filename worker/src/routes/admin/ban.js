import { getAuthUser, isAdmin, jsonResponse, errorResponse } from '../../utils.js';

export async function handleAdminBan(request, env) {
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405, env);
  const user = await getAuthUser(request, env);
  if (!user || !isAdmin(user, env)) return errorResponse('Forbidden', 403, env);

  try {
    const body = await request.json();
    const targetUid = body.uid;
    if (!targetUid) return errorResponse('Missing uid', 400, env);
    if (targetUid === user.uid) return errorResponse('Cannot ban yourself', 400, env);

    await env.DB.prepare(
      'INSERT OR IGNORE INTO banned_users (uid, banned_at) VALUES (?, ?)'
    ).bind(targetUid, Date.now()).run();

    return jsonResponse({ ok: true }, 200, env);
  } catch (e) {
    return errorResponse(e.message, 500, env);
  }
}
