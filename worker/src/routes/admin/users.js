import { getAuthUser, isAdmin, jsonResponse, errorResponse } from '../../utils.js';

export async function handleAdminUsers(request, env) {
  if (request.method !== 'GET') return errorResponse('Method not allowed', 405, env);
  const user = await getAuthUser(request, env);
  if (!user || !isAdmin(user, env)) return errorResponse('Forbidden', 403, env);

  try {
    // Get all users who have posted at least one message
    const users = await env.DB.prepare(
      'SELECT DISTINCT uid, display_name FROM messages WHERE type = ? ORDER BY display_name ASC'
    ).bind('chat').all();

    const banned = await env.DB.prepare(
      'SELECT uid FROM banned_users'
    ).all();

    const bannedUids = new Set((banned.results || []).map(b => b.uid));

    const activeUsers = (users.results || []).filter(u => !bannedUids.has(u.uid));
    const bannedUsers = (users.results || []).filter(u => bannedUids.has(u.uid));

    return jsonResponse({ users: activeUsers, banned: bannedUsers }, 200, env);
  } catch (e) {
    return errorResponse(e.message, 500, env);
  }
}
