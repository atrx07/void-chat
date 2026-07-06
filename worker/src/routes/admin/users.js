import { getAuthUser, isAdmin, jsonResponse, errorResponse } from '../../utils.js';

export async function handleAdminUsers(request, env) {
  if (request.method !== 'GET') return errorResponse('Method not allowed', 405, env);
  const user = await getAuthUser(request, env);
  if (!user || !isAdmin(user, env)) return errorResponse('Forbidden', 403, env);

  try {
    // One row per uid — resolve current name from user_profiles first,
    // fall back to the display_name on their most recent chat message.
    const users = await env.DB.prepare(`
      SELECT m.uid,
             COALESCE(p.display_name, m.display_name) AS display_name
      FROM (
        SELECT uid, display_name
        FROM   messages
        WHERE  type = 'chat'
        AND    id IN (
          SELECT MAX(id) FROM messages WHERE type = 'chat' GROUP BY uid
        )
      ) m
      LEFT JOIN user_profiles p ON p.uid = m.uid
      ORDER BY display_name ASC
    `).all();

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
