import { verifyAdminToken } from './_verify.js';

export async function onRequestPost({ request, env }) {
  try {
    var body = await request.json();
    if (!await verifyAdminToken(body.token, env)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    var users = await env.DB.prepare(
      'SELECT u.username, u.created_at FROM users u LEFT JOIN banned_users b ON u.username = b.username WHERE b.username IS NULL ORDER BY u.created_at DESC'
    ).all();
    var banned = await env.DB.prepare(
      'SELECT username, banned_at FROM banned_users ORDER BY banned_at DESC'
    ).all();
    return Response.json({
      users: users.results || [],
      banned: banned.results || []
    });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
