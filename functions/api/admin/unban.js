import { verifyAdminToken } from './_verify.js';

export async function onRequestPost({ request, env }) {
  try {
    var body = await request.json();
    if (!await verifyAdminToken(body.token, env)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!body.username) return Response.json({ error: 'Missing username' }, { status: 400 });
    var username = body.username.trim();
    await env.DB.prepare('DELETE FROM banned_users WHERE username = ?').bind(username).run();
    // Moderator announcement
    await env.DB.prepare('INSERT INTO messages (username, message, created_at, type) VALUES (?, ?, ?, ?)').bind('system', username + ' has been unbanned.', Date.now(), 'system').run();
    await env.DB.prepare('DELETE FROM messages WHERE id NOT IN (SELECT id FROM messages ORDER BY id DESC LIMIT 200)').run();
    return Response.json({ ok: true });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
